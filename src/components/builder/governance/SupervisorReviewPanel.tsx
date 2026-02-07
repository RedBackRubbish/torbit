'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useRef, useState } from 'react'
import { useEscapeToClose } from '@/hooks/useEscapeToClose'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { useFocusTrap } from '@/hooks/useFocusTrap'

// ============================================================================
// SUPERVISOR REVIEW PANEL
// 
// This is the ONLY moment where escalation becomes visible.
// Slides in from the right. Clinical design. No personality.
// 
// UX RULES:
// - Not a chat. A structured decision.
// - No model names. No drama.
// - Fixed structure: Findings → Amendments → Next Step
// ============================================================================

export type VerdictStatus = 'loading' | 'approved' | 'approved-with-amendments' | 'rejected' | 'escalate-to-human'

export interface SupervisorFindings {
  items: string[]
}

export interface SupervisorAmendment {
  number: number
  description: string
}

export interface SupervisorVerdict {
  status: VerdictStatus
  scope: string
  findings: SupervisorFindings
  amendments: SupervisorAmendment[]
  nextStep: string
}

interface SupervisorReviewPanelProps {
  isOpen: boolean
  verdict: SupervisorVerdict | null
  onProceed: () => void
  onDismiss: () => void
  onViewDetails?: () => void
}

export function SupervisorReviewPanel({
  isOpen,
  verdict,
  onProceed,
  onDismiss,
  onViewDetails,
}: SupervisorReviewPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  useEscapeToClose(isOpen, onDismiss)
  useBodyScrollLock(isOpen)
  useFocusTrap(panelRef, isOpen)
  
  const getVerdictLabel = (status: VerdictStatus): string => {
    switch (status) {
      case 'approved': return 'APPROVED'
      case 'approved-with-amendments': return 'APPROVED WITH AMENDMENTS'
      case 'rejected': return 'REJECTED'
      case 'escalate-to-human': return 'REQUIRES HUMAN REVIEW'
      default: return 'REVIEWING'
    }
  }
  
  const getVerdictColor = (status: VerdictStatus): string => {
    switch (status) {
      case 'approved': return 'text-emerald-400'
      case 'approved-with-amendments': return 'text-amber-400'
      case 'rejected': return 'text-red-400'
      case 'escalate-to-human': return 'text-orange-400'
      default: return 'text-neutral-400'
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 z-40"
            onClick={onDismiss}
          />
          
          {/* Panel - slides from right */}
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            ref={panelRef}
            className="fixed right-0 top-0 h-full w-[400px] bg-[#0a0a0a] border-l border-[#1a1a1a] z-50 flex flex-col"
            role="dialog"
            aria-modal="true"
            aria-labelledby="supervisor-review-title"
          >
            {/* Header - Clinical, muted */}
            <div className="px-5 py-4 border-b border-[#1a1a1a]">
              <div className="flex items-center justify-between mb-1">
                <h2 id="supervisor-review-title" className="text-[13px] font-medium text-[#888]">Supervisor Review</h2>
                <button
                  onClick={onDismiss}
                  aria-label="Close supervisor review"
                  className="w-6 h-6 flex items-center justify-center text-[#505050] hover:text-[#888] rounded transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              {verdict && (
                <p className="text-[11px] text-[#505050]">Scope: {verdict.scope}</p>
              )}
            </div>
            
            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5">
              {!verdict || verdict.status === 'loading' ? (
                /* Loading state */
                <div className="flex items-center gap-3 text-[#606060]">
                  <motion.div
                    className="w-4 h-4 rounded-full border-2 border-[#333] border-t-[#606060]"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                  />
                  <span className="text-[13px]">Reviewing plan…</span>
                </div>
              ) : (
                /* Verdict display - structured, not conversational */
                <div className="space-y-5">
                  {/* Verdict Status */}
                  <div className="pb-4 border-b border-[#151515]">
                    <p className="text-[11px] text-[#505050] mb-1">Supervisor Verdict</p>
                    <p className={`text-[14px] font-semibold ${getVerdictColor(verdict.status)}`}>
                      {getVerdictLabel(verdict.status)}
                    </p>
                  </div>
                  
                  {/* Findings */}
                  {verdict.findings.items.length > 0 && (
                    <div>
                      <p className="text-[11px] text-[#505050] mb-2">Findings</p>
                      <ul className="space-y-1.5">
                        {verdict.findings.items.map((finding, i) => (
                          <li key={i} className="flex items-start gap-2 text-[13px] text-[#999]">
                            <span className="text-[#404040] mt-1">•</span>
                            <span>{finding}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* Required Amendments */}
                  {verdict.amendments.length > 0 && (
                    <div>
                      <p className="text-[11px] text-[#505050] mb-2">Required Amendments</p>
                      <ol className="space-y-1.5">
                        {verdict.amendments.map((amendment) => (
                          <li key={amendment.number} className="flex items-start gap-2 text-[13px] text-[#999]">
                            <span className="text-[#505050] font-mono text-[11px] mt-0.5">{amendment.number}.</span>
                            <span>{amendment.description}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                  
                  {/* Next Step */}
                  <div className="pt-4 border-t border-[#151515]">
                    <p className="text-[11px] text-[#505050] mb-2">Next Step</p>
                    <p className="text-[13px] text-[#b3b3b3]">{verdict.nextStep}</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Footer - Actions */}
            {verdict && verdict.status !== 'loading' && (
              <div className="px-5 py-4 border-t border-[#1a1a1a] flex items-center justify-between">
                {onViewDetails && (
                  <button
                    onClick={() => {
                      setIsExpanded(!isExpanded)
                      onViewDetails()
                    }}
                    className="text-[12px] text-[#505050] hover:text-[#888] transition-colors"
                  >
                    View Details
                  </button>
                )}
                <div className="flex items-center gap-2 ml-auto">
                  {verdict.status === 'rejected' && (
                    <button
                      onClick={onDismiss}
                      className="h-8 px-4 text-[12px] font-medium text-[#999] bg-[#151515] hover:bg-[#1a1a1a] rounded-lg transition-colors"
                    >
                      Revise Plan
                    </button>
                  )}
                  {verdict.status !== 'rejected' && (
                    <button
                      onClick={onProceed}
                      className="h-8 px-4 text-[12px] font-medium text-black bg-white hover:bg-neutral-200 rounded-lg transition-colors"
                    >
                      Proceed
                    </button>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
