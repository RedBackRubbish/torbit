'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { ToolCallDisplay } from './ToolCallDisplay'
import { TaskCard } from './TaskCard'
import type { Message } from './types'

interface MessageBubbleProps {
  message: Message
  isLast: boolean
  isLoading: boolean
  index: number
}

/**
 * Parses content to extract files and clean message
 */
function parseContent(content: string): {
  cleanMessage: string
  files: { path: string; status: 'complete' }[]
} {
  const files: { path: string; status: 'complete' }[] = []
  
  // Extract file paths from code blocks
  const codeBlockRegex = /```\w*\n\/\/ ([\w\/.@-]+)\n[\s\S]*?```/g
  let match
  while ((match = codeBlockRegex.exec(content)) !== null) {
    files.push({ path: match[1], status: 'complete' })
  }
  
  // Remove code blocks from message
  let cleanMessage = content.replace(/```[\s\S]*?```/g, '').trim()
  
  if (!cleanMessage && files.length > 0) {
    cleanMessage = `Created ${files.length} file${files.length > 1 ? 's' : ''}`
  }
  
  cleanMessage = cleanMessage.replace(/\n{3,}/g, '\n\n').trim()
  
  return { cleanMessage, files }
}

/**
 * MessageBubble - Clean, v0-inspired message display
 */
export function MessageBubble({ message, isLast, isLoading, index }: MessageBubbleProps) {
  const { cleanMessage, files } = useMemo(() => {
    if (message.role === 'user' || !message.content) {
      return { cleanMessage: message.content || '', files: [] }
    }
    return parseContent(message.content)
  }, [message.content, message.role])

  // User message
  if (message.role === 'user') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: index * 0.02 }}
        className="py-4"
      >
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shrink-0">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <p className="text-[14px] text-[#fafafa] leading-relaxed whitespace-pre-wrap">
              {message.content}
            </p>
          </div>
        </div>
      </motion.div>
    )
  }

  // Assistant message
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.02 }}
      className="py-4 border-t border-[#1f1f1f] first:border-t-0"
    >
      <div className="flex items-start gap-3">
        {/* AI Avatar */}
        <div className="w-7 h-7 rounded-full bg-[#1a1a1a] border border-[#262626] flex items-center justify-center shrink-0">
          <svg className="w-3.5 h-3.5 text-[#a1a1a1]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          {/* Thinking indicator */}
          {isLoading && isLast && !message.content && !message.toolCalls?.length && (
            <div className="flex items-center gap-2 py-1">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#525252] typing-dot" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#525252] typing-dot" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#525252] typing-dot" />
              </div>
              <span className="text-[12px] text-[#525252]">Thinking...</span>
            </div>
          )}

          {/* Tool calls */}
          {message.toolCalls && message.toolCalls.length > 0 && (
            <div className="space-y-2 mb-3">
              {message.toolCalls.map(tc => (
                <ToolCallDisplay key={tc.id} toolCall={tc} />
              ))}
            </div>
          )}
          
          {/* File creation */}
          {files.length > 0 && (
            <div className="mb-3">
              <TaskCard 
                tasks={files} 
                isComplete={!isLoading || !isLast}
              />
            </div>
          )}
          
          {/* Error display */}
          {message.error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg mb-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] px-1.5 py-0.5 bg-red-500/20 rounded text-red-400 font-medium uppercase tracking-wide">
                  {message.error.type}
                </span>
                {message.error.retryable && (
                  <span className="text-[11px] text-[#525252]">Retryable</span>
                )}
              </div>
              <p className="text-[13px] text-red-400">{message.error.message}</p>
            </div>
          )}
          
          {/* Retrying indicator */}
          {message.retrying && (
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg mb-3 flex items-center gap-2">
              <motion.div
                className="w-3.5 h-3.5 border-2 border-yellow-400 border-t-transparent rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
              <p className="text-[13px] text-yellow-400">{message.content}</p>
            </div>
          )}
          
          {/* Text response */}
          {(cleanMessage && !message.error && !message.retrying) && (
            <div className="pt-0.5">
              <p className="text-[14px] text-[#e5e5e5] leading-relaxed whitespace-pre-wrap">
                {cleanMessage}
              </p>
            </div>
          )}

          {/* Token usage */}
          {message.usage && (
            <div className="mt-3 pt-3 border-t border-[#1f1f1f]">
              <span className="text-[11px] text-[#525252]">
                {(message.usage.inputTokens + message.usage.outputTokens).toLocaleString()} tokens
                <span className="mx-1.5">·</span>
                ${message.usage.estimatedCost.toFixed(4)}
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
