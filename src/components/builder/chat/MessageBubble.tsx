'use client'

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ToolCallDisplay } from './ToolCallDisplay'
import { MarkdownRenderer } from './MarkdownRenderer'
import type { Message, ToolCall } from './types'

/**
 * Groups tool calls intelligently - shows summary for many files, inline for few
 */
function ToolCallsGroup({ toolCalls }: { toolCalls: ToolCall[] }) {
  const [expanded, setExpanded] = useState(false)
  
  // Separate file operations from other tools
  const fileOps = toolCalls.filter(tc => 
    ['createFile', 'editFile', 'deleteFile'].includes(tc.name)
  )
  const otherOps = toolCalls.filter(tc => 
    !['createFile', 'editFile', 'deleteFile'].includes(tc.name)
  )
  
  const completedFiles = fileOps.filter(tc => tc.status === 'complete').length
  const totalFiles = fileOps.length
  const allComplete = completedFiles === totalFiles && totalFiles > 0

  // If 4+ files, show grouped summary
  if (fileOps.length >= 4) {
    return (
      <div className="mb-3 space-y-2">
        {/* Other ops shown inline */}
        {otherOps.length > 0 && (
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {otherOps.map(tc => (
              <ToolCallDisplay key={tc.id} toolCall={tc} />
            ))}
          </div>
        )}
        
        {/* Grouped file summary */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-[12px] group"
        >
          <span className={`w-1.5 h-1.5 rounded-full ${
            allComplete ? 'bg-emerald-400' : 'bg-blue-400 animate-pulse'
          }`} />
          <span className="text-[#737373] group-hover:text-[#a1a1a1] transition-colors">
            {allComplete ? 'Created' : 'Creating'} {totalFiles} files
          </span>
          <svg 
            className={`w-3 h-3 text-[#525252] transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor" 
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              <div className="pl-3 border-l border-[#1f1f1f] space-y-0.5 py-1">
                {fileOps.map(tc => {
                  const path = (tc.args.path || tc.args.filePath || '') as string
                  const fileName = path.split('/').pop() || ''
                  return (
                    <div key={tc.id} className="flex items-center gap-2 text-[11px]">
                      <span className={`w-1 h-1 rounded-full ${
                        tc.status === 'complete' ? 'bg-emerald-400' :
                        tc.status === 'running' ? 'bg-blue-400' : 'bg-red-400'
                      }`} />
                      <span className="text-[#525252] font-mono">{fileName}</span>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }
  
  // Otherwise show all inline
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 mb-3">
      {toolCalls.map(tc => (
        <ToolCallDisplay key={tc.id} toolCall={tc} />
      ))}
    </div>
  )
}

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
        <div className="flex items-start gap-3">
          {/* User avatar */}
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <p className="text-[13px] font-medium text-[#737373] mb-1">You</p>
            <p className="text-[14px] text-[#fafafa] leading-relaxed whitespace-pre-wrap">
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

      {/* Tool calls - grouped when many, inline when few */}
      {message.toolCalls && message.toolCalls.length > 0 && !message.error && (
        <ToolCallsGroup toolCalls={message.toolCalls} />
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
