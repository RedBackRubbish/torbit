'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check } from 'lucide-react'
import type { IntegrationCapability } from '@/lib/integrations/capabilities'

interface CapabilityPreviewProps {
  capability: IntegrationCapability
  children: React.ReactNode
}

/**
 * CapabilityPreview - Hover tooltip showing what Torbit will scaffold
 * 
 * Read-only. No config. No keys. Just information.
 */
export function CapabilityPreview({ capability, children }: CapabilityPreviewProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div 
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
      
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50"
          >
            <div className="bg-neutral-900 border border-white/10 rounded-xl p-4 shadow-xl min-w-[240px] max-w-[280px]">
              {/* Headline */}
              <div className="text-white/90 text-sm font-medium mb-3">
                {capability.preview.headline}
              </div>
              
              {/* Features list */}
              <ul className="space-y-1.5 mb-3">
                {capability.preview.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-white/50">
                    <Check className="w-3 h-3 text-emerald-400/70 mt-0.5 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              
              {/* Footer */}
              <div className="pt-2 border-t border-white/[0.06]">
                <span className="text-[10px] text-white/30 uppercase tracking-wider">
                  Configured during export
                </span>
              </div>
              
              {/* Arrow */}
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-neutral-900 border-r border-b border-white/10 rotate-45" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
