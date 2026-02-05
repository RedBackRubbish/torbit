/**
 * TORBIT - Project Memory Module
 * 
 * DIRECTIVE I: Project Memory & Knowledge Freezing
 * 
 * The last stabilizer before TORBIT scales.
 * 
 * Exports:
 * - Types: FreezeMode, KnowledgeSnapshot, etc.
 * - Snapshot: Generate, export, verify
 * - Freeze: Mode management
 * - Events: Audit trail
 */

// Types
export type {
  FreezeMode,
  FrameworkVersion,
  KnowledgeAssumption,
  KnowledgeSnapshot,
  ProjectKnowledge,
  FreezeChange,
  OverrideRequest,
} from './types'

export {
  FREEZE_MODE_DESCRIPTIONS,
  createEmptySnapshot,
  createEmptyProjectKnowledge,
} from './types'

// Snapshot operations
export {
  generateSnapshot,
  getProjectKnowledge,
  saveSnapshot,
  hasSnapshot,
  exportSnapshotJson,
  getSnapshotForEvidence,
  verifySnapshotIntegrity,
} from './snapshot'

// Freeze mode operations
export {
  getFreezeMode,
  isFrozen,
  areSuggestionsAllowed,
  areUpdatesAllowed,
  changeFreezeMode,
  forceFreeze,
  requestOverride,
  resolveOverride,
  getPendingOverrides,
  validateOperation,
  enforceEnvironmentFreeze,
} from './freeze'

// Ledger events
export type {
  MemoryEventType,
  MemoryLedgerEvent,
  SnapshotCreatedPayload,
  KnowledgeFrozenPayload,
  ModeChangedPayload,
  OverrideRequestedPayload,
  OverrideResolvedPayload,
  AssumptionAddedPayload,
  KnowledgeExportedPayload,
  IntegrityVerifiedPayload,
} from './events'

export {
  emitMemoryEvent,
  getMemoryEvents,
  getEventsByType,
  getAllMemoryEvents,
  emitSnapshotCreated,
  emitKnowledgeFrozen,
  emitModeChanged,
  emitOverrideRequested,
  emitOverrideResolved,
  emitAssumptionAdded,
  emitKnowledgeExported,
  emitIntegrityVerified,
} from './events'
