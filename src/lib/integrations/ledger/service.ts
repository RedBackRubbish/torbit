/**
 * TORBIT - Integration Ledger Service
 * 
 * Append-only audit trail for integration lifecycle events.
 * 
 * Critical Invariants:
 * 1. APPEND-ONLY - No mutations, no deletes
 * 2. NO SECRETS - Never record API keys, tokens, credentials
 * 3. HUMAN-READABLE - Plain JSON, meaningful summaries
 * 4. AGENT-READONLY - Agents cannot write to the ledger
 * 5. AUDITOR-READONLY - Auditor can read, never write
 */

import type {
  LedgerEntry,
  LedgerEventType,
  IntegrationLedger,
  LedgerQueryOptions,
  LedgerExport,
  GovernanceSnapshot,
  ConsentRecord,
  PackageRecord,
  DriftRecord,
  FixRecord,
  ExportContext,
} from './types'

// ============================================
// CONSTANTS
// ============================================

const LEDGER_VERSION = '1.0.0' as const

// ============================================
// UUID GENERATION
// ============================================

function generateId(): string {
  // Simple UUID v4 generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// ============================================
// HASH GENERATION (for tamper detection)
// ============================================

async function hashEntries(entries: LedgerEntry[]): Promise<string> {
  const content = JSON.stringify(entries)
  
  // Use Web Crypto API if available
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder()
    const data = encoder.encode(content)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  }
  
  // Fallback: simple checksum (not cryptographic, but deterministic)
  let hash = 0
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0')
}

// ============================================
// LEDGER INITIALIZATION
// ============================================

/**
 * Create an empty ledger
 */
export function createEmptyLedger(projectId: string): IntegrationLedger {
  const now = new Date().toISOString()
  
  return {
    version: LEDGER_VERSION,
    projectId,
    createdAt: now,
    lastUpdated: now,
    entryCount: 0,
    entries: [],
  }
}

// ============================================
// LEDGER WRITING (Append-Only)
// ============================================

/**
 * Create a new ledger entry
 * 
 * This is the ONLY way to add entries to the ledger.
 * No update or delete operations exist.
 */
export function createEntry(
  event: LedgerEventType,
  integration: string,
  summary: string,
  options?: {
    version?: string
    packages?: PackageRecord[]
    governance?: GovernanceSnapshot
    consent?: ConsentRecord
    drift?: DriftRecord[]
    fix?: FixRecord
    export?: ExportContext
    sessionId?: string
  }
): LedgerEntry {
  return {
    id: generateId(),
    timestamp: new Date().toISOString(),
    event,
    integration,
    summary,
    ...options,
  }
}

/**
 * Append an entry to the ledger (immutable operation)
 * Returns a new ledger with the entry appended
 */
export function appendEntry(
  ledger: IntegrationLedger,
  entry: LedgerEntry
): IntegrationLedger {
  // Create a new ledger with the entry appended (immutable)
  return {
    ...ledger,
    lastUpdated: entry.timestamp,
    entryCount: ledger.entryCount + 1,
    entries: [...ledger.entries, entry],
  }
}

// ============================================
// LEDGER READING
// ============================================

/**
 * Query ledger entries with filters
 */
export function queryEntries(
  ledger: IntegrationLedger,
  options: LedgerQueryOptions = {}
): LedgerEntry[] {
  let entries = [...ledger.entries]
  
  // Filter by integration
  if (options.integration) {
    entries = entries.filter((e) => e.integration === options.integration)
  }
  
  // Filter by event types
  if (options.events && options.events.length > 0) {
    entries = entries.filter((e) => options.events!.includes(e.event))
  }
  
  // Filter by date range
  if (options.from) {
    const fromDate = new Date(options.from).getTime()
    entries = entries.filter((e) => new Date(e.timestamp).getTime() >= fromDate)
  }
  if (options.to) {
    const toDate = new Date(options.to).getTime()
    entries = entries.filter((e) => new Date(e.timestamp).getTime() <= toDate)
  }
  
  // Filter by session
  if (options.sessionId) {
    entries = entries.filter((e) => e.sessionId === options.sessionId)
  }
  
  // Apply pagination
  if (options.offset) {
    entries = entries.slice(options.offset)
  }
  if (options.limit) {
    entries = entries.slice(0, options.limit)
  }
  
  return entries
}

/**
 * Get the latest entry for an integration
 */
export function getLatestEntry(
  ledger: IntegrationLedger,
  integration: string
): LedgerEntry | null {
  const entries = queryEntries(ledger, { integration })
  return entries.length > 0 ? entries[entries.length - 1] : null
}

/**
 * Get all unique integrations in the ledger
 */
export function getTrackedIntegrations(ledger: IntegrationLedger): string[] {
  const integrations = new Set<string>()
  for (const entry of ledger.entries) {
    integrations.add(entry.integration)
  }
  return Array.from(integrations)
}

/**
 * Get entry count by event type
 */
export function getEventCounts(
  ledger: IntegrationLedger
): Record<LedgerEventType, number> {
  const counts: Partial<Record<LedgerEventType, number>> = {}
  
  for (const entry of ledger.entries) {
    counts[entry.event] = (counts[entry.event] || 0) + 1
  }
  
  return counts as Record<LedgerEventType, number>
}

// ============================================
// LEDGER EXPORT (for compliance bundles)
// ============================================

/**
 * Export the ledger with integrity hash
 */
