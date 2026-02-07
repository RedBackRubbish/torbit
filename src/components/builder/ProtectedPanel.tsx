'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useGovernanceStore, type PersistedInvariant } from '@/store/governance'
import { ShieldCheck, Trash2 } from 'lucide-react'

/**
 * ProtectedPanel - Read-only view of persisted invariants.
 * Shows the project's "constitution" -- things Torbit won't break.
 */
export function ProtectedPanel() {
  const invariants = useGovernanceStore(s => s.invariants)
  const removeInvariant = useGovernanceStore(s => s.removeInvariant)
  const clearAll = useGovernanceStore(s => s.clearAll)

  if (invariants.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center">
          <ShieldCheck className="w-5 h-5 text-[#333] mx-auto mb-2" />
          <p className="text-[12px] text-[#505050] leading-relaxed">
            No protected invariants yet.
          </p>
          <p className="text-[11px] text-[#333] mt-1">
            {"They'll appear here as Torbit learns what to protect."}
          </p>
        </div>
      </div>
    )
  }

  const hardCount = invariants.filter(i => i.severity === 'hard').length
  const softCount = invariants.filter(i => i.severity === 'soft').length

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header summary */}
      <div className="px-3 py-2 border-b border-[#151515] flex items-center justify-between">
        <span className="text-[10px] text-[#505050]">
          {hardCount} hard{softCount > 0 ? `, ${softCount} soft` : ''}
        </span>
        {invariants.length > 0 && (
          <button
            onClick={clearAll}
            className="text-[10px] text-[#333] hover:text-red-400/60 transition-colors"
            title="Clear all invariants"
          >
            Clear
          </button>
        )}
      </div>

      {/* Invariant list */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence initial={false}>
          {invariants.map((inv) => (
            <InvariantRow
              key={inv.id}
              invariant={inv}
              onRemove={() => removeInvariant(inv.id)}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

function InvariantRow({
  invariant,
  onRemove,
}: {
  invariant: PersistedInvariant
  onRemove: () => void
}) {
  const isHard = invariant.severity === 'hard'

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="group border-b border-[#0a0a0a] last:border-0"
    >
      <div className="px-3 py-2 flex items-start gap-2">
        {/* Severity dot */}
        <div className="mt-1 shrink-0">
          <div
            className={`w-1.5 h-1.5 rounded-full ${
              isHard ? 'bg-emerald-500/60' : 'bg-amber-500/40'
            }`}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-[#a1a1a1] leading-relaxed truncate">
            {invariant.description}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[9px] text-[#333]">
              {isHard ? 'hard' : 'soft'}
            </span>
            {invariant.buildsSurvived > 0 && (
              <span className="text-[9px] text-[#333]">
                {invariant.buildsSurvived} build{invariant.buildsSurvived > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Remove button (on hover) */}
        <button
          onClick={onRemove}
          className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 flex items-center justify-center text-[#333] hover:text-red-400/60"
          title="Remove invariant"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </motion.div>
  )
}
