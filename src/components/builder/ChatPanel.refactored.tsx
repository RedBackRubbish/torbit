'use client'

/**
 * ChatPanel Refactored - Using New Hook Architecture
 *
 * This is a simplified, refactored version of ChatPanel demonstrating:
 * - useStreamingExecution for streaming
 * - useExecutionState for lifecycle tracking
 * - ErrorBoundary for error handling
 * - Analytics tracking
 * - Performance monitoring
 * - Pure UI state derivation
 */

import { useCallback, useMemo, useState } from 'react'
import { useStreamingExecution, deriveUIState } from '@/hooks/useStreamingExecution'
import { useExecutionState } from '@/hooks/useExecutionState'
import ErrorBoundary from '@/components/ErrorBoundary'
import { useMemoWithTracking } from '@/lib/performance/profiling'
import { useAnalyticsTracker } from '@/lib/analytics/tracking'
import { getSupabase } from '@/lib/supabase/client'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

interface ChatPanelRefactoredProps {
  projectId: string
  userId: string
  onMessageReceived?: (message: ChatMessage) => void
}

/**
 * Chat Input Component
 */
function ChatInput({
  onSend,
  disabled,
}: {
  onSend: (message: string) => void
  disabled: boolean
}) {
  const [input, setInput] = useState('')

  return (
    <div className="border-t p-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !disabled) {
              onSend(input)
              setInput('')
            }
          }}
          placeholder="Ask Torbit..."
          disabled={disabled}
          className="flex-1 px-3 py-2 border rounded disabled:bg-gray-100"
        />
        <button
          onClick={() => {
            onSend(input)
            setInput('')
          }}
          disabled={disabled || !input.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-400"
        >
          Send
        </button>
      </div>
    </div>
  )
}

/**
 * Message List Component
 */
