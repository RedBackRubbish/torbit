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
  /** Which project this invariant belongs to */
  projectId: string
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
  /** Active project scope -- invariants are keyed to this */
  projectId: string
  /** All accumulated invariants across sessions */
  invariants: PersistedInvariant[]
  /** Governance history log */
  history: GovernanceEntry[]
  /** Invariant descriptions the user explicitly removed.
   *  Prevents Strategist from silently re-adding them. */
  dismissedDescriptions: string[]
}

export interface GovernanceActions {
  /** Switch the active project scope. Only invariants for this project are returned. */
  setProjectId: (projectId: string) => void
  
  /**
   * Merge a new GovernanceObject into the persisted store.
   * Deduplicates by description (case-insensitive).
   * Skips invariants the user explicitly dismissed.
   * New invariants are added; existing ones bump buildsSurvived.
   */
  addGovernance: (gov: GovernanceObject) => void
  
  /** Remove an invariant by ID. Adds its description to the dismissed list
   *  so the Strategist cannot silently re-introduce it. */
  removeInvariant: (id: string) => void
  
  /** Clear all invariants for the current project (fresh start) */
  clearAll: () => void
  
  /** Get only hard invariants for the current project */
  getHardInvariants: () => PersistedInvariant[]
  
  /** Get active-project invariants formatted for injection into agent prompts */
  getInvariantsForPrompt: () => string | null
  
  /** Increment buildsSurvived for invariants that were enforced in a build */
  markEnforced: (descriptions: string[]) => void
  
  /** Un-dismiss an invariant (allow Strategist to re-add it) */
  undismiss: (description: string) => void
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
      projectId: 'default',
      invariants: [],
      history: [],
      dismissedDescriptions: [],

      setProjectId: (projectId) => {
        set((state) => { state.projectId = projectId })
      },

      addGovernance: (gov) => {
        const now = Date.now()
        const pid = get().projectId
        const intent = gov.scope.intent || 'Unknown intent'
        const dismissed = get().dismissedDescriptions
        let added = 0
        let enforced = 0

        set((state) => {
          for (const incoming of gov.protected_invariants) {
            // Skip invariants the user explicitly dismissed
            if (dismissed.some(d => normalizeDescription(d) === normalizeDescription(incoming.description))) {
              continue
            }

            // Only match against invariants for the same project
            const existingIndex = state.invariants.findIndex(
              inv => inv.projectId === pid && isDuplicate(inv, incoming)
            )

            if (existingIndex !== -1) {
              // Existing invariant -- bump survival count and upgrade severity if needed
              const existing = state.invariants[existingIndex]
              existing.buildsSurvived += 1
              if (incoming.severity === 'hard' && existing.severity === 'soft') {
                existing.severity = 'hard'
              }
              const newScope = new Set([...existing.scope, ...incoming.scope])
              existing.scope = Array.from(newScope)
              enforced += 1
            } else {
              // New invariant -- add it scoped to the active project
              state.invariants.push({
                id: `inv_${now}_${Math.random().toString(36).slice(2, 8)}`,
                projectId: pid,
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
          const inv = state.invariants.find(i => i.id === id)
          if (inv) {
            // Add to dismissed list so Strategist cannot silently re-add it
            const normalized = normalizeDescription(inv.description)
            if (!state.dismissedDescriptions.includes(normalized)) {
              state.dismissedDescriptions.push(normalized)
            }
          }
          state.invariants = state.invariants.filter(i => i.id !== id)
        })
      },

      clearAll: () => {
        const pid = get().projectId
        set((state) => {
          // Only clear invariants for the active project
          state.invariants = state.invariants.filter(inv => inv.projectId !== pid)
          // Also clear dismissed list for this project so they can be re-established
          state.dismissedDescriptions = []
        })
      },

      getHardInvariants: () => {
        const pid = get().projectId
        return get().invariants.filter(inv => inv.projectId === pid && inv.severity === 'hard')
      },

      getInvariantsForPrompt: () => {
        const pid = get().projectId
        const invariants = get().invariants.filter(inv => inv.projectId === pid)
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
        const pid = get().projectId
        set((state) => {
          for (const desc of descriptions) {
            const normalized = normalizeDescription(desc)
            const inv = state.invariants.find(
              i => i.projectId === pid && normalizeDescription(i.description) === normalized
            )
            if (inv) {
              inv.buildsSurvived += 1
            }
          }
        })
      },

      undismiss: (description) => {
        set((state) => {
          const normalized = normalizeDescription(description)
          state.dismissedDescriptions = state.dismissedDescriptions.filter(d => d !== normalized)
        })
      },
    })),
    {
      name: 'torbit-governance',
      version: 2,
      partialize: (state) => ({
        projectId: state.projectId,
        invariants: state.invariants,
        history: state.history.slice(0, 50),
        dismissedDescriptions: state.dismissedDescriptions,
      }),
    }
  )
)

// ============================================
// CONVENIENCE HOOKS
// ============================================

export function useInvariantCount() {
  return useGovernanceStore(s => {
    const pid = s.projectId
    return s.invariants.filter(i => i.projectId === pid).length
  })
}

export function useHardInvariantCount() {
  return useGovernanceStore(s => {
    const pid = s.projectId
    return s.invariants.filter(i => i.projectId === pid && i.severity === 'hard').length
  })
}

/** Get invariants for the active project (for UI rendering) */
export function useProjectInvariants() {
  return useGovernanceStore(s => {
    const pid = s.projectId
    return s.invariants.filter(i => i.projectId === pid)
  })
}
