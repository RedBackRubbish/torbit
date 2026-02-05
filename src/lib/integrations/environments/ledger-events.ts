/**
 * TORBIT - Environment Ledger Events
 * 
 * Integrates environment enforcement with the audit ledger.
 * Every environment check, block, and approval is recorded.
 */

import type { LedgerEntry } from '../ledger/types'
import { createEntry } from '../ledger/service'
import type { EnvironmentEvaluation, EnvironmentName } from './types'
import type { UnifiedEvaluation, UnifiedEnforcementResult } from './unified'

// ============================================
// ENVIRONMENT EVENT TYPES
// ============================================

export type EnvironmentEventType =
  | 'ENVIRONMENT_CHECK'
  | 'ENVIRONMENT_BLOCK'
  | 'ENVIRONMENT_APPROVED'
  | 'ENVIRONMENT_SWITCHED'
  | 'ENVIRONMENT_CONFIG_LOADED'

// ============================================
// LEDGER INTEGRATION
// ============================================

/**
 * Record an environment enforcement event to the ledger
 */
export function recordEnvironmentEvent(
  eventType: EnvironmentEventType,
  evaluation: EnvironmentEvaluation,
  operation: string,
  integrationId?: string,
  additionalData?: Record<string, unknown>
): LedgerEntry {
  const metadata = {
    environment: evaluation.environment,
    operation,
    integrationId,
    violationCount: evaluation.violations.length,
    violations: evaluation.violations.map(v => ({
      type: v.type,
      severity: v.severity,
      message: v.message,
      blocking: v.blocking,
    })),
    requiresHumanApproval: evaluation.requiresHumanApproval,
    ...additionalData,
  }
  
  return createEntry({
    type: eventType,
    integrationId: integrationId || 'system',
    action: `Environment ${eventType.toLowerCase().replace('environment_', '')}`,
    agent: 'environment-enforcer',
    success: eventType !== 'ENVIRONMENT_BLOCK',
    metadata,
  })
}

/**
 * Record a unified enforcement result to the ledger
 */
export function recordUnifiedEnforcement(
  result: UnifiedEnforcementResult,
  operation: string,
  integrationId?: string
): { environmentEntry: LedgerEntry; policyEntry: LedgerEntry } {
  const environmentEntry = recordEnvironmentEvent(
    result.ledgerEvents.environment.type,
    result.evaluation.environmentEvaluation,
    operation,
    integrationId
  )
  
  // Create policy entry via policy ledger events
  const policyEntry = createEntry({
    type: result.ledgerEvents.policy.type,
    integrationId: integrationId || 'system',
    action: `Policy ${result.ledgerEvents.policy.type.toLowerCase().replace('policy_', '')}`,
    agent: 'policy-enforcer',
    success: result.ledgerEvents.policy.type !== 'POLICY_BLOCK',
    metadata: {
      policyVersion: result.evaluation.policyEvaluation.policyVersion,
      operation,
      violations: result.ledgerEvents.policy.violations,
    },
  })
  
  return { environmentEntry, policyEntry }
}

// ============================================
// SPECIALIZED RECORDERS
// ============================================

/**
 * Record an environment switch event
 */
export function recordEnvironmentSwitch(
  previousEnvironment: EnvironmentName,
  newEnvironment: EnvironmentName
): LedgerEntry {
  const dummyEvaluation: EnvironmentEvaluation = {
    allowed: true,
    environment: newEnvironment,
    violations: [],
    requiresHumanApproval: false,
    evaluatedAt: new Date().toISOString(),
  }
  
  return recordEnvironmentEvent(
    'ENVIRONMENT_SWITCHED',
    dummyEvaluation,
    'switch',
    undefined,
    {
      previousEnvironment,
      newEnvironment,
      switchedAt: new Date().toISOString(),
    }
  )
}

/**
 * Record environment config loaded
 */
export function recordEnvironmentConfigLoaded(
  source: 'default' | 'file' | 'remote',
  activeEnvironment: EnvironmentName
): LedgerEntry {
  const dummyEvaluation: EnvironmentEvaluation = {
    allowed: true,
    environment: activeEnvironment,
    violations: [],
    requiresHumanApproval: false,
    evaluatedAt: new Date().toISOString(),
  }
  
  return recordEnvironmentEvent(
    'ENVIRONMENT_CONFIG_LOADED',
    dummyEvaluation,
    'configure',
    undefined,
    {
      source,
      activeEnvironment,
      loadedAt: new Date().toISOString(),
    }
  )
}

