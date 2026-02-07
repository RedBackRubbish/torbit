'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useFuelStore } from '@/store/fuel'
import RefuelModal from './RefuelModal'
import { useEscapeToClose } from '@/hooks/useEscapeToClose'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'

/**
 * TierBadge - Shows current subscription tier
 */
function TierBadge() {
  const { tier } = useFuelStore()
  
  const config = {
    standard: { label: 'Free', color: 'text-neutral-500', bg: 'bg-neutral-800' },
    pro: { label: 'Pro', color: 'text-[#c0c0c0]', bg: 'bg-[#c0c0c0]/10' },
    enterprise: { label: 'Team', color: 'text-purple-400', bg: 'bg-purple-500/10' },
  }[tier] || { label: 'Free', color: 'text-neutral-500', bg: 'bg-neutral-800' }
  
  return (
    <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${config.bg} ${config.color}`}>
      {config.label}
    </span>
  )
}

/**
 * FuelGauge - Clean, minimal token/credit display
 */
export default function FuelGauge() {
  const {
    currentFuel,
    maxFuel,
    ghostUsage,
    estimatedRange,
    pendingBuilderCost,
    isAuditorChecking,
    showAuthorizeBurn,
    pendingTaskDescription,
    authorizeBurn,
    cancelBurn,
    getFuelPercentage,
    getFuelStatus,
  } = useFuelStore()

  const [showDetails, setShowDetails] = useState(false)
  const [showRefuelModal, setShowRefuelModal] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEscapeToClose(showAuthorizeBurn, cancelBurn)
  useBodyScrollLock(showAuthorizeBurn)

  // Prevent hydration mismatch - only render dynamic values after mount
  useEffect(() => {
    setIsMounted(true)
  }, [])

  const percentage = getFuelPercentage()
  const status = getFuelStatus()

  const statusConfig = {
    full: { color: 'text-[#c0c0c0]', bg: 'bg-[#c0c0c0]', label: 'Full' },
    good: { color: 'text-[#a8a8a8]', bg: 'bg-[#a8a8a8]', label: 'Good' },
    low: { color: 'text-amber-400', bg: 'bg-amber-500', label: 'Low' },
    critical: { color: 'text-red-400', bg: 'bg-red-500', label: 'Critical' },
  }[status]

  // Use consistent initial values for SSR
  const displayConfig = isMounted ? statusConfig : { color: 'text-[#808080]', bg: 'bg-[#808080]', label: 'Loading' }
  const displayFuel = isMounted ? currentFuel : 0
  const displayPercentage = isMounted ? percentage : 0
  const displayGhostUsage = isMounted ? ghostUsage : 0

  const ghostPercentage = displayGhostUsage > 0 ? (displayGhostUsage / maxFuel) * 100 : 0
  const afterGhostPercentage = Math.max(0, displayPercentage - ghostPercentage)

  return (
    <>
      <div className="flex items-center gap-2" data-testid="fuel-gauge">
        {/* Fuel Display */}
        <div
          className="relative"
          onMouseEnter={() => setShowDetails(true)}
          onMouseLeave={() => setShowDetails(false)}
        >
          <motion.div
            className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[#0a0a0a] border border-[#1a1a1a] cursor-pointer hover:border-[#333] transition-colors"
            whileHover={{ scale: 1.01 }}
          >
            {/* Progress bar */}
            <div className="relative w-16 h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
              {displayGhostUsage > 0 && (
                <motion.div
                  className="absolute inset-y-0 left-0 bg-red-500/30"
                  style={{ width: `${displayPercentage}%` }}
                  animate={{ opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              )}
              <motion.div
                className={`absolute inset-y-0 left-0 ${displayConfig.bg} rounded-full`}
                initial={{ width: 0 }}
                animate={{ width: `${displayGhostUsage > 0 ? afterGhostPercentage : displayPercentage}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
              {isAuditorChecking && isMounted && (
                <motion.div
                  className="absolute inset-0 bg-amber-400/30"
                  animate={{ opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                />
              )}
            </div>

            {/* Amount */}
            <span className={`text-[13px] font-medium ${displayConfig.color}`}>
              {displayFuel.toLocaleString()}
            </span>

            {/* Ghost preview */}
            <AnimatePresence>
              {displayGhostUsage > 0 && (
                <motion.span
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -4 }}
                  className="text-[12px] text-red-400/70"
                >
                  -{displayGhostUsage}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Details Popover */}
          <AnimatePresence>
            {showDetails && isMounted && (
              <motion.div
                initial={{ opacity: 0, y: 4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full right-0 mt-2 w-64 p-4 bg-[#050505] border border-[#1a1a1a] rounded-xl shadow-xl z-50"
              >
                {/* Tier Badge */}
                <div className="flex items-center justify-between mb-3 pb-3 border-b border-[#1a1a1a]">
                  <TierBadge />
                  <a 
                    href="/dashboard/billing" 
                    className="text-[10px] text-[#505050] hover:text-[#808080] transition-colors"
                  >
                    Manage →
                  </a>
                </div>
                
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-[12px] font-medium ${statusConfig.color}`}>
                    {statusConfig.label}
                  </span>
                  <span className="text-[12px] text-[#505050]">{percentage}%</span>
                </div>

                {/* Full bar */}
                <div className="relative h-2 bg-[#151515] rounded-full overflow-hidden mb-4">
                  <motion.div
                    className={`absolute inset-y-0 left-0 ${statusConfig.bg}`}
                    style={{ width: `${percentage}%` }}
                  />
                  {ghostUsage > 0 && (
                    <motion.div
                      className="absolute inset-y-0 bg-red-500/50"
                      style={{ 
                        left: `${afterGhostPercentage}%`,
                        width: `${ghostPercentage}%` 
                      }}
                      animate={{ opacity: [0.3, 0.7, 0.3] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                  )}
                </div>

                {/* Stats */}
                <div className="space-y-2 text-[12px]">
                  <div className="flex justify-between">
                    <span className="text-[#505050]">Current</span>
                    <span className="text-[#a8a8a8]">{currentFuel.toLocaleString()} tokens</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#505050]">Capacity</span>
                    <span className="text-[#a8a8a8]">{maxFuel.toLocaleString()} tokens</span>
                  </div>
                  {pendingBuilderCost > 0 && (
                    <div className="flex justify-between text-amber-400">
                      <span>Pending</span>
                      <span>{pendingBuilderCost} tokens</span>
                    </div>
                  )}
                  {ghostUsage > 0 && estimatedRange && (
                    <div className="flex justify-between text-red-400">
                      <span>Estimated</span>
                      <span>{estimatedRange.min}-{estimatedRange.max}</span>
                    </div>
                  )}
                </div>

                {/* Guarantee */}
                <div className="mt-4 p-2.5 bg-[#0f0f0f] border border-[#1a1a1a] rounded-lg">
                  <div className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-[#808080]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                    </svg>
                    <span className="text-[11px] text-[#808080] font-medium">Auditor Guarantee</span>
                  </div>
                  <p className="text-[10px] text-[#505050] mt-1">
                    Refund if code fails quality checks
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Add Tokens */}
        <motion.button
          onClick={() => setShowRefuelModal(true)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all ${
            !isMounted
              ? 'bg-[#0a0a0a] border border-[#1a1a1a] text-[#606060]'
              : status === 'critical' 
              ? 'bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white' 
              : status === 'low'
              ? 'bg-amber-500/20 border border-amber-500/30 text-amber-400 hover:bg-amber-500 hover:text-black'
              : 'bg-[#0a0a0a] border border-[#1a1a1a] text-[#606060] hover:text-[#c0c0c0] hover:border-[#333]'
          }`}
          title="Add tokens"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </motion.button>
      </div>

      {/* Modals */}
      <RefuelModal open={showRefuelModal} onOpenChange={setShowRefuelModal} />

      {/* Authorize Modal */}
      <AnimatePresence>
        {showAuthorizeBurn && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={cancelBurn}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#050505] border border-[#1a1a1a] rounded-2xl p-6 max-w-md mx-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="authorize-usage-title"
            >
              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#0f0f0f] border border-[#1a1a1a] flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#808080]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                  </svg>
                </div>
                <div>
                  <h3 id="authorize-usage-title" className="text-[15px] font-medium text-[#ffffff]">Authorize Usage</h3>
                  <p className="text-[12px] text-[#505050]">Review estimated cost</p>
                </div>
              </div>

              {/* Task */}
              {pendingTaskDescription && (
                <div className="p-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg mb-4">
                  <p className="text-[13px] text-[#a8a8a8]">{pendingTaskDescription}</p>
                </div>
              )}

              {/* Breakdown */}
              <div className="space-y-3 mb-6 text-[13px]">
                <div className="flex justify-between items-center">
                  <span className="text-[#606060]">Estimated</span>
                  <span className="text-[#ffffff] font-medium">
                    {estimatedRange ? `${estimatedRange.min} - ${estimatedRange.max}` : ghostUsage} tokens
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#606060]">Current</span>
                  <span className="text-[#a8a8a8]">{currentFuel.toLocaleString()} tokens</span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-[#1a1a1a]">
                  <span className="text-[#606060]">After</span>
                  <span className={currentFuel - ghostUsage < 0 ? 'text-red-400' : 'text-[#c0c0c0]'}>
                    ~{Math.max(0, currentFuel - ghostUsage).toLocaleString()} tokens
                  </span>
                </div>
              </div>

              {/* Guarantee */}
              <div className="flex items-center gap-2 p-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg mb-6">
                <svg className="w-4 h-4 text-[#808080] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
                <span className="text-[12px] text-[#808080]">
                  Protected by Auditor Guarantee
                </span>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={cancelBurn}
                  className="flex-1 px-4 py-2.5 text-[13px] text-[#606060] border border-[#1a1a1a] hover:border-[#333] hover:text-[#a8a8a8] rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={authorizeBurn}
                  className="flex-1 px-4 py-2.5 text-[13px] font-medium text-[#000] bg-[#c0c0c0] hover:bg-[#d4d4d4] rounded-lg transition-colors"
                >
                  Authorize
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
