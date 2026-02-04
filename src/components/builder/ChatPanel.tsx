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
 * ChatPanel - Clean v0-style chat interface
 * 
 * The chat is conversational only. Code goes to Files/Code panels.
 */
export default function ChatPanel() {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedAgent] = useState<AgentId>('architect')
  
  const { 
    chatCollapsed, 
    toggleChat, 
    setAgentStatus,
    addFile,
    setIsGenerating,
    prompt,
  } = useBuilderStore()

  // Parse code blocks from AI response to add to files
  const parseCodeBlocks = useCallback((content: string) => {
    const blocks: { path: string; content: string; language: string }[] = []
    const regex = /```(\w+)?\n\/\/\s*([\w\/.@_-]+)\n([\s\S]*?)```/g
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
                setAgentStatus(agentId, 'working', tc.name)
                setMessages(prev => prev.map(m => 
                  m.id === assistantId 
                    ? { ...m, toolCalls: Array.from(toolCalls.values()) }
                    : m
                ))
                
                // Execute tool and add file if it's a createFile
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
                      
                      // Add file to sidebar if createFile was successful
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

            case 'retry':
              if (chunk.retry) {
                setAgentStatus(agentId, 'working', 'Retrying...')
                setMessages(prev => prev.map(m => 
                  m.id === assistantId 
                    ? { ...m, retrying: true, content: `Retrying (${chunk.retry!.attempt}/${chunk.retry!.maxAttempts})...` }
                    : m
                ))
              }
              break

            case 'error':
              if (chunk.error) {
                setMessages(prev => prev.map(m => 
                  m.id === assistantId 
                    ? { ...m, error: chunk.error, retrying: false, content: fullContent || '' }
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

    return { content: fullContent, toolCalls: Array.from(toolCalls.values()) }
  }, [setAgentStatus, addFile])

  const handleSubmitMessage = useCallback(async (messageContent: string, agentId: AgentId) => {
    if (!messageContent.trim() || isLoading) return

    setIsLoading(true)
    setIsGenerating(true)
    setAgentStatus(agentId, 'working', 'Thinking...')

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

      const { content: fullContent } = await parseSSEStream(reader, assistantId, agentId)

      // Parse any code blocks in text response and add as files
      const codeBlocks = parseCodeBlocks(fullContent)
      codeBlocks.forEach(block => {
        addFile({
          path: block.path,
          name: block.path.split('/').pop() || 'untitled',
          content: block.content,
          language: block.language,
        })
      })

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
    }
  }, [isLoading, messages, setIsGenerating, setAgentStatus, parseSSEStream, parseCodeBlocks, addFile])

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

  return (
    <motion.div
      className="h-full bg-[#0a0a0a] border-l border-[#1f1f1f] flex flex-col"
      animate={{ width: chatCollapsed ? 48 : 420 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Header */}
      <div className="h-12 border-b border-[#1f1f1f] flex items-center justify-between px-3 shrink-0">
        <AnimatePresence mode="wait">
          {!chatCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2"
            >
              <div className={`w-1.5 h-1.5 rounded-full ${isLoading ? 'bg-blue-400 animate-pulse' : 'bg-emerald-400'}`} />
              <span className="text-[12px] font-medium text-[#a1a1a1]">
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
              <div className="h-full flex items-center justify-center p-6">
                <div className="text-center max-w-[280px]">
                  <div className="w-10 h-10 mx-auto mb-4 rounded-xl bg-[#141414] border border-[#1f1f1f] flex items-center justify-center">
                    <svg className="w-5 h-5 text-[#525252]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                  </div>
                  <h3 className="text-[14px] font-medium text-[#fafafa] mb-1.5">
                    What do you want to build?
                  </h3>
                  <p className="text-[12px] text-[#525252] leading-relaxed">
                    Describe your idea and I'll build it.
                  </p>
                </div>
              </div>
            ) : (
              <div className="px-3">
                {messages.map((message, i) => (
                  <MessageBubble 
                    key={message.id}
                    message={message}
                    isLast={i === messages.length - 1}
                    isLoading={isLoading}
                    index={i}
                  />
                ))}
                <div ref={messagesEndRef} className="h-3" />
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
