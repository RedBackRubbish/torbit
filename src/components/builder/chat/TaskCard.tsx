'use client'

import { motion } from 'framer-motion'

interface FileTask {
  path: string
  status: 'pending' | 'creating' | 'complete'
}

interface TaskCardProps {
  tasks: FileTask[]
  isComplete: boolean
}

/**
 * TaskCard - Clean file creation progress display
 */
export function TaskCard({ tasks, isComplete }: TaskCardProps) {
  if (tasks.length === 0) return null

  const completedCount = tasks.filter(t => t.status === 'complete').length
  const progress = (completedCount / tasks.length) * 100

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#141414] border border-[#262626] rounded-lg overflow-hidden"
    >
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-[#1f1f1f] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-emerald-500/10 flex items-center justify-center">
            {isComplete ? (
              <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            ) : (
              <motion.svg 
                className="w-3 h-3 text-emerald-400" 
                viewBox="0 0 24 24"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" fill="none" strokeDasharray="32" strokeLinecap="round" />
              </motion.svg>
            )}
          </div>
          <span className="text-[12px] font-medium text-[#fafafa]">
            {isComplete ? 'Created' : 'Creating...'}
          </span>
        </div>
        <span className="text-[11px] text-[#525252]">
          {completedCount}/{tasks.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-[2px] bg-[#1f1f1f]">
        <motion.div
          className="h-full bg-emerald-500"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>

      {/* File list */}
      <div className="p-2 max-h-40 overflow-y-auto custom-scrollbar">
        {tasks.map((task, i) => (
          <motion.div
            key={task.path}
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
            className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-[#1a1a1a] transition-colors"
          >
            <div className="w-4 h-4 flex items-center justify-center shrink-0">
              {task.status === 'complete' ? (
                <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              ) : task.status === 'creating' ? (
                <motion.svg 
                  className="w-3 h-3 text-blue-400" 
                  viewBox="0 0 24 24"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" fill="none" strokeDasharray="32" strokeLinecap="round" />
                </motion.svg>
              ) : (
                <svg className="w-3 h-3 text-[#525252]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              )}
            </div>
            <span className="text-[11px] text-[#a1a1a1] truncate flex-1 font-mono">
              {task.path}
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
