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
 * Aggressively strip code from AI response
 * Code should ONLY appear in Files sidebar, NEVER in chat
 */
function stripAllCode(content: string): string {
  if (!content) return ''
  
  // Remove all code blocks (any language, any content)
  let clean = content.replace(/```[\s\S]*?```/g, '')
  
  // Remove inline file paths that look like code dumps
  clean = clean.replace(/\/\/\s*[\w\/.@_-]+\.(tsx?|jsx?|css|json|md)\n/g, '')
  
  // Clean up numbered file creation instructions (1. Create `file.tsx`:)
  clean = clean.replace(/\d+\.\s*(Create|Update|Add|Edit)\s*`[^`]+`\s*:?\s*/gi, '')
  
  // Remove "Here are the files" or "Create manually" type instructions
  clean = clean.replace(/here are the files.*?:/gi, '')
  clean = clean.replace(/create.*?manually.*?:/gi, '')
  clean = clean.replace(/copy.*?manually.*?:/gi, '')
  
  // Clean up excessive whitespace
  clean = clean.replace(/\n{3,}/g, '\n\n').trim()
  
  return clean
}

/**
 * MessageBubble - Clean v0-style message
 */
export function MessageBubble({ message, isLast, isLoading }: MessageBubbleProps) {
  const displayContent = useMemo(() => {
    if (message.role === 'user') return message.content || ''
    return stripAllCode(message.content || '')
  }, [message.content, message.role])

  // User message
  if (message.role === 'user') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="py-4 border-b border-[#1a1a1a]"
      >
        <p className="text-[14px] text-[#fafafa] leading-relaxed whitespace-pre-wrap">
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
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="py-4"
    >
      {/* Typing indicator */}
      {showTyping && (
        <div className="flex items-center gap-2 text-[13px] text-[#525252]">
          <motion.div
            className="w-4 h-4 rounded-full border-2 border-[#262626] border-t-[#525252]"
            animate={{ rotate: 360 }}
            transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
          />
        </div>
      )}

      {/* Error state */}
      {message.error && (
        <div className="flex items-start gap-2 p-3 bg-red-500/5 border border-red-500/10 rounded-lg">
          <svg className="w-4 h-4 text-red-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <div>
            <p className="text-[13px] text-red-400">{message.error.message}</p>
          </div>
        </div>
      )}

      {/* Tool calls - compact inline */}
      {message.toolCalls && message.toolCalls.length > 0 && !message.error && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 mb-3">
          {message.toolCalls.map(tc => (
            <ToolCallDisplay key={tc.id} toolCall={tc} />
          ))}
        </div>
      )}
      
      {/* Text content */}
      {displayContent && !message.error && (
        <div className="text-[14px] text-[#d4d4d4] leading-[1.6]">
          <MarkdownRenderer content={displayContent} />
        </div>
      )}

      {/* Token usage - very subtle */}
      {message.usage && !isLoading && (
        <div className="mt-3 pt-3 border-t border-[#1a1a1a] text-[11px] text-[#333]">
          {(message.usage.inputTokens + message.usage.outputTokens).toLocaleString()} tokens · ${message.usage.estimatedCost.toFixed(4)}
        </div>
      )}
    </motion.div>
  )
}
