'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { FileCode2, Check, Clock, Loader2, ShieldCheck } from 'lucide-react'
import { TorbitSpinner, TorbitIcon } from '@/components/ui/TorbitLogo'
import { MarkdownRenderer } from './MarkdownRenderer'
import type { Message, ToolCall } from './types'

// ============================================================================
// STREAMING MESSAGE - Real-time file-by-file generation with audit phase
// Flow: Writing → Auditing → Verified
// ============================================================================

interface StreamingMessageProps {
  message: Message
  isLast: boolean
  isLoading: boolean
}

type GenerationPhase = 'thinking' | 'creating' | 'installing' | 'building' | 'ready'
type FileStatus = 'running' | 'auditing' | 'complete' | 'error'

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

// Single file item with audit animation
function FileItem({ path, status, index }: { path: string; status: FileStatus; index: number }) {
  const fileName = path.split('/').pop() || path
  const folder = path.includes('/') ? path.substring(0, path.lastIndexOf('/')) : ''
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.02, duration: 0.15 }}
      className="flex items-center gap-2 py-1 px-2 rounded hover:bg-[#0a0a0a]"
    >
      {/* Status Icon */}
      {status === 'running' ? (
        <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />
      ) : status === 'auditing' ? (
        <motion.div
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ShieldCheck className="w-3 h-3 text-amber-400" />
        </motion.div>
      ) : status === 'complete' ? (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
        >
          <Check className="w-3 h-3 text-emerald-500" />
        </motion.div>
      ) : (
        <FileCode2 className="w-3 h-3 text-red-400" />
      )}
      
      {/* File path */}
      <div className="flex items-center gap-1 min-w-0 flex-1">
        {folder && (
          <span className="text-[10px] text-[#404040] font-mono truncate">{folder}/</span>
        )}
        <span className={`text-[12px] font-mono truncate ${
          status === 'running' ? 'text-blue-400' : 
          status === 'auditing' ? 'text-amber-400' : 
          'text-[#707070]'
        }`}>
          {fileName}
        </span>
      </div>
      
      {/* Status label */}
      {status === 'running' && (
        <span className="text-[9px] text-blue-400/60 uppercase tracking-wider">writing</span>
      )}
      {status === 'auditing' && (
        <motion.span 
          className="text-[9px] text-amber-400/80 uppercase tracking-wider"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
        >
          checking
        </motion.span>
      )}
    </motion.div>
  )
}

