/**
 * TORBIT - Ledger Event Hooks
 * 
 * Integration points that emit ledger entries at key lifecycle moments.
 * These hooks are called by the integration executor, health checker, and export flow.
 */

import type { IntegrationLedger, LedgerEntry, DriftRecord, PackageRecord } from './types'
import {
  createEmptyLedger,
  appendEntry,
  recordInstallApproved,
  recordDriftDetected,
  recordFixApplied,
  recordExportApproved,
  recordExportBlocked,
  recordStrategistReview,
  recordAuditorReview,
  recordUserConsent,
  recordHealthCheck,
  createEntry,
} from './service'
import type { IntegrationManifest, StrategistReview, AuditorReview } from '../types'
import type { HealthReport, HealthFix } from '../health/types'

// ============================================
// LEDGER STATE (In-memory for WebContainer context)
// ============================================

let currentLedger: IntegrationLedger | null = null
let currentSessionId: string | null = null

/**
 * Initialize or load the ledger for a project
 */
export function initializeLedger(projectId: string): IntegrationLedger {
  if (!currentLedger || currentLedger.projectId !== projectId) {
    currentLedger = createEmptyLedger(projectId)
  }
  return currentLedger
}

/**
 * Get the current ledger (read-only access)
 */
export function getLedger(): IntegrationLedger | null {
  return currentLedger
}

/**
 * Set the current session ID (for grouping related events)
 */
export function setSessionId(sessionId: string): void {
  currentSessionId = sessionId
}

/**
 * Load an existing ledger (from file system)
 */
export function loadLedger(ledger: IntegrationLedger): void {
  currentLedger = ledger
}

// ============================================
// INTERNAL APPEND HELPER
// ============================================

function appendToLedger(entry: LedgerEntry): LedgerEntry {
  if (!currentLedger) {
    throw new Error('Ledger not initialized. Call initializeLedger first.')
  }
  
  // Add session ID if set
  if (currentSessionId && !entry.sessionId) {
    entry.sessionId = currentSessionId
  }
  
  currentLedger = appendEntry(currentLedger, entry)
  return entry
}

// ============================================
// INSTALLATION HOOKS
// ============================================

/**
 * Record when an integration install is requested
 */
export function onInstallRequested(
  manifest: IntegrationManifest
): LedgerEntry {
  const entry = createEntry(
    'INSTALL_REQUESTED',
    manifest.id,
    `Installation requested for ${manifest.name} v${manifest.version}`,
    { version: manifest.version }
  )
  return appendToLedger(entry)
}

/**
 * Record strategist review result
 */
export function onStrategistReview(
  integration: string,
  review: StrategistReview
): LedgerEntry {
  const verdict = review.verdict === 'APPROVED' ? 'APPROVED' : 'REJECTED'
  const entry = recordStrategistReview(integration, verdict, review.reason)
  return appendToLedger(entry)
}

/**
 * Record auditor review result
 */
export function onAuditorReview(
  integration: string,
  review: AuditorReview
): LedgerEntry {
  const verdict = review.verdict === 'PASSED' ? 'PASSED' : 'FAILED'
  const entry = recordAuditorReview(integration, verdict, review.issues)
  return appendToLedger(entry)
}

/**
 * Record user consent decision
 */
export function onUserConsent(
  integration: string,
  granted: boolean,
  method: 'explicit' | 'implicit' | 'policy' = 'explicit'
): LedgerEntry {
  const entry = recordUserConsent(integration, granted, method)
  return appendToLedger(entry)
}

/**
 * Record successful installation
 */
