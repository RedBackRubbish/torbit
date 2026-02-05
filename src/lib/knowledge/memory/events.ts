/**
 * TORBIT - Project Memory Ledger Events
 * 
 * Events for audit trail of knowledge operations.
 * 
 * Event types:
 * - KNOWLEDGE_SNAPSHOT_CREATED
 * - KNOWLEDGE_FROZEN
 * - KNOWLEDGE_MODE_CHANGED
 * - KNOWLEDGE_OVERRIDE_REQUESTED
 * - KNOWLEDGE_OVERRIDE_RESOLVED
 * - KNOWLEDGE_ASSUMPTION_ADDED
 */

import type {
  FreezeMode,
  KnowledgeSnapshot,
  FreezeChange,
  OverrideRequest,
  KnowledgeAssumption,
} from './types'

// ============================================
// EVENT TYPES
// ============================================

export type MemoryEventType =
  | 'KNOWLEDGE_SNAPSHOT_CREATED'
  | 'KNOWLEDGE_FROZEN'
  | 'KNOWLEDGE_MODE_CHANGED'
  | 'KNOWLEDGE_OVERRIDE_REQUESTED'
  | 'KNOWLEDGE_OVERRIDE_RESOLVED'
  | 'KNOWLEDGE_ASSUMPTION_ADDED'
  | 'KNOWLEDGE_EXPORTED'
  | 'KNOWLEDGE_INTEGRITY_VERIFIED'

// ============================================
// EVENT PAYLOADS
// ============================================

export interface SnapshotCreatedPayload {
  projectId: string
  snapshotHash: string
  frameworkCount: number
  assumptionCount: number
  confidence: number
  freezeMode: FreezeMode
}

export interface KnowledgeFrozenPayload {
  projectId: string
  frozenBy: 'system' | 'user' | 'policy'
  frozenAt: string
  reason: string
  snapshotHash: string
}

export interface ModeChangedPayload {
  projectId: string
  change: FreezeChange
}

export interface OverrideRequestedPayload {
  projectId: string
  request: OverrideRequest
}

export interface OverrideResolvedPayload {
  projectId: string
  requestId: string
  approved: boolean
  resolvedBy: string
}

export interface AssumptionAddedPayload {
  projectId: string
  assumption: KnowledgeAssumption
}

export interface KnowledgeExportedPayload {
  projectId: string
  exportedAt: string
  format: 'json' | 'evidence-bundle'
  destination: string
}

export interface IntegrityVerifiedPayload {
  projectId: string
  verified: boolean
  expectedHash: string
  actualHash: string
}

// ============================================
// EVENT INTERFACE
// ============================================

export interface MemoryLedgerEvent {
  id: string
  type: MemoryEventType
  timestamp: string
  projectId: string
  payload:
    | SnapshotCreatedPayload
    | KnowledgeFrozenPayload
    | ModeChangedPayload
    | OverrideRequestedPayload
    | OverrideResolvedPayload
    | AssumptionAddedPayload
    | KnowledgeExportedPayload
    | IntegrityVerifiedPayload
  metadata?: {
    environment?: 'local' | 'staging' | 'production'
    actor?: string
    sessionId?: string
  }
}

// ============================================
// EVENT STORAGE
// ============================================

const memoryEvents: MemoryLedgerEvent[] = []

/**
 * Emit a memory event to the ledger
 */
export function emitMemoryEvent(
  type: MemoryEventType,
  projectId: string,
  payload: MemoryLedgerEvent['payload'],
  metadata?: MemoryLedgerEvent['metadata']
): MemoryLedgerEvent {
  const event: MemoryLedgerEvent = {
    id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    timestamp: new Date().toISOString(),
    projectId,
    payload,
    metadata,
  }
  
  memoryEvents.push(event)
  
  return event
}

/**
 * Get all memory events for a project
 */
export function getMemoryEvents(projectId: string): MemoryLedgerEvent[] {
  return memoryEvents.filter(e => e.projectId === projectId)
}

/**
 * Get memory events by type
 */
export function getEventsByType(
  projectId: string,
  type: MemoryEventType
): MemoryLedgerEvent[] {
  return memoryEvents.filter(e => e.projectId === projectId && e.type === type)
}

/**
 * Get all memory events (for export)
 */
export function getAllMemoryEvents(): MemoryLedgerEvent[] {
  return [...memoryEvents]
}

// ============================================
// CONVENIENCE EMITTERS
// ============================================

export function emitSnapshotCreated(snapshot: KnowledgeSnapshot): MemoryLedgerEvent {
  return emitMemoryEvent(
    'KNOWLEDGE_SNAPSHOT_CREATED',
    snapshot.projectId,
    {
      projectId: snapshot.projectId,
      snapshotHash: snapshot.snapshotHash,
      frameworkCount: Object.keys(snapshot.frameworks).length,
      assumptionCount: snapshot.assumptions.length,
      confidence: snapshot.confidence,
      freezeMode: snapshot.freezeMode,
    }
  )
}

export function emitKnowledgeFrozen(
  projectId: string,
  frozenBy: 'system' | 'user' | 'policy',
  reason: string,
  snapshotHash: string
): MemoryLedgerEvent {
  return emitMemoryEvent(
    'KNOWLEDGE_FROZEN',
    projectId,
    {
      projectId,
      frozenBy,
      frozenAt: new Date().toISOString(),
      reason,
      snapshotHash,
    }
  )
}

export function emitModeChanged(
  projectId: string,
  change: FreezeChange
): MemoryLedgerEvent {
  return emitMemoryEvent(
    'KNOWLEDGE_MODE_CHANGED',
    projectId,
    { projectId, change }
  )
}

export function emitOverrideRequested(
  projectId: string,
  request: OverrideRequest
): MemoryLedgerEvent {
  return emitMemoryEvent(
    'KNOWLEDGE_OVERRIDE_REQUESTED',
    projectId,
    { projectId, request }
  )
}

export function emitOverrideResolved(
  projectId: string,
  requestId: string,
  approved: boolean,
  resolvedBy: string
): MemoryLedgerEvent {
  return emitMemoryEvent(
    'KNOWLEDGE_OVERRIDE_RESOLVED',
    projectId,
    { projectId, requestId, approved, resolvedBy }
  )
}

export function emitAssumptionAdded(
  projectId: string,
  assumption: KnowledgeAssumption
): MemoryLedgerEvent {
  return emitMemoryEvent(
    'KNOWLEDGE_ASSUMPTION_ADDED',
    projectId,
    { projectId, assumption }
  )
}

export function emitKnowledgeExported(
  projectId: string,
  format: 'json' | 'evidence-bundle',
  destination: string
): MemoryLedgerEvent {
  return emitMemoryEvent(
    'KNOWLEDGE_EXPORTED',
    projectId,
    {
      projectId,
      exportedAt: new Date().toISOString(),
      format,
      destination,
    }
  )
}

export function emitIntegrityVerified(
  projectId: string,
  verified: boolean,
  expectedHash: string,
  actualHash: string
): MemoryLedgerEvent {
  return emitMemoryEvent(
    'KNOWLEDGE_INTEGRITY_VERIFIED',
    projectId,
    { projectId, verified, expectedHash, actualHash }
  )
}
