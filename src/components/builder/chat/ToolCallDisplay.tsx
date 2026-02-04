'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ToolCall } from './types'

interface ToolCallDisplayProps {
  toolCall: ToolCall
}

// Clean tool name display
function formatToolName(name: string): string {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim()
}

/**
 * ToolCallDisplay - Clean, collapsible tool execution display
 */
export function ToolCallDisplay({ toolCall }: ToolCallDisplayProps) {
  const [expanded, setExpanded] = useState(false)
  
  const statusStyles = {
    pending: {
      bg: 'bg-[#1a1a1a]',
      border: 'border-[#262626]',
      icon: 'text-[#525252]',
      text: 'text-[#737373]',
    },
    running: {
      bg: 'bg-blue-500/5',
      border: 'border-blue-500/20',
      icon: 'text-blue-400',
      text: 'text-blue-400',
    },
    complete: {
      bg: 'bg-emerald-500/5',
      border: 'border-emerald-500/20',
      icon: 'text-emerald-400',
      text: 'text-emerald-400',
    },
    error: {
      bg: 'bg-red-500/5',
      border: 'border-red-500/20',
      icon: 'text-red-400',
      text: 'text-red-400',
    },
  }[toolCall.status]

  return (
    <motion.div 
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${statusStyles.bg} border ${statusStyles.border} rounded-lg overflow-hidden`}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2.5 flex items-center gap-2.5 hover:bg-white/[0.02] transition-colors"
      >
        {/* Status Icon */}
        <div className={`w-4 h-4 flex items-center justify-center ${statusStyles.icon}`}>
          {toolCall.status === 'running' ? (
            <motion.svg 
              className="w-3.5 h-3.5" 
              viewBox="0 0 24 24"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              <circle 
                cx="12" cy="12" r="10" 
                stroke="currentColor" 
                strokeWidth="2.5" 
                fill="none"
                strokeDasharray="32"
                strokeLinecap="round"
              />
            </motion.svg>
          ) : toolCall.status === 'complete' ? (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          ) : toolCall.status === 'error' ? (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <div className="w-2 h-2 rounded-full bg-current" />
          )}
        </div>

        {/* Tool Name */}
        <span className={`text-[12px] font-medium flex-1 text-left ${statusStyles.text}`}>
          {formatToolName(toolCall.name)}
        </span>

        {/* Duration */}
        {toolCall.result && (
          <span className="text-[11px] text-[#525252]">
            {toolCall.result.duration}ms
          </span>
        )}

        {/* Expand Arrow */}
        <svg 
          className={`w-3.5 h-3.5 text-[#525252] transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
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
            <div className="p-3 space-y-3">
              {/* Arguments */}
              <div>
                <span className="text-[11px] text-[#525252] font-medium uppercase tracking-wide">Args</span>
                <pre className="mt-1.5 p-2.5 bg-[#0a0a0a] rounded-md text-[11px] text-[#a1a1a1] font-mono overflow-x-auto">
                  {JSON.stringify(toolCall.args, null, 2)}
                </pre>
              </div>
              
              {/* Result */}
              {toolCall.result && (
                <div>
                  <span className="text-[11px] text-[#525252] font-medium uppercase tracking-wide">Result</span>
                  <pre className={`mt-1.5 p-2.5 bg-[#0a0a0a] rounded-md text-[11px] font-mono overflow-x-auto max-h-32 ${
                    toolCall.result.success ? 'text-emerald-400/80' : 'text-red-400/80'
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
    </motion.div>
  )
}
