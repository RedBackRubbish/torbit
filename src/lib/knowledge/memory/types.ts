/**
 * TORBIT - Project Memory Types
 * 
 * DIRECTIVE I: Project Memory & Knowledge Freezing
 * 
 * The last stabilizer before TORBIT scales.
 * 
 * Core guarantees:
 * - Projects must not drift in intent over time
 * - Deterministic rebuilds
 * - Audit-proof explanations
 * - Reproducibility years later
 * - Torbit never rewrites history
 */

// ============================================
// FREEZE MODES
// ============================================

/**
 * Knowledge freeze mode per project
 * 
 * Frozen (default): No new knowledge injected
 * Advisory: Suggestions allowed, no auto-apply
 * Live: Suggestions + updates allowed (non-prod only)
 * 
 * Production environment forces Frozen.
 */
export type FreezeMode = 'frozen' | 'advisory' | 'live'

export const FREEZE_MODE_DESCRIPTIONS: Record<FreezeMode, string> = {
  frozen: 'No new knowledge injected. Deterministic builds.',
  advisory: 'Suggestions allowed, no auto-apply.',
  live: 'Suggestions + updates allowed. Non-production only.',
}

// ============================================
// FRAMEWORK VERSION
// ============================================

export interface FrameworkVersion {
  name: string
  version: string
  detectedAt: string
  source: string
}

// ============================================
// KNOWLEDGE ASSUMPTION
// ============================================

export interface KnowledgeAssumption {
  /**
   * What was assumed
   */
  assumption: string
  
  /**
   * Source that informed this
   */
  sourceId: string
  
  /**
   * When this was established
   */
  establishedAt: string
  
  /**
   * Confidence score (0-1)
   */
  confidence: number
  
  /**
   * Was this approved by strategist?
   */
  strategistApproved: boolean
  
  /**
   * Hash of strategist approval (if any)
   */
  approvalHash?: string
}

// ============================================
// KNOWLEDGE SNAPSHOT
// ============================================

export interface KnowledgeSnapshot {
  /**
   * Snapshot version
   */
  version: '1.0.0'
  
  /**
   * When snapshot was created
   */
  createdAt: string
  
  /**
   * Project identifier
   */
  projectId: string
  
  /**
   * Current freeze mode
   */
  freezeMode: FreezeMode
  
  /**
   * Framework versions detected
   */
  frameworks: Record<string, string>
  
  /**
   * Knowledge assumptions applied
   */
  assumptions: KnowledgeAssumption[]
  
  /**
   * Overall confidence score
   */
  confidence: number
  
  /**
   * Sources consulted
   */
  sourcesConsulted: string[]
  
  /**
   * Facts referenced (IDs)
   */
  factsReferenced: string[]
  
  /**
   * Suggestions offered (IDs)
   */
  suggestionsOffered: string[]
  
  /**
   * Suggestions accepted (IDs)
   */
  suggestionsAccepted: string[]
  
  /**
   * Suggestions dismissed (IDs)
   */
  suggestionsDismissed: string[]
  
  /**
   * Hash of this snapshot (for integrity)
   */
  snapshotHash: string
  
  /**
   * When this was last frozen
   */
  frozenAt?: string
  
  /**
   * Who froze it
   */
  frozenBy?: 'system' | 'user' | 'policy'
}

// ============================================
// PROJECT KNOWLEDGE
// ============================================

export interface ProjectKnowledge {
  /**
   * Current snapshot
   */
  snapshot: KnowledgeSnapshot
  
  /**
   * History of freeze mode changes
   */
  freezeHistory: FreezeChange[]
  
  /**
   * Override requests (if any)
   */
  overrideRequests: OverrideRequest[]
}

export interface FreezeChange {
  from: FreezeMode
  to: FreezeMode
  changedAt: string
  changedBy: 'system' | 'user' | 'policy'
  reason: string
}

export interface OverrideRequest {
  id: string
  requestedAt: string
  requestedBy: string
  reason: string
  status: 'pending' | 'approved' | 'denied'
  resolvedAt?: string
  resolvedBy?: string
}

// ============================================
// DEFAULTS
// ============================================

export function createEmptySnapshot(projectId: string): KnowledgeSnapshot {
  return {
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    projectId,
    freezeMode: 'frozen', // Default: frozen
    frameworks: {},
    assumptions: [],
    confidence: 1.0,
    sourcesConsulted: [],
    factsReferenced: [],
    suggestionsOffered: [],
    suggestionsAccepted: [],
    suggestionsDismissed: [],
    snapshotHash: '',
  }
}

export function createEmptyProjectKnowledge(projectId: string): ProjectKnowledge {
  return {
    snapshot: createEmptySnapshot(projectId),
    freezeHistory: [],
    overrideRequests: [],
  }
}
