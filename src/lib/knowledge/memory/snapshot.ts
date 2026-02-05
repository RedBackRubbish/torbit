/**
 * TORBIT - Knowledge Snapshot Generator
 * 
 * Creates .project/knowledge.json on first execution.
 * 
 * Contains:
 * - Approved sources consulted
 * - Versions / release timestamps
 * - Knowledge decisions applied
 * - Confidence scores
 * - Strategist approval hashes
 */

import type { 
  KnowledgeSnapshot, 
  KnowledgeAssumption,
  ProjectKnowledge,
  FreezeMode,
} from './types'
import { createEmptySnapshot, createEmptyProjectKnowledge } from './types'
import { getAllFacts, getCacheStats } from '../cache'
import { APPROVED_SOURCES, getSource } from '../sources'
import { STABLE_DEFAULTS } from '../charter'

// ============================================
// SNAPSHOT STORAGE (in-memory for now)
// ============================================

const projectSnapshots = new Map<string, ProjectKnowledge>()

// ============================================
// SNAPSHOT GENERATION
// ============================================

/**
 * Generate knowledge snapshot for a project
 * Called on first execution
 */
export function generateSnapshot(
  projectId: string,
  detectedFrameworks: Record<string, string>,
  environment: 'local' | 'staging' | 'production'
): KnowledgeSnapshot {
  const now = new Date().toISOString()
  
  // Get all facts from cache
  const facts = getAllFacts()
  
  // Build assumptions from stable defaults + facts
  const assumptions = buildAssumptions(detectedFrameworks, facts)
  
  // Calculate overall confidence
  const confidence = calculateConfidence(assumptions)
  
  // Determine freeze mode based on environment
  const freezeMode = determineFreezeMode(environment)
  
  // Get consulted sources
  const sourcesConsulted = getConsultedSources(facts)
  
  // Create snapshot
  const snapshot: KnowledgeSnapshot = {
    version: '1.0.0',
    createdAt: now,
    projectId,
    freezeMode,
    frameworks: detectedFrameworks,
    assumptions,
    confidence,
    sourcesConsulted,
    factsReferenced: facts.map(f => f.id),
    suggestionsOffered: [],
    suggestionsAccepted: [],
    suggestionsDismissed: [],
    snapshotHash: '',
  }
  
  // Generate hash
  snapshot.snapshotHash = generateSnapshotHash(snapshot)
  
  // If frozen, record when
  if (freezeMode === 'frozen') {
    snapshot.frozenAt = now
    snapshot.frozenBy = environment === 'production' ? 'policy' : 'system'
  }
  
  return snapshot
}

/**
 * Build assumptions from detected frameworks and facts
 */
function buildAssumptions(
  frameworks: Record<string, string>,
  facts: Array<{ id: string; sourceId: string; topic: string; confidence: number }>
): KnowledgeAssumption[] {
  const assumptions: KnowledgeAssumption[] = []
  const now = new Date().toISOString()
  
  // Add framework assumptions
  if (frameworks['nextjs']) {
    const version = parseFloat(frameworks['nextjs'])
    if (version >= 13) {
      assumptions.push({
        assumption: 'App Router default',
        sourceId: 'nextjs-releases',
        establishedAt: now,
        confidence: 0.95,
        strategistApproved: true,
        approvalHash: generateApprovalHash('App Router default'),
      })
    }
  }
  
  if (frameworks['react']) {
    const version = parseFloat(frameworks['react'])
    if (version >= 18) {
      assumptions.push({
        assumption: 'Server Components available',
        sourceId: 'react-official',
        establishedAt: now,
        confidence: 0.95,
        strategistApproved: true,
        approvalHash: generateApprovalHash('Server Components available'),
      })
    }
  }
  
  // Add stable defaults from charter
  for (const [tech, defaults] of Object.entries(STABLE_DEFAULTS)) {
    if (frameworks[tech]) {
      for (const [key, value] of Object.entries(defaults)) {
        assumptions.push({
          assumption: value,
          sourceId: `${tech}-official`,
          establishedAt: now,
          confidence: 0.95,
          strategistApproved: true,
          approvalHash: generateApprovalHash(value),
        })
      }
    }
  }
  
  return assumptions
}

