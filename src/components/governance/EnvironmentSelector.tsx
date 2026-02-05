'use client'

/**
 * TORBIT - Environment Selector
 * 
 * Visible but subtle environment switcher.
 * Switching environments re-evaluates health + policies automatically.
 */

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  getActiveEnvironment,
  setActiveEnvironment,
  getActiveProfile,
  ENVIRONMENT_INFO,
  type EnvironmentName,
  type EnvironmentProfile,
} from '@/lib/integrations/environments'

// ============================================
// ENVIRONMENT SELECTOR
// ============================================

interface EnvironmentSelectorProps {
  onEnvironmentChange?: (env: EnvironmentName) => void
  className?: string
}

export function EnvironmentSelector({ 
  onEnvironmentChange, 
  className 
}: EnvironmentSelectorProps) {
  const [activeEnv, setActiveEnv] = useState<EnvironmentName>('local')
  const [isOpen, setIsOpen] = useState(false)
  
  useEffect(() => {
    setActiveEnv(getActiveEnvironment())
  }, [])
  
  const handleSelect = useCallback((env: EnvironmentName) => {
    const result = setActiveEnvironment(env)
    if (result.success) {
      setActiveEnv(env)
      onEnvironmentChange?.(env)
    }
    setIsOpen(false)
  }, [onEnvironmentChange])
  
  const info = ENVIRONMENT_INFO[activeEnv]
  
  return (
    <div className={`relative ${className || ''}`}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 transition-colors duration-150"
      >
        <span className="text-sm">{info.icon}</span>
        <span className={`text-sm font-medium ${info.color}`}>{info.label}</span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.15 }}
          className="text-zinc-500 text-xs"
        >
          ▼
        </motion.span>
      </button>
      
      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Menu */}
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 mt-1 w-56 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50 overflow-hidden"
            >
              {(['local', 'staging', 'production'] as const).map((env) => {
                const envInfo = ENVIRONMENT_INFO[env]
                const isActive = env === activeEnv
                
                return (
                  <button
                    key={env}
                    onClick={() => handleSelect(env)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors duration-150
                      ${isActive ? 'bg-zinc-800' : 'hover:bg-zinc-800/50'}`}
                  >
                    <span className="text-base">{envInfo.icon}</span>
                    <div className="flex-1">
                      <div className={`text-sm font-medium ${envInfo.color}`}>
                        {envInfo.label}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {envInfo.description}
                      </div>
                    </div>
                    {isActive && (
                      <span className="text-green-400 text-xs">●</span>
                    )}
                  </button>
                )
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

// ============================================
// ENVIRONMENT BADGE
// ============================================

interface EnvironmentBadgeProps {
  environment?: EnvironmentName
  size?: 'sm' | 'md'
  className?: string
}

export function EnvironmentBadge({ 
  environment, 
  size = 'md',
  className 
}: EnvironmentBadgeProps) {
  const [activeEnv, setActiveEnv] = useState<EnvironmentName>('local')
  
  useEffect(() => {
    if (!environment) {
      setActiveEnv(getActiveEnvironment())
    }
  }, [environment])
  
  const env = environment || activeEnv
  const info = ENVIRONMENT_INFO[env]
  
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
  }
  
  return (
    <span className={`inline-flex items-center gap-1 rounded ${sizeClasses[size]} bg-zinc-800/50 ${className || ''}`}>
      <span>{info.icon}</span>
      <span className={info.color}>{info.label}</span>
    </span>
  )
}

// ============================================
// ENVIRONMENT RESTRICTIONS CARD
// ============================================

interface EnvironmentRestrictionsCardProps {
  className?: string
}

export function EnvironmentRestrictionsCard({ className }: EnvironmentRestrictionsCardProps) {
  const [profile, setProfile] = useState<EnvironmentProfile | null>(null)
  
  useEffect(() => {
    setProfile(getActiveProfile() as EnvironmentProfile)
  }, [])
  
  if (!profile) return null
  
  const info = ENVIRONMENT_INFO[profile.name]
  
  return (
    <div className={`bg-zinc-900 rounded-lg border border-zinc-800 p-4 ${className || ''}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">{info.icon}</span>
        <h3 className={`text-sm font-medium ${info.color}`}>{info.label} Environment</h3>
      </div>
      
      <div className="space-y-2">
        <RestrictionRow 
          label="Auto-fix" 
          value={profile.autoFix.enabled} 
        />
        <RestrictionRow 
          label="Experimental integrations" 
          value={profile.integrations.allowExperimental} 
        />
        <RestrictionRow 
          label="Requires clean ledger" 
          value={profile.shipping.requireCleanLedger} 
          inverted
        />
        <RestrictionRow 
          label="Requires Auditor" 
          value={profile.shipping.requireAuditorPass} 
          inverted
        />
        <RestrictionRow 
          label="Blocks on drift" 
          value={profile.shipping.blockOnDrift} 
          inverted
        />
      </div>
      
      {profile.categories.requireHumanApproval.length > 0 && (
        <div className="mt-3 pt-3 border-t border-zinc-800">
          <p className="text-xs text-zinc-500 mb-1">Requires approval:</p>
          <div className="flex flex-wrap gap-1">
            {profile.categories.requireHumanApproval.map(cat => (
              <span 
                key={cat} 
                className="px-1.5 py-0.5 text-xs bg-yellow-500/10 text-yellow-300 rounded"
              >
                {cat}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function RestrictionRow({ 
  label, 
  value, 
  inverted = false 
}: { 
  label: string
  value: boolean
  inverted?: boolean 
}) {
  // For inverted rows, true means "restricted" (yellow/red)
  const isRestricted = inverted ? value : !value
  
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-zinc-500">{label}</span>
      <span className={isRestricted ? 'text-yellow-400' : 'text-green-400'}>
        {value ? '✓' : '✗'}
      </span>
    </div>
  )
}

// ============================================
// ENVIRONMENT VIOLATION BANNER
// ============================================

interface EnvironmentViolationBannerProps {
  environment: EnvironmentName
  message: string
  onDismiss?: () => void
}

export function EnvironmentViolationBanner({ 
  environment, 
  message, 
  onDismiss 
}: EnvironmentViolationBannerProps) {
  const info = ENVIRONMENT_INFO[environment]
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 flex items-start gap-3"
    >
      <span className="text-red-400 mt-0.5">🚫</span>
      <div className="flex-1">
        <p className="text-sm text-red-200">{message}</p>
        <p className="text-xs text-red-400/70 mt-1 flex items-center gap-1">
          <span>{info.icon}</span>
          <span>Restricted in {info.label.toLowerCase()} environment</span>
        </p>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-red-400/50 hover:text-red-400 transition-colors"
        >
          ✕
        </button>
      )}
    </motion.div>
  )
}

// ============================================
// COMPACT ENVIRONMENT INDICATOR
// ============================================

interface EnvironmentIndicatorProps {
  className?: string
}

export function EnvironmentIndicator({ className }: EnvironmentIndicatorProps) {
  const [activeEnv, setActiveEnv] = useState<EnvironmentName>('local')
  
  useEffect(() => {
    setActiveEnv(getActiveEnvironment())
  }, [])
  
  const info = ENVIRONMENT_INFO[activeEnv]
  
  // Only show indicator for non-local environments
  if (activeEnv === 'local') {
    return null
  }
  
  return (
    <div className={`flex items-center gap-1.5 ${className || ''}`}>
      <span className="text-sm">{info.icon}</span>
      <span className={`text-xs font-medium ${info.color}`}>{info.label}</span>
    </div>
  )
}
