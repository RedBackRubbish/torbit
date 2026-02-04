'use client'

import { motion } from 'framer-motion'

/**
 * AgentStatus - Compact status bar showing active agents
 */
export default function AgentStatus() {
  const activeAgents = [
    { id: 'frontend', avatar: '🎨', color: '#00d4ff', status: 'working' },
    { id: 'backend', avatar: '⚙️', color: '#ff6b00', status: 'thinking' },
  ]

  return (
    <div className="flex items-center gap-3">
      {/* Active agents */}
      <div className="flex items-center -space-x-2">
        {activeAgents.map((agent) => (
          <motion.div
            key={agent.id}
            className="relative w-7 h-7 rounded-full flex items-center justify-center text-sm border-2 border-[#0a0a0a]"
            style={{ backgroundColor: `${agent.color}30` }}
            animate={agent.status === 'working' ? { scale: [1, 1.05, 1] } : {}}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            {agent.avatar}
            <div 
              className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-[#0a0a0a] ${
                agent.status === 'working' ? 'bg-[#00ff41]' : 'bg-yellow-500'
              }`}
            />
          </motion.div>
        ))}
      </div>
      
      {/* Status text */}
      <div className="text-xs text-white/40">
        <span className="text-[#00ff41]">2</span> agents active
      </div>
      
      {/* Divider */}
      <div className="w-px h-4 bg-white/10" />
      
      {/* Current task */}
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-[#00ff41] animate-pulse" />
        <span className="text-xs text-white/50">
          Building dashboard components...
        </span>
      </div>
    </div>
  )
}
