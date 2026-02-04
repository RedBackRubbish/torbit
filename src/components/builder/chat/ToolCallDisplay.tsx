'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import type { ToolCall } from './types'

interface ToolCallDisplayProps {
  toolCall: ToolCall
}

/**
 * Get a clean, human-readable label for a tool action
 */
function getToolInfo(name: string, args: Record<string, unknown>): { action: string; target?: string; icon: 'file' | 'edit' | 'terminal' | 'package' | 'search' | 'think' | 'deploy' | 'folder' } {
  const path = (args.path || args.filePath || '') as string
  const fileName = path.split('/').pop() || ''
  
  switch (name) {
    case 'createFile':
      return { action: 'Created', target: fileName || 'file', icon: 'file' }
    case 'editFile':
    case 'applyPatch':
      return { action: 'Edited', target: fileName || 'file', icon: 'edit' }
    case 'readFile':
      return { action: 'Read', target: fileName || 'file', icon: 'file' }
    case 'deleteFile':
      return { action: 'Deleted', target: fileName || 'file', icon: 'file' }
    case 'listFiles':
      return { action: 'Listed', target: (args.path as string) || '.', icon: 'folder' }
    case 'runCommand':
    case 'runTerminal':
      const cmd = (args.command as string) || ''
      return { action: 'Ran', target: cmd.length > 35 ? cmd.slice(0, 35) + '...' : cmd, icon: 'terminal' }
    case 'installPackage':
      return { action: 'Installed', target: args.packageName as string, icon: 'package' }
    case 'think':
      return { action: 'Reasoning', target: undefined, icon: 'think' }
    case 'searchCode':
      return { action: 'Searched', target: (args.query as string)?.slice(0, 25), icon: 'search' }
    case 'deployPreview':
    case 'deployToProduction':
      return { action: 'Deploying', target: (args.environment as string) || 'preview', icon: 'deploy' }
    default:
      return { action: name.replace(/([A-Z])/g, ' $1').trim(), target: undefined, icon: 'file' }
  }
}

/**
 * Icon components
 */
function Icon({ type, className }: { type: string; className?: string }) {
  switch (type) {
    case 'file':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      )
    case 'edit':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
        </svg>
      )
    case 'terminal':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
        </svg>
      )
    case 'package':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
        </svg>
      )
    case 'search':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
      )
    case 'think':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
        </svg>
      )
    case 'deploy':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
        </svg>
      )
    case 'folder':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
        </svg>
      )
    default:
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
        </svg>
      )
  }
}

/**
 * ToolCallDisplay - Compact v0-style action indicator
 * 
 * Shows ONLY a small inline action card. NO code preview.
 * Code goes to Files sidebar and Code tab, not the chat.
 */
export function ToolCallDisplay({ toolCall }: ToolCallDisplayProps) {
  const [showThought, setShowThought] = useState(false)
  const { action, target, icon } = getToolInfo(toolCall.name, toolCall.args)
  
  const isThink = toolCall.name === 'think'
  const thought = isThink ? (toolCall.args.thought as string) : null

  return (
    <motion.div
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      className="inline-flex items-center gap-1.5 text-[12px]"
    >
      {/* Status dot */}
      {toolCall.status === 'running' ? (
        <motion.div
          className="w-1.5 h-1.5 rounded-full bg-blue-400"
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        />
      ) : toolCall.status === 'complete' ? (
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
      ) : (
        <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
      )}
      
      {/* Icon */}
      <Icon type={icon} className="w-3 h-3 text-[#525252]" />
      
      {/* Action text */}
      <span className="text-[#737373]">{action}</span>
      
      {/* Target (file name, command, etc) */}
      {target && (
        <span className="text-[#a1a1a1] font-medium font-mono">{target}</span>
      )}
      
      {/* Expandable thought for think tool */}
      {isThink && thought && (
        <button
          onClick={() => setShowThought(!showThought)}
          className="ml-1 text-[#525252] hover:text-[#737373] transition-colors"
        >
          <svg 
            className={`w-3 h-3 transition-transform ${showThought ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      )}
      
      {/* Thought content */}
      {isThink && showThought && thought && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="w-full mt-1.5 pl-5 text-[11px] text-[#525252] leading-relaxed"
        >
          {thought}
        </motion.div>
      )}
    </motion.div>
  )
}
