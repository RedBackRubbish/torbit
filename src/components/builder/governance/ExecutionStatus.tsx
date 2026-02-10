'use client'

import { motion } from 'framer-motion'

// ============================================================================
// EXECUTION STATUS
// 
// Subtle, non-intrusive status line during builds.
// This is status, NOT narration.
// 
// UX RULES:
// - Optional subtle status line
// - No agent chatter
// - No token streaming
// - No uncertainty
// ============================================================================

export interface ExecutionStage {
  id: string
  label: string
  status: 'pending' | 'active' | 'complete'
}

interface ExecutionStatusProps {
  isActive: boolean
  stages?: ExecutionStage[]
  currentStage?: string
}

/**
 * Minimal execution status bar
 * Shows: Working... • UI • Backend • Validation
 */
export function ExecutionStatus({ isActive, stages, currentStage }: ExecutionStatusProps) {
  if (!isActive) return null
  
  // Default stages if none provided
  const displayStages = stages || [
    { id: 'ui', label: 'UI', status: 'pending' as const },
    { id: 'backend', label: 'Backend', status: 'pending' as const },
    { id: 'validation', label: 'Validation', status: 'pending' as const },
  ]
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className="flex items-center gap-2 px-3 py-2 text-[12px] text-[#606060]"
    >
      {/* Spinner */}
      <motion.div
        className="w-3 h-3 rounded-full border border-[#333] border-t-[#888]"
        animate={{ rotate: 360 }}
        transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
      />
      
      {/* Label */}
      <span className="text-[#808080]">Working…</span>
      
      {/* Stage dots */}
      <div className="flex items-center gap-1.5 ml-1">
        {displayStages.map((stage, i) => {
          const isCurrentStage = currentStage === stage.id || stage.status === 'active'
          const isComplete = stage.status === 'complete'
          
          return (
            <div key={stage.id} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-[#333]">•</span>}
              <span 
                className={`transition-colors ${
                  isCurrentStage 
                    ? 'text-[#999]' 
                    : isComplete 
                    ? 'text-[#505050]' 
                    : 'text-[#333]'
                }`}
              >
                {stage.label}
              </span>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}

/**
 * Minimal inline status for chat messages
 */
export function InlineStatus({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 text-[12px] text-[#606060]">
      <motion.div
        className="w-2.5 h-2.5 rounded-full border border-[#333] border-t-[#606060]"
        animate={{ rotate: 360 }}
        transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
      />
      <span>{message}</span>
    </div>
  )
}
