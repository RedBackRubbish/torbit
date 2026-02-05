/**
 * TORBIT - Policy Ledger Events
 * 
 * Integrates policy enforcement with the audit ledger.
 * Every policy check, block, and approval is recorded.
 */

import type { LedgerEntry } from '../ledger/types'
import { createEntry } from '../ledger/service'
import type { PolicyEvaluation } from './types'
import type { PolicyLedgerEvent, EnforcementResult } from './enforcement'
import type { OperationType } from './evaluator'

// ============================================
// POLICY EVENT TYPES
// ============================================

export type PolicyEventType =
  | 'POLICY_CHECK'
  | 'POLICY_BLOCK'
  | 'POLICY_APPROVAL_REQUIRED'
  | 'POLICY_APPROVED'
  | 'POLICY_REJECTED'
  | 'POLICY_LOADED'
  | 'POLICY_UPDATED'

// ============================================
// LEDGER INTEGRATION
// ============================================

/**
 * Record a policy enforcement event to the ledger
 */
export function recordPolicyEvent(
  eventType: PolicyEventType,
  evaluation: PolicyEvaluation,
  operation: OperationType,
  integrationId?: string,
  additionalData?: Record<string, unknown>
): LedgerEntry {
  const metadata = {
    policyVersion: evaluation.policyVersion,
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
    action: `Policy ${eventType.toLowerCase().replace('policy_', '')}`,
    agent: 'policy-enforcer',
    success: eventType !== 'POLICY_BLOCK',
    metadata,
  })
}

/**
 * Record an enforcement result to the ledger
 */
export function recordEnforcementResult(result: EnforcementResult): LedgerEntry {
  return recordPolicyEvent(
    result.ledgerEvent.type,
    result.evaluation,
    result.ledgerEvent.operation,
    result.ledgerEvent.integrationId
  )
}

// ============================================
// SPECIALIZED RECORDERS
// ============================================

/**
 * Record a policy block event
 */
export function recordPolicyBlock(
  evaluation: PolicyEvaluation,
  operation: OperationType,
  integrationId?: string
): LedgerEntry {
  return recordPolicyEvent('POLICY_BLOCK', evaluation, operation, integrationId, {
    blockedAt: new Date().toISOString(),
    blockReason: evaluation.message || 'Policy violation',
  })
}

/**
 * Record a human approval grant
 */
export function recordPolicyApproval(
  evaluation: PolicyEvaluation,
  operation: OperationType,
  integrationId?: string,
  approvedBy?: string
): LedgerEntry {
  return recordPolicyEvent('POLICY_APPROVED', evaluation, operation, integrationId, {
    approvedAt: new Date().toISOString(),
    approvedBy: approvedBy || 'user',
  })
}

/**
 * Record a human approval rejection
 */
export function recordPolicyRejection(
  evaluation: PolicyEvaluation,
  operation: OperationType,
  integrationId?: string,
  rejectedBy?: string
): LedgerEntry {
  return recordPolicyEvent('POLICY_REJECTED', evaluation, operation, integrationId, {
    rejectedAt: new Date().toISOString(),
    rejectedBy: rejectedBy || 'user',
  })
}

/**
 * Record policy load event
 */
export function recordPolicyLoaded(
  policyName: string,
  policyVersion: string,
  source: 'file' | 'remote' | 'default'
): LedgerEntry {
  const dummyEvaluation: PolicyEvaluation = {
    allowed: true,
    violations: [],
    requiresHumanApproval: false,
    policyVersion,
    evaluatedAt: new Date().toISOString(),
  }
  
  return recordPolicyEvent('POLICY_LOADED', dummyEvaluation, 'configure', undefined, {
    policyName,
    source,
    loadedAt: new Date().toISOString(),
  })
}

/**
 * Record policy update event
 */
export function recordPolicyUpdated(
  policyName: string,
  previousVersion: string,
  newVersion: string,
  source: 'file' | 'remote'
): LedgerEntry {
  const dummyEvaluation: PolicyEvaluation = {
    allowed: true,
    violations: [],
    requiresHumanApproval: false,
    policyVersion: newVersion,
    evaluatedAt: new Date().toISOString(),
  }
  
  return recordPolicyEvent('POLICY_UPDATED', dummyEvaluation, 'configure', undefined, {
    policyName,
    previousVersion,
    newVersion,
    source,
    updatedAt: new Date().toISOString(),
  })
}

// ============================================
// LEDGER QUERIES
// ============================================

/**
 * Check if ledger has unresolved policy violations
 */
export function hasUnresolvedPolicyViolations(entries: LedgerEntry[]): boolean {
  const blocks = entries.filter(e => e.type === 'POLICY_BLOCK')
  const approvals = entries.filter(e => e.type === 'POLICY_APPROVED')
  
  // Simple check: more blocks than approvals
  // A proper implementation would track specific violations
  return blocks.length > approvals.length
}

/**
 * Get policy event summary
 */
export function getPolicyEventSummary(entries: LedgerEntry[]): {
  totalChecks: number
  totalBlocks: number
  totalApprovals: number
  totalRejections: number
  complianceRate: number
} {
  const policyEvents = entries.filter(e => 
    e.type.startsWith('POLICY_')
  )
  
  const checks = policyEvents.filter(e => e.type === 'POLICY_CHECK').length
  const blocks = policyEvents.filter(e => e.type === 'POLICY_BLOCK').length
  const approvals = policyEvents.filter(e => e.type === 'POLICY_APPROVED').length
  const rejections = policyEvents.filter(e => e.type === 'POLICY_REJECTED').length
  
  const totalDecisions = checks + blocks
  const complianceRate = totalDecisions > 0 
    ? (checks / totalDecisions) * 100 
    : 100
  
  return {
    totalChecks: checks,
    totalBlocks: blocks,
    totalApprovals: approvals,
    totalRejections: rejections,
    complianceRate: Math.round(complianceRate * 10) / 10,
  }
}
