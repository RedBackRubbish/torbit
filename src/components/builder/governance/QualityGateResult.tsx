'use client'

import { motion } from 'framer-motion'

// ============================================================================
// QUALITY GATE RESULT
// 
// Inline display for Auditor verdicts. NOT a side panel.
// 
// UX RULES:
// - If Auditor PASSES: No panel, no modal. Just a single line in chat.
// - If Auditor FAILS: Shows inline, no blame, no agent mention.
// - Auto-resolve messaging: "Correcting issues and re-running checks."
// ============================================================================

export interface QualityIssue {
  description: string
  severity?: 'warning' | 'error'
}

export interface QualityGateVerdict {
  passed: boolean
  issues: QualityIssue[]
  resolution?: string
}

interface QualityGateResultProps {
  verdict: QualityGateVerdict
  showResolution?: boolean
}

/**
 * Inline component for quality gate results
 * Only renders if there are issues - silence is confidence
 */
export function QualityGateResult({ verdict, showResolution = true }: QualityGateResultProps) {
  // Silence is confidence - if passed, render nothing
  if (verdict.passed || verdict.issues.length === 0) {
    return null
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-red-500/10 bg-red-500/5 overflow-hidden"
    >
      {/* Header */}
      <div className="px-3.5 py-2.5 border-b border-red-500/10 flex items-center gap-2">
        <svg 
          className="w-3.5 h-3.5 text-red-400" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor" 
          strokeWidth={2}
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" 
          />
        </svg>
        <span className="text-[13px] font-medium text-red-400">Quality Check Failed</span>
      </div>
      
      {/* Issues */}
      <div className="px-3.5 py-3 space-y-2">
        <div>
          <p className="text-[11px] text-[#505050] mb-1.5">Issues</p>
          <ul className="space-y-1">
            {verdict.issues.map((issue, i) => (
              <li key={i} className="flex items-start gap-2 text-[13px] text-[#999]">
                <span className="text-red-400/50 mt-0.5">•</span>
                <span>{issue.description}</span>
              </li>
            ))}
          </ul>
        </div>
        
        {/* Resolution */}
        {showResolution && (
          <div className="pt-2 border-t border-red-500/10">
            <p className="text-[11px] text-[#505050] mb-1">Resolution</p>
            <p className="text-[13px] text-[#b3b3b3]">
              {verdict.resolution || 'Correcting issues and re-running checks.'}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  )
}

/**
 * Success badge for when quality checks pass
 * Minimal, non-intrusive - silence is confidence
 */
export function QualityGateSuccess() {
  return (
    <div className="flex items-center gap-2 text-[13px] text-[#999]">
      <svg 
        className="w-3.5 h-3.5 text-emerald-500" 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor" 
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
      </svg>
      <span>Checks passed. Ready to export.</span>
    </div>
  )
}

/**
 * Resolved badge for export screen
 * Shows completed governance checks
 */
export function GovernanceResolved({ 
  supervisorReviewed = false, 
  qualityPassed = false 
}: { 
  supervisorReviewed?: boolean
  qualityPassed?: boolean
}) {
  if (!supervisorReviewed && !qualityPassed) return null
  
  return (
    <div className="flex flex-col gap-1.5">
      {supervisorReviewed && (
        <div className="flex items-center gap-2 text-[12px] text-[#606060]">
          <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          <span>Supervisor review completed</span>
        </div>
      )}
      {qualityPassed && (
        <div className="flex items-center gap-2 text-[12px] text-[#606060]">
          <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          <span>Quality gates passed</span>
        </div>
      )}
    </div>
  )
}
