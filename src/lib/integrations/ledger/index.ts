/**
 * TORBIT - Integration Ledger Index
 * 
 * Central exports for the audit ledger system.
 */

// Types
export type {
  LedgerEventType,
  GovernanceSnapshot,
  PackageRecord,
  ConsentRecord,
  DriftRecord,
  FixRecord,
  ExportContext,
  LedgerEntry,
  IntegrationLedger,
  LedgerQueryOptions,
  LedgerExport,
  LedgerWriteResult,
} from './types'

// Service (core operations)
export {
  createEmptyLedger,
  createEntry,
  appendEntry,
  queryEntries,
  getLatestEntry,
  getTrackedIntegrations,
  getEventCounts,
  exportLedger,
  verifyIntegrity,
  serializeLedger,
  parseLedger,
  // Convenience entry creators
  recordInstallApproved,
  recordDriftDetected,
  recordFixApplied,
  recordExportApproved,
  recordExportBlocked,
  recordStrategistReview,
  recordAuditorReview,
  recordUserConsent,
  recordHealthCheck,
} from './service'

// Hooks (lifecycle event emitters)
export {
  initializeLedger,
  getLedger,
  setSessionId,
  loadLedger,
  // Installation hooks
  onInstallRequested,
  onStrategistReview,
  onAuditorReview,
  onUserConsent,
  onInstallCompleted,
  onInstallFailed,
  // Health check hooks
  onHealthCheckComplete,
  onDriftDetected,
  onDeprecationDetected,
  // Remediation hooks
  onFixProposed,
  onFixApproved,
  onFixRejected,
  onFixApplied,
  onFixFailed,
  // Export/deploy hooks
  onExportRequested,
  onExportApproved,
  onExportBlocked,
  onDeployRequested,
  onDeployApproved,
  onDeployBlocked,
} from './hooks'

// Export integration (for compliance bundles)
export {
  LEDGER_EXPORT_FILENAME,
  generateLedgerExportContent,
  generateComplianceSummary,
  generateComplianceReport,
  getComplianceFiles,
} from './export'
