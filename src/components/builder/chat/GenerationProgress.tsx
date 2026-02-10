'use client'

import { useMemo, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Brain, 
  FolderTree, 
  Package, 
  Hammer, 
  CheckCircle2,
  Sparkles,
  FileCode2,
  Shield,
} from 'lucide-react'
import { TorbitSpinner } from '@/components/ui/TorbitLogo'
import { Auditor, type AuditStatus } from '@/lib/auditor'

// ============================================================================
// GENERATION PROGRESS - Real-time phase indicator
// Shows users exactly where we are in the build process
// ============================================================================

export type GenerationPhase = 
  | 'thinking'
  | 'creating' 
  | 'installing' 
  | 'building' 
  | 'ready' 
  | 'idle'

interface PhaseConfig {
  icon: React.ReactNode
  label: string
  description: string
  color: string
}

const PHASES: Record<GenerationPhase, PhaseConfig> = {
  idle: {
    icon: <Sparkles className="w-4 h-4" />,
    label: 'Ready',
    description: 'Waiting for your prompt',
    color: '#525252',
  },
  thinking: {
    icon: <Brain className="w-4 h-4" />,
    label: 'Thinking',
    description: 'Planning the architecture...',
    color: '#a78bfa',
  },
  creating: {
    icon: <FolderTree className="w-4 h-4" />,
    label: 'Working',
    description: 'Building your files',
    color: '#60a5fa',
  },
  installing: {
    icon: <Package className="w-4 h-4" />,
    label: 'Working',
    description: 'Adding dependencies',
    color: '#f59e0b',
  },
  building: {
    icon: <Hammer className="w-4 h-4" />,
    label: 'Reviewing',
    description: 'Compiling the app',
    color: '#f97316',
  },
  ready: {
    icon: <CheckCircle2 className="w-4 h-4" />,
    label: 'Ready',
    description: 'Preview available',
    color: '#22c55e',
  },
}

interface GenerationProgressProps {
  phase: GenerationPhase
  filesCreated: number
  totalFiles: number
  currentFile?: string
  isVisible: boolean
}

/**
 * Compact progress indicator showing current generation phase
 */
