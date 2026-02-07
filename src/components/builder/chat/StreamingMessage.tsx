'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Check, Loader2, ShieldCheck } from 'lucide-react'
import { MarkdownRenderer } from './MarkdownRenderer'
import { ActionLog } from './ActionLog'
import type { Message, ToolCall, ProofLine } from './types'

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
  const toolCalls = useMemo(() => message.toolCalls ?? [], [message.toolCalls])
  
  // Track files that are in "auditing" phase
  const [createdFiles, setCreatedFiles] = useState<Set<string>>(new Set())
  const prevCompletedRef = useRef<Set<string>>(new Set())
  
  const phase = getPhaseFromTools(toolCalls, isLoading && isLast)
  const fileToolCalls = useMemo(
    () => toolCalls.filter(tc => tc.name === 'createFile'),
    [toolCalls]
  )
  const displayContent = useMemo(() => stripCodeBlocks(message.content || ''), [message.content])
  
  // When a file completes, stagger audit before marking as created
  useEffect(() => {
    const completedFileIds = new Set(
      fileToolCalls.filter(tc => tc.status === 'complete').map(tc => tc.id)
    )
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
  }, [fileToolCalls])
  
  const createdCount = createdFiles.size
  const proofLines: ProofLine[] = message.proofLines || []

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
      
      {/* Completion + Proof Lines */}
      {!isLoading && createdCount > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-2 space-y-1">
          <div className="flex items-center gap-2 text-[11px] text-[#505050]">
            <ShieldCheck className="w-3 h-3 text-emerald-500/60" />
            <span>{createdCount} files ready</span>
          </div>
          {proofLines.length > 0 && (
            <div className="pl-5 space-y-0.5">
              {proofLines.map((line, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[11px]">
                  {line.status === 'verified' && (
                    <Check className="w-3 h-3 text-emerald-500/50" />
                  )}
                  {line.status === 'warning' && (
                    <svg className="w-3 h-3 text-amber-500/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
                    </svg>
                  )}
                  {line.status === 'failed' && (
                    <svg className="w-3 h-3 text-red-500/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                  <span className={
                    line.status === 'verified' ? 'text-[#505050]' :
                    line.status === 'warning' ? 'text-amber-500/60' :
                    'text-red-500/60'
                  }>
                    {line.label}{line.status === 'verified' ? ' (verified)' : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  )
}

export type { GenerationPhase }
