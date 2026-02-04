'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'

export interface ToolCall {
  id: string
  name: string
  args: Record<string, unknown>
  status: 'pending' | 'executing' | 'complete' | 'error'
  result?: {
    success: boolean
    output: string
    error?: string
    duration?: number
  }
  timestamp: number
}

// Tool metadata for display
const TOOL_META: Record<string, { icon: string; label: string; color: string }> = {
  createFile: { icon: '📄', label: 'Create File', color: '#00ff41' },
  editFile: { icon: '✏️', label: 'Edit File', color: '#00d4ff' },
  readFile: { icon: '📖', label: 'Read File', color: '#a855f7' },
  deleteFile: { icon: '🗑️', label: 'Delete File', color: '#f43f5e' },
  listFiles: { icon: '📁', label: 'List Files', color: '#eab308' },
  runCommand: { icon: '⚡', label: 'Run Command', color: '#ff6b00' },
  runTests: { icon: '🧪', label: 'Run Tests', color: '#10b981' },
  installPackage: { icon: '📦', label: 'Install Package', color: '#6366f1' },
  searchCode: { icon: '🔍', label: 'Search Code', color: '#ec4899' },
  getFileTree: { icon: '🌳', label: 'File Tree', color: '#14b8a6' },
  analyzeDependencies: { icon: '📊', label: 'Analyze Deps', color: '#f97316' },
  fetchDocumentation: { icon: '📚', label: 'Fetch Docs', color: '#8b5cf6' },
  searchWeb: { icon: '🌐', label: 'Web Search', color: '#06b6d4' },
  deployPreview: { icon: '🚀', label: 'Deploy Preview', color: '#22c55e' },
  checkDeployStatus: { icon: '📡', label: 'Check Deploy', color: '#84cc16' },
  think: { icon: '💭', label: 'Thinking', color: '#64748b' },
  planSteps: { icon: '📋', label: 'Planning', color: '#0ea5e9' },
  delegateToAgent: { icon: '🤝', label: 'Delegate', color: '#d946ef' },
}

interface ToolCallDisplayProps {
  toolCall: ToolCall
  compact?: boolean
}

/**
 * ToolCallDisplay - Shows a single tool call with its status and result
 */
export function ToolCallDisplay({ toolCall, compact = false }: ToolCallDisplayProps) {
  const [expanded, setExpanded] = useState(!compact)
  
  const meta = TOOL_META[toolCall.name] || { icon: '🔧', label: toolCall.name, color: '#64748b' }
  
  const statusColors = {
    pending: 'bg-yellow-500/20 border-yellow-500/30',
    executing: 'bg-blue-500/20 border-blue-500/30',
    complete: 'bg-green-500/20 border-green-500/30',
    error: 'bg-red-500/20 border-red-500/30',
  }
  
  const statusIcons = {
    pending: '⏳',
    executing: '⚙️',
    complete: '✅',
    error: '❌',
  }

  // Format arguments for display
  const formatArgs = (args: Record<string, unknown>): string => {
    const formatted = Object.entries(args)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => {
        const value = typeof v === 'string' 
          ? (v.length > 50 ? v.slice(0, 50) + '...' : v)
          : JSON.stringify(v)
        return `${k}: ${value}`
      })
      .join(', ')
    
    return formatted.length > 100 ? formatted.slice(0, 100) + '...' : formatted
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-lg border ${statusColors[toolCall.status]} overflow-hidden`}
      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2 flex items-center gap-3 hover:bg-white/5 transition-colors"
      >
        <span className="text-lg">{meta.icon}</span>
        
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <span 
              className="text-sm font-medium"
              style={{ color: meta.color }}
            >
              {meta.label}
            </span>
            <span className="text-xs text-white/40">
              {formatArgs(toolCall.args)}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {toolCall.result?.duration !== undefined && (
            <span className="text-xs text-white/30">
              {toolCall.result.duration}ms
            </span>
          )}
          
          {toolCall.status === 'executing' ? (
            <motion.div
              className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
          ) : (
            <span className="text-sm">{statusIcons[toolCall.status]}</span>
          )}
          
          <motion.svg
            className="w-4 h-4 text-white/40"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            animate={{ rotate: expanded ? 180 : 0 }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </motion.svg>
        </div>
      </button>
      
      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-white/5"
          >
            {/* Arguments */}
            <div className="px-3 py-2 bg-black/30">
              <div className="text-xs text-white/40 mb-1">Arguments</div>
              <pre className="text-xs text-white/70 overflow-x-auto">
                {JSON.stringify(toolCall.args, null, 2)}
              </pre>
            </div>
            
            {/* Result */}
            {toolCall.result && (
              <div className="px-3 py-2 bg-black/20">
                <div className="text-xs text-white/40 mb-1">Output</div>
                {toolCall.result.error ? (
                  <pre className="text-xs text-red-400 overflow-x-auto">
                    {toolCall.result.error}
                  </pre>
                ) : (
                  <pre className="text-xs text-white/70 overflow-x-auto max-h-40">
                    {toolCall.result.output}
                  </pre>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

interface ToolCallStreamProps {
  toolCalls: ToolCall[]
  className?: string
}

/**
 * ToolCallStream - Shows a stream of tool calls in real-time
 */
export function ToolCallStream({ toolCalls, className = '' }: ToolCallStreamProps) {
  if (toolCalls.length === 0) return null
  
  return (
    <div className={`space-y-2 ${className}`}>
      <AnimatePresence mode="popLayout">
        {toolCalls.map(tc => (
          <ToolCallDisplay key={tc.id} toolCall={tc} compact={toolCalls.length > 3} />
        ))}
      </AnimatePresence>
    </div>
  )
}

interface ToolCallSummaryProps {
  toolCalls: ToolCall[]
}

/**
 * ToolCallSummary - Compact summary of tool calls
 */
export function ToolCallSummary({ toolCalls }: ToolCallSummaryProps) {
  const completed = toolCalls.filter(tc => tc.status === 'complete').length
  const failed = toolCalls.filter(tc => tc.status === 'error').length
  const executing = toolCalls.filter(tc => tc.status === 'executing').length
  
  if (toolCalls.length === 0) return null
  
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="text-white/40">Tools:</span>
      {executing > 0 && (
        <span className="flex items-center gap-1 text-blue-400">
          <motion.div
            className="w-2 h-2 rounded-full bg-blue-400"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
          {executing} running
        </span>
      )}
      {completed > 0 && (
        <span className="text-green-400">✓ {completed}</span>
      )}
      {failed > 0 && (
        <span className="text-red-400">✗ {failed}</span>
      )}
    </div>
  )
}
