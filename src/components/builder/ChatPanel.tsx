'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useBuilderStore } from '@/store/builder'
import { ExecutorService } from '@/services/executor'
import { NervousSystem, type PainSignal } from '@/lib/nervous-system'
import type { AgentId } from '@/lib/tools/definitions'

const AGENT_ICONS: Record<string, string> = {
  architect: '◆',
  frontend: '◇',
  backend: '⬡',
  database: '⬢',
  devops: '△',
  qa: '○',
  planner: '▣',
  auditor: '⚠',
}

const AGENT_COLORS: Record<string, string> = {
  architect: '#00ff41',
  frontend: '#00d4ff',
  backend: '#ff6b00',
  database: '#a855f7',
  devops: '#f43f5e',
  qa: '#eab308',
  planner: '#22c55e',
  auditor: '#ef4444',
}

// Tool call for real-time display
interface ToolCall {
  id: string
  name: string
  args: Record<string, unknown>
  status: 'pending' | 'running' | 'complete' | 'error'
  result?: {
    success: boolean
    output: string
    duration: number
  }
}

// Usage metrics
interface UsageMetrics {
  inputTokens: number
  outputTokens: number
  estimatedCost: number
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  agentId?: string
  toolCalls?: ToolCall[]
  usage?: UsageMetrics
  error?: {
    type: string
    message: string
    retryable: boolean
  }
  retrying?: boolean
}

// Stream chunk types from API
interface StreamChunk {
  type: 'text' | 'tool-call' | 'tool-result' | 'error' | 'usage' | 'retry'
  content?: string
  toolCall?: {
    id: string
    name: string
    args: Record<string, unknown>
  }
  toolResult?: {
    id: string
    success: boolean
    output: string
    duration: number
  }
  usage?: UsageMetrics
  error?: {
    type: string
    message: string
    retryable: boolean
  }
  retry?: {
    attempt: number
    maxAttempts: number
    retryAfterMs: number
  }
}

