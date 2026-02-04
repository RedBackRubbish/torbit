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
 * ChatPanel - Emergent-style chat interface
 */
export default function ChatPanel() {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [currentTask, setCurrentTask] = useState<string | null>(null)
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

  // Parse SSE stream
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
                
                const taskName = getTaskName(tc.name, tc.args)
                setCurrentTask(taskName)
                setAgentStatus(agentId, 'working', taskName)
                
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
                      existingTc.result = { success: result.success, output: result.output, duration: result.duration }
                      toolCalls.set(existingTc.id, existingTc)
                      
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
                      existingTc.result = { success: false, output: error instanceof Error ? error.message : 'Unknown error', duration: 0 }
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

    setCurrentTask(null)
    return { content: fullContent, toolCalls: Array.from(toolCalls.values()) }
  }, [setAgentStatus, addFile])

  const handleSubmitMessage = useCallback(async (messageContent: string, agentId: AgentId) => {
    if (!messageContent.trim() || isLoading) return

    setIsLoading(true)
    setIsGenerating(true)
    setAgentStatus(agentId, 'thinking', 'Thinking...')
    setCurrentTask('Thinking...')

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

      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`)

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      await parseSSEStream(reader, assistantId, agentId)
      setAgentStatus(agentId, 'complete', 'Done')
    } catch (error) {
      setAgentStatus(agentId, 'error', 'Failed')
      setMessages(prev => prev.map(m => 
        m.id === assistantId 
          ? { ...m, content: '', error: { type: 'network', message: error instanceof Error ? error.message : 'Unknown error', retryable: true }}
          : m
      ))
    } finally {
      setIsLoading(false)
      setIsGenerating(false)
      setCurrentTask(null)
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

  // Auto-fix errors
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

  function getTaskName(toolName: string, args: Record<string, unknown>): string {
    if (toolName === 'createFile' && args.path) {
      return (args.path as string).split('/').pop() || 'file'
    }
    if (toolName === 'think') return 'Reasoning'
    if (toolName === 'verifyDependencyGraph') return 'verify Dependency Graph'
    return toolName.replace(/([A-Z])/g, ' $1').trim()
  }

  return (
    <motion.div
      className="h-full bg-[#0a0a0a] border-r border-[#1a1a1a] flex flex-col"
      animate={{ width: chatCollapsed ? 48 : 440 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Header - Minimal */}
      <div className="h-11 border-b border-[#1a1a1a] flex items-center justify-between px-4 shrink-0">
        <AnimatePresence mode="wait">
          {!chatCollapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-[13px] font-medium text-[#fafafa]"
            >
              Chat
            </motion.span>
          )}
        </AnimatePresence>
        
        <button
          onClick={toggleChat}
          className="w-6 h-6 flex items-center justify-center text-[#525252] hover:text-[#a1a1a1] hover:bg-[#141414] rounded transition-all"
        >
          <svg 
            className={`w-3.5 h-3.5 transition-transform ${chatCollapsed ? '' : 'rotate-180'}`}
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
              <EmptyState onSelectTemplate={(prompt) => {
                setInput(prompt)
              }} />
            ) : (
              <div className="p-4 space-y-0">
                {messages.map((message, i) => (
                  <MessageBubble 
                    key={message.id}
                    message={message}
                    isLast={i === messages.length - 1}
                    isLoading={isLoading}
                    index={i}
                  />
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Agent Status Bar - Emergent style */}
      <AnimatePresence mode="wait">
        {!chatCollapsed && isLoading && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 py-2.5 border-t border-[#1a1a1a] bg-[#0c0c0c]"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[12px] text-[#737373]">
                Agent is running...
              </span>
              {currentTask && currentTask !== 'Thinking...' && (
                <span className="text-[11px] text-[#525252] font-mono ml-auto">
                  {currentTask}
                </span>
              )}
            </div>
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
      
      {/* Bottom Action Bar - Emergent style */}
      <AnimatePresence mode="wait">
        {!chatCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-11 border-t border-[#1a1a1a] flex items-center justify-between px-3 bg-[#0a0a0a] shrink-0"
          >
            {/* Left: Attachment */}
            <button className="w-7 h-7 flex items-center justify-center text-[#525252] hover:text-[#a1a1a1] hover:bg-[#141414] rounded-lg transition-all">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
              </svg>
            </button>
            
            {/* Center: Actions */}
            <div className="flex items-center gap-1">
              <button className="h-7 px-2.5 flex items-center gap-1.5 text-[11px] text-[#525252] hover:text-[#a1a1a1] hover:bg-[#141414] rounded-lg transition-all">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15m0-3l-3-3m0 0l-3 3m3-3v11.25" />
                </svg>
                Save to GitHub
              </button>
              
              <button className="h-7 px-2.5 flex items-center gap-1.5 text-[11px] text-[#525252] hover:text-[#a1a1a1] hover:bg-[#141414] rounded-lg transition-all">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
                </svg>
                Fork
              </button>
              
              {/* Ultra toggle */}
              <button className="h-7 px-2.5 flex items-center gap-1.5 text-[11px] text-[#525252] hover:text-[#a1a1a1] hover:bg-[#141414] rounded-lg transition-all">
                <span className="w-3 h-3 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 opacity-50" />
                Ultra
              </button>
            </div>
            
            {/* Right: Mic / Stop */}
            <div className="flex items-center gap-1">
              {isLoading ? (
                <button 
                  onClick={() => setIsLoading(false)}
                  className="w-7 h-7 flex items-center justify-center text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="6" width="12" height="12" rx="1" />
                  </svg>
                </button>
              ) : (
                <button className="w-7 h-7 flex items-center justify-center text-[#525252] hover:text-[#a1a1a1] hover:bg-[#141414] rounded-lg transition-all">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                  </svg>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

const STARTER_TEMPLATES = [
  { 
    label: 'Dashboard', 
    prompt: 'Build a modern analytics dashboard with charts, stats cards, and a sidebar navigation',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    )
  },
  { 
    label: 'Landing Page', 
    prompt: 'Create a beautiful SaaS landing page with hero, features, pricing, and footer sections',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
      </svg>
    )
  },
  { 
    label: 'E-commerce', 
    prompt: 'Build a product catalog page with filters, search, and a shopping cart',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
      </svg>
    )
  },
  { 
    label: 'Blog', 
    prompt: 'Create a minimal blog with article cards, tags, and a featured post section',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
      </svg>
    )
  },
]

function EmptyState({ onSelectTemplate }: { onSelectTemplate?: (prompt: string) => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center p-6">
      <div className="text-center max-w-[340px]">
        {/* Logo/Icon - Emergent style */}
        <div className="w-10 h-10 mx-auto mb-4 rounded-xl bg-[#111] border border-[#1f1f1f] flex items-center justify-center">
          <svg className="w-5 h-5 text-[#404040]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
        </div>
        
        <h3 className="text-[14px] font-medium text-[#e5e5e5] mb-1">What do you want to build?</h3>
        <p className="text-[12px] text-[#525252] mb-5">
          Describe your idea or pick a template
        </p>
        
        {/* Template Grid - Emergent style */}
        <div className="grid grid-cols-2 gap-2">
          {STARTER_TEMPLATES.map((template) => (
            <button
              key={template.label}
              onClick={() => onSelectTemplate?.(template.prompt)}
              className="flex items-center gap-2 p-2.5 rounded-lg bg-[#0f0f0f] border border-[#1a1a1a] hover:border-[#2a2a2a] hover:bg-[#111] transition-all text-left group"
            >
              <div className="w-7 h-7 rounded-lg bg-[#141414] border border-[#1f1f1f] flex items-center justify-center text-[#404040] group-hover:text-[#666] group-hover:border-[#2a2a2a] transition-all">
                {template.icon}
              </div>
              <span className="text-[11px] font-medium text-[#737373] group-hover:text-[#a1a1a1] transition-colors">
                {template.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
