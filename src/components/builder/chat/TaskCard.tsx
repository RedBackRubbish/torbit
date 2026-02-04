'use client'

import { motion } from 'framer-motion'
import { File, Check, Loader2, Code } from 'lucide-react'

interface FileTask {
  path: string
  status: 'pending' | 'creating' | 'complete'
}

interface TaskCardProps {
  tasks: FileTask[]
  isComplete: boolean
}

/**
 * TaskCard - Shows file creation progress like Lovable/v0
 * Clean visual progress instead of raw code in chat
 */
export function TaskCard({ tasks, isComplete }: TaskCardProps) {
  if (tasks.length === 0) return null

  const completedCount = tasks.filter(t => t.status === 'complete').length
  const progress = (completedCount / tasks.length) * 100

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-neutral-800/80 border border-neutral-700/50 rounded-xl overflow-hidden"
    >
      {/* Header with progress */}
      <div className="px-4 py-3 border-b border-neutral-700/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center">
            {isComplete ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <Loader2 className="w-3.5 h-3.5 text-emerald-400" />
              </motion.div>
            )}
          </div>
          <span className="text-sm font-medium text-neutral-200">
            {isComplete ? 'Files created' : 'Creating files...'}
          </span>
        </div>
        <span className="text-xs text-neutral-500">
          {completedCount}/{tasks.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-neutral-700/50">
        <motion.div
          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>

      {/* File list - compact */}
      <div className="p-2 max-h-48 overflow-y-auto custom-scrollbar">
        {tasks.map((task, i) => (
          <motion.div
            key={task.path}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-neutral-700/30 transition-colors group"
          >
            <div className="w-5 h-5 rounded flex items-center justify-center shrink-0">
              {task.status === 'complete' ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : task.status === 'creating' ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <Loader2 className="w-3.5 h-3.5 text-blue-400" />
                </motion.div>
              ) : (
                <File className="w-3.5 h-3.5 text-neutral-500" />
              )}
            </div>
            <span className="text-xs text-neutral-400 truncate flex-1 font-mono">
              {task.path}
            </span>
            <Code className="w-3 h-3 text-neutral-600 opacity-0 group-hover:opacity-100 transition-opacity" />
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
