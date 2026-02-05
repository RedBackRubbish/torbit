'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Check, 
  ChevronRight, 
  FileText, 
  FilePlus2, 
  FileEdit, 
  Eye, 
  Trash2,
  Terminal,
  Package,
  Sparkles,
  Search,
  AlertCircle,
  Loader2
} from 'lucide-react'
import type { ToolCall } from './types'

// ============================================================================
// VS CODE STYLE ACTION LOG
// Clean, minimal action tracking with diff indicators
// ============================================================================

interface ActionLogProps {
  toolCalls: ToolCall[]
  isLoading: boolean
  className?: string
}

interface ActionMeta {
  icon: React.ReactNode
  verb: string
  label: string
  sublabel?: string
  diff?: { added: number; removed: number }
}

/**
 * Parse action metadata from tool call
 */
function getActionMeta(toolCall: ToolCall): ActionMeta {
  const args = toolCall.args || {}
  const path = (args.path || args.filePath || '') as string
  const fileName = path.split('/').pop() || ''
  
  // Try to extract line info for reads
  const startLine = args.startLine as number | undefined
  const endLine = args.endLine as number | undefined
  const lineRange = startLine && endLine ? `lines ${startLine} to ${endLine}` : undefined
  
  // Try to extract diff info for edits
  const oldContent = (args.oldContent || args.oldString || '') as string
  const newContent = (args.newContent || args.newString || args.content || '') as string
  
  let diff: { added: number; removed: number } | undefined
  if (oldContent || newContent) {
    const oldLines = oldContent ? oldContent.split('\n').length : 0
    const newLines = newContent ? newContent.split('\n').length : 0
    if (oldLines > 0 || newLines > 0) {
      diff = {
        added: Math.max(0, newLines - (toolCall.name === 'createFile' ? 0 : oldLines)),
        removed: Math.max(0, oldLines - newLines)
      }
      // For createFile, count all lines as added
      if (toolCall.name === 'createFile') {
        diff = { added: newLines, removed: 0 }
      }
    }
  }
  
  switch (toolCall.name) {
    case 'think':
      return {
        icon: <Sparkles className="w-3.5 h-3.5" />,
        verb: 'Reasoned',
        label: `for ${args.duration || '0'}s`,
      }
    case 'createFile':
      return {
        icon: <FilePlus2 className="w-3.5 h-3.5" />,
        verb: 'Created',
        label: fileName,
        diff,
      }
    case 'editFile':
    case 'replaceInFile':
      return {
        icon: <FileEdit className="w-3.5 h-3.5" />,
        verb: 'Edited',
        label: fileName,
        diff,
      }
    case 'readFile':
      return {
        icon: <Eye className="w-3.5 h-3.5" />,
        verb: 'Read',
        label: fileName,
        sublabel: lineRange,
      }
    case 'deleteFile':
      return {
        icon: <Trash2 className="w-3.5 h-3.5" />,
        verb: 'Deleted',
        label: fileName,
      }
    case 'runCommand':
    case 'executeCommand':
      const cmd = (args.command as string)?.slice(0, 40) || 'command'
      return {
        icon: <Terminal className="w-3.5 h-3.5" />,
        verb: 'Ran',
        label: cmd + (cmd.length >= 40 ? '...' : ''),
      }
    case 'installPackage':
    case 'installDependency':
      return {
        icon: <Package className="w-3.5 h-3.5" />,
        verb: 'Installed',
        label: (args.package || args.packages || args.name || '') as string,
      }
    case 'searchFiles':
    case 'findInFiles':
      return {
        icon: <Search className="w-3.5 h-3.5" />,
        verb: 'Searched',
        label: (args.query || args.pattern || '') as string,
      }
    case 'listFiles':
    case 'listDirectory':
      return {
        icon: <FileText className="w-3.5 h-3.5" />,
        verb: 'Listed',
        label: (args.path || args.directory || '') as string,
      }
    default:
      return {
        icon: <FileText className="w-3.5 h-3.5" />,
        verb: toolCall.name.replace(/([A-Z])/g, ' $1').trim(),
        label: fileName || 'action',
      }
  }
}

/**
 * Single action item with VS Code styling
 */
function ActionItem({ toolCall }: { toolCall: ToolCall }) {
  const meta = getActionMeta(toolCall)
  const isRunning = toolCall.status === 'running'
  const isComplete = toolCall.status === 'complete'
  const isError = toolCall.status === 'error'
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-2 py-1 text-[12px]"
    >
      {/* Status indicator */}
      <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
        {isRunning ? (
          <Loader2 className="w-3.5 h-3.5 text-[#808080] animate-spin" />
        ) : isComplete ? (
          <Check className="w-3.5 h-3.5 text-[#666]" />
        ) : isError ? (
          <AlertCircle className="w-3.5 h-3.5 text-red-400" />
        ) : (
          <div className="w-1.5 h-1.5 rounded-full bg-[#404040]" />
        )}
      </div>
      
      {/* Action icon */}
      <span className={`flex-shrink-0 ${
        isError ? 'text-red-400' : 
        isComplete ? 'text-[#606060]' : 
        'text-[#808080]'
      }`}>
        {meta.icon}
      </span>
      
      {/* Verb */}
      <span className={`${
        isError ? 'text-red-400' : 
        isComplete ? 'text-[#808080]' : 
        'text-[#a8a8a8]'
      }`}>
        {meta.verb}
      </span>
      
      {/* Label (file name, command, etc) */}
      <span className={`font-mono truncate ${
        isError ? 'text-red-400/70' :
        isComplete ? 'text-[#666]' : 
        'text-[#c0c0c0]'
      }`}>
        {meta.label}
      </span>
      
      {/* Sublabel (line range, etc) */}
      {meta.sublabel && (
        <span className="text-[#505050] hidden sm:inline">
          , {meta.sublabel}
        </span>
      )}
      
      {/* Diff indicator */}
      {meta.diff && (isComplete || isRunning) && (
        <span className="flex items-center gap-1 ml-auto flex-shrink-0">
          {meta.diff.added > 0 && (
            <span className="text-emerald-500/80">+{meta.diff.added}</span>
          )}
          {meta.diff.removed > 0 && (
            <span className="text-red-400/80">-{meta.diff.removed}</span>
          )}
        </span>
      )}
    </motion.div>
  )
}