export function onInstallCompleted(
  manifest: IntegrationManifest,
  strategistVerdict: 'APPROVED' | 'REJECTED' | 'SKIPPED',
  auditorVerdict: 'PASSED' | 'FAILED' | 'SKIPPED'
): LedgerEntry {
  // Extract packages from manifest
  const packages: PackageRecord[] = []
  
  if (manifest.packages.frontend) {
    for (const [name, version] of Object.entries(manifest.packages.frontend)) {
      packages.push({ name, version, category: 'frontend' })
    }
  }
  if (manifest.packages.backend) {
    for (const [name, version] of Object.entries(manifest.packages.backend)) {
      packages.push({ name, version, category: 'backend' })
    }
  }
  if (manifest.packages.mobile) {
    for (const [name, version] of Object.entries(manifest.packages.mobile)) {
      packages.push({ name, version, category: 'mobile' })
    }
  }
  
  const entry = recordInstallApproved(
    manifest.id,
    manifest.version,
    packages,
    {
      strategist: {
        verdict: strategistVerdict,
        timestamp: new Date().toISOString(),
      },
      auditor: {
        verdict: auditorVerdict,
        timestamp: new Date().toISOString(),
      },
    },
    {
      granted: true,
      timestamp: new Date().toISOString(),
      method: 'explicit',
    }
  )
  
  return appendToLedger(entry)
}

/**
 * Record failed installation
 */
export function onInstallFailed(
  integration: string,
  reason: string
): LedgerEntry {
  const entry = createEntry(
    'INSTALL_FAILED',
    integration,
    `Installation failed for ${integration}: ${reason}`
  )
  return appendToLedger(entry)
}

// ============================================
// HEALTH CHECK HOOKS
// ============================================

/**
 * Record health check results
 */
export function onHealthCheckComplete(
  report: HealthReport
): LedgerEntry[] {
  const entries: LedgerEntry[] = []
  
  // Record overall health check
  for (const integration of report.integrations) {
    const driftRecords: DriftRecord[] = integration.issues.map((issue) => {
      if (issue.type === 'version-drift') {
        return {
          type: 'version-drift' as const,
          packageName: issue.packageName,
          expected: issue.manifestVersion,
          actual: issue.installedVersion,
          severity: issue.severity,
        }
      }
      if (issue.type === 'missing-package') {
        return {
          type: 'missing-package' as const,
          packageName: issue.packageName,
          expected: issue.requiredVersion,
          severity: issue.severity,
        }
      }
      if (issue.type === 'deprecated-sdk') {
        return {
          type: 'deprecated-sdk' as const,
          packageName: issue.packageName,
          actual: issue.installedVersion,
          severity: issue.severity,
        }
      }
      // Orphan packages
      return {
        type: 'orphan-package' as const,
        packageName: 'packageName' in issue ? issue.packageName : 'unknown',
        severity: issue.severity,
      }
    })
    
    const entry = recordHealthCheck(
      integration.integrationId,
      integration.status === 'healthy',
      driftRecords.length > 0 ? driftRecords : undefined
    )
    entries.push(appendToLedger(entry))
  }
  
  return entries
}

/**
 * Record drift detection
 */
export function onDriftDetected(
  integration: string,
  drift: DriftRecord[]
): LedgerEntry {
  const entry = recordDriftDetected(integration, drift)
  return appendToLedger(entry)
}

/**
 * Record deprecation detection
 */
export function onDeprecationDetected(
  integration: string,
  packageName: string,
  replacement?: string
): LedgerEntry {
  const entry = createEntry(
    'DEPRECATION_DETECTED',
    integration,
    `Deprecated package detected: ${packageName}${replacement ? ` → ${replacement}` : ''}`
  )
  return appendToLedger(entry)
}

// ============================================
// REMEDIATION HOOKS
// ============================================

/**
 * Record fix proposal
 */
export function onFixProposed(
  integration: string,
  fix: HealthFix
): LedgerEntry {
  const entry = createEntry(
    'FIX_PROPOSED',
    integration,
    `Fix proposed for ${fix.packageName}: ${fix.description}`,
    {
      fix: {
        packageName: fix.packageName,
        action: fix.action,
        command: fix.command,
      },
    }
  )
  return appendToLedger(entry)
}

/**
 * Record fix approval (user consented)
 */
export function onFixApproved(
  integration: string,
  fix: HealthFix
): LedgerEntry {
  const entry = createEntry(
    'FIX_APPROVED',
    integration,
    `User approved fix for ${fix.packageName}`,
    {
      fix: {
        packageName: fix.packageName,
        action: fix.action,
        command: fix.command,
      },
      consent: {
        granted: true,
        timestamp: new Date().toISOString(),
        method: 'explicit',
      },
    }
  )
  return appendToLedger(entry)
}

