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
 * ChatPanel - Conversational interface for interacting with agents
 * With real-time tool call streaming and Reflex Arc auto-healing
 */
export default function ChatPanel() {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedAgent, _setSelectedAgent] = useState<AgentId>('architect')
  
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
      setMessages([{ id: 'init', role: 'user', content: prompt }])
      handleSubmitMessage(prompt, selectedAgent)
    }
  }, [prompt]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ========================================================================
  // REFLEX ARC: Listen for pain signals and auto-append to chat
  // ========================================================================
  useEffect(() => {
    const handlePain = (e: CustomEvent<PainSignal>) => {
      const signal = e.detail
      
      if (signal.severity !== 'critical') return
      
      // Debounce - only one auto-fix per 5 seconds
      const lastAutoFix = (window as unknown as { __lastAutoFix?: number }).__lastAutoFix || 0
      if (Date.now() - lastAutoFix < 5000) return
      (window as unknown as { __lastAutoFix: number }).__lastAutoFix = Date.now()
      
      const errorMessage = NervousSystem.formatForAI(signal)
      const systemMessage: Message = {
        id: `pain-${signal.id}`,
        role: 'user',
        content: errorMessage,
      }
      
      setMessages(prev => [...prev, systemMessage])
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
              <MessageBubble 
                key={message.id}
                message={message}
                isLast={i === messages.length - 1}
                isLoading={isLoading}
                index={i}
              />
            ))}
            <div ref={messagesEndRef} />
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
