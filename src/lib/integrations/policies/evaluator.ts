/**
 * TORBIT - Policy Evaluator
 * 
 * Evaluates operations against organization policies.
 * This is the enforcement layer. No exceptions. No bypasses.
 * 
 * Rule: Policy overrides user intent, Planner plans, and auto-fix.
 */

import type {
  OrganizationPolicy,
  PolicyViolation,
  PolicyEvaluation,
  PolicyViolationType,
} from './types'
import { getPolicy } from './loader'
import type { IntegrationManifest, IntegrationCategory } from '../types'

// ============================================
// EVALUATION CONTEXT
// ============================================

export interface EvaluationContext {
  operation: OperationType
  integration?: IntegrationManifest
  category?: IntegrationCategory
  fixAction?: string
  isDriftPresent?: boolean
  hasLedgerViolations?: boolean
  healthCheckPassed?: boolean
  auditorPassed?: boolean
  requestedModel?: 'premium' | 'standard'
}

export type OperationType =
  | 'install'
  | 'update'
  | 'remove'
  | 'auto-fix'
  | 'export'
  | 'deploy'
  | 'configure'

// ============================================
// MAIN EVALUATOR
// ============================================

/**
 * Evaluate an operation against the current policy
 * 
 * @returns PolicyEvaluation with allowed flag and any violations
 */
export function evaluatePolicy(context: EvaluationContext): PolicyEvaluation {
  const policy = getPolicy()
  const violations: PolicyViolation[] = []
  
  // Collect all violations
  const integrationViolations = evaluateIntegrationRules(policy, context)
  const categoryViolations = evaluateCategoryRules(policy, context)
  const autoFixViolations = evaluateAutoFixRules(policy, context)
  const shippingViolations = evaluateShippingRules(policy, context)
  const governanceViolations = evaluateGovernanceRules(policy, context)
  
  violations.push(
    ...integrationViolations,
    ...categoryViolations,
    ...autoFixViolations,
    ...shippingViolations,
    ...governanceViolations
  )
  
  // All violations are blocking by default
  const hasViolations = violations.length > 0
  
  return {
    allowed: !hasViolations,
    violations,
    summary: hasViolations
      ? 'This action is restricted by organization policy.'
      : 'Policy check passed.',
    policyName: policy.name,
    timestamp: new Date().toISOString(),
  }
}

/**
 * Quick check if an integration is allowed
 */
export function isIntegrationAllowed(integrationId: string): boolean {
  const policy = getPolicy()
  
  // Deny list takes precedence
  if (policy.integrations.deny?.includes(integrationId)) {
    return false
  }
  
  // If allow list is empty, all (not denied) are allowed
  if (!policy.integrations.allow || policy.integrations.allow.length === 0) {
    return true
  }
  
  // Otherwise, must be in allow list
  return policy.integrations.allow.includes(integrationId)
}

/**
 * Quick check if a category requires human approval
 */
export function categoryRequiresApproval(category: IntegrationCategory): boolean {
  const policy = getPolicy()
  return policy.categories.requireHumanApproval?.includes(category) ?? false
}

/**
 * Quick check if auto-fix is enabled
 */
export function isAutoFixEnabled(): boolean {
  const policy = getPolicy()
  return policy.autoFix.enabled
}

// ============================================
// INTEGRATION RULES
// ============================================

function evaluateIntegrationRules(
  policy: OrganizationPolicy,
  context: EvaluationContext
): PolicyViolation[] {
  const violations: PolicyViolation[] = []
  
  if (!context.integration) return violations
  
  const integrationId = context.integration.id
  
  // Check deny list
  if (policy.integrations.deny?.includes(integrationId)) {
    violations.push({
      type: 'INTEGRATION_DENIED',
      rule: `integrations.deny contains "${integrationId}"`,
      message: `Integration "${integrationId}" is explicitly denied by organization policy.`,
      integration: integrationId,
    })
  }
  
  // Check allow list (if defined)
  if (
    policy.integrations.allow &&
    policy.integrations.allow.length > 0 &&
    !policy.integrations.allow.includes(integrationId)
  ) {
    violations.push({
      type: 'INTEGRATION_NOT_ALLOWED',
      rule: `integrations.allow does not contain "${integrationId}"`,
      message: `Integration "${integrationId}" is not in the allowed list.`,
      integration: integrationId,
    })
  }
  
  // Check version constraints
  const constraint = policy.integrations.versionConstraints?.[integrationId]
  if (constraint && context.integration.version) {
    const currentVersion = context.integration.version
    
    if (constraint.minVersion && compareVersions(currentVersion, constraint.minVersion) < 0) {
      violations.push({
        type: 'VERSION_CONSTRAINT_FAILED',
        rule: `Minimum version: ${constraint.minVersion}`,
        message: `Integration "${integrationId}" version ${currentVersion} is below minimum ${constraint.minVersion}.`,
        integration: integrationId,
      })
    }
    
    if (constraint.maxVersion && compareVersions(currentVersion, constraint.maxVersion) > 0) {
      violations.push({
        type: 'VERSION_CONSTRAINT_FAILED',
        rule: `Maximum version: ${constraint.maxVersion}`,
        message: `Integration "${integrationId}" version ${currentVersion} exceeds maximum ${constraint.maxVersion}.`,
        integration: integrationId,
      })
    }
  }
  
  return violations
}

// ============================================
// CATEGORY RULES
// ============================================