// Tool call display component
function ToolCallDisplay({ toolCall }: { toolCall: ToolCall }) {
  const [expanded, setExpanded] = useState(false)
  
  const statusColor = {
    pending: 'text-white/40',
    running: 'text-yellow-400',
    complete: 'text-green-400',
    error: 'text-red-400',
  }[toolCall.status]

  const statusIcon = {
    pending: '○',
    running: '◐',
    complete: '●',
    error: '✕',
  }[toolCall.status]

  return (
    <div className="my-2 bg-white/5 border border-white/10 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2 flex items-center gap-2 hover:bg-white/5 transition-colors"
      >
        <motion.span 
          className={statusColor}
          animate={toolCall.status === 'running' ? { rotate: 360 } : {}}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          {statusIcon}
        </motion.span>
        <code className="text-xs text-blue-400 flex-1 text-left truncate">
          {toolCall.name}
        </code>
        {toolCall.result && (
          <span className="text-white/40 text-xs">
            {toolCall.result.duration}ms
          </span>
        )}
        <svg 
          className={`w-3 h-3 text-white/40 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-white/10"
          >
            <div className="p-3 space-y-2 text-xs">
              <div>
                <span className="text-white/40">Arguments:</span>
                <pre className="mt-1 p-2 bg-black/50 rounded text-white/60 overflow-x-auto">
                  {JSON.stringify(toolCall.args, null, 2)}
                </pre>
              </div>
              {toolCall.result && (
                <div>
                  <span className="text-white/40">Result:</span>
                  <pre className={`mt-1 p-2 bg-black/50 rounded overflow-x-auto max-h-32 ${
                    toolCall.result.success ? 'text-green-400/80' : 'text-red-400/80'
                  }`}>
                    {toolCall.result.output.slice(0, 500)}
                    {toolCall.result.output.length > 500 && '...'}
                  </pre>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * ChatPanel - Conversational interface for interacting with agents
 * With real-time tool call streaming!
 */
export default function ChatPanel() {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<AgentId>('architect')
  
  const { 
    chatCollapsed, 
    toggleChat, 
    setAgentStatus,
    addFile,
    setIsGenerating,
    prompt,
  } = useBuilderStore()

  // Parse code blocks from AI response
  const parseCodeBlocks = useCallback((content: string) => {
    const blocks: { path: string; content: string; language: string }[] = []
    const regex = /```(\w+)?\n\/\/ ([\w\/.]+)\n([\s\S]*?)```/g
    let match
    
    while ((match = regex.exec(content)) !== null) {
      blocks.push({
        language: match[1] || 'typescript',
        path: match[2],
        content: match[3].trim(),
      })
    }
    
    return blocks
  }, [])

  // Parse SSE stream with tool calls
  const parseSSEStream = useCallback(async (
    reader: ReadableStreamDefaultReader<Uint8Array>,
    assistantId: string,
    agentId: AgentId
  ) => {
    const decoder = new TextDecoder()
    let buffer = ''
    let fullContent = ''
    const toolCalls: Map<string, ToolCall> = new Map()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      
      // Parse SSE format: data: {...}\n\n
      const lines = buffer.split('\n\n')
      buffer = lines.pop() || '' // Keep incomplete chunk in buffer

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        
        try {
          const chunk: StreamChunk = JSON.parse(line.slice(6))
          
          switch (chunk.type) {
            case 'text':
              fullContent += chunk.content || ''
              setMessages(prev => prev.map(m => 
                m.id === assistantId 
                  ? { ...m, content: fullContent, toolCalls: Array.from(toolCalls.values()) }
                  : m
              ))
              break

            case 'tool-call':
              if (chunk.toolCall) {
                const tc: ToolCall = {
                  id: chunk.toolCall.id,
                  name: chunk.toolCall.name,
                  args: chunk.toolCall.args,
                  status: 'running',
                }
                toolCalls.set(tc.id, tc)
                setAgentStatus(agentId, 'working', `Running ${tc.name}...`)
                setMessages(prev => prev.map(m => 
                  m.id === assistantId 
                    ? { ...m, toolCalls: Array.from(toolCalls.values()) }
                    : m
                ))
                
                // CLIENT-SIDE EXECUTION: Route to WebContainer via ExecutorService
                // This is the "Spinal Cord" - connecting AI intent to browser runtime
                if (ExecutorService.isToolAvailable(tc.name)) {
                  ExecutorService.executeTool(tc.name, tc.args).then((result) => {
                    // Update the tool call with client-side result
                    const existingTc = toolCalls.get(tc.id)
                    if (existingTc) {
                      existingTc.status = result.success ? 'complete' : 'error'
                      existingTc.result = {
                        success: result.success,
                        output: result.output,
                        duration: result.duration,
                      }
                      toolCalls.set(existingTc.id, existingTc)
                      setMessages(prev => prev.map(m => 
                        m.id === assistantId 
                          ? { ...m, toolCalls: Array.from(toolCalls.values()) }
                          : m
                      ))
                    }
                  }).catch((error) => {
                    console.error('[ChatPanel] Client execution error:', error)
                    const existingTc = toolCalls.get(tc.id)
                    if (existingTc) {
                      existingTc.status = 'error'
                      existingTc.result = {
                        success: false,
                        output: error instanceof Error ? error.message : 'Unknown error',
                        duration: 0,
                      }
                      toolCalls.set(existingTc.id, existingTc)
                      setMessages(prev => prev.map(m => 
                        m.id === assistantId 
                          ? { ...m, toolCalls: Array.from(toolCalls.values()) }
                          : m
                      ))
                    }
                  })
                }
              }
              break

            case 'tool-result':
              if (chunk.toolResult) {
                const existing = toolCalls.get(chunk.toolResult.id)
                if (existing) {
                  existing.status = chunk.toolResult.success ? 'complete' : 'error'
                  existing.result = chunk.toolResult
                  toolCalls.set(existing.id, existing)
                  setMessages(prev => prev.map(m => 
                    m.id === assistantId 
                      ? { ...m, toolCalls: Array.from(toolCalls.values()) }
                      : m
                  ))
                }
              }
              break

            case 'usage':
              if (chunk.usage) {
                setMessages(prev => prev.map(m => 
                  m.id === assistantId 
                    ? { ...m, usage: chunk.usage }
                    : m
                ))
              }
              break

            case 'retry':
              if (chunk.retry) {
                setAgentStatus(agentId, 'working', `Retrying (${chunk.retry.attempt}/${chunk.retry.maxAttempts})...`)
                setMessages(prev => prev.map(m => 
                  m.id === assistantId 
                    ? { ...m, retrying: true, content: `Retrying... (attempt ${chunk.retry!.attempt}/${chunk.retry!.maxAttempts})` }
                    : m
                ))
              }
              break

            case 'error':
              if (chunk.error) {
                setMessages(prev => prev.map(m => 
                  m.id === assistantId 
                    ? { 
                        ...m, 
                        error: chunk.error, 
                        retrying: false,
                        content: fullContent || chunk.error?.message || 'An error occurred' 
                      }
                    : m
                ))
              }
              break
          }
        } catch {
          // Ignore parse errors for incomplete chunks
        }
      }
    }

    return { content: fullContent, toolCalls: Array.from(toolCalls.values()) }
  }, [setAgentStatus])

  const handleSubmitMessage = useCallback(async (messageContent: string, agentId: AgentId) => {
    if (!messageContent.trim() || isLoading) return

    setIsLoading(true)
    setIsGenerating(true)
    setAgentStatus(agentId, 'working', 'Analyzing request...')

    // Add assistant placeholder
    const assistantId = crypto.randomUUID()
    setMessages(prev => [...prev, {
      id: assistantId,
      role: 'assistant',
      content: '',
      agentId,
      toolCalls: [],
    }])

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: messageContent }].map(m => ({
            role: m.role,
            content: m.content,
          })),
          agentId,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const { content: fullContent } = await parseSSEStream(reader, assistantId, agentId)

      // Parse code blocks and add as files
      const codeBlocks = parseCodeBlocks(fullContent)
      codeBlocks.forEach(block => {
        addFile({
          path: block.path,
          name: block.path.split('/').pop() || 'untitled',
          content: block.content,
          language: block.language,
        })
      })

      setAgentStatus(agentId, 'complete', 'Complete')
    } catch (error) {
      console.error('Chat error:', error)
      setAgentStatus(agentId, 'error', 'Request failed')
      setMessages(prev => prev.map(m => 
        m.id === assistantId 
          ? { 
              ...m, 
              content: '', 
              error: {
                type: 'network',
                message: error instanceof Error ? error.message : 'Unknown error',
                retryable: true,
              }
            }
          : m
      ))
    } finally {
      setIsLoading(false)
      setIsGenerating(false)
    }
  }, [isLoading, messages, setIsGenerating, setAgentStatus, parseSSEStream, parseCodeBlocks, addFile])

  // Initialize with stored prompt
  useEffect(() => {
    if (prompt && messages.length === 0) {
      setMessages([
        {
          id: 'init',
          role: 'user',
          content: prompt,
        }
      ])
      handleSubmitMessage(prompt, selectedAgent)
    }
  }, [prompt]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ========================================================================
  // REFLEX ARC: Listen for pain signals and auto-append to chat
  // This makes Torbit self-heal by immediately notifying the AI of errors
  // ========================================================================
  useEffect(() => {
    const handlePain = (e: CustomEvent<PainSignal>) => {
      const signal = e.detail
      
      // Skip if we're not loading (AI not active) or if it's just a warning
      if (signal.severity !== 'critical') {
        console.log('[ReflexArc] Ignoring non-critical pain:', signal.type)
        return
      }
      
      // Prevent notification storms - only allow one auto-fix per 5 seconds
      const lastAutoFix = (window as unknown as { __lastAutoFix?: number }).__lastAutoFix || 0
      const now = Date.now()
      if (now - lastAutoFix < 5000) {
        console.log('[ReflexArc] Debouncing pain signal (too soon after last)')
        return
      }
      (window as unknown as { __lastAutoFix: number }).__lastAutoFix = now
      
      console.warn('[ReflexArc] 🔴 Pain detected, triggering auto-fix:', signal.type)
      
      // Create the error message for the AI
      const errorMessage = NervousSystem.formatForAI(signal)
      
      // Add as a "system" message (appears as user to trigger AI response)
      const systemMessage: Message = {
        id: `pain-${signal.id}`,
        role: 'user',
        content: errorMessage,
      }
      
      setMessages(prev => [...prev, systemMessage])
      
      // Trigger AI response to fix the error
      setAgentStatus(selectedAgent, 'working', `Auto-fixing: ${signal.type}`)
      handleSubmitMessage(errorMessage, selectedAgent)
    }

    window.addEventListener('torbit-pain-signal', handlePain as EventListener)
    return () => window.removeEventListener('torbit-pain-signal', handlePain as EventListener)
  }, [selectedAgent, handleSubmitMessage, setAgentStatus])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return
    
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
    }
    setMessages(prev => [...prev, userMessage])
    handleSubmitMessage(input, selectedAgent)
    setInput('')
  }

  return (
    <motion.div
      className="h-full bg-neutral-900/80 border-l border-neutral-800 flex flex-col"
      animate={{ width: chatCollapsed ? 48 : 400 }}
      transition={{ duration: 0.2 }}
      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
    >
      {/* Header */}
      <div className="h-12 border-b border-neutral-800 flex items-center justify-between px-4">
        <AnimatePresence mode="wait">
          {!chatCollapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-neutral-300 text-sm font-medium"
            >
              Agent Console
            </motion.span>
          )}
        </AnimatePresence>
        
        <button
          onClick={toggleChat}
          className="w-6 h-6 flex items-center justify-center text-neutral-500 hover:text-neutral-300 transition-colors"
        >
          <svg 
            className={`w-4 h-4 transition-transform duration-200 ${chatCollapsed ? 'rotate-180' : ''}`}
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <AnimatePresence mode="wait">
        {!chatCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar"
          >
            {messages.length === 0 && (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="text-3xl mb-3 opacity-20">💬</div>
                  <p className="text-neutral-400 text-sm">Describe what you want to build</p>
                  <p className="text-neutral-500 text-xs mt-1">The agents will take it from there</p>
                </div>
              </div>
            )}
            
            {messages.map((message, i) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
              >
                {message.role === 'user' ? (
                  <div className="flex justify-end">
                    <div className="max-w-[85%] bg-blue-500/10 border border-blue-500/20 rounded-2xl rounded-br-md px-4 py-3">
                      <p className="text-neutral-100 text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0"
                      style={{ 
                        backgroundColor: `${AGENT_COLORS[message.agentId || 'architect']}20`, 
                        color: AGENT_COLORS[message.agentId || 'architect'] 
                      }}
                    >
                      {AGENT_ICONS[message.agentId || 'architect']}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span 
                          className="text-xs font-medium capitalize"
                          style={{ color: AGENT_COLORS[message.agentId || 'architect'] }}
                        >
                          {message.agentId || 'Architect'}
                        </span>
                        {isLoading && i === messages.length - 1 && !message.content && (
                          <div className="flex gap-1">
                            <motion.div
                              className="w-1 h-1 rounded-full bg-white/40"
                              animate={{ opacity: [0.3, 1, 0.3] }}
                              transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                            />
                            <motion.div
                              className="w-1 h-1 rounded-full bg-white/40"
                              animate={{ opacity: [0.3, 1, 0.3] }}
                              transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                            />
                            <motion.div
                              className="w-1 h-1 rounded-full bg-white/40"
                              animate={{ opacity: [0.3, 1, 0.3] }}
                              transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                            />
                          </div>
                        )}
                        {/* Token usage display */}
                        {message.usage && (
                          <span className="text-neutral-500 text-xs ml-auto">
                            {message.usage.inputTokens + message.usage.outputTokens} tokens · ${message.usage.estimatedCost.toFixed(4)}
                          </span>
                        )}
                      </div>
                      
                      {/* Tool calls - show above text response */}
                      {message.toolCalls && message.toolCalls.length > 0 && (
                        <div className="mb-2">
                          {message.toolCalls.map(tc => (
                            <ToolCallDisplay key={tc.id} toolCall={tc} />
                          ))}
                        </div>
                      )}
                      
                      {/* Error display with type badge */}
                      {message.error && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl rounded-tl-md px-4 py-3 mb-2">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs px-2 py-0.5 bg-red-500/20 rounded text-red-400 uppercase">
                              {message.error.type}
                            </span>
                            {message.error.retryable && (
                              <span className="text-xs text-white/40">Retryable</span>
                            )}
                          </div>
                          <p className="text-sm text-red-400">{message.error.message}</p>
                        </div>
                      )}
                      
                      {/* Retrying indicator */}
                      {message.retrying && (
                        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl rounded-tl-md px-4 py-3 mb-2 flex items-center gap-2">
                          <motion.div
                            className="w-3 h-3 border-2 border-yellow-400 border-t-transparent rounded-full"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          />
                          <p className="text-sm text-yellow-400">{message.content}</p>
                        </div>
                      )}
                      
                      {/* Text response */}
                      {(message.content && !message.error && !message.retrying) && (
                        <div className="bg-neutral-800/50 border border-neutral-700/50 rounded-2xl rounded-tl-md px-4 py-3">
                          <p className="text-sm whitespace-pre-wrap text-neutral-200">
                            {message.content}
                          </p>
                        </div>
                      )}
                      
                      {/* Thinking state */}
                      {!message.content && !message.error && !message.retrying && !message.toolCalls?.length && (
                        <div className="bg-neutral-800/50 border border-neutral-700/50 rounded-2xl rounded-tl-md px-4 py-3">
                          <p className="text-sm text-neutral-400">Thinking...</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
            <div ref={messagesEndRef} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <AnimatePresence mode="wait">
        {!chatCollapsed && (
          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="p-4 border-t border-neutral-800"
          >
            <div className="relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmit(e)
                  }
                }}
                placeholder="What would you like to build?"
                rows={1}
                className="w-full bg-neutral-800/50 border border-neutral-700 rounded-xl px-4 py-3 pr-12
                  text-neutral-100 text-sm placeholder:text-neutral-500 resize-none
                  focus:outline-none focus:border-blue-500/50 transition-colors"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className={`absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg
                  flex items-center justify-center transition-all ${
                    input.trim() && !isLoading
                      ? 'bg-blue-600 text-white hover:bg-blue-500'
                      : 'bg-neutral-700/50 text-neutral-500 cursor-not-allowed'
                  }`}
              >
                {isLoading ? (
                  <motion.div
                    className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  />
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                )}
              </button>
            </div>
            
            <p className="text-neutral-500 text-xs mt-3 text-center">
              Enter to send · Shift+Enter for new line
            </p>
          </motion.form>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