/**
 * Record fix rejection (user declined)
 */
export function onFixRejected(
  integration: string,
  fix: HealthFix
): LedgerEntry {
  const entry = createEntry(
    'FIX_REJECTED',
    integration,
    `User rejected fix for ${fix.packageName}`,
    {
      fix: {
        packageName: fix.packageName,
        action: fix.action,
        command: fix.command,
      },
      consent: {
        granted: false,
        timestamp: new Date().toISOString(),
        method: 'explicit',
      },
    }
  )
  return appendToLedger(entry)
}

/**
 * Record successful fix application
 */
export function onFixApplied(
  integration: string,
  fix: HealthFix
): LedgerEntry {
  const entry = recordFixApplied(integration, {
    packageName: fix.packageName,
    action: fix.action,
    command: fix.command,
  })
  return appendToLedger(entry)
}

/**
 * Record failed fix
 */
export function onFixFailed(
  integration: string,
  fix: HealthFix,
  reason: string
): LedgerEntry {
  const entry = createEntry(
    'FIX_FAILED',
    integration,
    `Fix failed for ${fix.packageName}: ${reason}`,
    {
      fix: {
        packageName: fix.packageName,
        action: fix.action,
        command: fix.command,
      },
    }
  )
  return appendToLedger(entry)
}

// ============================================
// EXPORT/DEPLOY HOOKS
// ============================================

/**
 * Record export request
 */
export function onExportRequested(
  target: 'ios' | 'android' | 'vercel' | 'netlify' | 'other',
  integrations: string[]
): LedgerEntry {
  const entry = createEntry(
    'EXPORT_REQUESTED',
    'system',
    `Export requested for ${target} with ${integrations.length} integrations`,
    {
      export: {
        target,
        integrationsIncluded: integrations,
        healthStatus: 'healthy', // Will be updated after health check
      },
    }
  )
  return appendToLedger(entry)
}

/**
 * Record export approval
 */
export function onExportApproved(
  target: 'ios' | 'android' | 'vercel' | 'netlify' | 'other',
  integrations: string[],
  healthStatus: 'healthy' | 'warning' | 'critical'
): LedgerEntry {
  const entry = recordExportApproved('system', {
    target,
    integrationsIncluded: integrations,
    healthStatus,
  })
  return appendToLedger(entry)
}

/**
 * Record export blocked
 */
export function onExportBlocked(
  target: 'ios' | 'android' | 'vercel' | 'netlify' | 'other',
  integrations: string[],
  reason: string,
  healthStatus: 'healthy' | 'warning' | 'critical'
): LedgerEntry {
  const entry = recordExportBlocked('system', reason, {
    target,
    integrationsIncluded: integrations,
    healthStatus,
  })
  return appendToLedger(entry)
}

/**
 * Record deploy request
 */
export function onDeployRequested(
  target: 'vercel' | 'netlify' | 'other',
  integrations: string[]
): LedgerEntry {
  const entry = createEntry(
    'DEPLOY_REQUESTED',
    'system',
    `Deploy requested for ${target} with ${integrations.length} integrations`,
    {
      export: {
        target,
        integrationsIncluded: integrations,
        healthStatus: 'healthy',
      },
    }
  )
  return appendToLedger(entry)
}

/**
 * Record deploy approval
 */
export function onDeployApproved(
  target: 'vercel' | 'netlify' | 'other',
  integrations: string[]
): LedgerEntry {
  const entry = createEntry(
    'DEPLOY_APPROVED',
    'system',
    `Deploy approved for ${target}`,
    {
      export: {
        target,
        integrationsIncluded: integrations,
        healthStatus: 'healthy',
      },
    }
  )
  return appendToLedger(entry)
}

/**
 * Record deploy blocked
 */
export function onDeployBlocked(
  target: 'vercel' | 'netlify' | 'other',
  integrations: string[],
  reason: string
): LedgerEntry {
  const entry = createEntry(
    'DEPLOY_BLOCKED',
    'system',
    `Deploy blocked for ${target}: ${reason}`,
    {
      export: {
        target,
        integrationsIncluded: integrations,
        healthStatus: 'critical',
      },
    }
  )
  return appendToLedger(entry)
}
