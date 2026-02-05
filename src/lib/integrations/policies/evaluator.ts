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
import type { IntegrationManifest, IntegrationCategory } from '../manifests/types'

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
  
  // Determine if any violations require blocking
  const blockingViolations = violations.filter(v => v.blocking)
  const requiresApproval = violations.some(v => v.requiresHumanApproval)
  
  return {
    allowed: blockingViolations.length === 0,
    violations,
    requiresHumanApproval: requiresApproval,
    policyVersion: policy.version,
    evaluatedAt: new Date().toISOString(),
    message: blockingViolations.length > 0
      ? 'This action is restricted by organization policy.'
      : undefined,
  }
}

/**
 * Quick check if an integration is allowed
 */
export function isIntegrationAllowed(integrationId: string): boolean {
  const policy = getPolicy()
  
  // Deny list takes precedence
  if (policy.integrations.deny.includes(integrationId)) {
    return false
  }
  
  // If allow list is empty, all (not denied) are allowed
  if (policy.integrations.allow.length === 0) {
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
  return policy.categories.requireHumanApproval.includes(category)
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
  if (policy.integrations.deny.includes(integrationId)) {
    violations.push({
      type: 'INTEGRATION_DENIED',
      severity: 'error',
      message: `Integration "${integrationId}" is explicitly denied by organization policy.`,
      blocking: true,
      requiresHumanApproval: false,
      policyRule: `integrations.deny contains "${integrationId}"`,
    })
  }
  
  // Check allow list (if defined)
  if (
    policy.integrations.allow.length > 0 &&
    !policy.integrations.allow.includes(integrationId)
  ) {
    violations.push({
      type: 'INTEGRATION_NOT_ALLOWED',
      severity: 'error',
      message: `Integration "${integrationId}" is not in the allowed list.`,
      blocking: true,
      requiresHumanApproval: false,
      policyRule: `integrations.allow does not contain "${integrationId}"`,
    })
  }
  
  // Check version constraints
  const constraint = policy.integrations.versionConstraints[integrationId]
  if (constraint && context.integration.sdk.version) {
    const currentVersion = context.integration.sdk.version
    
    if (constraint.minVersion && compareVersions(currentVersion, constraint.minVersion) < 0) {
      violations.push({
        type: 'VERSION_CONSTRAINT_VIOLATION',
        severity: 'error',
        message: `Integration "${integrationId}" version ${currentVersion} is below minimum ${constraint.minVersion}.`,
        blocking: true,
        requiresHumanApproval: false,
        policyRule: `Minimum version: ${constraint.minVersion}`,
      })
    }
    
    if (constraint.maxVersion && compareVersions(currentVersion, constraint.maxVersion) > 0) {
      violations.push({
        type: 'VERSION_CONSTRAINT_VIOLATION',
        severity: 'error',
        message: `Integration "${integrationId}" version ${currentVersion} exceeds maximum ${constraint.maxVersion}.`,
        blocking: true,
        requiresHumanApproval: false,
        policyRule: `Maximum version: ${constraint.maxVersion}`,
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
  if (policy.categories.blocked.includes(category)) {
    violations.push({
      type: 'CATEGORY_BLOCKED',
      severity: 'error',
      message: `Category "${category}" is blocked by organization policy.`,
      blocking: true,
      requiresHumanApproval: false,
      policyRule: `categories.blocked contains "${category}"`,
    })
  }
  
  // Check if category requires human approval
  if (policy.categories.requireHumanApproval.includes(category)) {
    violations.push({
      type: 'REQUIRES_HUMAN_APPROVAL',
      severity: 'warning',
      message: `Category "${category}" requires human approval.`,
      blocking: false,
      requiresHumanApproval: true,
      policyRule: `categories.requireHumanApproval contains "${category}"`,
    })
  }
  
  // Check if category requires Strategist review
  if (policy.categories.requireStrategist.includes(category)) {
    violations.push({
      type: 'REQUIRES_STRATEGIST',
      severity: 'info',
      message: `Category "${category}" requires Strategist review.`,
      blocking: false,
      requiresHumanApproval: false,
      policyRule: `categories.requireStrategist contains "${category}"`,
    })
  }
  
  // Check if category requires Auditor review
  if (policy.categories.requireAuditor.includes(category)) {
    violations.push({
      type: 'REQUIRES_AUDITOR',
      severity: 'info',
      message: `Category "${category}" requires Auditor review.`,
      blocking: false,
      requiresHumanApproval: false,
      policyRule: `categories.requireAuditor contains "${category}"`,
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
      severity: 'error',
      message: 'Auto-fix is disabled by organization policy.',
      blocking: true,
      requiresHumanApproval: false,
      policyRule: 'autoFix.enabled = false',
    })
    return violations
  }
  
  // Check if specific action is allowed
  if (context.fixAction && !policy.autoFix.allowedActions.includes(context.fixAction)) {
    violations.push({
      type: 'AUTOFIX_ACTION_NOT_ALLOWED',
      severity: 'error',
      message: `Auto-fix action "${context.fixAction}" is not allowed.`,
      blocking: true,
      requiresHumanApproval: false,
      policyRule: `autoFix.allowedActions does not include "${context.fixAction}"`,
    })
  }
  
  // Check if approval is required
  if (policy.autoFix.requireApproval) {
    violations.push({
      type: 'REQUIRES_HUMAN_APPROVAL',
      severity: 'warning',
      message: 'Auto-fix requires human approval.',
      blocking: false,
      requiresHumanApproval: true,
      policyRule: 'autoFix.requireApproval = true',
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
      type: 'DRIFT_BLOCKING',
      severity: 'error',
      message: 'Export blocked: Version drift detected.',
      blocking: true,
      requiresHumanApproval: false,
      policyRule: 'shipping.blockOnDrift = true',
    })
  }
  
  // Check clean ledger requirement
  if (policy.shipping.requireCleanLedger && context.hasLedgerViolations) {
    violations.push({
      type: 'LEDGER_VIOLATION',
      severity: 'error',
      message: 'Export blocked: Ledger contains unresolved violations.',
      blocking: true,
      requiresHumanApproval: false,
      policyRule: 'shipping.requireCleanLedger = true',
    })
  }
  
  // Check health check requirement
  if (policy.shipping.requireHealthCheck && !context.healthCheckPassed) {
    violations.push({
      type: 'HEALTH_CHECK_REQUIRED',
      severity: 'error',
      message: 'Export blocked: Health check required but not passed.',
      blocking: true,
      requiresHumanApproval: false,
      policyRule: 'shipping.requireHealthCheck = true',
    })
  }
  
  // Check auditor pass requirement
  if (policy.shipping.requireAuditorPass && !context.auditorPassed) {
    violations.push({
      type: 'AUDITOR_REQUIRED',
      severity: 'error',
      message: 'Export blocked: Auditor approval required.',
      blocking: true,
      requiresHumanApproval: false,
      policyRule: 'shipping.requireAuditorPass = true',
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
      type: 'PREMIUM_MODEL_BUDGET',
      severity: 'info',
      message: `Premium model usage limited to ${policy.governance.premiumModelBudgetPercent}% of tokens.`,
      blocking: false,
      requiresHumanApproval: false,
      policyRule: `governance.premiumModelBudgetPercent = ${policy.governance.premiumModelBudgetPercent}`,
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
  const icon = violation.blocking ? '🚫' : violation.requiresHumanApproval ? '⚠️' : 'ℹ️'
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
