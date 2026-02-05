'use client'

/**
 * TORBIT - Knowledge Panel UI
 * 
 * Displays contextual suggestions with full transparency.
 * Never auto-applies. Always optional.
 */

import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import type { Suggestion, TrendFact } from '@/lib/knowledge/types'

// ============================================
// ANIMATION CONFIG
// ============================================

const MATRIX_EASE = [0.4, 0, 0.2, 1] as const
const DURATION = 0.25

// ============================================
// KNOWLEDGE PANEL
// ============================================

interface KnowledgePanelProps {
  suggestions: Suggestion[]
  facts: TrendFact[]
  onApprove?: (suggestionId: string) => void
  onReject?: (suggestionId: string, reason: string) => void
  environment: 'local' | 'staging' | 'production'
}

export function KnowledgePanel({
  suggestions,
  facts,
  onApprove,
  onReject,
  environment,
}: KnowledgePanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showFacts, setShowFacts] = useState(false)
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION, ease: MATRIX_EASE }}
      className="bg-black/90 border border-green-500/30 rounded-lg p-4 font-mono"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-green-400">◈</span>
          <h3 className="text-green-400 text-sm font-bold">KNOWLEDGE AWARENESS</h3>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className={`px-2 py-0.5 rounded ${
            environment === 'production' ? 'bg-red-500/20 text-red-400' :
            environment === 'staging' ? 'bg-yellow-500/20 text-yellow-400' :
            'bg-green-500/20 text-green-400'
          }`}>
            {environment.toUpperCase()}
          </span>
          <span className="text-green-500/50">{facts.length} facts</span>
        </div>
      </div>
      
      {/* Suggestions */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {suggestions.length === 0 ? (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-green-500/50 text-sm"
            >
              No suggestions for current context.
            </motion.p>
          ) : (
            suggestions.map((suggestion, index) => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                index={index}
                expanded={expandedId === suggestion.id}
                onToggle={() => setExpandedId(
                  expandedId === suggestion.id ? null : suggestion.id
                )}
                onApprove={() => onApprove?.(suggestion.id)}
                onReject={(reason) => onReject?.(suggestion.id, reason)}
              />
            ))
          )}
        </AnimatePresence>
      </div>
      
      {/* Facts Toggle */}
      <div className="mt-4 pt-4 border-t border-green-500/20">
        <button
          onClick={() => setShowFacts(!showFacts)}
          className="text-xs text-green-500/50 hover:text-green-400 transition-colors"
        >
          {showFacts ? '▼' : '▶'} Source Facts ({facts.length})
        </button>
        
        <AnimatePresence>
          {showFacts && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: DURATION, ease: MATRIX_EASE }}
              className="overflow-hidden"
            >
              <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                {facts.map(fact => (
                  <div 
                    key={fact.id}
                    className="text-xs text-green-500/70 flex items-start gap-2"
                  >
                    <span className="text-green-500/30">•</span>
                    <span>{fact.topic}</span>
                    <span className="ml-auto text-green-500/30">
                      {Math.round(fact.confidence * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Disclaimer */}
      <div className="mt-4 pt-2 border-t border-green-500/10">
        <p className="text-[10px] text-green-500/30 leading-relaxed">
          All suggestions are optional. Strategist approval required before application.
          Knowledge sources are verified and logged.
        </p>
      </div>
    </motion.div>
  )
}

// ============================================
// SUGGESTION CARD
// ============================================

interface SuggestionCardProps {
  suggestion: Suggestion
  index: number
  expanded: boolean
  onToggle: () => void
  onApprove: () => void
  onReject: (reason: string) => void
}

function SuggestionCard({
  suggestion,
  index,
  expanded,
  onToggle,
  onApprove,
  onReject,
}: SuggestionCardProps) {
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectInput, setShowRejectInput] = useState(false)
  
  const categoryColors = {
    security: 'text-red-400 bg-red-500/10',
    framework: 'text-blue-400 bg-blue-500/10',
    architecture: 'text-purple-400 bg-purple-500/10',
    performance: 'text-yellow-400 bg-yellow-500/10',
    'best-practice': 'text-green-400 bg-green-500/10',
    integration: 'text-cyan-400 bg-cyan-500/10',
  }
  
  const categoryIcons = {
    security: '🔐',
    framework: '📦',
    architecture: '🏗️',
    performance: '⚡',
    'best-practice': '✨',
    integration: '🔌',
  }
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: DURATION, ease: MATRIX_EASE, delay: index * 0.05 }}
      className="bg-green-500/5 border border-green-500/20 rounded-lg overflow-hidden"
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full p-3 flex items-start gap-3 text-left hover:bg-green-500/10 transition-colors"
      >
        <span className="text-lg">{categoryIcons[suggestion.category]}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-green-400 text-sm font-medium truncate">
              {suggestion.title}
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${categoryColors[suggestion.category]}`}>
              {suggestion.category}
            </span>
            {suggestion.strategistApproved && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">
                ✓ approved
              </span>
            )}
          </div>
          <p className="text-xs text-green-500/50 mt-1 line-clamp-2">
            {suggestion.description}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-xs text-green-500/30">
            {Math.round(suggestion.confidence * 100)}%
          </span>
          <span className={`text-[10px] ${
            suggestion.relevance === 'high' ? 'text-green-400' :
            suggestion.relevance === 'medium' ? 'text-yellow-400' :
            'text-green-500/30'
          }`}>
            {suggestion.relevance}
          </span>
        </div>
      </button>
      
      {/* Expanded Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: DURATION, ease: MATRIX_EASE }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-1 border-t border-green-500/10">
              {/* Rationale */}
              <div className="mb-3">
                <p className="text-[10px] text-green-500/30 uppercase mb-1">Rationale</p>
                <p className="text-xs text-green-500/70">{suggestion.rationale}</p>
              </div>
              
              {/* Source Facts */}
              <div className="mb-3">
                <p className="text-[10px] text-green-500/30 uppercase mb-1">
                  Sources ({suggestion.sourceFactIds.length})
                </p>
                <div className="flex flex-wrap gap-1">
                  {suggestion.sourceFactIds.map(id => (
                    <span 
                      key={id}
                      className="text-[10px] px-1.5 py-0.5 bg-green-500/10 text-green-500/50 rounded"
                    >
                      {id.slice(0, 12)}...
                    </span>
                  ))}
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex items-center gap-2 mt-3">
                {!suggestion.strategistApproved ? (
                  <>
                    <button
                      onClick={onApprove}
                      className="flex-1 text-xs py-1.5 px-3 bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 transition-colors"
                    >
                      Request Approval
                    </button>
                    <button
                      onClick={() => setShowRejectInput(true)}
                      className="text-xs py-1.5 px-3 bg-red-500/10 text-red-400 rounded hover:bg-red-500/20 transition-colors"
                    >
                      Dismiss
                    </button>
                  </>
                ) : (
                  <p className="text-xs text-green-400">
                    ✓ Approved by strategist. Ready for user acceptance.
                  </p>
                )}
              </div>
              
              {/* Reject Reason Input */}
              <AnimatePresence>
                {showRejectInput && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-2 overflow-hidden"
                  >
                    <input
                      type="text"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Reason for dismissal..."
                      className="w-full text-xs bg-black/50 border border-green-500/20 rounded px-2 py-1.5 text-green-400 placeholder-green-500/30"
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => {
                          onReject(rejectReason || 'Not relevant')
                          setShowRejectInput(false)
                        }}
                        className="text-xs py-1 px-2 bg-red-500/20 text-red-400 rounded"
                      >
                        Confirm Dismiss
                      </button>
                      <button
                        onClick={() => setShowRejectInput(false)}
                        className="text-xs py-1 px-2 text-green-500/50"
                      >
                        Cancel
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ============================================
// MINIMAL STATUS INDICATOR
// ============================================

interface KnowledgeStatusProps {
  factCount: number
  suggestionCount: number
  lastUpdated: string | null
}

export function KnowledgeStatus({
  factCount,
  suggestionCount,
  lastUpdated,
}: KnowledgeStatusProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center gap-3 text-xs font-mono"
    >
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
        <span className="text-green-500/50">KNOWLEDGE</span>
      </div>
      <span className="text-green-500/30">|</span>
      <span className="text-green-500/50">{factCount} facts</span>
      <span className="text-green-500/30">|</span>
      <span className="text-green-400">{suggestionCount} suggestions</span>
      {lastUpdated && (
        <>
          <span className="text-green-500/30">|</span>
          <span className="text-green-500/30 text-[10px]">
            {new Date(lastUpdated).toLocaleTimeString()}
          </span>
        </>
      )}
    </motion.div>
  )
}
