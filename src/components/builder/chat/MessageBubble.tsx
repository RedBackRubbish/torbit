'use client'

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ToolCallDisplay } from './ToolCallDisplay'
import { MarkdownRenderer } from './MarkdownRenderer'
import type { Message } from './types'

interface MessageBubbleProps {
  message: Message
  isLast: boolean
  isLoading: boolean
  index: number
}

interface ParsedFile {
  path: string
  language: string
  content: string
}

/**
 * Extract code blocks that represent files from AI response
 */
function extractFiles(content: string): { cleanContent: string; files: ParsedFile[] } {
  const files: ParsedFile[] = []
  
  // Match code blocks with filepath comments: ```lang\n// path/to/file.ext
  const fileBlockRegex = /```(\w+)?\n\/\/\s*([\w\/.@_-]+)\n([\s\S]*?)```/g
  
  let cleanContent = content
  let match
  
  while ((match = fileBlockRegex.exec(content)) !== null) {
    files.push({
      language: match[1] || 'text',
      path: match[2],
      content: match[3].trim(),
    })
  }
  
  // Remove file blocks from content
  cleanContent = content.replace(fileBlockRegex, '').trim()
  
  // Clean up excessive newlines
  cleanContent = cleanContent.replace(/\n{3,}/g, '\n\n')
  
  return { cleanContent, files }
}

/**
 * Get file icon based on extension
 */
function getFileIcon(path: string) {
  const ext = path.split('.').pop()?.toLowerCase()
  
  const icons: Record<string, { color: string; label: string }> = {
    ts: { color: 'text-blue-400', label: 'TS' },
    tsx: { color: 'text-blue-400', label: 'TSX' },
    js: { color: 'text-yellow-400', label: 'JS' },
    jsx: { color: 'text-yellow-400', label: 'JSX' },
    css: { color: 'text-pink-400', label: 'CSS' },
    json: { color: 'text-yellow-500', label: 'JSON' },
    md: { color: 'text-gray-400', label: 'MD' },
    html: { color: 'text-orange-400', label: 'HTML' },
    sql: { color: 'text-emerald-400', label: 'SQL' },
    prisma: { color: 'text-emerald-400', label: 'PRISMA' },
  }
  
  return icons[ext || ''] || { color: 'text-gray-400', label: ext?.toUpperCase() || 'FILE' }
}

/**
 * FileCard - Premium file creation display
 */
