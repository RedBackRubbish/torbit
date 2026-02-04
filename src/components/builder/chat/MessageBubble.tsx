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
      <div className="space-y-2">
        {/* Other ops shown inline */}
        {otherOps.length > 0 && (
          <div className="flex flex-wrap gap-x-2.5 gap-y-1">
            {otherOps.map(tc => (
              <ToolCallDisplay key={tc.id} toolCall={tc} />
            ))}
          </div>
        )}
        
        {/* Grouped file summary */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-[11px] group"
        >
          <span className={`w-1.5 h-1.5 rounded-full ${
            allComplete ? 'bg-[#c0c0c0]' : 'bg-[#808080] animate-pulse'
          }`} />
          <span className="text-[#666] group-hover:text-[#999] transition-colors">
            {allComplete ? 'Created' : 'Creating'} {totalFiles} files
          </span>
          <svg 
            className={`w-2.5 h-2.5 text-[#404040] transition-transform ${expanded ? 'rotate-180' : ''}`}
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
              <div className="pl-3 border-l border-[#1a1a1a] space-y-0.5 py-1">
                {fileOps.map(tc => {
                  const path = (tc.args.path || tc.args.filePath || '') as string
                  const fileName = path.split('/').pop() || ''
                  return (
                    <div key={tc.id} className="flex items-center gap-2 text-[10px]">
                      <span className={`w-1 h-1 rounded-full ${
                        tc.status === 'complete' ? 'bg-[#c0c0c0]' :
                        tc.status === 'running' ? 'bg-[#808080]' : 'bg-red-400'
                      }`} />
                      <span className="text-[#404040] font-mono">{fileName}</span>
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
    <div className="flex flex-wrap gap-x-2.5 gap-y-1">
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
 * MessageBubble - Emergent-style clean message display
 */
export function MessageBubble({ message, isLast, isLoading }: MessageBubbleProps) {
  const displayContent = useMemo(() => {
    if (message.role === 'user') return message.content || ''
    return stripAllCode(message.content || '')
  }, [message.content, message.role])

  // User message - Emergent style: bordered box
  if (message.role === 'user') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="py-3"
      >
        <div className="p-3.5 rounded-xl bg-[#0f0f0f] border border-[#1f1f1f] hover:border-[#2a2a2a] transition-colors">
          <p className="text-[14px] text-[#e5e5e5] leading-relaxed whitespace-pre-wrap">
            {message.content}
          </p>
        </div>
      </motion.div>
    )
  }

  // Assistant message - Emergent style: clean without avatar
  const hasContent = displayContent || message.toolCalls?.length
  const showTyping = isLoading && isLast && !hasContent

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="py-3"
    >
      <div className="space-y-3">
        {/* Typing indicator */}
        {showTyping && (
          <div className="flex items-center gap-2.5 text-[13px] text-[#666]">
            <motion.div
              className="w-3.5 h-3.5 rounded-full border-2 border-[#333] border-t-[#666]"
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
            />
            <span>Processing next step...</span>
          </div>
        )}

        {/* Error state */}
        {message.error && (
          <div className="flex items-start gap-2.5 p-3 bg-red-500/5 border border-red-500/10 rounded-lg">
            <svg className="w-4 h-4 text-red-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <p className="text-[13px] text-red-400">{message.error.message}</p>
          </div>
        )}

        {/* Tool calls - grouped when many, inline when few */}
        {message.toolCalls && message.toolCalls.length > 0 && !message.error && (
          <ToolCallsGroup toolCalls={message.toolCalls} />
        )}
        
        {/* Text content */}
        {displayContent && !message.error && (
          <div className="text-[14px] text-[#b3b3b3] leading-[1.7]">
            <MarkdownRenderer content={displayContent} />
          </div>
        )}

        {/* Token usage - very subtle */}
        {message.usage && !isLoading && (
          <div className="pt-2 text-[10px] text-[#333]">
            {(message.usage.inputTokens + message.usage.outputTokens).toLocaleString()} tokens
          </div>
        )}
      </div>
    </motion.div>
  )
}