/**
 * Grouped actions by type (e.g., "3 files edited")
 */
function ActionGroup({ 
  label, 
  count, 
  children,
  defaultOpen = true
}: { 
  label: string
  count: number
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  
  return (
    <div className="py-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 text-[11px] text-[#606060] hover:text-[#909090] transition-colors w-full"
        aria-expanded={isOpen}
        aria-label={`${label}, ${count} items. ${isOpen ? 'Click to collapse' : 'Click to expand'}`}
      >
        <ChevronRight className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
        <span>{label}</span>
        <span className="text-[#404040]">{count}</span>
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="pl-2 pt-1">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * ActionLog - VS Code style action tracking
 */
export function ActionLog({ toolCalls, isLoading, className = '' }: ActionLogProps) {
  // Group tool calls by type
  const groups = useMemo(() => {
    const reads: ToolCall[] = []
    const writes: ToolCall[] = []
    const commands: ToolCall[] = []
    const other: ToolCall[] = []
    
    for (const tc of toolCalls) {
      if (tc.name === 'readFile') {
        reads.push(tc)
      } else if (['createFile', 'editFile', 'replaceInFile', 'deleteFile'].includes(tc.name)) {
        writes.push(tc)
      } else if (['runCommand', 'executeCommand', 'installPackage', 'installDependency'].includes(tc.name)) {
        commands.push(tc)
      } else {
        other.push(tc)
      }
    }
    
    return { reads, writes, commands, other }
  }, [toolCalls])
  
  const completedCount = toolCalls.filter(tc => tc.status === 'complete').length
  const hasAnyActions = toolCalls.length > 0
  
  if (!hasAnyActions && !isLoading) {
    return null
  }
  
  return (
    <div className={`space-y-1 ${className}`}>
      {/* Show loading state */}
      {isLoading && toolCalls.length === 0 && (
        <div className="flex items-center gap-2 py-1 text-[12px] text-[#606060]">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Processing...</span>
        </div>
      )}
      
      {/* Reads - collapsed by default when there are many */}
      {groups.reads.length > 0 && (
        groups.reads.length > 3 ? (
          <ActionGroup 
            label="Read" 
            count={groups.reads.length}
            defaultOpen={false}
          >
            {groups.reads.map(tc => (
              <ActionItem key={tc.id} toolCall={tc} />
            ))}
          </ActionGroup>
        ) : (
          groups.reads.map(tc => (
            <ActionItem key={tc.id} toolCall={tc} />
          ))
        )
      )}
      
      {/* Writes - always expanded */}
      {groups.writes.map(tc => (
        <ActionItem key={tc.id} toolCall={tc} />
      ))}
      
      {/* Commands */}
      {groups.commands.map(tc => (
        <ActionItem key={tc.id} toolCall={tc} />
      ))}
      
      {/* Other */}
      {groups.other.map(tc => (
        <ActionItem key={tc.id} toolCall={tc} />
      ))}
      
      {/* Summary when done - minimal */}
      {!isLoading && completedCount > 0 && completedCount === toolCalls.length && (
        <div className="pt-2 text-[10px] text-[#404040]">
          {completedCount} action{completedCount !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}

/**
 * Compact inline action indicator (for headers)
 */
export function ActionIndicator({ toolCalls, isLoading }: { toolCalls: ToolCall[]; isLoading: boolean }) {
  const running = toolCalls.filter(tc => tc.status === 'running').length
  const completed = toolCalls.filter(tc => tc.status === 'complete').length
  const errors = toolCalls.filter(tc => tc.status === 'error').length
  
  if (!isLoading && toolCalls.length === 0) return null
  
  return (
    <div className="flex items-center gap-2 text-[11px]">
      {isLoading && (
        <div className="flex items-center gap-1.5 text-[#808080]">
          <Loader2 className="w-3 h-3 animate-spin" />
          {running > 0 && <span>{running} running</span>}
        </div>
      )}
      {completed > 0 && (
        <div className="flex items-center gap-1 text-[#606060]">
          <Check className="w-3 h-3" />
          <span>{completed}</span>
        </div>
      )}
      {errors > 0 && (
        <div className="flex items-center gap-1 text-red-400">
          <AlertCircle className="w-3 h-3" />
          <span>{errors}</span>
        </div>
      )}
    </div>
  )
}
