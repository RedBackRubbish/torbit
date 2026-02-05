'use client'

/**
 * TORBIT - Suggestions UI
 * 
 * PRODUCTION DOCTRINE - LOCKED
 * 
 * Torbit never nags.
 * Torbit never auto-adds.
 * Torbit never surprises.
 * 
 * Placement: Inline, below Torbit's response
 * Style: Compact, dismissible
 * Limit: Max 3 suggestions
 * State: Collapsed by default
 * 
 * ❌ No popups
 * ❌ No blocking dialogs
 * ❌ No agent chatter
 * ❌ No "AI recommends…"
 */

import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import type { Suggestion } from '@/lib/knowledge/types'

// ============================================
// ANIMATION CONFIG
// ============================================

const MATRIX_EASE = [0.4, 0, 0.2, 1] as const
const DURATION = 0.25

// ============================================
// INLINE SUGGESTIONS (Below Torbit's response)
// ============================================

interface SuggestionsInlineProps {
  suggestions: Suggestion[]
  onApply: (suggestionId: string) => void
  onDismiss: (suggestionId: string) => void
}

export function SuggestionsInline({
  suggestions,
  onApply,
  onDismiss,
}: SuggestionsInlineProps) {
  const [expanded, setExpanded] = useState(false)
  
  // Max 3 suggestions
  const visibleSuggestions = suggestions.slice(0, 3)
  
  if (visibleSuggestions.length === 0) {
    return null
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: DURATION, ease: MATRIX_EASE }}
      className="mt-3 border-t border-neutral-800 pt-3"
    >
      {/* Header - Compact */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-xs text-neutral-500 hover:text-neutral-400 transition-colors w-full"
      >
        <span className="text-neutral-600">{expanded ? '▼' : '▶'}</span>
        <span>Suggestions (optional):</span>
        <span className="text-neutral-600 ml-auto">{visibleSuggestions.length}</span>
      </button>
      
      {/* Suggestions List - Collapsed by default */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: DURATION, ease: MATRIX_EASE }}
            className="overflow-hidden"
          >
            <div className="mt-2 space-y-1.5">
              {visibleSuggestions.map(suggestion => (
                <SuggestionRow
                  key={suggestion.id}
                  suggestion={suggestion}
                  onApply={() => onApply(suggestion.id)}
                  onDismiss={() => onDismiss(suggestion.id)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ============================================
// SUGGESTION ROW
// ============================================

interface SuggestionRowProps {
  suggestion: Suggestion
  onApply: () => void
  onDismiss: () => void
}

function SuggestionRow({ suggestion, onApply, onDismiss }: SuggestionRowProps) {
  const impactIcon = {
    high: '⚠️',
    medium: '•',
    low: '○',
  }
  
  const impactColor = {
    high: 'text-amber-400',
    medium: 'text-neutral-400',
    low: 'text-neutral-600',
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-start gap-2 text-sm group"
    >
      {/* Impact indicator */}
      <span className={`${impactColor[suggestion.impact]} text-xs mt-0.5`}>
        {impactIcon[suggestion.impact]}
      </span>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <span className="text-neutral-300">{suggestion.title}</span>
        <span className="text-neutral-500 ml-1.5">({suggestion.why})</span>
      </div>
      
      {/* Actions - appear on hover */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onApply}
          className="text-xs px-2 py-0.5 text-green-400 hover:bg-green-400/10 rounded transition-colors"
        >
          Apply
        </button>
        <button
          onClick={onDismiss}
          className="text-xs px-2 py-0.5 text-neutral-500 hover:bg-neutral-500/10 rounded transition-colors"
        >
          Dismiss
        </button>
      </div>
    </motion.div>
  )
}

// ============================================
// EXPANDED VIEW (Click "View" to see details)
// ============================================

interface SuggestionDetailProps {
  suggestion: Suggestion
  onApply: () => void
  onDismiss: () => void
  onClose: () => void
}

export function SuggestionDetail({
  suggestion,
  onApply,
  onDismiss,
  onClose,
}: SuggestionDetailProps) {
  const impactColors = {
    high: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    medium: 'bg-neutral-500/20 text-neutral-400 border-neutral-500/30',
    low: 'bg-neutral-700/20 text-neutral-500 border-neutral-700/30',
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: DURATION, ease: MATRIX_EASE }}
      className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 max-w-md"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <h4 className="text-sm font-medium text-neutral-200">{suggestion.title}</h4>
        <button
          onClick={onClose}
          className="text-neutral-600 hover:text-neutral-400 text-xs"
        >
          ✕
        </button>
      </div>
      
      {/* Why */}
      <p className="text-sm text-neutral-400 mb-3">{suggestion.why}</p>
      
      {/* Meta */}
      <div className="flex items-center gap-2 mb-4">
        <span className={`text-xs px-2 py-0.5 rounded border ${impactColors[suggestion.impact]}`}>
          {suggestion.impact.toUpperCase()} IMPACT
        </span>
        <span className="text-xs text-neutral-600">
          {Math.round(suggestion.confidence * 100)}% confidence
        </span>
      </div>
      
      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onApply}
          className="flex-1 text-sm py-2 px-4 bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 transition-colors"
        >
          Apply
        </button>
        <button
          onClick={onDismiss}
          className="text-sm py-2 px-4 text-neutral-500 hover:bg-neutral-800 rounded transition-colors"
        >
          Dismiss
        </button>
      </div>
      
      {/* Strategist note */}
      {!suggestion.strategistApproved && (
        <p className="text-xs text-neutral-600 mt-3">
          Requires strategist approval before application.
        </p>
      )}
    </motion.div>
  )
}

// ============================================
// HOOK FOR SUGGESTION STATE
// ============================================

import { useCallback } from 'react'

interface UseSuggestionsResult {
  handleApply: (id: string) => void
  handleDismiss: (id: string) => void
  dismissedIds: Set<string>
}

export function useSuggestions(
  onApply?: (id: string) => void,
  onDismiss?: (id: string) => void
): UseSuggestionsResult {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())
  
  const handleApply = useCallback((id: string) => {
    // Triggers: Manifest → Governance → Consent
    onApply?.(id)
  }, [onApply])
  
  const handleDismiss = useCallback((id: string) => {
    // Logged once, never shown again for this project
    setDismissedIds(prev => new Set([...prev, id]))
    onDismiss?.(id)
  }, [onDismiss])
  
  return {
    handleApply,
    handleDismiss,
    dismissedIds,
  }
}

// ============================================
// VISUAL STRUCTURE EXAMPLE
// ============================================

/**
 * ────────────────────────────────
 * Torbit:
 * "I'll build this using Next.js App Router."
 * 
 * ▶ Suggestions (optional):
 * • Add authentication (common for SaaS apps)
 * • Enable Stripe test mode
 * • Add error tracking (Sentry)
 * [Apply] [Dismiss]
 * ────────────────────────────────
 */