function evaluateCategoryRules(
  policy: OrganizationPolicy,
  context: EvaluationContext
): PolicyViolation[] {
  const violations: PolicyViolation[] = []
  
  const category = context.category || context.integration?.category
  if (!category) return violations
  
  // Check if category is blocked
  if (policy.categories.blocked?.includes(category)) {
    violations.push({
      type: 'CATEGORY_BLOCKED',
      rule: `categories.blocked contains "${category}"`,
      message: `Category "${category}" is blocked by organization policy.`,
      category,
    })
  }
  
  // Check if category requires human approval
  if (policy.categories.requireHumanApproval?.includes(category)) {
    violations.push({
      type: 'CATEGORY_REQUIRES_APPROVAL',
      rule: `categories.requireHumanApproval contains "${category}"`,
      message: `Category "${category}" requires human approval.`,
      category,
    })
  }
  
  return violations
}

// ============================================
// AUTO-FIX RULES
// ============================================

function evaluateAutoFixRules(
  policy: OrganizationPolicy,
  context: EvaluationContext
): PolicyViolation[] {
  const violations: PolicyViolation[] = []
  
  if (context.operation !== 'auto-fix') return violations
  
  // Check if auto-fix is disabled
  if (!policy.autoFix.enabled) {
    violations.push({
      type: 'AUTOFIX_DISABLED',
      rule: 'autoFix.enabled = false',
      message: 'Auto-fix is disabled by organization policy.',
    })
    return violations
  }
  
  // Check if specific action is allowed
  if (context.fixAction && policy.autoFix.allowedActions && !policy.autoFix.allowedActions.includes(context.fixAction as typeof policy.autoFix.allowedActions[number])) {
    violations.push({
      type: 'AUTOFIX_ACTION_DENIED',
      rule: `autoFix.allowedActions does not include "${context.fixAction}"`,
      message: `Auto-fix action "${context.fixAction}" is not allowed.`,
      blockedAction: context.fixAction,
    })
  }
  
  return violations
}

// ============================================
// SHIPPING RULES
// ============================================

function evaluateShippingRules(
  policy: OrganizationPolicy,
  context: EvaluationContext
): PolicyViolation[] {
  const violations: PolicyViolation[] = []
  
  if (context.operation !== 'export' && context.operation !== 'deploy') {
    return violations
  }
  
  // Check drift blocking
  if (policy.shipping.blockOnDrift && context.isDriftPresent) {
    violations.push({
      type: 'EXPORT_DRIFT_BLOCKED',
      rule: 'shipping.blockOnDrift = true',
      message: 'Export blocked: Version drift detected.',
    })
  }
  
  // Check clean ledger requirement
  if (policy.shipping.requireCleanLedger && context.hasLedgerViolations) {
    violations.push({
      type: 'EXPORT_LEDGER_DIRTY',
      rule: 'shipping.requireCleanLedger = true',
      message: 'Export blocked: Ledger contains unresolved violations.',
    })
  }
  
  // Check health check requirement
  if (policy.shipping.requireHealthCheck && !context.healthCheckPassed) {
    violations.push({
      type: 'EXPORT_HEALTH_FAILED',
      rule: 'shipping.requireHealthCheck = true',
      message: 'Export blocked: Health check required but not passed.',
    })
  }
  
  // Check auditor pass requirement
  if (policy.shipping.requireAuditorPass && !context.auditorPassed) {
    violations.push({
      type: 'GOVERNANCE_REQUIRED',
      rule: 'shipping.requireAuditorPass = true',
      message: 'Export blocked: Auditor approval required.',
    })
  }
  
  return violations
}

// ============================================
// GOVERNANCE RULES
// ============================================

function evaluateGovernanceRules(
  policy: OrganizationPolicy,
  context: EvaluationContext
): PolicyViolation[] {
  const violations: PolicyViolation[] = []
  
  // Check premium model budget
  if (context.requestedModel === 'premium') {
    violations.push({
      type: 'GOVERNANCE_REQUIRED',
      rule: `governance.premiumModelBudgetPercent = ${policy.governance.premiumModelBudgetPercent}`,
      message: `Premium model usage limited to ${policy.governance.premiumModelBudgetPercent}% of tokens.`,
    })
  }
  
  return violations
}

// ============================================
// UTILITIES
// ============================================

/**
 * Compare semantic versions
 * Returns: -1 if a < b, 0 if a == b, 1 if a > b
 */
function compareVersions(a: string, b: string): number {
  const partsA = a.split('.').map(Number)
  const partsB = b.split('.').map(Number)
  
  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const numA = partsA[i] || 0
    const numB = partsB[i] || 0
    
    if (numA < numB) return -1
    if (numA > numB) return 1
  }
  
  return 0
}

/**
 * Format a policy violation for user display
 */
export function formatViolation(violation: PolicyViolation): string {
  // Determine icon based on violation type
  const isBlocking = violation.type.includes('DENIED') || 
                     violation.type.includes('BLOCKED') || 
                     violation.type.includes('DISABLED') ||
                     violation.type.includes('FAILED')
  const icon = isBlocking ? '🚫' : 'ℹ️'
  return `${icon} ${violation.message}`
}

/**
 * Format all violations for user display
 */
export function formatEvaluation(evaluation: PolicyEvaluation): string {
  if (evaluation.allowed && evaluation.violations.length === 0) {
    return '✅ Policy check passed'
  }
  
  const lines = [
    evaluation.allowed ? '⚠️ Policy warnings' : '🚫 Policy violation',
    '',
    ...evaluation.violations.map(formatViolation),
  ]
  
  return lines.join('\n')
}
