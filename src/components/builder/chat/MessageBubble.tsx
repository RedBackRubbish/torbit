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
  // Remove code blocks with filepath comments (these are file creations)
  let clean = content.replace(/```(\w+)?\n\/\/\s*[\w\/.@_-]+\n[\s\S]*?```/g, '')
  
  // Remove any remaining large code blocks (over 5 lines)
  clean = clean.replace(/```[\s\S]{500,}?```/g, '')
  
  // Clean up excessive newlines
  clean = clean.replace(/\n{3,}/g, '\n\n').trim()
  
  return clean
}

/**
 * Typing indicator
 */
function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 py-1">
      <motion.span 
        className="w-1.5 h-1.5 rounded-full bg-[#525252]"
        animate={{ y: [0, -3, 0] }}
        transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
      />
      <motion.span 
        className="w-1.5 h-1.5 rounded-full bg-[#525252]"
        animate={{ y: [0, -3, 0] }}
        transition={{ duration: 0.6, repeat: Infinity, delay: 0.15 }}
      />
      <motion.span 
        className="w-1.5 h-1.5 rounded-full bg-[#525252]"
        animate={{ y: [0, -3, 0] }}
        transition={{ duration: 0.6, repeat: Infinity, delay: 0.3 }}
      />
    </div>
  )
}

/**
 * MessageBubble - Clean v0-style message display
 * 
 * Key principle: Chat is conversational. Code goes to Code panel.
 */
export function MessageBubble({ message, isLast, isLoading, index }: MessageBubbleProps) {
  // Strip code blocks from assistant messages - they belong in Files/Code panel
  const displayContent = useMemo(() => {
    if (message.role === 'user') return message.content || ''
    return stripCodeBlocks(message.content || '')
  }, [message.content, message.role])

  // User message
  if (message.role === 'user') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
        className="py-4"
      >
        <div className="flex gap-3">
          {/* Avatar */}
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shrink-0">
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
            </svg>
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0 pt-0.5">
            <p className="text-[13px] text-[#fafafa] leading-relaxed whitespace-pre-wrap">
              {message.content}
            </p>
          </div>
        </div>
      </motion.div>
    )
  }

  // Assistant message
  const hasContent = displayContent || message.toolCalls?.length
  const showTyping = isLoading && isLast && !hasContent

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className="py-4"
    >
      <div className="flex gap-3">
        {/* Avatar */}
        <div className="w-6 h-6 rounded-full bg-[#1a1a1a] border border-[#262626] flex items-center justify-center shrink-0">
          {isLoading && isLast ? (
            <motion.div
              className="w-2.5 h-2.5 border-[1.5px] border-[#525252] border-t-[#a1a1a1] rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
            />
          ) : (
            <svg className="w-3 h-3 text-[#737373]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Typing indicator */}
          {showTyping && <TypingIndicator />}

          {/* Error */}
          {message.error && (
            <div className="flex items-start gap-2 p-2.5 bg-red-500/5 border border-red-500/20 rounded-lg">
              <svg className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <p className="text-[12px] text-red-400">{message.error.message}</p>
            </div>
          )}

          {/* Retrying */}
          {message.retrying && (
            <div className="flex items-center gap-2 text-[12px] text-yellow-400">
              <motion.div
                className="w-3 h-3 border-[1.5px] border-yellow-400/50 border-t-yellow-400 rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
              />
              <span>{message.content}</span>
            </div>
          )}

          {/* Tool calls - compact inline indicators */}
          {message.toolCalls && message.toolCalls.length > 0 && (
            <div className="flex flex-wrap gap-x-3 gap-y-1.5">
              {message.toolCalls.map(tc => (
                <ToolCallDisplay key={tc.id} toolCall={tc} />
              ))}
            </div>
          )}
          
          {/* Text content */}
          {displayContent && !message.error && !message.retrying && (
            <div className="text-[13px] text-[#e5e5e5] leading-relaxed">
              <MarkdownRenderer content={displayContent} />
            </div>
          )}

          {/* Token usage - subtle */}
          {message.usage && (
            <div className="flex items-center gap-2 pt-2 text-[10px] text-[#3d3d3d]">
              <span>{(message.usage.inputTokens + message.usage.outputTokens).toLocaleString()} tokens</span>
              <span>·</span>
              <span>${message.usage.estimatedCost.toFixed(4)}</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