export function GenerationProgress({ 
  phase, 
  filesCreated, 
  totalFiles,
  currentFile,
  isVisible 
}: GenerationProgressProps) {
  const config = PHASES[phase]
  const progress = totalFiles > 0 ? (filesCreated / totalFiles) * 100 : 0
  
  if (!isVisible || phase === 'idle') return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="mb-4"
    >
      {/* Main progress card */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#0a0a0a] to-[#0f0f0f] border border-[#1f1f1f] p-4">
        {/* Animated gradient background */}
        <motion.div
          className="absolute inset-0 opacity-10"
          style={{
            background: `linear-gradient(90deg, transparent, ${config.color}40, transparent)`,
          }}
          animate={{ x: ['-100%', '100%'] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        />
        
        <div className="relative flex items-center gap-4">
          {/* Phase Icon */}
          <motion.div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ 
              backgroundColor: `${config.color}15`,
              color: config.color,
            }}
            animate={phase !== 'ready' ? { scale: [1, 1.05, 1] } : {}}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            {phase !== 'ready' ? (
              <TorbitSpinner size="sm" speed="fast" />
            ) : (
              config.icon
            )}
          </motion.div>
          
          {/* Phase Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span 
                className="text-[14px] font-semibold"
                style={{ color: config.color }}
              >
                {config.label}
              </span>
              
              {/* File counter for creating phase */}
              {phase === 'creating' && totalFiles > 0 && (
                <span className="text-[12px] text-[#606060] font-mono">
                  {filesCreated}/{totalFiles}
                </span>
              )}
            </div>
            
            {/* Current file or description */}
            <p className="text-[12px] text-[#707070] truncate">
              {currentFile ? (
                <span className="flex items-center gap-1.5">
                  <FileCode2 className="w-3 h-3 text-[#505050]" />
                  {currentFile}
                </span>
              ) : (
                config.description
              )}
            </p>
          </div>
          
          {/* Progress percentage */}
          {phase === 'creating' && totalFiles > 0 && (
            <div className="text-[18px] font-bold" style={{ color: config.color }}>
              {Math.round(progress)}%
            </div>
          )}
        </div>
        
        {/* Progress bar */}
        {phase === 'creating' && totalFiles > 0 && (
          <div className="mt-3 h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: config.color }}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ============================================================================
// LIVE FILE TREE - Shows files as they're created with real-time audit status
// ============================================================================

interface FileNode {
  name: string
  path: string
  type: 'file' | 'folder'
  isNew?: boolean
  auditStatus?: AuditStatus
  children?: FileNode[]
}

interface LiveFileInfo {
  path: string
  content: string
}

interface LiveFileTreeProps {
  files: LiveFileInfo[]
  className?: string
}

/**
 * Builds a tree structure from flat file paths with audit status
 */
function buildFileTree(files: LiveFileInfo[], auditStatuses: Map<string, AuditStatus>): FileNode[] {
  const root: FileNode[] = []
  
  for (const file of files) {
    const parts = file.path.split('/')
    let current = root
    let currentPath = ''
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      currentPath = currentPath ? `${currentPath}/${part}` : part
      const isFile = i === parts.length - 1
      
      let node = current.find(n => n.name === part)
      
      if (!node) {
        node = {
          name: part,
          path: currentPath,
          type: isFile ? 'file' : 'folder',
          isNew: true,
          auditStatus: isFile ? auditStatuses.get(file.path) || 'new' : undefined,
          children: isFile ? undefined : [],
        }
        current.push(node)
      } else if (isFile) {
        // Update audit status for existing nodes
        node.auditStatus = auditStatuses.get(file.path) || 'new'
      }
      
      if (!isFile && node.children) {
        current = node.children
      }
    }
  }
  
  return root
}

/**
 * Audit status indicator with glow effects
 */
function AuditStatusIndicator({ status }: { status?: AuditStatus }) {
  if (!status || status === 'new') {
    // New file - queue for audit, show subtle indicator
    return (
      <motion.span
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-1.5 h-1.5 rounded-full bg-[#404040]"
        title="Queued for validation"
      />
    )
  }

  if (status === 'auditing') {
    // Auditing - show glowing/pulsing effect
    return (
      <motion.span
        initial={{ opacity: 0, scale: 0 }}
        animate={{ 
          opacity: 1, 
          scale: [1, 1.4, 1],
          boxShadow: [
            '0 0 4px rgba(147, 197, 253, 0.3)',
            '0 0 12px rgba(147, 197, 253, 0.8)',
            '0 0 4px rgba(147, 197, 253, 0.3)',
          ]
        }}
        transition={{ 
          scale: { repeat: Infinity, duration: 0.8, ease: 'easeInOut' },
          boxShadow: { repeat: Infinity, duration: 0.8, ease: 'easeInOut' },
        }}
        className="w-2 h-2 rounded-full bg-blue-400"
        title="Validating..."
      />
    )
  }

  if (status === 'passed') {
    // Passed - green with subtle glow
    return (
      <motion.span
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 25 }}
        className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]"
        title="Validation passed"
      />
    )
  }

  if (status === 'warning') {
    // Warning - amber
    return (
      <motion.span
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.5)]"
        title="Validation warnings"
      />
    )
  }

  if (status === 'error') {
    // Error - red
    return (
      <motion.span
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]"
        title="Validation errors"
      />
    )
  }

  return null
}

/**
 * Recursive file tree node renderer with audit status
 */
