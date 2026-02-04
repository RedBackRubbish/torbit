'use client'

import { motion } from 'framer-motion'
import { useBuilderStore } from '@/store/builder'

/**
 * AgentStatusBar - Clean, minimal status indicator
 */
export default function AgentStatusBar() {
  const { agents, isGenerating } = useBuilderStore()
  
  const workingAgent = agents.find((a) => a.status === 'working')
  const thinkingAgent = agents.find((a) => a.status === 'thinking')
  const activeAgent = workingAgent || thinkingAgent

  return (
    <div className="flex items-center gap-3">
      {/* Status Indicator */}
      <div className="flex items-center gap-2.5">
        {isGenerating ? (
          <>
            <motion.div
              className="w-2 h-2 rounded-full bg-blue-500"
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            />
            <span className="text-[13px] text-[#a1a1a1]">
              {activeAgent ? (
                <>
                  <span className="text-[#fafafa] font-medium">{activeAgent.name}</span>
                  {activeAgent.currentTask && (
                    <span className="text-[#525252] ml-1.5">
                      {activeAgent.currentTask}
                    </span>
                  )}
                </>
              ) : (
                'Processing...'
              )}
            </span>
          </>
        ) : (
          <>
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[13px] text-[#737373]">Ready</span>
          </>
        )}
      </div>
    </div>
  )
}
