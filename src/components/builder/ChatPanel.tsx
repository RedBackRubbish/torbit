'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useBuilderStore } from '@/store/builder'
import { ExecutorService } from '@/services/executor'
import { NervousSystem, type PainSignal } from '@/lib/nervous-system'
import { MessageBubble } from './chat/MessageBubble'
import { ChatInput } from './chat/ChatInput'
import type { Message, ToolCall, StreamChunk, AgentId } from './chat/types'

/**
 * ChatPanel - Premium v0-style chat interface
 * 
 * Features:
 * - Streaming text while working (AI talks as it builds)
 * - Reasoning section with collapsible actions
 * - Clean conversational UI
 */
export default function ChatPanel() {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [reasoningExpanded, setReasoningExpanded] = useState(true)
  const [currentAction, setCurrentAction] = useState<string | null>(null)
  const [selectedAgent] = useState<AgentId>('architect')
  
  const { 
    chatCollapsed, 
    toggleChat, 
    setAgentStatus,
    addFile,
    setIsGenerating,
    prompt,
    files,
  } = useBuilderStore()

  // Parse SSE stream with streaming text support
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
      
      const lines = buffer.split('\n\n')
      buffer = lines.pop() || ''

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
                
                // Update current action for reasoning section
                const actionName = getActionDisplayName(tc.name, tc.args)
                setCurrentAction(actionName)
                setAgentStatus(agentId, 'working', actionName)
                
                setMessages(prev => prev.map(m => 
                  m.id === assistantId 
                    ? { ...m, toolCalls: Array.from(toolCalls.values()) }
                    : m
                ))
                
                // Execute tool
                if (ExecutorService.isToolAvailable(tc.name)) {
                  ExecutorService.executeTool(tc.name, tc.args).then((result) => {
                    const existingTc = toolCalls.get(tc.id)
                    if (existingTc) {
                      existingTc.status = result.success ? 'complete' : 'error'
                      existingTc.result = {
                        success: result.success,
                        output: result.output,
                        duration: result.duration,
                      }
                      toolCalls.set(existingTc.id, existingTc)
                      
                      // Add file to sidebar
                      if (tc.name === 'createFile' && result.success && tc.args.path && tc.args.content) {
                        const path = tc.args.path as string
                        addFile({
                          path,
                          name: path.split('/').pop() || 'untitled',
                          content: tc.args.content as string,
                          language: path.split('.').pop() || 'text',
                        })
                      }
                      
                      setMessages(prev => prev.map(m => 
                        m.id === assistantId 
                          ? { ...m, toolCalls: Array.from(toolCalls.values()) }
                          : m
                      ))
                    }
                  }).catch((error) => {
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

            case 'error':
              if (chunk.error) {
                setMessages(prev => prev.map(m => 
                  m.id === assistantId 
                    ? { ...m, error: chunk.error, content: fullContent || '' }
                    : m
                ))
              }
              break
          }
        } catch {
          // Ignore parse errors
        }
      }
    }

    setCurrentAction(null)
    return { content: fullContent, toolCalls: Array.from(toolCalls.values()) }
  }, [setAgentStatus, addFile])

  const handleSubmitMessage = useCallback(async (messageContent: string, agentId: AgentId) => {
    if (!messageContent.trim() || isLoading) return

    setIsLoading(true)
    setIsGenerating(true)
    setAgentStatus(agentId, 'thinking', 'Thinking...')
    setCurrentAction('Thinking...')

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
          messages: [...messages, { role: 'user', content: messageContent }]
            .filter(m => m.content && m.content.trim().length > 0)
            .map(m => ({ role: m.role, content: m.content })),
          agentId,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      await parseSSEStream(reader, assistantId, agentId)
      setAgentStatus(agentId, 'complete', 'Done')
    } catch (error) {
      setAgentStatus(agentId, 'error', 'Failed')
      setMessages(prev => prev.map(m => 
        m.id === assistantId 
          ? { ...m, content: '', error: {
              type: 'network',
              message: error instanceof Error ? error.message : 'Unknown error',
              retryable: true,
            }}
          : m
      ))
    } finally {
      setIsLoading(false)
      setIsGenerating(false)
      setCurrentAction(null)
    }
  }, [isLoading, messages, setIsGenerating, setAgentStatus, parseSSEStream])

  // Auto-submit initial prompt
  useEffect(() => {
    if (prompt && messages.length === 0) {
      setMessages([{ id: 'init', role: 'user', content: prompt }])
      handleSubmitMessage(prompt, selectedAgent)
    }
  }, [prompt]) // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-fix errors via Nervous System
  useEffect(() => {
    const handlePain = (e: CustomEvent<PainSignal>) => {
      const signal = e.detail
      if (signal.severity !== 'critical') return
      
      const lastAutoFix = (window as unknown as { __lastAutoFix?: number }).__lastAutoFix || 0
      if (Date.now() - lastAutoFix < 5000) return
      (window as unknown as { __lastAutoFix: number }).__lastAutoFix = Date.now()
      
      const errorMessage = NervousSystem.formatForAI(signal)
      setMessages(prev => [...prev, { id: `pain-${signal.id}`, role: 'user', content: errorMessage }])
      setAgentStatus(selectedAgent, 'working', 'Auto-fixing...')
      handleSubmitMessage(errorMessage, selectedAgent)
    }

    window.addEventListener('torbit-pain-signal', handlePain as EventListener)
    return () => window.removeEventListener('torbit-pain-signal', handlePain as EventListener)
  }, [selectedAgent, handleSubmitMessage, setAgentStatus])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return
    
    setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'user', content: input }])
    handleSubmitMessage(input, selectedAgent)
    setInput('')
  }

  // Helper: Get display name for action
  function getActionDisplayName(toolName: string, args: Record<string, unknown>): string {
    if (toolName === 'createFile' && args.path) {
      const path = args.path as string
      return path.split('/').pop() || path
    }
    if (toolName === 'think') return 'Thinking...'
    if (toolName === 'verifyDependencyGraph') return 'verify Dependency Graph'
    if (toolName === 'executeCommand') return args.command as string || 'Running command'
    return toolName.replace(/([A-Z])/g, ' $1').trim()
  }

  return (
    <motion.div
      className="h-full bg-[#0a0a0a] border-l border-[#1a1a1a] flex flex-col"
      animate={{ width: chatCollapsed ? 48 : 420 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Header */}
      <div className="h-12 border-b border-[#1a1a1a] flex items-center justify-between px-3 shrink-0">
        <AnimatePresence mode="wait">
          {!chatCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2"
            >
              <div className={`w-1.5 h-1.5 rounded-full ${isLoading ? 'bg-emerald-400 animate-pulse' : 'bg-emerald-400'}`} />
              <span className="text-[12px] font-medium text-[#fafafa]">
                {isLoading ? 'Working...' : 'Ready'}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
        
        <button
          onClick={toggleChat}
          className="w-7 h-7 flex items-center justify-center text-[#525252] hover:text-[#a1a1a1] hover:bg-[#1a1a1a] rounded-md transition-all"
        >
          <svg 
            className={`w-3.5 h-3.5 transition-transform ${chatCollapsed ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
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
            className="flex-1 overflow-y-auto custom-scrollbar"
          >
            {messages.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="px-4 py-2">
                {/* Reasoning section - v0 style */}
                {isLoading && (
                  <motion.div 
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4"
                  >
                    <button
                      onClick={() => setReasoningExpanded(!reasoningExpanded)}
                      className="flex items-center gap-2 text-[11px] text-[#737373] hover:text-[#a1a1a1] transition-colors"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                      </svg>
                      <span>Reasoning</span>
                      <svg className={`w-3 h-3 transition-transform ${reasoningExpanded ? '' : '-rotate-90'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                      </svg>
                      {currentAction && (
                        <>
                          <span className="text-[#404040] mx-1">·</span>
                          <span className="text-[#525252] flex items-center gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                            {currentAction}
                          </span>
                        </>
                      )}
                    </button>
                    
                    <AnimatePresence>
                      {reasoningExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-2 space-y-1">
                            {/* Show recent tool calls as reasoning steps */}
                            {messages
                              .filter(m => m.role === 'assistant')
                              .flatMap(m => m.toolCalls || [])
                              .slice(-5)
                              .map((tc, i) => (
                                <div key={tc.id} className="flex items-center gap-2 text-[11px]">
                                  <span className={`w-1 h-1 rounded-full ${
                                    tc.status === 'complete' ? 'bg-emerald-400' :
                                    tc.status === 'error' ? 'bg-red-400' : 'bg-blue-400 animate-pulse'
                                  }`} />
                                  <span className="text-[#525252]">
                                    {getActionDisplayName(tc.name, tc.args)}
                                  </span>
                                </div>
                              ))
                            }
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}

                {/* Messages */}
                {messages.map((message, i) => (
                  <MessageBubble 
                    key={message.id}
                    message={message}
                    isLast={i === messages.length - 1}
                    isLoading={isLoading}
                    index={i}
                  />
                ))}
                
                {/* Files count indicator */}
                {files.length > 0 && !isLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center justify-center py-4 text-[11px] text-[#404040]"
                  >
                    {files.length} files ready
                  </motion.div>
                )}
                
                <div ref={messagesEndRef} className="h-4" />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <AnimatePresence mode="wait">
        {!chatCollapsed && (
          <ChatInput
            input={input}
            isLoading={isLoading}
            onInputChange={setInput}
            onSubmit={handleSubmit}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/**
 * Empty state with premium styling
 */
function EmptyState() {
  return (
    <div className="h-full flex items-center justify-center p-6">
      <div className="text-center max-w-[280px]">
        <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border border-[#262626] flex items-center justify-center shadow-lg">
          <svg className="w-5 h-5 text-[#525252]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
        </div>
        <h3 className="text-[14px] font-medium text-[#fafafa] mb-1.5">
          What do you want to build?
        </h3>
        <p className="text-[12px] text-[#525252] leading-relaxed">
          Describe your idea and watch it come to life.
        </p>
      </div>
    </div>
  )
}