/**
 * Record an environment block
 */
export function recordEnvironmentBlock(
  evaluation: EnvironmentEvaluation,
  operation: string,
  integrationId?: string
): LedgerEntry {
  return recordEnvironmentEvent(
    'ENVIRONMENT_BLOCK',
    evaluation,
    operation,
    integrationId,
    {
      blockedAt: new Date().toISOString(),
    }
  )
}

/**
 * Record an environment approval (human override)
 */
export function recordEnvironmentApproval(
  evaluation: EnvironmentEvaluation,
  operation: string,
  integrationId?: string,
  approvedBy?: string
): LedgerEntry {
  return recordEnvironmentEvent(
    'ENVIRONMENT_APPROVED',
    evaluation,
    operation,
    integrationId,
    {
      approvedAt: new Date().toISOString(),
      approvedBy: approvedBy || 'user',
    }
  )
}

// ============================================
// LEDGER QUERIES
// ============================================

/**
 * Get environment event summary
 */
export function getEnvironmentEventSummary(entries: LedgerEntry[]): {
  totalChecks: number
  totalBlocks: number
  totalApprovals: number
  totalSwitches: number
  byEnvironment: Record<EnvironmentName, { checks: number; blocks: number }>
} {
  const environmentEvents = entries.filter(e => 
    e.type.startsWith('ENVIRONMENT_')
  )
  
  const checks = environmentEvents.filter(e => e.type === 'ENVIRONMENT_CHECK').length
  const blocks = environmentEvents.filter(e => e.type === 'ENVIRONMENT_BLOCK').length
  const approvals = environmentEvents.filter(e => e.type === 'ENVIRONMENT_APPROVED').length
  const switches = environmentEvents.filter(e => e.type === 'ENVIRONMENT_SWITCHED').length
  
  // Count by environment
  const byEnvironment: Record<EnvironmentName, { checks: number; blocks: number }> = {
    local: { checks: 0, blocks: 0 },
    staging: { checks: 0, blocks: 0 },
    production: { checks: 0, blocks: 0 },
  }
  
  for (const entry of environmentEvents) {
    const env = (entry.metadata as Record<string, unknown>)?.environment as EnvironmentName
    if (env && byEnvironment[env]) {
      if (entry.type === 'ENVIRONMENT_CHECK') {
        byEnvironment[env].checks++
      } else if (entry.type === 'ENVIRONMENT_BLOCK') {
        byEnvironment[env].blocks++
      }
    }
  }
  
  return {
    totalChecks: checks,
    totalBlocks: blocks,
    totalApprovals: approvals,
    totalSwitches: switches,
    byEnvironment,
  }
}

// ============================================
// EXPORT PROOF
// ============================================

export interface EnvironmentExportProof {
  environment: EnvironmentName
  evaluatedAt: string
  allowed: boolean
  violations: Array<{
    type: string
    message: string
    blocking: boolean
  }>
  profile: {
    autoFixEnabled: boolean
    experimentalAllowed: boolean
    requiresCleanLedger: boolean
    requiresAuditorPass: boolean
  }
}

/**
 * Generate environment proof for export bundle
 */
export function generateEnvironmentProof(
  evaluation: EnvironmentEvaluation | UnifiedEvaluation
): EnvironmentExportProof {
  const envEval = 'environmentEvaluation' in evaluation 
    ? evaluation.environmentEvaluation 
    : evaluation
  
  // Get profile for additional context
  const { getActiveProfile } = require('./loader')
  const profile = getActiveProfile()
  
  return {
    environment: envEval.environment,
    evaluatedAt: envEval.evaluatedAt,
    allowed: envEval.allowed,
    violations: envEval.violations.map(v => ({
      type: v.type,
      message: v.message,
      blocking: v.blocking,
    })),
    profile: {
      autoFixEnabled: profile.autoFix.enabled,
      experimentalAllowed: profile.integrations.allowExperimental,
      requiresCleanLedger: profile.shipping.requireCleanLedger,
      requiresAuditorPass: profile.shipping.requireAuditorPass,
    },
  }
}
