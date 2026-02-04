'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MarkdownRenderer } from './MarkdownRenderer'
import type { Message, ToolCall } from './types'

// ============================================================================
// RORK-STYLE AGENT MESSAGE
// Beautiful structured output with task tracking
// ============================================================================

interface AgentMessageProps {
  message: Message
  isLast: boolean
  isLoading: boolean
}

/**
 * Get human-readable action name
 */
function getActionLabel(name: string, args: Record<string, unknown>): { verb: string; target: string } {
  const path = (args.path || args.filePath || '') as string
  const fileName = path.split('/').pop() || ''
  
  switch (name) {
    case 'think':
      return { verb: 'Thought', target: `for ${args.duration || '0'}s` }
    case 'createFile':
      return { verb: 'Created', target: fileName }
    case 'editFile':
      return { verb: 'Edited', target: fileName }
    case 'readFile':
      return { verb: 'Read', target: fileName }
    case 'deleteFile':
      return { verb: 'Deleted', target: fileName }
    case 'runCommand':
      return { verb: 'Ran', target: (args.command as string)?.slice(0, 30) || 'command' }
    case 'installPackage':
      return { verb: 'Installed', target: (args.package || args.packages || '') as string }
    default:
      return { verb: name, target: '' }
  }
}

/**
 * Parse tasks from AI content (looks for numbered lists or bullet points)
 */
function parseTasksFromContent(content: string): { title: string; completed: boolean }[] {
  const tasks: { title: string; completed: boolean }[] = []
  
  // Match patterns like "1. Do something" or "- Do something" or "• Do something"
  const patterns = [
    /^\d+\.\s+(.+)$/gm,
    /^[-•]\s+(.+)$/gm,
    /^[✓✗☐]\s+(.+)$/gm,
  ]
  
  for (const pattern of patterns) {
    const matches = content.matchAll(pattern)
    for (const match of matches) {
      const title = match[1].trim()
      // Skip if it looks like a heading or is too short
      if (title.length > 10 && title.length < 100 && !title.startsWith('#')) {
        tasks.push({ title, completed: false })
      }
    }
  }
  
  return tasks.slice(0, 10) // Max 10 tasks
}

/**
 * Collapsible section header
 */