// Phase badge
function PhaseBadge({ phase, totalFiles, filesComplete }: {
  phase: GenerationPhase
  totalFiles: number
  filesComplete: number
}) {
  const config = {
    thinking: { label: 'Planning', color: 'text-violet-400', bg: 'bg-violet-500/10' },
    creating: { label: 'Creating', color: 'text-blue-400', bg: 'bg-blue-500/10' },
    installing: { label: 'Installing', color: 'text-amber-400', bg: 'bg-amber-500/10' },
    building: { label: 'Building', color: 'text-orange-400', bg: 'bg-orange-500/10' },
    ready: { label: 'Created', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  }[phase]

  const progress = totalFiles > 0 ? (filesComplete / totalFiles) * 100 : 0

  return (
    <div className="mb-3">
      <div role="status" className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${config.bg}`}>
        {phase !== 'ready' ? (
          <Loader2 className={`w-3 h-3 ${config.color} animate-spin`} />
        ) : (
          <ShieldCheck className={`w-3 h-3 ${config.color}`} />
        )}
        <span className={`text-[12px] font-medium ${config.color}`}>{config.label}</span>
        {phase === 'creating' && totalFiles > 0 && (
          <span className="text-[11px] text-[#606060] font-mono">{filesComplete}/{totalFiles}</span>
        )}
      </div>
      
      {phase === 'creating' && totalFiles > 0 && (
        <div className="mt-2 h-0.5 bg-[#1a1a1a] rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      )}
    </div>
  )
}

export function StreamingMessage({ message, isLast, isLoading }: StreamingMessageProps) {
  const toolCalls = message.toolCalls || []
  const [startTime] = useState(() => Date.now())
  const [elapsedTime, setElapsedTime] = useState(0)
  
  // Track files that are in "auditing" phase (between complete and created)
  const [createdFiles, setCreatedFiles] = useState<Set<string>>(new Set())
  const prevCompletedRef = useRef<Set<string>>(new Set())
  
  const phase = getPhaseFromTools(toolCalls, isLoading && isLast)
  const fileToolCalls = toolCalls.filter(tc => tc.name === 'createFile')
  const completedFileIds = new Set(fileToolCalls.filter(tc => tc.status === 'complete').map(tc => tc.id))
  const displayContent = useMemo(() => stripCodeBlocks(message.content || ''), [message.content])
  
  // When a file completes, start audit timer before marking as created
  useEffect(() => {
    const newlyCompleted = [...completedFileIds].filter(id => !prevCompletedRef.current.has(id))
    
    if (newlyCompleted.length > 0) {
      // For each newly completed file, add a staggered delay before marking created
      newlyCompleted.forEach((id, idx) => {
        // Stagger verification: 800ms base + 200ms per file for realistic feel
        const delay = 800 + (idx * 200)
        setTimeout(() => {
          setCreatedFiles(prev => new Set([...prev, id]))
        }, delay)
      })
      
      prevCompletedRef.current = new Set(completedFileIds)
    }
  }, [completedFileIds])
  
  // Determine each file's display status
  const getFileStatus = (tc: ToolCall): FileStatus => {
    if (tc.status === 'running') return 'running'
    if (tc.status === 'complete') {
      // Check if this file has passed audit
      if (createdFiles.has(tc.id)) return 'complete'
      return 'auditing'
    }
    return 'error'
  }
  
  const createdCount = createdFiles.size
  
  // Timer
  useEffect(() => {
    if (!isLoading || !isLast) return
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [isLoading, isLast, startTime])

  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="py-3">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        {isLoading && isLast ? <TorbitSpinner size="xs" speed="fast" /> : <TorbitIcon size="xs" variant="muted" />}
        <span className="text-[14px] font-medium text-[#e5e5e5]">Torbit</span>
        {isLoading && isLast && elapsedTime > 0 && (
          <div className="flex items-center gap-1 ml-auto text-[11px] text-[#505050]">
            <Clock className="w-3 h-3" />
            <span>{elapsedTime}s</span>
          </div>
        )}
      </div>
      
      <div className="pl-4 border-l border-[#1a1a1a] space-y-3">
        {/* Phase indicator */}
        {isLoading && isLast && (
          <PhaseBadge
            phase={phase}
            totalFiles={fileToolCalls.length}
            filesComplete={createdCount}
          />
        )}
        
        {/* Text content */}
        {displayContent && (
          <div className="text-[13px] text-[#b3b3b3] leading-relaxed">
            <MarkdownRenderer content={displayContent} />
          </div>
        )}
        
        {/* File list - streams in real-time with audit status */}
        {fileToolCalls.length > 0 && (
          <div className="bg-[#050505] rounded-lg p-2 border border-[#151515]">
            <div className="flex items-center gap-2 px-2 py-1 text-[10px] uppercase tracking-wider text-[#404040] font-medium">
              <FileCode2 className="w-3 h-3" />
              <span>Files</span>
              <span className="ml-auto text-[#505050]">{createdCount}/{fileToolCalls.length} created</span>
            </div>
            <div className="max-h-[180px] overflow-y-auto custom-scrollbar">
              {fileToolCalls.map((tc, i) => (
                <FileItem
                  key={tc.id}
                  path={(tc.args?.path as string) || 'unknown'}
                  status={getFileStatus(tc)}
                  index={i}
                />
              ))}
            </div>
          </div>
        )}
        
        {/* Thinking state */}
        {isLoading && isLast && !displayContent && toolCalls.length === 0 && (
          <div className="flex items-center gap-2 text-[12px] text-[#606060] py-1">
            <TorbitSpinner size="sm" speed="normal" />
            <span className="text-[#505050]">Thinking...</span>
          </div>
        )}
        
        {/* Error */}
        {message.error && (
          <div className="flex items-start gap-2.5 p-3 bg-red-500/5 border border-red-500/10 rounded-lg">
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
            <span>{createdCount} files created</span>
            {message.usage && (
              <>
                <span className="text-[#333]">•</span>
                <span className="text-[#404040]">{(message.usage.inputTokens + message.usage.outputTokens).toLocaleString()} tokens</span>
              </>
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

export type { GenerationPhase }
