'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useTimeline, type TimelineStep, type AgentType } from '@/store/timeline'

/**
 * NeuralTimeline - Activity feed showing agent progress
 */

// Agent Icons
function AgentIcon({ agent, className }: { agent: AgentType; className?: string }) {
  const iconClass = `w-3.5 h-3.5 ${className || ''}`
  
  switch (agent) {
    case 'Planner':
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      )
    case 'Architect':
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
        </svg>
      )
    case 'Builder':
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
        </svg>
      )
    case 'Auditor':
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
      )
    case 'DevOps':
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
        </svg>
      )
    default:
      return null
  }
}

// Status styling
function getStepStyles(step: TimelineStep) {
  switch (step.status) {
    case 'thinking':
      return {
        node: 'bg-blue-500/10 border-blue-500/30',
        icon: 'text-blue-400',
        label: 'text-blue-400',
      }
    case 'active':
      return {
        node: 'bg-amber-500/10 border-amber-500/30',
        icon: 'text-amber-400',
        label: 'text-amber-400',
      }
    case 'auditing':
      return {
        node: 'bg-purple-500/10 border-purple-500/30',
        icon: 'text-purple-400',
        label: 'text-purple-400',
      }
    case 'complete':
      return {
        node: 'bg-[#c0c0c0]/10 border-[#c0c0c0]/30',
        icon: 'text-[#c0c0c0]',
        label: 'text-[#a1a1a1]',
      }
    case 'failed':
      return {
        node: 'bg-red-500/10 border-red-500/30',
        icon: 'text-red-400',
        label: 'text-red-400',
      }
    default:
      return {
        node: 'bg-[#1a1a1a] border-[#262626]',
        icon: 'text-[#525252]',
        label: 'text-[#525252]',
      }
  }
}

function TimelineNode({ step, index, isLast }: { step: TimelineStep; index: number; isLast: boolean }) {
  const styles = getStepStyles(step)
  const isActive = step.status === 'active' || step.status === 'thinking' || step.status === 'auditing'
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.2 }}
      className="relative flex items-start gap-3"
    >
      {/* Vertical Line */}
      {!isLast && (
        <div className="absolute left-[11px] top-6 w-px h-[calc(100%+8px)] bg-[#1f1f1f]" />
      )}
      
      {/* Node */}
      <div className={`relative z-10 w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 ${styles.node}`}>
        <AgentIcon agent={step.agent} className={styles.icon} />
        {isActive && (
          <span className="absolute inset-0 rounded-lg border-2 border-current animate-ping opacity-30" 
                style={{ borderColor: step.status === 'auditing' ? '#a855f7' : step.status === 'thinking' ? '#3b82f6' : '#eab308' }} 
          />
        )}
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0 pb-5">
        <div className="flex items-center gap-2">
          <span className={`text-[12px] font-medium ${styles.label}`}>
            {step.label}
          </span>
          
          {step.status === 'complete' && (
            <svg className="w-3 h-3 text-[#c0c0c0]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          )}
          {step.status === 'failed' && (
            <svg className="w-3 h-3 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </div>
        
        {step.description && (
          <p className="text-[11px] text-[#525252] mt-0.5 truncate">
            {step.description}
          </p>
        )}
        
        {step.fuelCost && step.status !== 'complete' && (
          <span className="inline-flex items-center gap-1 text-[10px] text-amber-500/80 mt-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            {step.fuelCost} tokens
          </span>
        )}
        
        {/* Thinking Output */}
        <AnimatePresence>
          {isActive && step.thinkingOutput && step.thinkingOutput.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2"
            >
              <div className="text-[10px] font-mono text-[#525252] border-l border-[#262626] pl-2 space-y-0.5">
                {step.thinkingOutput.slice(-3).map((line, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="truncate"
                  >
                    {line}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {step.status === 'failed' && step.error && (
          <p className="text-[10px] text-red-400/80 mt-1 truncate">
            {step.error}
          </p>
        )}
        
        {step.status === 'complete' && step.startedAt && step.completedAt && (
          <span className="text-[10px] text-[#404040] mt-1 block">
            {formatDuration(step.completedAt - step.startedAt)}
          </span>
        )}
      </div>
    </motion.div>
  )
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
}

export default function NeuralTimeline() {
  const { steps, clearTimeline } = useTimeline()
  
  const completedCount = steps.filter(s => s.status === 'complete').length
  const totalCount = steps.length
  
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1f1f1f]">
        <div className="flex items-center gap-2">
          <div className="relative">
            <svg className="w-4 h-4 text-[#525252]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
            {steps.some(s => s.status === 'active' || s.status === 'thinking') && (
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
            )}
          </div>
          <span className="text-[12px] font-medium text-[#737373]">Activity</span>
        </div>
        
        <div className="flex items-center gap-2">
          {totalCount > 0 && (
            <span className="text-[10px] text-[#525252]">
              {completedCount}/{totalCount}
            </span>
          )}
          
          {totalCount > 0 && (
            <button
              onClick={clearTimeline}
              className="p-1 text-[#525252] hover:text-[#a1a1a1] transition-colors"
              title="Clear"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </button>
          )}
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {steps.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <div className="w-10 h-10 rounded-lg bg-[#1a1a1a] border border-[#262626] flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-[#404040]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
            </div>
            <p className="text-[13px] text-[#737373] mb-1">No activity yet</p>
            <p className="text-[12px] text-[#525252]">Agent actions will appear here</p>
          </div>
        ) : (
          <div className="p-4">
            {steps.map((step, index) => (
              <TimelineNode 
                key={step.id} 
                step={step} 
                index={index}
                isLast={index === steps.length - 1}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
