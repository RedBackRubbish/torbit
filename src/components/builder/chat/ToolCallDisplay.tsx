'use client'

import { motion } from 'framer-motion'
import type { ToolCall } from './types'

interface ToolCallDisplayProps {
  toolCall: ToolCall
}

/**
 * Get clean label for tool action - v0 style
 */
function getLabel(name: string, args: Record<string, unknown>): { verb: string; target: string } {
  const path = (args.path || args.filePath || '') as string
  const fileName = path.split('/').pop() || ''
  
  switch (name) {
    case 'createFile':
      return { verb: 'Created', target: fileName }
    case 'editFile':
    case 'applyPatch':
      return { verb: 'Edited', target: fileName }
    case 'readFile':
      return { verb: 'Read', target: fileName }
    case 'deleteFile':
      return { verb: 'Deleted', target: fileName }
    case 'listFiles':
      return { verb: 'Listed', target: (args.path as string) || '.' }
    case 'runCommand':
    case 'runTerminal':
      const cmd = (args.command as string) || ''
      return { verb: 'Ran', target: cmd.length > 30 ? cmd.slice(0, 30) + '...' : cmd }
    case 'installPackage':
      return { verb: 'Installed', target: args.packageName as string }
    case 'think':
      return { verb: 'Reasoning', target: '' }
    case 'verifyDependencyGraph':
      return { verb: 'verify Dependency Graph', target: '' }
    default:
      return { verb: name.replace(/([A-Z])/g, ' $1').trim(), target: '' }
  }
}

/**
 * ToolCallDisplay - Emergent-style minimal indicator
 * Just shows: [dot] Created filename.tsx
 */
export function ToolCallDisplay({ toolCall }: ToolCallDisplayProps) {
  const { verb, target } = getLabel(toolCall.name, toolCall.args)

  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="inline-flex items-center gap-1.5 text-[11px]"
    >
      {/* Status dot */}
      <span className={`w-1.5 h-1.5 rounded-full ${
        toolCall.status === 'running' ? 'bg-[#808080] animate-pulse' :
        toolCall.status === 'complete' ? 'bg-[#c0c0c0]' :
        'bg-red-400'
      }`} />
      
      {/* Verb */}
      <span className="text-[#404040]">{verb}</span>
      
      {/* Target */}
      {target && (
        <span className="text-[#666] font-mono">{target}</span>
      )}
    </motion.span>
  )
}