export async function exportLedger(
  ledger: IntegrationLedger
): Promise<LedgerExport> {
  const entriesHash = await hashEntries(ledger.entries)
  const integrations = getTrackedIntegrations(ledger)
  
  // Get date range
  const timestamps = ledger.entries.map((e) => e.timestamp)
  const from = timestamps.length > 0 ? timestamps[0] : ledger.createdAt
  const to = timestamps.length > 0 ? timestamps[timestamps.length - 1] : ledger.createdAt
  
  return {
    exportedAt: new Date().toISOString(),
    formatVersion: LEDGER_VERSION,
    ledger,
    entriesHash,
    metadata: {
      entryCount: ledger.entryCount,
      integrations,
      dateRange: { from, to },
    },
  }
}

/**
 * Verify ledger integrity
 */
export async function verifyIntegrity(
  ledgerExport: LedgerExport
): Promise<boolean> {
  const computedHash = await hashEntries(ledgerExport.ledger.entries)
  return computedHash === ledgerExport.entriesHash
}

// ============================================
// LEDGER SERIALIZATION
// ============================================

/**
 * Serialize ledger to JSON string
 */
export function serializeLedger(ledger: IntegrationLedger): string {
  return JSON.stringify(ledger, null, 2)
}

/**
 * Parse ledger from JSON string
 */
export function parseLedger(json: string): IntegrationLedger | null {
  try {
    const parsed = JSON.parse(json)
    
    // Validate structure
    if (
      parsed.version &&
      parsed.projectId &&
      parsed.createdAt &&
      Array.isArray(parsed.entries)
    ) {
      return parsed as IntegrationLedger
    }
    
    return null
  } catch {
    return null
  }
}

// ============================================
// CONVENIENCE ENTRY CREATORS
// ============================================

/**
 * Record an installation approval
 */
export function recordInstallApproved(
  integration: string,
  version: string,
  packages: PackageRecord[],
  governance: GovernanceSnapshot,
  consent: ConsentRecord
): LedgerEntry {
  const pkgList = packages.map((p) => p.name).join(', ')
  return createEntry(
    'INSTALL_APPROVED',
    integration,
    `Approved installation of ${integration} v${version} with packages: ${pkgList}`,
    { version, packages, governance, consent }
  )
}

/**
 * Record drift detection
 */
export function recordDriftDetected(
  integration: string,
  drift: DriftRecord[]
): LedgerEntry {
  const issues = drift.map((d) => `${d.packageName}: ${d.type}`).join(', ')
  return createEntry(
    'DRIFT_DETECTED',
    integration,
    `Drift detected in ${integration}: ${issues}`,
    { drift }
  )
}

/**
 * Record a fix being applied
 */
export function recordFixApplied(
  integration: string,
  fix: FixRecord
): LedgerEntry {
  return createEntry(
    'FIX_APPLIED',
    integration,
    `Applied ${fix.action} fix for ${fix.packageName}: ${fix.command}`,
    { fix }
  )
}

/**
 * Record export approval
 */
export function recordExportApproved(
  integration: string,
  exportContext: ExportContext
): LedgerEntry {
  return createEntry(
    'EXPORT_APPROVED',
    integration,
    `Export approved for ${exportContext.target} with ${exportContext.integrationsIncluded.length} integrations`,
    { export: exportContext }
  )
}

/**
 * Record export blocked
 */
export function recordExportBlocked(
  integration: string,
  reason: string,
  exportContext: ExportContext
): LedgerEntry {
  return createEntry(
    'EXPORT_BLOCKED',
    integration,
    `Export blocked for ${exportContext.target}: ${reason}`,
    { export: exportContext }
  )
}

/**
 * Record strategist review
 */
export function recordStrategistReview(
  integration: string,
  verdict: 'APPROVED' | 'REJECTED',
  reason?: string
): LedgerEntry {
  return createEntry(
    'STRATEGIST_REVIEW',
    integration,
    `Strategist ${verdict.toLowerCase()} ${integration}${reason ? `: ${reason}` : ''}`,
    {
      governance: {
        strategist: {
          verdict,
          reason,
          timestamp: new Date().toISOString(),
        },
      },
    }
  )
}

/**
 * Record auditor review
 */
export function recordAuditorReview(
  integration: string,
  verdict: 'PASSED' | 'FAILED',
  issues?: string[]
): LedgerEntry {
  return createEntry(
    'AUDITOR_REVIEW',
    integration,
    `Auditor ${verdict.toLowerCase()} ${integration}${issues?.length ? ` with ${issues.length} issues` : ''}`,
    {
      governance: {
        auditor: {
          verdict,
          issues,
          timestamp: new Date().toISOString(),
        },
      },
    }
  )
}

/**
 * Record user consent
 */
export function recordUserConsent(
  integration: string,
  granted: boolean,
  method: 'explicit' | 'implicit' | 'policy' = 'explicit'
): LedgerEntry {
  return createEntry(
    granted ? 'USER_CONSENT_GRANTED' : 'USER_CONSENT_DENIED',
    integration,
    `User ${granted ? 'granted' : 'denied'} consent for ${integration} (${method})`,
    {
      consent: {
        granted,
        timestamp: new Date().toISOString(),
        method,
      },
    }
  )
}

/**
 * Record health check result
 */
export function recordHealthCheck(
  integration: string,
  passed: boolean,
  drift?: DriftRecord[]
): LedgerEntry {
  return createEntry(
    passed ? 'HEALTH_CHECK_PASSED' : 'HEALTH_CHECK_FAILED',
    integration,
    passed 
      ? `Health check passed for ${integration}`
      : `Health check failed for ${integration} with ${drift?.length || 0} issues`,
    { drift }
  )
}
