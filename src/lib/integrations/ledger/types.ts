/**
 * TORBIT - Integration Ledger Types
 * 
 * Immutable, append-only audit trail for integration lifecycle events.
 * 
 * Rules:
 * - Append-only (no mutation, no deletes)
 * - No secrets ever recorded
 * - Human-readable
 * - Not editable by agents
 * - Auditor may read, never write
 */

/**
 * All possible ledger events
 */
export type LedgerEventType =
  // Installation lifecycle
  | 'INSTALL_REQUESTED'
  | 'INSTALL_APPROVED'
  | 'INSTALL_REJECTED'
  | 'INSTALL_COMPLETED'
  | 'INSTALL_FAILED'
  // Governance decisions
  | 'STRATEGIST_REVIEW'
  | 'AUDITOR_REVIEW'
  | 'USER_CONSENT_GRANTED'
  | 'USER_CONSENT_DENIED'
  // Health & drift
  | 'HEALTH_CHECK_PASSED'
  | 'HEALTH_CHECK_FAILED'
  | 'DRIFT_DETECTED'
  | 'DEPRECATION_DETECTED'
  | 'ORPHAN_DETECTED'
  // Remediation
  | 'FIX_PROPOSED'
  | 'FIX_APPROVED'
  | 'FIX_REJECTED'
  | 'FIX_APPLIED'
  | 'FIX_FAILED'
  // Export/Deploy gates
  | 'EXPORT_REQUESTED'
  | 'EXPORT_BLOCKED'
  | 'EXPORT_APPROVED'
  | 'DEPLOY_REQUESTED'
  | 'DEPLOY_BLOCKED'
  | 'DEPLOY_APPROVED'
  // Environment enforcement
  | 'ENVIRONMENT_CHECK'
  | 'ENVIRONMENT_BLOCK'
  | 'ENVIRONMENT_APPROVED'
  | 'ENVIRONMENT_SWITCHED'
  | 'ENVIRONMENT_CONFIG_LOADED'
  // Policy enforcement
  | 'POLICY_CHECK'
  | 'POLICY_BLOCK'
  | 'POLICY_ALLOW'
  | 'POLICY_HUMAN_APPROVAL_REQUIRED'

/**
 * Governance verdict snapshot (immutable record)
 */
export interface GovernanceSnapshot {
  strategist?: {
    verdict: 'APPROVED' | 'REJECTED' | 'SKIPPED'
    reason?: string
    timestamp: string
  }
  auditor?: {
    verdict: 'PASSED' | 'FAILED' | 'SKIPPED'
    issues?: string[]
    timestamp: string
  }
}

/**
 * Package version record (no secrets)
 */
export interface PackageRecord {
  name: string
  version: string
  category: 'frontend' | 'backend' | 'mobile'
}

/**
 * User consent record
 */
export interface ConsentRecord {
  granted: boolean
  timestamp: string
  method: 'explicit' | 'implicit' | 'policy'
}

/**
 * Drift issue record (for DRIFT_DETECTED events)
 */
export interface DriftRecord {
  type: 'version-drift' | 'missing-package' | 'orphan-package' | 'deprecated-sdk'
  packageName: string
  expected?: string
  actual?: string
  severity: 'warning' | 'critical'
}

/**
 * Fix record (for FIX_* events)
 */
export interface FixRecord {
  packageName: string
  action: 'install' | 'update' | 'remove' | 'replace'
  fromVersion?: string
  toVersion?: string
  command: string
}

/**
 * Export/deploy context
 */
export interface ExportContext {
  target: 'ios' | 'android' | 'vercel' | 'netlify' | 'other'
  bundleId?: string
  integrationsIncluded: string[]
  healthStatus: 'healthy' | 'warning' | 'critical'
}

/**
 * Core ledger entry - the fundamental unit of the audit trail
 */
export interface LedgerEntry {
  /** Unique entry ID (UUID v4) */
  id: string
  
  /** ISO 8601 timestamp */
  timestamp: string
  
  /** Event type */
  event: LedgerEventType
  
  /** Integration ID (e.g., "stripe", "clerk") */
  integration: string
  
  /** Integration version at time of event */
  version?: string
  
  /** Packages involved (no secrets) */
  packages?: PackageRecord[]
  
  /** Governance decisions */
  governance?: GovernanceSnapshot
  
  /** User consent */
  consent?: ConsentRecord
  
  /** Drift details (for health events) */
  drift?: DriftRecord[]
  
  /** Fix details (for remediation events) */
  fix?: FixRecord
  
  /** Export/deploy context */
  export?: ExportContext
  
  /** Human-readable summary */
  summary: string
  
  /** Session ID for grouping related events */
  sessionId?: string
}

/**
 * The complete ledger structure
 */
export interface IntegrationLedger {
  /** Ledger format version */
  version: '1.0.0'
  
  /** Project identifier */
  projectId: string
  
  /** Ledger creation timestamp */
  createdAt: string
  
  /** Last entry timestamp */
  lastUpdated: string
  
  /** Total entry count */
  entryCount: number
  
  /** The append-only entries array */
  entries: LedgerEntry[]
}

/**
 * Ledger query options
 */
export interface LedgerQueryOptions {
  /** Filter by integration ID */
  integration?: string
  
  /** Filter by event types */
  events?: LedgerEventType[]
  
  /** Filter by date range */
  from?: string
  to?: string
  
  /** Filter by session ID */
  sessionId?: string
  
  /** Limit results */
  limit?: number
  
  /** Skip entries (for pagination) */
  offset?: number
}

/**
 * Ledger export format (for compliance bundles)
 */
export interface LedgerExport {
  /** Export timestamp */
  exportedAt: string
  
  /** Export format version */
  formatVersion: '1.0.0'
  
  /** The ledger data */
  ledger: IntegrationLedger
  
  /** Cryptographic hash of entries (for tamper detection) */
  entriesHash: string
  
  /** Export metadata */
  metadata: {
    entryCount: number
    integrations: string[]
    dateRange: {
      from: string
      to: string
    }
  }
}

/**
 * Ledger write result
 */
export interface LedgerWriteResult {
  success: boolean
  entryId?: string
  error?: string
}
