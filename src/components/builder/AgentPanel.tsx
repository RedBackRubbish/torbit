'use client'

import { motion } from 'framer-motion'
import { useBuilderStore, Agent } from '@/store/builder'

const AGENT_ICONS: Record<string, string> = {
  architect: '◆',
  frontend: '◇',
  backend: '⬡',
  database: '⬢',
  devops: '△',
  qa: '○',
}

const STATUS_STYLES = {
  idle: {
    ring: 'border-white/10',
    bg: 'bg-white/5',
    text: 'text-white/30',
    label: 'Standby',
  },
  thinking: {
    ring: 'border-yellow-500/50',
    bg: 'bg-yellow-500/10',
    text: 'text-yellow-500',
    label: 'Thinking',
  },
  working: {
    ring: 'border-[#00ff41]/50',
    bg: 'bg-[#00ff41]/10',
    text: 'text-[#00ff41]',
    label: 'Working',
  },
  complete: {
    ring: 'border-[#00ff41]',
    bg: 'bg-[#00ff41]/20',
    text: 'text-[#00ff41]',
    label: 'Done',
  },
  error: {
    ring: 'border-red-500/50',
    bg: 'bg-red-500/10',
    text: 'text-red-500',
    label: 'Error',
  },
}

interface AgentCardProps {
  agent: Agent
}

function AgentCard({ agent }: AgentCardProps) {
  const styles = STATUS_STYLES[agent.status]
  const isActive = agent.status === 'working' || agent.status === 'thinking'

  return (
    <motion.div
      className={`relative p-3 rounded-lg border ${styles.ring} ${styles.bg} transition-all duration-300`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
    >
      {/* Active indicator */}
      {isActive && (
        <motion.div
          className="absolute inset-0 rounded-lg"
          style={{ 
            boxShadow: `0 0 20px ${agent.color}20`,
            border: `1px solid ${agent.color}30`,
          }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
      
      <div className="relative flex items-start gap-3">
        {/* Avatar */}
        <div 
          className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${
            isActive ? 'animate-pulse' : ''
          }`}
          style={{ backgroundColor: `${agent.color}20`, color: agent.color }}
        >
          {AGENT_ICONS[agent.id]}
        </div>
        
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-white/90 text-sm font-medium">{agent.name}</span>
            <span className={`text-[10px] uppercase tracking-wider ${styles.text}`}>
              {styles.label}
            </span>
          </div>
          <p className="text-white/30 text-xs mt-0.5">{agent.role}</p>
          
          {agent.currentTask && (
            <motion.div
              className="mt-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <p className={`text-xs ${styles.text} truncate`}>
                {isActive && <span className="animate-pulse mr-1">●</span>}
                {agent.currentTask}
              </p>
              {agent.progress !== undefined && (
                <div className="mt-1 h-1 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: agent.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${agent.progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

/**
 * AgentPanel - Visual representation of the 6 AI agents
 */
export default function AgentPanel() {
  const { agents } = useBuilderStore()

  return (
    <div className="h-full overflow-y-auto p-3 space-y-2 custom-scrollbar">
      {agents.map((agent, i) => (
        <motion.div
          key={agent.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1 }}
        >
          <AgentCard agent={agent} />
        </motion.div>
      ))}
    </div>
  )
}