function CollapsibleSection({ 
  label, 
  count,
  defaultOpen = false,
  children 
}: { 
  label: string
  count?: number
  defaultOpen?: boolean
  children: React.ReactNode 
}) {
  const [open, setOpen] = useState(defaultOpen)
  
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-[12px] text-[#666] hover:text-[#999] transition-colors py-1"
      >
        <svg 
          className={`w-3 h-3 text-[#404040] transition-transform ${open ? 'rotate-90' : ''}`}
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor" 
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        <span>{label}</span>
        {count !== undefined && (
          <span className="text-[#404040]">{count}</span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="pl-5 py-1">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * Task checklist item
 */
function TaskItem({ task, isActive }: { task: { title: string; completed: boolean }; isActive?: boolean }) {
  return (
    <div className="flex items-start gap-2.5 py-1">
      <div className={`w-4 h-4 mt-0.5 rounded-full border flex items-center justify-center shrink-0 ${
        task.completed 
          ? 'border-[#c0c0c0] bg-[#c0c0c0]/10' 
          : isActive 
            ? 'border-[#808080]' 
            : 'border-[#333]'
      }`}>
        {task.completed ? (
          <svg className="w-2.5 h-2.5 text-[#c0c0c0]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        ) : isActive ? (
          <motion.div
            className="w-1.5 h-1.5 rounded-full bg-[#808080]"
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        ) : null}
      </div>
      <span className={`text-[13px] ${task.completed ? 'text-[#808080]' : 'text-[#a1a1a1]'}`}>
        {task.title}
      </span>
    </div>
  )
}

/**
 * Action log item (Created, Edited, etc.)
 */
function ActionItem({ toolCall }: { toolCall: ToolCall }) {
  const { verb, target } = getActionLabel(toolCall.name, toolCall.args)
  const isRunning = toolCall.status === 'running'
  const isComplete = toolCall.status === 'complete'
  const isError = toolCall.status === 'error'
  
  // Icon based on action type
  const getIcon = () => {
    switch (toolCall.name) {
      case 'think':
        return (
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
        )
      case 'createFile':
        return (
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
        )
      case 'editFile':
        return (
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
          </svg>
        )
      case 'readFile':
        return (
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.64 0 8.577 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.64 0-8.577-3.007-9.963-7.178z" />
          </svg>
        )
      default:
        return (
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
          </svg>
        )
    }
  }
  
  return (
    <div className="flex items-center gap-2.5 py-0.5 text-[12px]">
      <span className={`${isComplete ? 'text-[#666]' : isError ? 'text-red-400' : 'text-[#808080]'}`}>
        {getIcon()}
      </span>
      <span className={`${isComplete ? 'text-[#666]' : isError ? 'text-red-400' : 'text-[#a1a1a1]'}`}>
        {verb}
      </span>
      {target && (
        <span className="text-[#505050] font-mono">{target}</span>
      )}
      {isRunning && (
        <motion.div
          className="w-1 h-1 rounded-full bg-[#808080]"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      )}
    </div>
  )
}

/**
 * Strip code blocks from content for display
 */
function stripCodeBlocks(content: string): string {
  if (!content) return ''
  let clean = content.replace(/```[\s\S]*?```/g, '')
  clean = clean.replace(/\/\/\s*[\w\/.@_-]+\.(tsx?|jsx?|css|json|md)\n/g, '')
  clean = clean.replace(/\n{3,}/g, '\n\n').trim()
  return clean
}

/**
 * AgentMessage - Rork-style structured AI output
 */
export function AgentMessage({ message, isLast, isLoading }: AgentMessageProps) {
  const toolCalls = message.toolCalls || []
  const completedTools = toolCalls.filter(tc => tc.status === 'complete').length
  const hasTools = toolCalls.length > 0
  
  // Clean content for display
  const displayContent = useMemo(() => {
    return stripCodeBlocks(message.content || '')
  }, [message.content])
  
  // Parse tasks from content
  const tasks = useMemo(() => {
    return parseTasksFromContent(message.content || '')
  }, [message.content])
  
  // Determine how many tasks are "complete" based on tool progress
  const completedTaskCount = Math.min(
    Math.floor((completedTools / Math.max(toolCalls.length, 1)) * tasks.length),
    tasks.length
  )
  
  const showTyping = isLoading && isLast && !displayContent && toolCalls.length === 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="py-3"
    >
      {/* Agent Header */}
      <div className="flex items-center gap-2.5 mb-3">
        <div className={`w-2 h-2 rounded-full ${
          isLoading ? 'bg-[#c0c0c0] animate-pulse' : 'bg-[#606060]'
        }`} />
        <span className="text-[14px] font-medium text-[#e5e5e5]">Torbit</span>
      </div>
      
      <div className="pl-4 border-l border-[#1a1a1a] space-y-2">
        {/* Made X actions - Collapsible */}
        {hasTools && completedTools > 0 && (
          <CollapsibleSection label="Made" count={completedTools} defaultOpen={false}>
            <div className="text-[11px] text-[#505050]">
              {completedTools} action{completedTools !== 1 ? 's' : ''} completed
            </div>
          </CollapsibleSection>
        )}
        
        {/* Main Content - Markdown */}
        {displayContent && (
          <div className="text-[14px] text-[#b3b3b3] leading-[1.7] py-1">
            <MarkdownRenderer content={displayContent} />
          </div>
        )}
        
        {/* Task Checklist */}
        {tasks.length > 0 && (
          <div className="py-2">
            <div className="flex items-center gap-2 text-[12px] text-[#666] mb-2">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
              <span>{completedTaskCount} of {tasks.length} Done</span>
            </div>
            <div className="space-y-0.5">
              {tasks.map((task, i) => (
                <TaskItem 
                  key={i} 
                  task={{ ...task, completed: i < completedTaskCount }}
                  isActive={i === completedTaskCount && isLoading}
                />
              ))}
            </div>
          </div>
        )}
        
        {/* Working... Section - Live Actions */}
        {(isLoading || hasTools) && (
          <CollapsibleSection label={isLoading ? "Working..." : "Actions"} defaultOpen={isLoading}>
            <div className="space-y-0.5">
              {toolCalls.map(tc => (
                <ActionItem key={tc.id} toolCall={tc} />
              ))}
              {isLoading && toolCalls.length === 0 && (
                <div className="flex items-center gap-2 text-[12px] text-[#606060]">
                  <motion.div
                    className="w-3 h-3 rounded-full border border-[#404040] border-t-[#808080]"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                  />
                  <span>Processing...</span>
                </div>
              )}
            </div>
          </CollapsibleSection>
        )}
        
        {/* Typing Indicator */}
        {showTyping && (
          <div className="flex items-center gap-2.5 text-[13px] text-[#666] py-1">
            <motion.div
              className="w-3.5 h-3.5 rounded-full border-2 border-[#333] border-t-[#666]"
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
            />
            <span>Thinking...</span>
          </div>
        )}
        
        {/* Error Display */}
        {message.error && (
          <div className="flex items-start gap-2.5 p-3 bg-red-500/5 border border-red-500/10 rounded-lg">
            <svg className="w-4 h-4 text-red-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <p className="text-[13px] text-red-400">{message.error.message}</p>
          </div>
        )}
        
        {/* Token usage */}
        {message.usage && !isLoading && (
          <div className="pt-1 text-[10px] text-[#333]">
            {(message.usage.inputTokens + message.usage.outputTokens).toLocaleString()} tokens
          </div>
        )}
      </div>
    </motion.div>
  )
}