function TreeNode({ 
  node, 
  depth = 0 
}: { 
  node: FileNode
  depth?: number 
}) {
  const isFolder = node.type === 'folder'
  const status = node.auditStatus
  
  // Determine file row styling based on audit status
  const getRowStyles = () => {
    if (isFolder) return ''
    
    switch (status) {
      case 'auditing':
        // Glowing effect while auditing
        return 'bg-blue-500/5 shadow-[inset_0_0_12px_rgba(96,165,250,0.15)]'
      case 'passed':
        // Subtle green tint when passed
        return 'bg-emerald-500/5'
      case 'warning':
        return 'bg-amber-500/5'
      case 'error':
        return 'bg-red-500/5'
      default:
        return ''
    }
  }
  
  // File icon color based on status
  const getIconColor = () => {
    switch (status) {
      case 'passed':
        return 'text-emerald-400'
      case 'warning':
        return 'text-amber-400'
      case 'error':
        return 'text-red-400'
      case 'auditing':
        return 'text-blue-400'
      default:
        return 'text-[#60a5fa]'
    }
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: depth * 0.02 }}
    >
      <motion.div 
        className={`flex items-center gap-1.5 py-0.5 text-[11px] rounded px-1 -mx-1 transition-colors duration-300 ${getRowStyles()}`}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
        animate={status === 'auditing' ? {
          boxShadow: [
            'inset 0 0 8px rgba(96,165,250,0.1)',
            'inset 0 0 16px rgba(96,165,250,0.25)',
            'inset 0 0 8px rgba(96,165,250,0.1)',
          ]
        } : {}}
        transition={status === 'auditing' ? {
          boxShadow: { repeat: Infinity, duration: 1.2, ease: 'easeInOut' }
        } : {}}
      >
        {isFolder ? (
          <FolderTree className="w-3 h-3 text-[#f59e0b]" />
        ) : (
          <FileCode2 className={`w-3 h-3 ${getIconColor()}`} />
        )}
        <span className={`flex-1 ${isFolder ? 'text-[#a0a0a0]' : status === 'passed' ? 'text-emerald-300/80' : 'text-[#808080]'}`}>
          {node.name}
        </span>
        
        {/* Audit status indicator */}
        {!isFolder && <AuditStatusIndicator status={status} />}
      </motion.div>
      
      {node.children && (
        <div>
          {node.children.map((child) => (
            <TreeNode 
              key={child.path} 
              node={child} 
              depth={depth + 1} 
            />
          ))}
        </div>
      )}
    </motion.div>
  )
}

/**
 * Live file tree showing files as they're created with real-time audit status
 * 
 * Files glow while being audited by the supervisor, then turn green when passed
 */
export function LiveFileTree({ files, className }: LiveFileTreeProps) {
  // Track audit status for each file
  const [auditStatuses, setAuditStatuses] = useState<Map<string, AuditStatus>>(new Map())
  
  // Queue files for audit when they arrive
  useEffect(() => {
    const auditor = Auditor.getInstance()
    const fileContexts = files.map(f => ({ path: f.path, content: f.content }))
    const filesToAudit: LiveFileInfo[] = []

    setAuditStatuses(prev => {
      const next = new Map(prev)

      for (const file of files) {
        const currentStatus = next.get(file.path)
        if (!currentStatus || currentStatus === 'new') {
          next.set(file.path, 'auditing')
          filesToAudit.push(file)
        }
      }

      return next
    })

    for (const file of filesToAudit) {
      auditor.queueAudit(
        file.path,
        { path: file.path, content: file.content },
        fileContexts,
        100
      )
    }
  }, [files])
  
  // Subscribe to audit results
  useEffect(() => {
    const auditor = Auditor.getInstance()
    
    const unsubscribe = auditor.subscribe((fileId, result) => {
      setAuditStatuses(prev => {
        const next = new Map(prev)
        next.set(fileId, result.status)
        return next
      })
    })
    
    return unsubscribe
  }, [])
  
  const tree = useMemo(
    () => buildFileTree(files, auditStatuses), 
    [files, auditStatuses]
  )
  
  if (files.length === 0) return null
  
  // Count stats
  const passedCount = Array.from(auditStatuses.values()).filter(s => s === 'passed').length
  const auditingCount = Array.from(auditStatuses.values()).filter(s => s === 'auditing').length
  
  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] uppercase tracking-wider text-[#505050] font-medium">
          Files Created
        </div>
        
        {/* Audit progress indicator */}
        <div className="flex items-center gap-2 text-[10px]">
          {auditingCount > 0 && (
            <motion.span 
              className="flex items-center gap-1 text-blue-400"
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              <Shield className="w-3 h-3" />
              <span>Validating {auditingCount}...</span>
            </motion.span>
          )}
          {passedCount > 0 && auditingCount === 0 && (
            <span className="flex items-center gap-1 text-emerald-400">
              <CheckCircle2 className="w-3 h-3" />
              <span>{passedCount} passed</span>
            </span>
          )}
        </div>
      </div>
      
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-2 max-h-48 overflow-y-auto custom-scrollbar">
        <AnimatePresence>
          {tree.map((node) => (
            <TreeNode 
              key={node.path} 
              node={node}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
