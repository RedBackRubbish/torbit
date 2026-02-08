'use client'

import type { RefObject } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Plus, X } from 'lucide-react'
import {
  PRIMARY_CAPABILITIES,
  SECONDARY_CAPABILITIES,
  type IntegrationCapability,
} from '@/lib/integrations/capabilities'
import { CapabilityPreview } from '../CapabilityPreview'
import { CAPABILITY_ICONS } from './constants'

interface CapabilitySelectorProps {
  selectedCapabilities: string[]
  showMoreCapabilities: boolean
  setShowMoreCapabilities: (show: boolean) => void
  toggleCapability: (id: string) => void
  getCapabilityById: (id: string) => IntegrationCapability | undefined
  moreRef: RefObject<HTMLDivElement | null>
}

export function CapabilitySelector({
  selectedCapabilities,
  showMoreCapabilities,
  setShowMoreCapabilities,
  toggleCapability,
  getCapabilityById,
  moreRef,
}: CapabilitySelectorProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="mt-4"
    >
      <div className="flex flex-wrap items-center justify-center gap-2">
        {PRIMARY_CAPABILITIES.map((id) => {
          const capability = getCapabilityById(id)
          if (!capability) return null

          const Icon = CAPABILITY_ICONS[capability.icon]
          const isSelected = selectedCapabilities.includes(id)

          return (
            <CapabilityPreview key={id} capability={capability}>
              <button
                type="button"
                onClick={() => toggleCapability(id)}
                className={`group flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                  isSelected
                    ? 'border-white/20 bg-white/10 text-white'
                    : 'border-white/[0.06] bg-white/[0.03] text-white/40 hover:border-white/10 hover:bg-white/[0.06] hover:text-white/60'
                }`}
              >
                {isSelected ? (
                  <X className="h-3 w-3" />
                ) : (
                  <Plus className="h-3 w-3 opacity-50 group-hover:opacity-100" />
                )}
                {Icon && <Icon className="h-3.5 w-3.5" />}
                {capability.label}
              </button>
            </CapabilityPreview>
          )
        })}

        <div ref={moreRef} className="relative">
          <button
            type="button"
            onClick={() => setShowMoreCapabilities(!showMoreCapabilities)}
            className="flex items-center gap-1 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-white/40 transition-all hover:border-white/10 hover:bg-white/[0.06] hover:text-white/60"
          >
            More
            <ChevronDown className={`h-3 w-3 transition-transform ${showMoreCapabilities ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {showMoreCapabilities && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full z-50 mt-2 min-w-[160px] rounded-xl border border-white/10 bg-neutral-900 p-1.5 shadow-xl"
              >
                {SECONDARY_CAPABILITIES.map((id) => {
                  const capability = getCapabilityById(id)
                  if (!capability) return null

                  const Icon = CAPABILITY_ICONS[capability.icon]
                  const isSelected = selectedCapabilities.includes(id)

                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => toggleCapability(id)}
                      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                        isSelected
                          ? 'bg-white/10 text-white'
                          : 'text-white/50 hover:bg-white/[0.06] hover:text-white/80'
                      }`}
                    >
                      {Icon && <Icon className="h-3.5 w-3.5" />}
                      {capability.label}
                      {isSelected && (
                        <svg className="ml-auto h-3.5 w-3.5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </button>
                  )
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {selectedCapabilities.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-3 flex flex-col items-center gap-1 text-xs"
          >
            <div className="flex items-center gap-2">
              <span className="text-white/30">Capabilities:</span>
              <span className="text-white/60">
                {selectedCapabilities
                  .map((id) => getCapabilityById(id)?.label)
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </div>
            <span className="text-[11px] text-white/25">Simulated during build</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
