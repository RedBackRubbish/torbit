'use client'

// ============================================================================
// ESCALATION MESSAGE
// 
// The announcement Torbit makes before showing SupervisorReviewPanel.
// Single message, mandatory structure, no model names.
// ============================================================================

import { motion } from 'framer-motion'

interface EscalationMessageProps {
  scope: 'architecture' | 'security' | 'payment' | 'export' | 'auth'
}

const SCOPE_LABELS: Record<string, string> = {
  architecture: 'core architecture',
  security: 'security configuration',
  payment: 'payment processing',
  export: 'export pipeline',
  auth: 'authentication flow',
}

/**
 * Torbit's escalation announcement
 * 
 * Format (mandatory):
 * "This affects [scope] and safety.
 * Requesting supervisor review."
 */
export function EscalationMessage({ scope }: EscalationMessageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="py-3"
    >
      {/* Agent Header */}
      <div className="flex items-center gap-2.5 mb-2">
        <div className="w-2 h-2 rounded-full bg-amber-500/70" />
        <span className="text-[14px] font-medium text-[#e5e5e5]">Torbit</span>
      </div>
      
      <div className="pl-4 border-l border-amber-500/20">
        <p className="text-[13px] text-[#b3b3b3] leading-relaxed">
          This affects {SCOPE_LABELS[scope] || scope} and safety.
          <br />
          <span className="text-[#999]">Requesting supervisor review.</span>
        </p>
      </div>
    </motion.div>
  )
}

/**
 * Completion message after supervisor approval
 */
export function EscalationResolved() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="py-3"
    >
      <div className="flex items-center gap-2.5 mb-2">
        <div className="w-2 h-2 rounded-full bg-emerald-500/70" />
        <span className="text-[14px] font-medium text-[#e5e5e5]">Torbit</span>
      </div>
      
      <div className="pl-4 border-l border-emerald-500/20">
        <p className="text-[13px] text-[#b3b3b3]">
          Review complete. Applying amendments.
        </p>
      </div>
    </motion.div>
  )
}