function ChatMessages({ messages }: { messages: ChatMessage[] }) {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((msg) => (
        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          <div
            className={`max-w-md px-4 py-2 rounded ${
              msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-900'
            }`}
          >
            {msg.content}
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Main Chat Panel Component
 */
function ChatPanelRefactoredContent({
  projectId,
  userId,
  onMessageReceived,
}: ChatPanelRefactoredProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])

  // Execution tracking with auto ledger recording
  const execution = useExecutionState({
    projectId,
    userId,
    agentId: 'chat-agent',
    onExecutionComplete: (record) => {
      console.log('Chat execution recorded:', record)
    },
    onExecutionError: (error) => {
      console.error('Chat execution error:', error)
    },
  })

  // Streaming execution with proper cancellation
  const streaming = useStreamingExecution({
    onChunk: (chunk: any) => {
      // Process stream chunk
      if (chunk.type === 'content') {
        // Update last message content
        setMessages((prev) => {
          const updated = [...prev]
          if (updated.length > 0) {
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              content: updated[updated.length - 1].content + (chunk.data.content || ''),
            }
          }
          return updated
        })
      }
    },
    onComplete: () => {
      console.log('Chat stream completed')
    },
    onError: (error) => {
      console.error('Chat stream error:', error)
    },
  })

  // Pure UI state derivation - no side effects
  const uiState = useMemoWithTracking(
    () =>
      deriveUIState({
        isStreaming: streaming.isStreaming,
        error: streaming.error,
        data: streaming.data,
        progress: streaming.progress,
      }),
    [streaming.isStreaming, streaming.error, streaming.data, streaming.progress],
    'chatUIState'
  )

  // Analytics tracking
  const { trackExecution, trackEvent } = useAnalyticsTracker('ChatPanel', userId)

  // Handle sending message
  const handleSendMessage = useCallback(
    async (content: string) => {
      // Add user message to UI immediately
      const userMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'user',
        content,
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, userMsg])

      trackEvent({
        event: 'chat_message_sent',
        projectId,
        metadata: { messageLength: content.length },
      })

      // Start execution tracking
      const runId = execution.startExecution('Chat interaction', { message: content }, 'chat-agent')

      // Create placeholder assistant message
      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now()}-resp`,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, assistantMsg])

      try {
        // Get auth token
        const supabase = getSupabase()
        const { data: { session } } = await supabase?.auth.getSession() || { data: { session: null } }
        const headers: HeadersInit = { 'Content-Type': 'application/json' }
        if (session?.access_token) {
          headers.Authorization = `Bearer ${session.access_token}`
        }

        // Start streaming
        const startTime = Date.now()
        await streaming.startStream(runId, async (signal) => {
          const response = await fetch('/api/chat', {
            method: 'POST',
            headers,
            signal,
            body: JSON.stringify({
              messages: [...messages, userMsg],
              projectId,
              intent: 'chat',
            }),
          })

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`)
          }

          return response.body || new ReadableStream()
        })

        // Record successful execution
        const duration = Date.now() - startTime
        await execution.completeExecution(
          runId,
          { message: assistantMsg.content },
          {
            cost: Math.ceil(content.length / 100) * 10, // Rough estimate
            duration,
            tokensUsed: (content.length + assistantMsg.content.length) / 4, // Rough estimate
            toolCalls: 0,
          }
        )

        // Track execution metrics
        trackExecution({
          runId,
          projectId,
          userId,
          agentId: 'chat-agent',
          executionTime: duration,
          status: 'success',
          cost: Math.ceil(content.length / 100) * 10,
          tokensUsed: (content.length + assistantMsg.content.length) / 4,
          toolCalls: 0,
          retryCount: 0,
        })

        onMessageReceived?.(assistantMsg)
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error))

        // Record failed execution
        if (err.name !== 'AbortError') {
          execution.failExecution(runId, err)

          trackEvent({
            event: 'chat_error',
            projectId,
            metadata: { error: err.message },
          })
        } else {
          execution.cancelExecution()
          trackEvent({
            event: 'chat_cancelled',
            projectId,
          })
        }
      }
    },
    [messages, execution, streaming, projectId, userId, trackExecution, trackEvent, onMessageReceived]
  )

  // Handle cancel
  const handleCancel = useCallback(() => {
    streaming.cancelStream()
    execution.cancelExecution()
  }, [streaming, execution])

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Status bar */}
      {execution.isRunning() && (
        <div className="px-4 py-2 bg-blue-50 text-sm text-blue-700">
          Processing... {streaming.progress > 0 && `(${streaming.progress}%)`}
        </div>
      )}

      {uiState.isFailed && (
        <div className="px-4 py-2 bg-red-50 text-sm text-red-700 flex justify-between">
          <span>Error: {uiState.errorMessage}</span>
          <button onClick={() => execution.reset()} className="text-red-900 hover:underline">
            Retry
          </button>
        </div>
      )}

      {/* Messages */}
      <ChatMessages messages={messages} />

      {/* Progress bar */}
      {uiState.shouldShowProgress && (
        <div className="h-1 bg-gray-200">
          <div className="h-full bg-blue-500" style={{ width: `${uiState.progressPercent}%` }} />
        </div>
      )}

      {/* Input */}
      <ChatInput onSend={handleSendMessage} disabled={execution.isRunning()} />

      {/* Action buttons */}
      {execution.isRunning() && (
        <div className="px-4 py-2 border-t">
          <button
            onClick={handleCancel}
            className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}

/**
 * Export with Error Boundary
 */
export default function ChatPanelRefactored(props: ChatPanelRefactoredProps) {
  return (
    <ErrorBoundary
      resetKeys={[props.projectId, props.userId]}
      level="error"
      fallback={(error, reset) => (
        <div className="flex flex-col h-full bg-red-50 p-4 justify-center items-center">
          <h3 className="font-semibold text-red-900 mb-2">Chat Error</h3>
          <p className="text-red-700 text-sm mb-4">{error?.message}</p>
          <button
            onClick={reset}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )}
      onError={(error, componentStack) => {
        console.error('ChatPanel error boundary caught:', { error, componentStack })
      }}
    >
      <ChatPanelRefactoredContent {...props} />
    </ErrorBoundary>
  )
}
