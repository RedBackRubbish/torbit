'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { MarkdownRenderer } from './MarkdownRenderer'
import { ActionLog } from './ActionLog'
import type { Message } from './types'

// ============================================================================
// AGENT MESSAGE - Clean left-aligned response, no branding per message
// ============================================================================

interface AgentMessageProps {
  message: Message
  isLast: boolean
  isLoading: boolean
}

/**
 * Strip code blocks from content for display
 */
function stripCodeBlocks(content: string): string {
  if (!content) return ''
  let clean = content.replace(/```[\s\S]*?```/g, '')
  clean = clean.replace(/\/\/\s*[\w\/.@_-]+\.(tsx?|jsx?|css|json|md)\n/g, '')
  clean = clean.replace(/\n{3,}/g, '\n\n').trim()
  return clean
}

/**
 * AgentMessage - Clean AI response with inline action log
 */
export function AgentMessage({ message, isLast, isLoading }: AgentMessageProps) {
  const toolCalls = message.toolCalls || []
  const hasTools = toolCalls.length > 0
  
  const displayContent = useMemo(() => {
    return stripCodeBlocks(message.content || '')
  }, [message.content])
  
  const showTyping = isLoading && isLast && !displayContent && toolCalls.length === 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="py-3"
    >
      {/* Action Log - Connected-line timeline */}
      {hasTools && (
        <ActionLog 
          toolCalls={toolCalls} 
          isLoading={isLoading && isLast}
        />
      )}
      
      {/* Main Content */}
      {displayContent && (
        <div className="text-[13px] text-[#b3b3b3] leading-relaxed mt-2">
          <MarkdownRenderer content={displayContent} />
        </div>
      )}
      
      {/* Typing Indicator */}
      {showTyping && (
        <div className="flex items-center gap-2.5 pl-4 py-1">
          <motion.div
            className="w-[7px] h-[7px] rounded-full bg-[#808080]"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          />
          <span className="text-[12px] text-[#505050]">Thinking...</span>
        </div>
      )}
      
      {/* Error Display */}
      {message.error && (
        <div className="flex items-start gap-2.5 p-3 mt-2 bg-red-500/5 border border-red-500/10 rounded-lg">
          <svg 
            className="w-4 h-4 text-red-400 mt-0.5 shrink-0" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor" 
            strokeWidth={2} 
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <p className="text-[13px] text-red-400">{message.error.message}</p>
        </div>
      )}
    </motion.div>
  )
}
