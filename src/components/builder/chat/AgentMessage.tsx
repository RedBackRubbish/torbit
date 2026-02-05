'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { MarkdownRenderer } from './MarkdownRenderer'
import { ActionLog } from './ActionLog'
import type { Message } from './types'

// ============================================================================
// VS CODE STYLE AGENT MESSAGE
// Clean structured output with action tracking
// ============================================================================

interface AgentMessageProps {
  message: Message
  isLast: boolean
  isLoading: boolean
}

/**
 * Strip code blocks from content for display
 * Since we create files from code blocks, don't show them in chat
 */
function stripCodeBlocks(content: string): string {
  if (!content) return ''
  // Remove code blocks
  let clean = content.replace(/```[\s\S]*?```/g, '')
  // Remove file path comments like "// src/components/Button.tsx"
  clean = clean.replace(/\/\/\s*[\w\/.@_-]+\.(tsx?|jsx?|css|json|md)\n/g, '')
  // Collapse multiple newlines
  clean = clean.replace(/\n{3,}/g, '\n\n').trim()
  return clean
}

/**
 * AgentMessage - VS Code style structured AI output
 * 
 * Shows:
 * - Brief summary/intent from the AI
 * - Action log with file operations (Read, Edit, Create, etc.)
 * - Diff indicators (+lines -lines)
 * - Status checkmarks
 */
export function AgentMessage({ message, isLast, isLoading }: AgentMessageProps) {
  const toolCalls = message.toolCalls || []
  const hasTools = toolCalls.length > 0
  const completedTools = toolCalls.filter(tc => tc.status === 'complete').length
  
  // Clean content for display (strip code blocks since files are created)
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
      {/* Agent Header - VS Code style */}
      <div className="flex items-center gap-2.5 mb-2">
        <div 
          className={`w-2 h-2 rounded-full ${
            isLoading ? 'bg-[#c0c0c0] animate-pulse' : 'bg-[#606060]'
          }`} 
          aria-hidden="true" 
        />
        <span className="text-[14px] font-medium text-[#e5e5e5]">Torbit</span>
        {isLoading && hasTools && (
          <span className="text-[11px] text-[#606060]">
            {completedTools}/{toolCalls.length}
          </span>
        )}
      </div>
      
      <div className="pl-4 border-l border-[#1a1a1a] space-y-3">
        
        {/* Main Content - Brief summary/intent */}
        {displayContent && (
          <div className="text-[13px] text-[#b3b3b3] leading-relaxed">
            <MarkdownRenderer content={displayContent} />
          </div>
        )}
        
        {/* Action Log - VS Code style with checkmarks and diffs */}
        {hasTools && (
          <ActionLog 
            toolCalls={toolCalls} 
            isLoading={isLoading && isLast}
          />
        )}
        
        {/* Typing Indicator - When no content yet */}
        {showTyping && (
          <div className="flex items-center gap-2 text-[12px] text-[#606060] py-1">
            <motion.div
              className="w-3.5 h-3.5 rounded-full border-2 border-[#333] border-t-[#606060]"
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
              aria-hidden="true"
            />
          </div>
        )}
        
        {/* Error Display */}
        {message.error && (
          <div className="flex items-start gap-2.5 p-3 bg-red-500/5 border border-red-500/10 rounded-lg">
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
        
        {/* Token usage - subtle footer */}
        {message.usage && !isLoading && (
          <div className="pt-1 text-[10px] text-[#333]">
            {(message.usage.inputTokens + message.usage.outputTokens).toLocaleString()} tokens
          </div>
        )}
      </div>
    </motion.div>
  )
}
