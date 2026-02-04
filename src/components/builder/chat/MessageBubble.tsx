'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { ToolCallDisplay } from './ToolCallDisplay'
import { TaskCard } from './TaskCard'
import { AGENT_ICONS, AGENT_COLORS, type Message } from './types'

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
  
  // Extract file paths from code blocks (format: ```lang\n// path\n...```)
  const codeBlockRegex = /```\w*\n\/\/ ([\w\/.@-]+)\n[\s\S]*?```/g
  let match
  while ((match = codeBlockRegex.exec(content)) !== null) {
    files.push({ path: match[1], status: 'complete' })
  }
  
  // Remove code blocks from message to get clean text
  let cleanMessage = content.replace(/```[\s\S]*?```/g, '').trim()
  
  // If only code was returned, provide a friendly message
  if (!cleanMessage && files.length > 0) {
    cleanMessage = `Created ${files.length} file${files.length > 1 ? 's' : ''}`
  }
  
  // Clean up extra whitespace
  cleanMessage = cleanMessage.replace(/\n{3,}/g, '\n\n').trim()
  
  return { cleanMessage, files }
}

/**
 * MessageBubble - Individual chat message with tool calls and error handling
 * Shows clean status messages, not raw code
 */
export function MessageBubble({ message, isLast, isLoading, index }: MessageBubbleProps) {
  // Parse content to extract files and clean message
  const { cleanMessage, files } = useMemo(() => {
    if (message.role === 'user' || !message.content) {
      return { cleanMessage: message.content || '', files: [] }
    }
    return parseContent(message.content)
  }, [message.content, message.role])
  if (message.role === 'user') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.02 }}
        className="flex justify-end"
      >
        <div className="max-w-[85%] bg-blue-500/10 border border-blue-500/20 rounded-2xl rounded-br-md px-4 py-3">
          <p className="text-neutral-100 text-sm whitespace-pre-wrap">{message.content}</p>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02 }}
      className="flex gap-3"
    >
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
          {isLoading && isLast && !message.content && (
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
          {/* Token usage display */}
          {message.usage && (
            <span className="text-neutral-500 text-xs ml-auto">
              {message.usage.inputTokens + message.usage.outputTokens} tokens · ${message.usage.estimatedCost.toFixed(4)}
            </span>
          )}
        </div>
        
        {/* Tool calls - show above text response */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="mb-2">
            {message.toolCalls.map(tc => (
              <ToolCallDisplay key={tc.id} toolCall={tc} />
            ))}
          </div>
        )}
        
        {/* File creation progress - TaskCard instead of raw code */}
        {files.length > 0 && (
          <div className="mb-2">
            <TaskCard 
              tasks={files} 
              isComplete={!isLoading || !isLast}
            />
          </div>
        )}
        
        {/* Error display with type badge */}
        {message.error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl rounded-tl-md px-4 py-3 mb-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs px-2 py-0.5 bg-red-500/20 rounded text-red-400 uppercase">
                {message.error.type}
              </span>
              {message.error.retryable && (
                <span className="text-xs text-white/40">Retryable</span>
              )}
            </div>
            <p className="text-sm text-red-400">{message.error.message}</p>
          </div>
        )}
        
        {/* Retrying indicator */}
        {message.retrying && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl rounded-tl-md px-4 py-3 mb-2 flex items-center gap-2">
            <motion.div
              className="w-3 h-3 border-2 border-yellow-400 border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
            <p className="text-sm text-yellow-400">{message.content}</p>
          </div>
        )}
        
        {/* Clean text response - no code blocks shown */}
        {(cleanMessage && !message.error && !message.retrying) && (
          <div className="bg-neutral-800/50 border border-neutral-700/50 rounded-2xl rounded-tl-md px-4 py-3">
            <p className="text-sm whitespace-pre-wrap text-neutral-200">
              {cleanMessage}
            </p>
          </div>
        )}
        
        {/* Thinking state */}
        {!message.content && !message.error && !message.retrying && !message.toolCalls?.length && (
          <div className="bg-neutral-800/50 border border-neutral-700/50 rounded-2xl rounded-tl-md px-4 py-3">
            <p className="text-sm text-neutral-400">Thinking...</p>
          </div>
        )}
      </div>
    </motion.div>
  )
}
