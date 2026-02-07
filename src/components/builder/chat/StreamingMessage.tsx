'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Check, Loader2, ShieldCheck } from 'lucide-react'
import { MarkdownRenderer } from './MarkdownRenderer'
import { ActionLog } from './ActionLog'
import type { Message, ToolCall } from './types'

// ============================================================================
// STREAMING MESSAGE - Clean real-time generation display
// No branding header, no heavy phase badge, inline file tracking
// ============================================================================

interface StreamingMessageProps {
  message: Message
  isLast: boolean
  isLoading: boolean
}

type GenerationPhase = 'thinking' | 'creating' | 'installing' | 'building' | 'ready'

function getPhaseFromTools(toolCalls: ToolCall[], isLoading: boolean): GenerationPhase {
  if (!isLoading) return 'ready'
  if (toolCalls.length === 0) return 'thinking'
  
  const lastCall = toolCalls[toolCalls.length - 1]
  if (lastCall?.name === 'think') return 'thinking'
  if (lastCall?.name === 'createFile' || lastCall?.name === 'editFile') return 'creating'
  
  return 'creating'
}

function stripCodeBlocks(content: string): string {
  if (!content) return ''
  let clean = content.replace(/```[\s\S]*?```/g, '')
  clean = clean.replace(/\/\/\s*[\w\/.@_-]+\.(tsx?|jsx?|css|json|md)\n/g, '')
  clean = clean.replace(/\n{3,}/g, '\n\n').trim()
  return clean
}

// Subtle inline phase label
function PhaseLabel({ phase, filesComplete, totalFiles }: {
  phase: GenerationPhase
  filesComplete: number
  totalFiles: number
}) {
  const config: Record<GenerationPhase, { label: string; color: string }> = {
    thinking: { label: 'Planning', color: 'text-[#707070]' },
    creating: { label: 'Writing files', color: 'text-[#707070]' },
    installing: { label: 'Setting up', color: 'text-[#707070]' },
    building: { label: 'Checking', color: 'text-[#707070]' },
    ready: { label: 'Ready', color: 'text-emerald-500/70' },
  }

  const c = config[phase]

  return (
    <div className="flex items-center gap-2 py-1 text-[11px]">
      {phase !== 'ready' ? (
        <Loader2 className={`w-3 h-3 ${c.color} animate-spin`} />
      ) : (
        <Check className={`w-3 h-3 ${c.color}`} />
      )}
      <span className={c.color}>{c.label}</span>
      {phase === 'creating' && totalFiles > 0 && (
        <span className="text-[#404040] font-mono">{filesComplete}/{totalFiles}</span>
      )}
    </div>
  )
}

export function StreamingMessage({ message, isLast, isLoading }: StreamingMessageProps) {
  const toolCalls = message.toolCalls || []
  
  // Track files that are in "auditing" phase
  const [createdFiles, setCreatedFiles] = useState<Set<string>>(new Set())
  const prevCompletedRef = useRef<Set<string>>(new Set())
  
  const phase = getPhaseFromTools(toolCalls, isLoading && isLast)
  const fileToolCalls = toolCalls.filter(tc => tc.name === 'createFile')
  const completedFileIds = new Set(fileToolCalls.filter(tc => tc.status === 'complete').map(tc => tc.id))
  const displayContent = useMemo(() => stripCodeBlocks(message.content || ''), [message.content])
  
  // When a file completes, stagger audit before marking as created
  useEffect(() => {
    const newlyCompleted = [...completedFileIds].filter(id => !prevCompletedRef.current.has(id))
    
    if (newlyCompleted.length > 0) {
      newlyCompleted.forEach((id, idx) => {
        const delay = 800 + (idx * 200)
        setTimeout(() => {
          setCreatedFiles(prev => new Set([...prev, id]))
        }, delay)
      })
      
      prevCompletedRef.current = new Set(completedFileIds)
    }
  }, [completedFileIds])
  
  const createdCount = createdFiles.size

  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="py-3">
      {/* Subtle phase indicator - only while actively loading */}
      {isLoading && isLast && (
        <PhaseLabel
          phase={phase}
          filesComplete={createdCount}
          totalFiles={fileToolCalls.length}
        />
      )}
      
      {/* Action log - connected-line timeline for all tool calls */}
      {toolCalls.length > 0 && (
        <ActionLog
          toolCalls={toolCalls}
          isLoading={isLoading && isLast}
        />
      )}
      
      {/* Text content */}
      {displayContent && (
        <div className="text-[13px] text-[#b3b3b3] leading-relaxed mt-2">
          <MarkdownRenderer content={displayContent} />
        </div>
      )}
      
      {/* Thinking state */}
      {isLoading && isLast && !displayContent && toolCalls.length === 0 && (
        <div className="flex items-center gap-2.5 pl-4 py-1">
          <motion.div
            className="w-[7px] h-[7px] rounded-full bg-[#808080]"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
          />
          <span className="text-[12px] text-[#505050]">Thinking...</span>
        </div>
      )}
      
      {/* Error */}
      {message.error && (
        <div className="flex items-start gap-2.5 p-3 mt-2 bg-red-500/5 border border-red-500/10 rounded-lg">
          <svg className="w-4 h-4 text-red-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <p className="text-[13px] text-red-400">{message.error.message}</p>
        </div>
      )}
      
      {/* Completion */}
      {!isLoading && createdCount > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-2 flex items-center gap-2 text-[11px] text-[#505050]">
          <ShieldCheck className="w-3 h-3 text-emerald-500/60" />
          <span>{createdCount} files ready</span>
        </motion.div>
      )}
    </motion.div>
  )
}

export type { GenerationPhase }
