'use client'

import { motion } from 'framer-motion'
import { useBuilderStore } from '@/store/builder'

const AGENT_ICONS: Record<string, string> = {
  architect: '◆',
  frontend: '◇',
  backend: '⬡',
  database: '⬢',
  devops: '△',
  qa: '○',
}

/**
 * AgentStatusBar - Compact status bar showing active agents
 */
export default function AgentStatusBar() {
  const { agents, isGenerating } = useBuilderStore()
  
  const activeAgents = agents.filter(
    (a) => a.status === 'working' || a.status === 'thinking'
  )
  const workingAgent = agents.find((a) => a.status === 'working')

  return (
    <div className="flex items-center gap-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
      {/* Active agents */}
      <div className="flex items-center -space-x-1">
        {agents.map((agent) => {
          const isActive = agent.status === 'working' || agent.status === 'thinking'
          const isComplete = agent.status === 'complete'
          
          return (
            <motion.div
              key={agent.id}
              className={`relative w-7 h-7 rounded-md flex items-center justify-center text-xs border transition-all duration-300 ${
                isActive
                  ? 'border-transparent z-10'
                  : isComplete
                  ? 'border-green-500/30 bg-green-500/10'
                  : 'border-neutral-700 bg-neutral-800/50'
              }`}
              style={{ 
                backgroundColor: isActive ? `${agent.color}20` : undefined,
                borderColor: isActive ? `${agent.color}50` : undefined,
              }}
              animate={isActive ? { scale: [1, 1.05, 1] } : {}}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <span 
                className={`${isActive ? '' : isComplete ? 'text-green-500/60' : 'text-neutral-500'}`}
                style={{ color: isActive ? agent.color : undefined }}
              >
                {AGENT_ICONS[agent.id]}
              </span>
              
              {isActive && (
                <motion.div
                  className="absolute inset-0 rounded-md"
                  style={{ boxShadow: `0 0 10px ${agent.color}40` }}
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}
            </motion.div>
          )
        })}
      </div>
      
      {/* Divider */}
      <div className="w-px h-5 bg-neutral-700" />
      
      {/* Status text */}
      {isGenerating ? (
        <div className="flex items-center gap-2">
          <motion.div
            className="w-1.5 h-1.5 rounded-full bg-blue-500"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
          <span className="text-xs text-neutral-400">
            {workingAgent ? (
              <>
                <span style={{ color: workingAgent.color }}>{workingAgent.name}</span>
                {' · '}
                <span className="text-neutral-500">{workingAgent.currentTask || 'Working...'}</span>
              </>
            ) : (
              'Processing...'
            )}
          </span>
        </div>
      ) : (
        <span className="text-xs text-neutral-500">
          {activeAgents.length > 0 ? (
            <>
              <span className="text-blue-400">{activeAgents.length}</span> agent{activeAgents.length > 1 ? 's' : ''} active
            </>
          ) : (
            'Ready'
          )}
        </span>
      )}
    </div>
  )
}
