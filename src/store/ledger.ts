import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { recordMetric, recordPromptToVerified } from '@/lib/metrics/success'

// ============================================================================
// ACTIVITY LEDGER STORE
// ============================================================================
// System-of-record timeline. Immutable. Past-tense only.
// 
// This is NOT a log viewer. This is canonical proof of what happened.
// 
// Four phases: Describe → Build → Verify → Export
// Each entry is a completed fact, not a status update.
// ============================================================================

export type LedgerPhase = 'describe' | 'build' | 'verify' | 'export'

export interface LedgerEntry {
  id: string
  phase: LedgerPhase
  label: string
  completedAt: number
  
  // Phase-specific proof data (shown on expand)
  proof?: {
    // Describe phase
    intentHash?: string
    
    // Build phase
    artifactCount?: number
    filesGenerated?: string[]
    // Capability artifact attribution
    capabilityArtifacts?: {
      capability: string
      files: string[]
    }[]
    
    // Verify phase
    auditorVerdict?: 'passed' | 'failed'
    runtimeHash?: string
    dependencyLockHash?: string
    
    // Export phase
    exportFormat?: string
    includesProof?: boolean
    capabilitiesIncluded?: string[]
    
    // Native wrapper export (Phase 8 - unused until then)
    nativeWrapper?: {
      platform: 'ios' | 'android'
      wrapper: 'capacitor'
      bundleId: string
      capabilities: string[]
    }
  }
}

export interface LedgerState {
  entries: LedgerEntry[]
  isExpanded: boolean
}

export interface LedgerActions {
  // Record immutable events (past-tense)
  recordIntent: (intentHash: string) => void
  recordArtifactsGenerated: (
    artifactCount: number, 
    files: string[], 
    capabilityArtifacts?: { capability: string; files: string[] }[]
  ) => void
  recordVerificationPassed: (runtimeHash: string, dependencyLockHash: string) => void
  recordVerificationFailed: () => void
  recordExport: (format: string, includesProof: boolean, capabilitiesIncluded?: string[]) => void
  
  // UI State
  setExpanded: (expanded: boolean) => void
  toggleExpanded: () => void
  
  // Queries
  getCompletedCount: () => number
  getPhaseStatus: (phase: LedgerPhase) => 'complete' | 'pending'
  getEntry: (phase: LedgerPhase) => LedgerEntry | undefined
  
  // Reset (for new sessions)
  clearLedger: () => void
}

// Simple hash generator for ledger entries
function generateLedgerHash(input: string): string {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return `0x${Math.abs(hash).toString(16).padStart(8, '0')}`
}

let entryCounter = 0
const PROMPT_START_TS_KEY = 'torbit_prompt_start_ts'

function storePromptStartTimestamp(timestamp: number): void {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(PROMPT_START_TS_KEY, String(timestamp))
}

function consumePromptStartTimestamp(): number | null {
  if (typeof window === 'undefined') return null
  const raw = window.sessionStorage.getItem(PROMPT_START_TS_KEY)
  if (!raw) return null

  window.sessionStorage.removeItem(PROMPT_START_TS_KEY)
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  return parsed
}

export const useLedger = create<LedgerState & LedgerActions>()(
  immer((set, get) => ({
    // Initial State
    entries: [],
    isExpanded: false, // Collapsed by default
    
    // ========================================================================
    // Record Events (Immutable, Past-Tense)
    // ========================================================================
    
    recordIntent: (intentHash) => {
      set((state) => {
        // Don't duplicate
        if (state.entries.some(e => e.phase === 'describe')) return
        
        // Record metric (Phase 6) - build starts when intent is recorded
        recordMetric('build_started')
        storePromptStartTimestamp(Date.now())
        
        state.entries.push({
          id: `ledger-${++entryCounter}-${Date.now()}`,
          phase: 'describe',
          label: 'Intent recorded',
          completedAt: Date.now(),
          proof: {
            intentHash,
          },
        })
      })
    },
    
    recordArtifactsGenerated: (artifactCount, files, capabilityArtifacts) => {
      set((state) => {
        // Don't duplicate
        if (state.entries.some(e => e.phase === 'build')) return
        
        // Record metric (Phase 6)
        recordMetric('build_completed', { artifactCount })
        
        state.entries.push({
          id: `ledger-${++entryCounter}-${Date.now()}`,
          phase: 'build',
          label: 'Artifacts generated',
          completedAt: Date.now(),
          proof: {
            artifactCount,
            filesGenerated: files.slice(0, 10), // Limit for display
            capabilityArtifacts,
          },
        })
      })
    },
    
    recordVerificationPassed: (runtimeHash, dependencyLockHash) => {
      set((state) => {
        // Don't duplicate
        if (state.entries.some(e => e.phase === 'verify')) return
        
        // Record metric (Phase 6)
        recordMetric('build_verified')
        const promptStart = consumePromptStartTimestamp()
        if (promptStart) {
          recordPromptToVerified(promptStart)
        }
        
        state.entries.push({
          id: `ledger-${++entryCounter}-${Date.now()}`,
          phase: 'verify',
          label: 'Auditor verification passed',
          completedAt: Date.now(),
          proof: {
            auditorVerdict: 'passed',
            runtimeHash,
            dependencyLockHash,
          },
        })
      })
    },
    
    recordVerificationFailed: () => {
      set((state) => {
        // Don't duplicate
        if (state.entries.some(e => e.phase === 'verify')) return
        
        state.entries.push({
          id: `ledger-${++entryCounter}-${Date.now()}`,
          phase: 'verify',
          label: 'Auditor verification failed',
          completedAt: Date.now(),
          proof: {
            auditorVerdict: 'failed',
          },
        })
      })
    },
    
    recordExport: (format, includesProof, capabilitiesIncluded) => {
      set((state) => {
        // Allow multiple exports (each is a separate event)
        state.entries.push({
          id: `ledger-${++entryCounter}-${Date.now()}`,
          phase: 'export',
          label: 'Project exported',
          completedAt: Date.now(),
          proof: {
            exportFormat: format,
            includesProof,
            capabilitiesIncluded,
          },
        })
      })
    },
    
    // ========================================================================
    // UI State
    // ========================================================================
    
    setExpanded: (expanded) => {
      set((state) => {
        state.isExpanded = expanded
      })
    },
    
    toggleExpanded: () => {
      set((state) => {
        state.isExpanded = !state.isExpanded
      })
    },
    
    // ========================================================================
    // Queries
    // ========================================================================
    
    getCompletedCount: () => {
      const { entries } = get()
      // Count unique phases completed
      const phases = new Set(entries.map(e => e.phase))
      return phases.size
    },
    
    getPhaseStatus: (phase) => {
      const { entries } = get()
      return entries.some(e => e.phase === phase) ? 'complete' : 'pending'
    },
    
    getEntry: (phase) => {
      const { entries } = get()
      return entries.find(e => e.phase === phase)
    },
    
    // ========================================================================
    // Reset
    // ========================================================================
    
    clearLedger: () => {
      set((state) => {
        state.entries = []
        state.isExpanded = false
        if (typeof window !== 'undefined') {
          window.sessionStorage.removeItem(PROMPT_START_TS_KEY)
        }
      })
    },
  }))
)

// Export hash generator for use in other components
export { generateLedgerHash }