/**
 * Calculate overall confidence from assumptions
 */
function calculateConfidence(assumptions: KnowledgeAssumption[]): number {
  if (assumptions.length === 0) return 1.0
  
  const sum = assumptions.reduce((acc, a) => acc + a.confidence, 0)
  return Math.round((sum / assumptions.length) * 100) / 100
}

/**
 * Determine freeze mode based on environment
 * Production ALWAYS forces frozen
 */
function determineFreezeMode(
  environment: 'local' | 'staging' | 'production'
): FreezeMode {
  switch (environment) {
    case 'production':
      return 'frozen' // ALWAYS
    case 'staging':
      return 'advisory' // Suggestions allowed
    case 'local':
      return 'live' // Full flexibility
    default:
      return 'frozen'
  }
}

/**
 * Get list of sources that were consulted
 */
function getConsultedSources(
  facts: Array<{ sourceId: string }>
): string[] {
  const sourceIds = new Set(facts.map(f => f.sourceId))
  return Array.from(sourceIds)
}

/**
 * Generate hash for snapshot integrity
 */
function generateSnapshotHash(snapshot: KnowledgeSnapshot): string {
  const content = JSON.stringify({
    projectId: snapshot.projectId,
    frameworks: snapshot.frameworks,
    assumptions: snapshot.assumptions.map(a => a.assumption),
    confidence: snapshot.confidence,
  })
  
  // Simple hash for now (would use crypto in production)
  let hash = 0
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  
  return `snap-${Math.abs(hash).toString(16)}`
}

/**
 * Generate approval hash
 */
function generateApprovalHash(assumption: string): string {
  let hash = 0
  for (let i = 0; i < assumption.length; i++) {
    const char = assumption.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return `apr-${Math.abs(hash).toString(16)}`
}

// ============================================
// SNAPSHOT MANAGEMENT
// ============================================

/**
 * Get or create project knowledge
 */
export function getProjectKnowledge(projectId: string): ProjectKnowledge {
  if (!projectSnapshots.has(projectId)) {
    projectSnapshots.set(projectId, createEmptyProjectKnowledge(projectId))
  }
  return projectSnapshots.get(projectId)!
}

/**
 * Save snapshot for project
 */
export function saveSnapshot(projectId: string, snapshot: KnowledgeSnapshot): void {
  const knowledge = getProjectKnowledge(projectId)
  knowledge.snapshot = snapshot
  projectSnapshots.set(projectId, knowledge)
}

/**
 * Check if project has snapshot
 */
export function hasSnapshot(projectId: string): boolean {
  const knowledge = projectSnapshots.get(projectId)
  return knowledge?.snapshot.snapshotHash !== ''
}

/**
 * Export snapshot as JSON (for .project/knowledge.json)
 */
export function exportSnapshotJson(projectId: string): string {
  const knowledge = getProjectKnowledge(projectId)
  
  // Clean export format
  const exportData = {
    createdAt: knowledge.snapshot.createdAt,
    frameworks: knowledge.snapshot.frameworks,
    assumptions: knowledge.snapshot.assumptions.map(a => a.assumption),
    confidence: knowledge.snapshot.confidence,
    freezeMode: knowledge.snapshot.freezeMode,
    frozenAt: knowledge.snapshot.frozenAt,
    snapshotHash: knowledge.snapshot.snapshotHash,
  }
  
  return JSON.stringify(exportData, null, 2)
}

/**
 * Get snapshot for evidence bundle
 */
export function getSnapshotForEvidence(projectId: string): KnowledgeSnapshot | null {
  const knowledge = projectSnapshots.get(projectId)
  return knowledge?.snapshot || null
}

/**
 * Verify snapshot integrity
 * Returns true if hash matches
 */
export function verifySnapshotIntegrity(snapshot: KnowledgeSnapshot): boolean {
  const storedHash = snapshot.snapshotHash
  const computedHash = generateSnapshotHash({ ...snapshot, snapshotHash: '' })
  
  // Remove the prefix for comparison (snap-)
  const storedValue = storedHash.replace('snap-', '')
  const computedValue = computedHash.replace('snap-', '')
  
  return storedValue === computedValue
}
