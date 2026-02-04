'use client'

import { motion } from 'framer-motion'
import { useBuilderStore } from '@/store/builder'

/**
 * AgentStatusBar - v0-style premium status indicator
 */
export default function AgentStatusBar() {
  const { agents, isGenerating } = useBuilderStore()
  
  const workingAgent = agents.find((a) => a.status === 'working')
  const thinkingAgent = agents.find((a) => a.status === 'thinking')
  const activeAgent = workingAgent || thinkingAgent

  return (
    <div className="flex items-center gap-2.5">
      {/* Animated status dot */}
      <motion.div
        className={`w-2 h-2 rounded-full ${isGenerating ? 'bg-emerald-400' : 'bg-emerald-400'}`}
        animate={isGenerating ? { 
          scale: [1, 1.3, 1],
          opacity: [1, 0.6, 1]
        } : {}}
        transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
      />
      
      {/* Status text */}
      <div className="flex items-center gap-1.5 text-[13px]">
        {isGenerating && activeAgent ? (
          <>
            <span className="font-medium text-[#fafafa]">{activeAgent.name}</span>
            {activeAgent.currentTask && (
              <>
                <span className="text-[#333]">·</span>
                <span className="text-[#737373] truncate max-w-[180px]">
                  {activeAgent.currentTask}
                </span>
              </>
            )}
          </>
        ) : (
          <span className="font-medium text-[#fafafa]">Ready</span>
        )}
      </div>
    </div>
  )
}
