'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useBuilderStore } from '@/store/builder'

const AGENT_ICONS: Record<string, string> = {
  architect: '◆',
  frontend: '◇',
  backend: '⬡',
  database: '⬢',
  devops: '△',
  qa: '○',
}

const AGENT_COLORS: Record<string, string> = {
  architect: '#00ff41',
  frontend: '#00d4ff',
  backend: '#ff6b00',
  database: '#a855f7',
  devops: '#f43f5e',
  qa: '#eab308',
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  agentId?: string
}

/**
 * ChatPanel - Conversational interface for interacting with agents
 */
export default function ChatPanel() {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  
  const { 
    chatCollapsed, 
    toggleChat, 
    setAgentStatus,
    addFile,
    setIsGenerating,
    prompt,
    initProject,
  } = useBuilderStore()

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
      // Auto-submit the initial prompt
      handleSubmitMessage(prompt)
    }
  }, [prompt])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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

  const handleSubmitMessage = async (messageContent: string) => {
    if (!messageContent.trim() || isLoading) return

    setIsLoading(true)
    setIsGenerating(true)
    setAgentStatus('architect', 'working', 'Analyzing request...')

    // Add assistant placeholder
    const assistantId = crypto.randomUUID()
    setMessages(prev => [...prev, {
      id: assistantId,
      role: 'assistant',
      content: '',
      agentId: 'architect',
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
          agentId: 'architect',
        }),
      })

      if (!response.ok) throw new Error('Failed to get response')

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''

      while (reader) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        fullContent += chunk

        // Update the assistant message with streaming content
        setMessages(prev => prev.map(m => 
          m.id === assistantId ? { ...m, content: fullContent } : m
        ))
      }

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

      setAgentStatus('architect', 'complete', 'Analysis complete')
    } catch (error) {
      console.error('Chat error:', error)
      setAgentStatus('architect', 'error', 'Request failed')
      setMessages(prev => prev.map(m => 
        m.id === assistantId 
          ? { ...m, content: 'Sorry, there was an error processing your request. Please check your API key configuration.' }
          : m
      ))
    } finally {
      setIsLoading(false)
      setIsGenerating(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return
    
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
    }
    setMessages(prev => [...prev, userMessage])
    handleSubmitMessage(input)
    setInput('')
  }

  return (
    <motion.div
      className="h-full bg-black/60 border-l border-white/5 flex flex-col"
      animate={{ width: chatCollapsed ? 48 : 400 }}
      transition={{ duration: 0.2 }}
      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
    >
      {/* Header */}
      <div className="h-12 border-b border-white/5 flex items-center justify-between px-4">
        <AnimatePresence mode="wait">
          {!chatCollapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-white/60 text-sm font-medium"
            >
              Agent Console
            </motion.span>
          )}
        </AnimatePresence>
        
        <button
          onClick={toggleChat}
          className="w-6 h-6 flex items-center justify-center text-white/40 hover:text-white/80 transition-colors"
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
                  <p className="text-white/30 text-sm">Describe what you want to build</p>
                  <p className="text-white/20 text-xs mt-1">The agents will take it from there</p>
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
                    <div className="max-w-[85%] bg-[#00ff41]/10 border border-[#00ff41]/20 rounded-2xl rounded-br-md px-4 py-3">
                      <p className="text-white/90 text-sm whitespace-pre-wrap">{message.content}</p>
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
                      </div>
                      <div className="bg-white/5 border border-white/5 rounded-2xl rounded-tl-md px-4 py-3">
                        <p className="text-white/80 text-sm whitespace-pre-wrap">
                          {message.content || 'Thinking...'}
                        </p>
                      </div>
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
            className="p-4 border-t border-white/5"
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
                placeholder="Describe what you want to build..."
                rows={1}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12
                  text-white/90 text-sm placeholder:text-white/20 resize-none
                  focus:outline-none focus:border-[#00ff41]/30 transition-colors"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className={`absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg
                  flex items-center justify-center transition-all ${
                    input.trim() && !isLoading
                      ? 'bg-[#00ff41] text-black hover:bg-[#00ff41]/90'
                      : 'bg-white/5 text-white/20 cursor-not-allowed'
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
            
            <p className="text-white/20 text-xs mt-3 text-center">
              Press Enter to send · Shift+Enter for new line
            </p>
          </motion.form>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
