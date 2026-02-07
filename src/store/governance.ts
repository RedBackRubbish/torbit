import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { GovernanceObject, ProtectedInvariant } from '@/lib/agents/governance'

// ============================================
// GOVERNANCE PERSISTENCE
// 
// Invariants accumulate across sessions.
// A user builds a dashboard on Monday -> "blue sidebar" is protected.
// They come back Tuesday to "add settings page" -> the Strategist
// already knows "blue sidebar" is protected without being told again.
//
// This is the project-level constitution.
// ============================================

/** A persisted invariant with metadata */
export interface PersistedInvariant {
  id: string
  /** What must remain true */
  description: string
  /** Files or patterns this applies to */
  scope: string[]
  /** hard = must never break, soft = warn */
  severity: 'hard' | 'soft'
  /** When this invariant was first established */
  createdAt: number
  /** Which build established it */
  sourceIntent: string
  /** How many builds this has survived (trust signal) */
  buildsSurvived: number
}

/** A log entry for governance history */
export interface GovernanceEntry {
  id: string
  timestamp: number
  intent: string
  verdict: GovernanceObject['verdict']
  invariantsAdded: number
  invariantsEnforced: number
}

export interface GovernanceState {
  /** All accumulated invariants across sessions */
  invariants: PersistedInvariant[]
  /** Governance history log */
  history: GovernanceEntry[]
}

export interface GovernanceActions {
  /**
   * Merge a new GovernanceObject into the persisted store.
   * Deduplicates by description (case-insensitive).
   * New invariants are added; existing ones bump buildsSurvived.
   */
  addGovernance: (gov: GovernanceObject) => void
  
  /** Remove an invariant by ID */
  removeInvariant: (id: string) => void
  
  /** Clear all invariants (fresh start) */
  clearAll: () => void
  
  /** Get only hard invariants (for enforcement) */
  getHardInvariants: () => PersistedInvariant[]
  
  /** Get all active invariants formatted for injection into agent prompts */
  getInvariantsForPrompt: () => string | null
  
  /** Increment buildsSurvived for invariants that were enforced in a build */
  markEnforced: (descriptions: string[]) => void
}

// ============================================
// MERGE LOGIC
// ============================================

/**
 * Normalize description for dedup comparison.
 * "Blue theme on sidebar" === "blue theme on sidebar" === "Blue Theme On Sidebar"
 */
function normalizeDescription(desc: string): string {
  return desc.toLowerCase().trim().replace(/\s+/g, ' ')
}

/**
 * Check if two invariants are effectively the same.
 */
function isDuplicate(existing: PersistedInvariant, incoming: ProtectedInvariant): boolean {
  return normalizeDescription(existing.description) === normalizeDescription(incoming.description)
}

// ============================================
// STORE
// ============================================

export const useGovernanceStore = create<GovernanceState & GovernanceActions>()(
  persist(
    immer((set, get) => ({
      invariants: [],
      history: [],

      addGovernance: (gov) => {
        const now = Date.now()
        const intent = gov.scope.intent || 'Unknown intent'
        let added = 0
        let enforced = 0

        set((state) => {
          for (const incoming of gov.protected_invariants) {
            const existingIndex = state.invariants.findIndex(inv => isDuplicate(inv, incoming))

            if (existingIndex !== -1) {
              // Existing invariant -- bump survival count and upgrade severity if needed
              const existing = state.invariants[existingIndex]
              existing.buildsSurvived += 1
              if (incoming.severity === 'hard' && existing.severity === 'soft') {
                existing.severity = 'hard' // Promote to hard if Strategist now considers it critical
              }
              // Merge scope (union of file paths)
              const newScope = new Set([...existing.scope, ...incoming.scope])
              existing.scope = Array.from(newScope)
              enforced += 1
            } else {
              // New invariant -- add it
              state.invariants.push({
                id: `inv_${now}_${Math.random().toString(36).slice(2, 8)}`,
                description: incoming.description,
                scope: [...incoming.scope],
                severity: incoming.severity,
                createdAt: now,
                sourceIntent: intent,
                buildsSurvived: 0,
              })
              added += 1
            }
          }

          // Add history entry (keep last 50)
          state.history.unshift({
            id: `gov_${now}_${Math.random().toString(36).slice(2, 8)}`,
            timestamp: now,
            intent,
            verdict: gov.verdict,
            invariantsAdded: added,
            invariantsEnforced: enforced,
          })
          if (state.history.length > 50) {
            state.history = state.history.slice(0, 50)
          }
        })
      },

      removeInvariant: (id) => {
        set((state) => {
          state.invariants = state.invariants.filter(inv => inv.id !== id)
        })
      },

      clearAll: () => {
        set((state) => {
          state.invariants = []
          state.history = []
        })
      },

      getHardInvariants: () => {
        return get().invariants.filter(inv => inv.severity === 'hard')
      },

      getInvariantsForPrompt: () => {
        const invariants = get().invariants
        if (invariants.length === 0) return null

        const lines: string[] = [
          '=== PERSISTED PROJECT INVARIANTS ===',
          'These invariants were established in previous builds.',
          'They MUST be respected unless the user explicitly asks to change them.',
          '',
        ]

        for (const inv of invariants) {
          const tag = inv.severity === 'hard' ? '[HARD]' : '[SOFT]'
          const trust = inv.buildsSurvived > 0 
            ? ` (survived ${inv.buildsSurvived} build${inv.buildsSurvived > 1 ? 's' : ''})`
            : ' (new)'
          lines.push(`  ${tag} ${inv.description}${trust}`)
          if (inv.scope.length > 0) {
            lines.push(`        Scope: ${inv.scope.join(', ')}`)
          }
        }

        lines.push('', '=== END PERSISTED INVARIANTS ===')
        return lines.join('\n')
      },

      markEnforced: (descriptions) => {
        set((state) => {
          for (const desc of descriptions) {
            const normalized = normalizeDescription(desc)
            const inv = state.invariants.find(i => normalizeDescription(i.description) === normalized)
            if (inv) {
              inv.buildsSurvived += 1
            }
          }
        })
      },
    })),
    {
      name: 'torbit-governance',
      version: 1,
      partialize: (state) => ({
        invariants: state.invariants,
        history: state.history.slice(0, 50),
      }),
    }
  )
)

// ============================================
// CONVENIENCE HOOKS
// ============================================

export function useInvariantCount() {
  return useGovernanceStore(s => s.invariants.length)
}

export function useHardInvariantCount() {
  return useGovernanceStore(s => s.invariants.filter(i => i.severity === 'hard').length)
}
