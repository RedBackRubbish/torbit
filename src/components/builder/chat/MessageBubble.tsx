'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { ToolCallDisplay } from './ToolCallDisplay'
import { MarkdownRenderer } from './MarkdownRenderer'
import type { Message } from './types'

interface MessageBubbleProps {
  message: Message
  isLast: boolean
  isLoading: boolean
  index: number
}

/**
 * Strip code blocks from AI response - they go to Files sidebar, not chat
 */
function stripCodeBlocks(content: string): string {
  // Remove code blocks with filepath comments (file creations)
  let clean = content.replace(/```(\w+)?\n\/\/\s*[\w\/.@_-]+\n[\s\S]*?```/g, '')
  
  // Remove any remaining large code blocks (over 500 chars)
  clean = clean.replace(/```[\s\S]{500,}?```/g, '')
  
  // Clean up excessive newlines
  clean = clean.replace(/\n{3,}/g, '\n\n').trim()
  
  return clean
}

/**
 * MessageBubble - Premium v0-style message display
 */
export function MessageBubble({ message, isLast, isLoading }: MessageBubbleProps) {
  // Strip code blocks from assistant messages
  const displayContent = useMemo(() => {
    if (message.role === 'user') return message.content || ''
    return stripCodeBlocks(message.content || '')
  }, [message.content, message.role])

  // User message
  if (message.role === 'user') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="py-4 border-b border-[#1a1a1a]"
      >
        <p className="text-[14px] text-[#fafafa] leading-relaxed">
          {message.content}
        </p>
      </motion.div>
    )
  }

  // Assistant message
  const hasContent = displayContent || message.toolCalls?.length
  const showTyping = isLoading && isLast && !hasContent

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="py-4"
    >
      {/* Typing indicator */}
      {showTyping && (
        <div className="flex items-center gap-2 text-[13px] text-[#525252]">
          <motion.div
            className="w-4 h-4 rounded-full border-2 border-[#333] border-t-[#737373]"
            animate={{ rotate: 360 }}
            transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
          />
          <span>Thinking...</span>
        </div>
      )}

      {/* Error state */}
      {message.error && (
        <div className="flex items-start gap-3 p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
          <svg className="w-4 h-4 text-red-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <div>
            <p className="text-[13px] font-medium text-red-400">Something went wrong</p>
            <p className="text-[12px] text-red-400/70 mt-1">{message.error.message}</p>
          </div>
        </div>
      )}

      {/* Tool calls - inline indicators */}
      {message.toolCalls && message.toolCalls.length > 0 && !message.error && (
        <div className="flex flex-wrap gap-2 mb-3">
          {message.toolCalls.map(tc => (
            <ToolCallDisplay key={tc.id} toolCall={tc} />
          ))}
        </div>
      )}
      
      {/* Text content with premium markdown */}
      {displayContent && !message.error && (
        <div className="text-[14px] text-[#e5e5e5] leading-[1.65]">
          <MarkdownRenderer content={displayContent} />
        </div>
      )}

      {/* Token usage */}
      {message.usage && !isLoading && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#1a1a1a] text-[11px] text-[#3d3d3d]">
          <span>{(message.usage.inputTokens + message.usage.outputTokens).toLocaleString()} tokens</span>
          <span className="text-[#262626]">·</span>
          <span>${message.usage.estimatedCost.toFixed(4)}</span>
        </div>
      )}
    </motion.div>
  )
}
