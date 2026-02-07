'use client'

import { motion } from 'framer-motion'
import { useBuilderStore } from '@/store/builder'

/**
 * AgentStatus - Compact status bar showing active agents
 */
export default function AgentStatus() {
  const { agents, isGenerating } = useBuilderStore()

  const activeAgents = agents.filter(
    (a) => a.status === 'working' || a.status === 'thinking'
  )

  if (activeAgents.length === 0 && !isGenerating) {
    return (
      <div className="flex items-center gap-2 text-xs text-white/40">
        <div className="w-1.5 h-1.5 rounded-full bg-[#808080]" />
        <span>Ready</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      {/* Active agents */}
      <div className="flex items-center -space-x-2">
        {activeAgents.map((agent) => (
          <motion.div
            key={agent.id}
            className="relative w-7 h-7 rounded-full flex items-center justify-center text-sm border-2 border-[#0a0a0a] bg-[#1a1a1a]"
            animate={agent.status === 'working' ? { scale: [1, 1.05, 1] } : {}}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <span className="text-[10px] font-medium text-[#a1a1a1]">
              {agent.name?.charAt(0) || '?'}
            </span>
            <div
              className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-[#0a0a0a] ${
                agent.status === 'working' ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
          </motion.div>
        ))}
      </div>

      {/* Status text */}
      <div className="text-xs text-white/40">
        <span className="text-emerald-400">{activeAgents.length}</span> agent{activeAgents.length !== 1 ? 's' : ''} active
      </div>

      {/* Divider */}
      <div className="w-px h-4 bg-white/10" />

      {/* Current task */}
      {activeAgents[0]?.currentTask && (
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-white/50 truncate max-w-[200px]">
            {activeAgents[0].currentTask}
          </span>
        </div>
      )}
    </div>
  )
}
