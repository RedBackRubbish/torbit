'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ToolCall } from './types'

interface ToolCallDisplayProps {
  toolCall: ToolCall
}

/**
 * ToolCallDisplay - Expandable display for tool calls with args and results
 */
export function ToolCallDisplay({ toolCall }: ToolCallDisplayProps) {
  const [expanded, setExpanded] = useState(false)
  
  const statusColor = {
    pending: 'text-white/40',
    running: 'text-yellow-400',
    complete: 'text-green-400',
    error: 'text-red-400',
  }[toolCall.status]

  const statusIcon = {
    pending: '○',
    running: '◐',
    complete: '●',
    error: '✕',
  }[toolCall.status]

  return (
    <div className="my-2 bg-white/5 border border-white/10 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2 flex items-center gap-2 hover:bg-white/5 transition-colors"
      >
        <motion.span 
          className={statusColor}
          animate={toolCall.status === 'running' ? { rotate: 360 } : {}}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          {statusIcon}
        </motion.span>
        <code className="text-xs text-blue-400 flex-1 text-left truncate">
          {toolCall.name}
        </code>
        {toolCall.result && (
          <span className="text-white/40 text-xs">
            {toolCall.result.duration}ms
          </span>
        )}
        <svg 
          className={`w-3 h-3 text-white/40 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-white/10"
          >
            <div className="p-3 space-y-2 text-xs">
              <div>
                <span className="text-white/40">Arguments:</span>
                <pre className="mt-1 p-2 bg-black/50 rounded text-white/60 overflow-x-auto">
                  {JSON.stringify(toolCall.args, null, 2)}
                </pre>
              </div>
              {toolCall.result && (
                <div>
                  <span className="text-white/40">Result:</span>
                  <pre className={`mt-1 p-2 bg-black/50 rounded overflow-x-auto max-h-32 ${
                    toolCall.result.success ? 'text-green-400/80' : 'text-red-400/80'
                  }`}>
                    {toolCall.result.output.slice(0, 500)}
                    {toolCall.result.output.length > 500 && '...'}
                  </pre>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
