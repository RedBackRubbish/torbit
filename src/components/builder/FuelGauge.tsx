'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useFuelStore } from '@/store/fuel'
import RefuelModal from './RefuelModal'

/**
 * FuelGauge - The "Reactor Core" UI
 * 
 * A visual fuel cell that shows current credits, ghost usage on hover,
 * and the "Authorize Burn" confirmation flow.
 * 
 * States:
 * - Full (>75%): Bright blue, calm pulse
 * - Good (40-75%): Blue, steady
 * - Low (15-40%): Amber, faster pulse
 * - Critical (<15%): Red, flashing "CORE UNSTABLE"
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
  const [showRefundAnimation, setShowRefundAnimation] = useState(false)
  const [showChargeAnimation, setShowChargeAnimation] = useState(false)
  const [showRefuelModal, setShowRefuelModal] = useState(false)

  const percentage = getFuelPercentage()
  const status = getFuelStatus()

  // Status-based styling
  const statusConfig = {
    full: {
      barColor: 'bg-blue-500',
      glowColor: 'shadow-[0_0_20px_rgba(59,130,246,0.5)]',
      textColor: 'text-blue-400',
      pulseSpeed: 3,
      label: 'REACTOR STABLE',
    },
    good: {
      barColor: 'bg-blue-500',
      glowColor: 'shadow-[0_0_15px_rgba(59,130,246,0.4)]',
      textColor: 'text-blue-400',
      pulseSpeed: 4,
      label: 'OPERATIONAL',
    },
    low: {
      barColor: 'bg-amber-500',
      glowColor: 'shadow-[0_0_20px_rgba(245,158,11,0.5)]',
      textColor: 'text-amber-400',
      pulseSpeed: 1.5,
      label: 'FUEL LOW',
    },
    critical: {
      barColor: 'bg-red-500',
      glowColor: 'shadow-[0_0_25px_rgba(239,68,68,0.6)]',
      textColor: 'text-red-400',
      pulseSpeed: 0.5,
      label: 'CORE UNSTABLE',
    },
  }[status]

  // Ghost segment calculation
  const ghostPercentage = ghostUsage > 0 ? (ghostUsage / maxFuel) * 100 : 0
  const afterGhostPercentage = Math.max(0, percentage - ghostPercentage)

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Main Fuel Gauge */}
        <div
          className="relative"
          onMouseEnter={() => setShowDetails(true)}
          onMouseLeave={() => setShowDetails(false)}
        >
          {/* Compact View */}
          <motion.div
            className={`flex items-center gap-3 px-3 py-2 rounded-lg bg-neutral-800/50 border border-neutral-700 cursor-pointer transition-all hover:border-neutral-600 ${statusConfig.glowColor}`}
            whileHover={{ scale: 1.02 }}
          >
          {/* Fuel Rod (Vertical Bar) */}
          <div className="relative w-3 h-8 bg-neutral-900 rounded-full overflow-hidden">
            {/* Ghost usage segment */}
            {ghostUsage > 0 && (
              <motion.div
                className="absolute bottom-0 left-0 right-0 bg-red-500/30"
                style={{ height: `${percentage}%` }}
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
            )}
            
            {/* Current fuel level */}
            <motion.div
              className={`absolute bottom-0 left-0 right-0 ${statusConfig.barColor} rounded-full`}
              initial={{ height: 0 }}
              animate={{ height: `${ghostUsage > 0 ? afterGhostPercentage : percentage}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
            
            {/* Pulse effect */}
            <motion.div
              className={`absolute inset-0 ${statusConfig.barColor} opacity-30`}
              animate={{ opacity: [0.2, 0.4, 0.2] }}
              transition={{ duration: statusConfig.pulseSpeed, repeat: Infinity }}
            />

            {/* Pending auditor indicator */}
            {isAuditorChecking && (
              <motion.div
                className="absolute inset-0 border-2 border-amber-400 rounded-full"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              />
            )}
          </div>

          {/* Fuel count */}
          <div className="flex flex-col">
            <span className={`text-xs font-medium ${statusConfig.textColor}`}>
              {currentFuel.toLocaleString()}
            </span>
            <span className="text-[10px] text-neutral-500">
              FUEL
            </span>
          </div>

          {/* Ghost usage preview */}
          <AnimatePresence>
            {ghostUsage > 0 && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex items-center gap-1 pl-2 border-l border-neutral-700"
              >
                <span className="text-xs text-red-400">-{ghostUsage}</span>
                {estimatedRange && (
                  <span className="text-[10px] text-neutral-500">
                    ({estimatedRange.min}-{estimatedRange.max})
                  </span>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Status indicator */}
          {status === 'critical' && (
            <motion.div
              className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"
              animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            />
          )}
        </motion.div>

        {/* Expanded Details Panel */}
        <AnimatePresence>
          {showDetails && (
            <motion.div
              initial={{ opacity: 0, y: 5, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 5, scale: 0.95 }}
              className="absolute top-full right-0 mt-2 w-64 p-4 bg-neutral-900 border border-neutral-800 rounded-xl shadow-xl z-50"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <span className={`text-xs font-medium uppercase tracking-wider ${statusConfig.textColor}`}>
                  {statusConfig.label}
                </span>
                <span className="text-xs text-neutral-500">{percentage}%</span>
              </div>

              {/* Full bar */}
              <div className="relative h-2 bg-neutral-800 rounded-full overflow-hidden mb-4">
                <motion.div
                  className={`absolute inset-y-0 left-0 ${statusConfig.barColor}`}
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
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Current</span>
                  <span className="text-neutral-200">{currentFuel.toLocaleString()} units</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Capacity</span>
                  <span className="text-neutral-200">{maxFuel.toLocaleString()} units</span>
                </div>
                {pendingBuilderCost > 0 && (
                  <div className="flex justify-between text-amber-400">
                    <span>Pending Audit</span>
                    <span>{pendingBuilderCost} units</span>
                  </div>
                )}
                {ghostUsage > 0 && estimatedRange && (
                  <div className="flex justify-between text-red-400">
                    <span>Estimated Cost</span>
                    <span>{estimatedRange.min}-{estimatedRange.max} units</span>
                  </div>
                )}
              </div>

              {/* Auditor Guarantee Badge */}
              <div className="mt-4 p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span className="text-xs text-blue-400 font-medium">Auditor Guarantee</span>
                </div>
                <p className="text-[10px] text-neutral-400 mt-1">
                  If code fails audit, builder costs are refunded
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Refund Animation */}
        <AnimatePresence>
          {showRefundAnimation && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.5 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <div className="px-3 py-1 bg-green-500 text-black text-xs font-bold rounded-full">
                REFUNDED
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        </div>

        {/* Add Fuel Button */}
        <motion.button
          onClick={() => setShowRefuelModal(true)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`
            h-8 w-8 rounded-lg flex items-center justify-center transition-all
            ${status === 'critical' 
              ? 'bg-red-500/20 border border-red-500/50 text-red-400 hover:bg-red-500 hover:text-black animate-pulse' 
              : status === 'low'
              ? 'bg-amber-500/20 border border-amber-500/30 text-amber-400 hover:bg-amber-500 hover:text-black'
              : 'bg-neutral-800 border border-neutral-700 text-neutral-400 hover:border-blue-500/50 hover:text-blue-400'
            }
          `}
          title={status === 'critical' ? 'Emergency Refuel!' : 'Purchase Fuel'}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </motion.button>
      </div>

      {/* Refuel Modal */}
      <RefuelModal open={showRefuelModal} onOpenChange={setShowRefuelModal} />

      {/* Authorize Burn Modal */}
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
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 max-w-md mx-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-xl ${statusConfig.barColor}/20 flex items-center justify-center`}>
                  <svg className={`w-5 h-5 ${statusConfig.textColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-neutral-100 font-medium">Authorize Fuel Burn</h3>
                  <p className="text-neutral-500 text-xs">Review estimated cost before proceeding</p>
                </div>
              </div>

              {/* Task description */}
              {pendingTaskDescription && (
                <div className="p-3 bg-neutral-800/50 rounded-lg mb-4">
                  <p className="text-sm text-neutral-300">{pendingTaskDescription}</p>
                </div>
              )}

              {/* Cost breakdown */}
              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-neutral-400 text-sm">Estimated Cost</span>
                  <span className="text-neutral-100 font-medium">
                    {estimatedRange ? `${estimatedRange.min} - ${estimatedRange.max}` : ghostUsage} units
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-neutral-400 text-sm">Current Fuel</span>
                  <span className="text-neutral-100">{currentFuel.toLocaleString()} units</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-neutral-800">
                  <span className="text-neutral-400 text-sm">After Task</span>
                  <span className={currentFuel - ghostUsage < 0 ? 'text-red-400' : 'text-green-400'}>
                    ~{Math.max(0, currentFuel - ghostUsage).toLocaleString()} units
                  </span>
                </div>
              </div>

              {/* Auditor guarantee reminder */}
              <div className="flex items-center gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg mb-6">
                <svg className="w-4 h-4 text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span className="text-xs text-blue-400">
                  Protected by Auditor Guarantee — no charge if build fails
                </span>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={cancelBurn}
                  className="flex-1 px-4 py-2.5 text-sm text-neutral-400 border border-neutral-700 hover:border-neutral-600 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={authorizeBurn}
                  className={`flex-1 px-4 py-2.5 text-sm font-medium text-white ${statusConfig.barColor} hover:opacity-90 rounded-lg transition-opacity flex items-center justify-center gap-2`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Authorize Burn
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
