'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { ShieldCheck, AlertCircle, CheckCircle2, X, Loader2, Zap } from 'lucide-react'

// ============================================================================
// SUPERVISOR SLIDE PANEL
// 
// Clean slide-in panel from the right side.
// Shows what Torbit is fixing. Fixes are auto-applied, no button needed.
// ============================================================================

export interface SupervisorFix {
  id: string
  feature: string
  description: string
  severity: 'critical' | 'recommended'
  status: 'pending' | 'fixing' | 'complete'
}

export interface SupervisorSuggestion {
  id: string
  idea: string
  description: string
  effort: 'quick' | 'moderate' | 'significant'
}

export interface SupervisorReviewResult {
  status: 'APPROVED' | 'NEEDS_FIXES'
  summary: string
  fixes: SupervisorFix[]
  suggestions?: SupervisorSuggestion[]
}

interface SupervisorSlidePanelProps {
  isOpen: boolean
  isLoading?: boolean
  result: SupervisorReviewResult | null
  onDismiss: () => void
}

export function SupervisorSlidePanel({
  isOpen,
  isLoading = false,
  result,
  onDismiss,
}: SupervisorSlidePanelProps) {
  const criticalCount = result?.fixes.filter(f => f.severity === 'critical').length || 0
  const recommendedCount = result?.fixes.filter(f => f.severity === 'recommended').length || 0
  const completedCount = result?.fixes.filter(f => f.status === 'complete').length || 0
  const isFixing = result?.fixes.some(f => f.status === 'fixing')
  const allComplete = result?.fixes.every(f => f.status === 'complete')

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Subtle backdrop - doesn't block interaction */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/20 z-40"
            onClick={onDismiss}
          />
          
          {/* Panel - slides from right */}
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="fixed right-0 top-0 h-full w-[360px] bg-[#0d0d0d] border-l border-[#1a1a1a] z-50 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-amber-500/10 flex items-center justify-center">
                  <ShieldCheck className="w-3 h-3 text-amber-400" />
                </div>
                <span className="text-[13px] font-medium text-[#e5e5e5]">Supervisor</span>
              </div>
              <button
                onClick={onDismiss}
                className="w-6 h-6 flex items-center justify-center text-[#505050] hover:text-[#888] rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4">
              {isLoading ? (
                /* Loading state */
                <div className="flex items-center gap-3 py-8 justify-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                  >
                    <Loader2 className="w-4 h-4 text-amber-400" />
                  </motion.div>
                  <span className="text-[13px] text-[#707070]">Reviewing build...</span>
                </div>
              ) : result?.status === 'APPROVED' ? (
                /* Approved state */
                <div className="space-y-4">
                  <div className="py-6 text-center">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
                      <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                    </div>
                    <p className="text-[14px] font-medium text-emerald-400 mb-1">Build Approved</p>
                    <p className="text-[12px] text-[#606060]">All requirements verified</p>
                  </div>
                  
                  {/* Suggestions for improvement */}
                  {result.suggestions && result.suggestions.length > 0 && (
                    <div className="border-t border-[#151515] pt-4">
                      <p className="text-[11px] uppercase tracking-wider text-[#505050] mb-3">
                        Suggestions for improvement
                      </p>
                      <div className="space-y-2">
                        {result.suggestions.map((suggestion) => (
                          <div
                            key={suggestion.id}
                            className="p-3 rounded-lg bg-[#111] border border-[#1a1a1a]"
                          >
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <p className="text-[13px] font-medium text-[#c5c5c5]">
                                {suggestion.idea}
                              </p>
                              <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                suggestion.effort === 'quick' 
                                  ? 'bg-emerald-500/10 text-emerald-400'
                                  : suggestion.effort === 'moderate'
                                  ? 'bg-amber-500/10 text-amber-400'
                                  : 'bg-blue-500/10 text-blue-400'
                              }`}>
                                {suggestion.effort}
                              </span>
                            </div>
                            <p className="text-[12px] text-[#707070] leading-relaxed">
                              {suggestion.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : result?.status === 'NEEDS_FIXES' ? (
                /* Fixes needed */
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="pb-3 border-b border-[#151515]">
                    <p className="text-[12px] text-[#606060] mb-1">Review Summary</p>
                    <p className="text-[13px] text-[#b3b3b3] leading-relaxed">{result.summary}</p>
                  </div>
                  
                  {/* Fix counts */}
                  <div className="flex items-center gap-3 text-[11px]">
                    {criticalCount > 0 && (
                      <span className="flex items-center gap-1 text-red-400">
                        <AlertCircle className="w-3 h-3" />
                        {criticalCount} critical
                      </span>
                    )}
                    {recommendedCount > 0 && (
                      <span className="flex items-center gap-1 text-amber-400">
                        <Zap className="w-3 h-3" />
                        {recommendedCount} recommended
                      </span>
                    )}
                    {isFixing && (
                      <span className="flex items-center gap-1 text-blue-400 ml-auto">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        {completedCount}/{result.fixes.length}
                      </span>
                    )}
                  </div>
                  
                  {/* Fix items */}
                  <div className="space-y-2">
                    {result.fixes.map((fix) => (
                      <motion.div
                        key={fix.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`p-3 rounded-lg border transition-colors ${
                          fix.status === 'complete' 
                            ? 'bg-emerald-500/5 border-emerald-500/20' 
                            : fix.status === 'fixing'
                            ? 'bg-blue-500/5 border-blue-500/20'
                            : 'bg-[#111] border-[#1a1a1a]'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {/* Status icon */}
                          <div className="mt-0.5">
                            {fix.status === 'complete' ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            ) : fix.status === 'fixing' ? (
                              <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />
                            ) : fix.severity === 'critical' ? (
                              <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                            ) : (
                              <Zap className="w-3.5 h-3.5 text-amber-400" />
                            )}
                          </div>
                          
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <p className={`text-[12px] font-medium ${
                              fix.status === 'complete' ? 'text-emerald-400' : 'text-[#e5e5e5]'
                            }`}>
                              {fix.feature}
                            </p>
                            <p className="text-[11px] text-[#606060] mt-0.5 leading-relaxed">
                              {fix.description}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
            
            {/* Footer - Progress indicator (no button, auto-fixes) */}
            {result && result.status !== 'APPROVED' && !allComplete && isFixing && (
              <div className="px-4 py-3 border-t border-[#1a1a1a]">
                <div className="flex items-center justify-center gap-2 text-[12px] text-blue-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Torbit is fixing {completedCount}/{result.fixes.length}...</span>
                </div>
              </div>
            )}
            
            {/* All complete */}
            {allComplete && result && (
              <div className="px-4 py-3 border-t border-[#1a1a1a]">
                <div className="flex items-center justify-center gap-2 text-[12px] text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>All fixes applied</span>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
