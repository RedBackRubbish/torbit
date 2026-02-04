'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useTimeline, type TimelineStep, type AgentType } from '@/store/timeline'

/**
 * NeuralTimeline - The Visual Brain
 * 
 * A vertical "Subway Map" showing agent activity in real-time.
 * Nodes change color based on agent state:
 * 
 * 🔵 Thinking (Planner/Architect)
 * 🟡 Building (Builder) -> Shows Fuel Ghost Usage
 * 🟣 Auditing (Auditor) -> Pulsing (Risk State)
 * 🟢 Complete
 * 🔴 Failed
 */

// Agent Icons as inline SVGs for performance
function AgentIcon({ agent, className }: { agent: AgentType; className?: string }) {
  const iconClass = `w-4 h-4 ${className || ''}`
  
  switch (agent) {
    case 'Planner':
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      )
    case 'Architect':
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      )
    case 'Builder':
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    case 'Auditor':
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      )
    case 'DevOps':
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
        </svg>
      )
    default:
      return null
  }
}

// Status-based styling
function getStepStyles(step: TimelineStep) {
  switch (step.status) {
    case 'thinking':
      return {
        node: 'bg-cyan-500/20 border-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.5)]',
        icon: 'text-cyan-400',
        label: 'text-cyan-400',
        line: 'from-cyan-500/50',
      }
    case 'active':
      return {
        node: 'bg-yellow-500/20 border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.6)]',
        icon: 'text-yellow-400',
        label: 'text-yellow-400',
        line: 'from-yellow-500/50',
      }
    case 'auditing':
      return {
        node: 'bg-purple-500/20 border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.6)] animate-pulse',
        icon: 'text-purple-400',
        label: 'text-purple-400',
        line: 'from-purple-500/50',
      }
    case 'complete':
      return {
        node: 'bg-emerald-500/20 border-emerald-500',
        icon: 'text-emerald-400',
        label: 'text-neutral-400',
        line: 'from-emerald-500/30',
      }
    case 'failed':
      return {
        node: 'bg-red-500/20 border-red-500',
        icon: 'text-red-400',
        label: 'text-red-400',
        line: 'from-red-500/30',
      }
    default: // pending
      return {
        node: 'bg-neutral-800 border-neutral-600',
        icon: 'text-neutral-500',
        label: 'text-neutral-500',
        line: 'from-neutral-600/30',
      }
  }
}

function TimelineNode({ step, index, isLast }: { step: TimelineStep; index: number; isLast: boolean }) {
  const styles = getStepStyles(step)
  const isActive = step.status === 'active' || step.status === 'thinking' || step.status === 'auditing'
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08, duration: 0.3 }}
      className="relative flex items-start gap-3 group"
    >
      {/* Vertical Line (connecting to next node) */}
      {!isLast && (
        <div 
          className={`absolute left-[13px] top-8 w-0.5 h-[calc(100%+16px)] bg-gradient-to-b ${styles.line} to-transparent`}
        />
      )}
      
      {/* The Node */}
      <div className={`
        relative z-10 flex items-center justify-center w-7 h-7 rounded-full border-2 transition-all duration-300
        ${styles.node}
      `}>
        <AgentIcon agent={step.agent} className={styles.icon} />
        
        {/* Pulse ring for active states */}
        {isActive && (
          <span className="absolute inset-0 rounded-full animate-ping opacity-30 border-2 border-current" 
                style={{ borderColor: step.status === 'auditing' ? '#a855f7' : step.status === 'thinking' ? '#22d3ee' : '#facc15' }} 
          />
        )}
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0 pb-6">
        {/* Header */}
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${styles.label}`}>
            {step.label}
          </span>
          
          {/* Status Badge */}
          {step.status === 'complete' && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-medium">
              ✓
            </span>
          )}
          {step.status === 'failed' && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-medium">
              ✗
            </span>
          )}
        </div>
        
        {/* Description */}
        {step.description && (
          <p className="text-xs text-neutral-500 mt-0.5 truncate">
            {step.description}
          </p>
        )}
        
        {/* Fuel Cost (Risk indicator for pending builder work) */}
        {step.fuelCost && step.status !== 'complete' && (
          <motion.span 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="inline-flex items-center gap-1 text-[10px] font-mono text-amber-500/80 mt-1.5"
          >
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            {step.fuelCost} Fuel Risk
          </motion.span>
        )}
        
        {/* Thinking Output (Live stream) */}
        <AnimatePresence>
          {isActive && step.thinkingOutput && step.thinkingOutput.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2 overflow-hidden"
            >
              <div className="text-[11px] font-mono text-neutral-500 border-l-2 border-neutral-700 pl-2 space-y-0.5">
                {step.thinkingOutput.map((line, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="truncate"
                  >
                    {line}
                  </motion.div>
                ))}
                {/* Blinking cursor */}
                <span className="inline-block w-1.5 h-3 bg-neutral-500 animate-pulse" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Error Message */}
        {step.status === 'failed' && step.error && (
          <p className="text-xs text-red-400/80 mt-1 truncate">
            {step.error}
          </p>
        )}
        
        {/* Duration (for completed steps) */}
        {step.status === 'complete' && step.startedAt && step.completedAt && (
          <span className="text-[10px] text-neutral-600 mt-1 block">
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
  const { steps, isExpanded, setExpanded, clearTimeline } = useTimeline()
  
  const completedCount = steps.filter(s => s.status === 'complete').length
  const totalCount = steps.length
  
  return (
    <div className="flex flex-col h-full bg-neutral-900/50 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          {/* Neural Link Icon */}
          <div className="relative">
            <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            {steps.some(s => s.status === 'active' || s.status === 'thinking') && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
            )}
          </div>
          <h3 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
            Neural Link
          </h3>
        </div>
        
        {/* Progress & Controls */}
        <div className="flex items-center gap-2">
          {totalCount > 0 && (
            <span className="text-[10px] font-mono text-neutral-500">
              {completedCount}/{totalCount}
            </span>
          )}
          
          <button
            onClick={() => setExpanded(!isExpanded)}
            className="p-1 text-neutral-500 hover:text-neutral-300 transition-colors"
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            <svg 
              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor" 
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {totalCount > 0 && (
            <button
              onClick={clearTimeline}
              className="p-1 text-neutral-500 hover:text-red-400 transition-colors"
              aria-label="Clear timeline"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>
      
      {/* Timeline Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex-1 overflow-y-auto"
          >
            {steps.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-center px-4">
                <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center mb-3">
                  <svg className="w-5 h-5 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <p className="text-sm text-neutral-500">No activity yet</p>
                <p className="text-xs text-neutral-600 mt-1">Agent actions will appear here</p>
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
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Collapsed Summary */}
      {!isExpanded && totalCount > 0 && (
        <div className="px-4 py-2 text-xs text-neutral-500">
          {completedCount === totalCount 
            ? `✓ All ${totalCount} steps complete`
            : `${totalCount - completedCount} steps remaining...`
          }
        </div>
      )}
    </div>
  )
}