function FileCard({ file, index }: { file: ParsedFile; index: number }) {
  const [expanded, setExpanded] = useState(false)
  const icon = getFileIcon(file.path)
  const fileName = file.path.split('/').pop()
  const filePath = file.path.split('/').slice(0, -1).join('/')
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="border border-[#262626] rounded-lg overflow-hidden bg-[#0a0a0a]"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-[#141414] transition-colors"
      >
        {/* File type badge */}
        <div className={`w-8 h-8 rounded-md bg-[#1a1a1a] border border-[#262626] flex items-center justify-center ${icon.color}`}>
          <span className="text-[9px] font-bold tracking-tight">{icon.label}</span>
        </div>
        
        {/* File info */}
        <div className="flex-1 text-left min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-medium text-[#fafafa] truncate">
              {fileName}
            </span>
            <span className="flex items-center gap-1 text-emerald-400">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              <span className="text-[10px] font-medium">Created</span>
            </span>
          </div>
          {filePath && (
            <span className="text-[11px] text-[#525252] truncate block">
              {filePath}/
            </span>
          )}
        </div>
        
        {/* Line count */}
        <span className="text-[11px] text-[#525252]">
          {file.content.split('\n').length} lines
        </span>
        
        {/* Expand arrow */}
        <svg 
          className={`w-4 h-4 text-[#525252] transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
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
            transition={{ duration: 0.2 }}
            className="border-t border-[#1f1f1f]"
          >
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  navigator.clipboard.writeText(file.content)
                }}
                className="absolute top-2 right-2 px-2 py-1 text-[10px] text-[#525252] hover:text-[#a1a1a1] bg-[#141414] rounded border border-[#262626] transition-colors z-10"
              >
                Copy
              </button>
              <pre className="p-3 overflow-x-auto max-h-80">
                <code className="text-[11px] leading-relaxed text-[#a1a1a1] font-mono">
                  {file.content}
                </code>
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/**
 * Thinking indicator with animated dots
 */
function ThinkingIndicator() {
  return (
    <div className="flex items-center gap-2.5 py-2">
      <div className="flex gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-[#525252] typing-dot" />
        <span className="w-1.5 h-1.5 rounded-full bg-[#525252] typing-dot" />
        <span className="w-1.5 h-1.5 rounded-full bg-[#525252] typing-dot" />
      </div>
      <span className="text-[12px] text-[#525252]">Thinking...</span>
    </div>
  )
}

/**
 * MessageBubble - Premium v0-style message display
 */
export function MessageBubble({ message, isLast, isLoading, index }: MessageBubbleProps) {
  const { cleanContent, files } = useMemo(() => {
    if (message.role === 'user' || !message.content) {
      return { cleanContent: message.content || '', files: [] }
    }
    return extractFiles(message.content)
  }, [message.content, message.role])

  // User message
  if (message.role === 'user') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: index * 0.02 }}
        className="py-5"
      >
        <div className="flex items-start gap-3">
          {/* User avatar */}
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>
          
          <div className="flex-1 min-w-0 pt-0.5">
            <span className="text-[11px] text-[#525252] font-medium uppercase tracking-wide">You</span>
            <p className="mt-1 text-[14px] text-[#fafafa] leading-relaxed whitespace-pre-wrap">
              {message.content}
            </p>
          </div>
        </div>
      </motion.div>
    )
  }

  // Assistant message
  const hasContent = cleanContent || files.length > 0 || message.toolCalls?.length
  const showThinking = isLoading && isLast && !hasContent

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.02 }}
      className="py-5 border-t border-[#1f1f1f]/50"
    >
      <div className="flex items-start gap-3">
        {/* AI Avatar */}
        <div className="w-7 h-7 rounded-full bg-[#1a1a1a] border border-[#262626] flex items-center justify-center shrink-0">
          {isLoading && isLast ? (
            <motion.div
              className="w-3 h-3 border-2 border-[#525252] border-t-[#a1a1a1] rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
          ) : (
            <svg className="w-3.5 h-3.5 text-[#a1a1a1]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
            </svg>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <span className="text-[11px] text-[#525252] font-medium uppercase tracking-wide">TORBIT</span>
          
          <div className="mt-2 space-y-4">
            {/* Thinking indicator */}
            {showThinking && <ThinkingIndicator />}

            {/* Error state */}
            {message.error && (
              <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-lg">
                <div className="flex items-center gap-2 mb-1.5">
                  <svg className="w-3.5 h-3.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  <span className="text-[11px] font-medium text-red-400 uppercase tracking-wide">
                    {message.error.type}
                  </span>
                </div>
                <p className="text-[13px] text-red-400/80">{message.error.message}</p>
              </div>
            )}

            {/* Retrying state */}
            {message.retrying && (
              <div className="p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-lg flex items-center gap-2.5">
                <motion.div
                  className="w-3.5 h-3.5 border-2 border-yellow-400/50 border-t-yellow-400 rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
                <p className="text-[13px] text-yellow-400">{message.content}</p>
              </div>
            )}

            {/* Tool calls */}
            {message.toolCalls && message.toolCalls.length > 0 && (
              <div className="space-y-2">
                {message.toolCalls.map(tc => (
                  <ToolCallDisplay key={tc.id} toolCall={tc} />
                ))}
              </div>
            )}
            
            {/* Created files */}
            {files.length > 0 && (
              <div className="space-y-2">
                {files.map((file, i) => (
                  <FileCard key={file.path} file={file} index={i} />
                ))}
              </div>
            )}
            
            {/* Text content with markdown */}
            {cleanContent && !message.error && !message.retrying && (
              <MarkdownRenderer content={cleanContent} />
            )}

            {/* Token usage */}
            {message.usage && (
              <div className="pt-3 border-t border-[#1f1f1f]/50 flex items-center gap-3">
                <span className="text-[11px] text-[#525252]">
                  {(message.usage.inputTokens + message.usage.outputTokens).toLocaleString()} tokens
                </span>
                <span className="text-[11px] text-[#3d3d3d]">|</span>
                <span className="text-[11px] text-[#525252]">
                  ${message.usage.estimatedCost.toFixed(4)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
