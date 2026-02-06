'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Brain, 
  FolderTree, 
  Package, 
  Hammer, 
  CheckCircle2,
  Sparkles,
  FileCode2
} from 'lucide-react'
import { TorbitSpinner } from '@/components/ui/TorbitLogo'

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
    label: 'Creating',
    description: 'Building your files',
    color: '#60a5fa',
  },
  installing: {
    icon: <Package className="w-4 h-4" />,
    label: 'Installing',
    description: 'Adding dependencies',
    color: '#f59e0b',
  },
  building: {
    icon: <Hammer className="w-4 h-4" />,
    label: 'Building',
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
// LIVE FILE TREE - Shows files as they're created
// ============================================================================

interface FileNode {
  name: string
  path: string
  type: 'file' | 'folder'
  isNew?: boolean
  children?: FileNode[]
}

interface LiveFileTreeProps {
  files: string[]
  className?: string
}

/**
 * Builds a tree structure from flat file paths
 */
function buildFileTree(paths: string[]): FileNode[] {
  const root: FileNode[] = []
  
  for (const path of paths) {
    const parts = path.split('/')
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
          children: isFile ? undefined : [],
        }
        current.push(node)
      }
      
      if (!isFile && node.children) {
        current = node.children
      }
    }
  }
  
  return root
}

/**
 * Recursive file tree node renderer
 */
function TreeNode({ node, depth = 0 }: { node: FileNode; depth?: number }) {
  const isFolder = node.type === 'folder'
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: depth * 0.02 }}
    >
      <div 
        className="flex items-center gap-1.5 py-0.5 text-[11px] hover:bg-white/[0.02] rounded px-1 -mx-1"
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
      >
        {isFolder ? (
          <FolderTree className="w-3 h-3 text-[#f59e0b]" />
        ) : (
          <FileCode2 className="w-3 h-3 text-[#60a5fa]" />
        )}
        <span className={isFolder ? 'text-[#a0a0a0]' : 'text-[#808080]'}>
          {node.name}
        </span>
        {node.isNew && (
          <span className="text-[9px] px-1 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-medium">
            NEW
          </span>
        )}
      </div>
      
      {node.children && (
        <div>
          {node.children.map((child) => (
            <TreeNode key={child.path} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </motion.div>
  )
}

/**
 * Live file tree showing files as they're created
 */
export function LiveFileTree({ files, className }: LiveFileTreeProps) {
  const tree = useMemo(() => buildFileTree(files), [files])
  
  if (files.length === 0) return null
  
  return (
    <div className={className}>
      <div className="text-[10px] uppercase tracking-wider text-[#505050] mb-2 font-medium">
        Files Created
      </div>
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-2 max-h-48 overflow-y-auto custom-scrollbar">
        <AnimatePresence>
          {tree.map((node) => (
            <TreeNode key={node.path} node={node} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
