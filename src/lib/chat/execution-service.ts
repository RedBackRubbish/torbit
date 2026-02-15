/**
 * Chat Execution Service
 * Wraps streaming execution with chat-specific logic
 */

import { useStreamingExecution, deriveUIState } from '@/hooks/useStreamingExecution'
import type { Message, StreamChunk, ToolCall } from '@/components/builder/chat/types'

export interface ChatStreamConfig {
  onMessageUpdate?: (msg: Message) => void
  onToolCall?: (toolCall: ToolCall) => void
  onStatusChange?: (status: string) => void
  onChunk?: (chunk: StreamChunk) => void
  onError?: (error: Error) => void
}

export interface ChatStreamResult {
  messages: Message[]
  toolCalls: ToolCall[]
  finalContent: string
}

/**
 * Custom hook for chat streaming operations
 * Handles SSE parsing, message assembly, tool call tracking
 */
export function useChatExecution(config: ChatStreamConfig = {}) {
  const streaming = useStreamingExecution({
    onChunk: (chunk: Record<string, unknown>) => {
      const streamChunk = chunk as unknown as StreamChunk

      if (streamChunk.type === 'text') {
        config.onStatusChange?.('Receiving content...')
      } else if (streamChunk.type === 'tool-call' && streamChunk.toolCall) {
        config.onToolCall?.({
          ...streamChunk.toolCall,
          status: 'pending',
        })
        config.onStatusChange?.('Executing tool...')
      } else if (streamChunk.type === 'error') {
        config.onStatusChange?.('Error occurred')
      }
    },
    onComplete: () => {
      config.onStatusChange?.('Complete')
    },
    onError: (error) => {
      config.onError?.(error)
      config.onStatusChange?.('Failed')
    },
  })

  /**
   * Parse SSE stream from chat API
   * Converts raw bytes to structured chunks
   */
  const parseSSEStream = async (
    reader: ReadableStreamDefaultReader<Uint8Array>
  ): Promise<ChatStreamResult> => {
    const decoder = new TextDecoder()
    let buffer = ''
    const messages: Message[] = []
    const toolCalls: ToolCall[] = []
    let fullContent = ''

    try {
      while (true) {
        const { done, value } = await reader.read()

        if (done) break

        // Keep streaming alive - reset idle timeout
        config.onStatusChange?.('Receiving...')

        buffer += decoder.decode(value, { stream: true })

        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const chunk: StreamChunk = JSON.parse(line.slice(6))
              streaming.data.push(chunk as unknown as Record<string, unknown>)

              if (chunk.type === 'text') {
                fullContent += chunk.content || ''
              } else if (chunk.type === 'tool-call' && chunk.toolCall) {
                const toolCall: ToolCall = {
                  ...chunk.toolCall,
                  status: 'pending',
                }
                toolCalls.push(toolCall)
              }

              // Call chunk handler for UI updates
              config.onChunk?.(chunk)
            } catch (e) {
              console.error('Failed to parse chunk:', e)
            }
          }
        }
      }

      // Ensure final buffer is processed
      if (buffer.startsWith('data: ')) {
        try {
          const chunk: StreamChunk = JSON.parse(buffer.slice(6))
          streaming.data.push(chunk as unknown as Record<string, unknown>)

          if (chunk.type === 'text') {
            fullContent += chunk.content || ''
          } else if (chunk.type === 'tool-call' && chunk.toolCall) {
            toolCalls.push({
              ...chunk.toolCall,
              status: 'pending',
            })
          }

          config.onChunk?.(chunk)
        } catch (e) {
          console.error('Failed to parse final chunk:', e)
        }
      }

      return {
        messages,
        toolCalls,
        finalContent: fullContent,
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        throw error
      }
      throw new Error('Stream cancelled')
    }
  }

  return {
    ...streaming,
    parseSSEStream,
  }
}

/**
 * Pure function to derive chat UI state from streaming state
 */
export function deriveChatUIState(state: {
  isStreaming: boolean
  error: Error | null
  data: any[]
  progress: number
  toolCallsCount: number
}) {
  const uiState = deriveUIState({
    isStreaming: state.isStreaming,
    error: state.error,
    data: state.data,
    progress: state.progress,
  })

  return {
    ...uiState,
    // Chat-specific derivations
    isWaitingForUserInput: state.error !== null && !state.isStreaming,
    isProcessingToolCalls: state.toolCallsCount > 0 && state.isStreaming,
    showProgressBar: state.isStreaming && state.progress > 0,
    connectionStatus: state.isStreaming ? 'connected' : 'idle',
  }
}
