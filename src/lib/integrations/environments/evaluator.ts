/**
 * TORBIT - Environment Evaluator
 * 
 * Evaluates operations against active environment profile.
 * Environment rules layer on top of organization policies.
 * 
 * Rule Resolution Order:
 * 1. Environment profile (highest priority)
 * 2. Organization policy
 * 3. Integration manifest
 * 4. User intent (lowest priority)
 * 
 * Most restrictive rule always wins.
 */

import type {
  EnvironmentName,
  EnvironmentProfile,
  EnvironmentViolation,
  EnvironmentEvaluation,
  EnvironmentViolationType,
} from './types'
import { getActiveProfile, getActiveEnvironment } from './loader'
import type { IntegrationManifest, IntegrationCategory } from '../manifests/types'
import type { OperationType } from '../policies/evaluator'

// ============================================
// EVALUATION CONTEXT
// ============================================

export interface EnvironmentContext {
  operation: OperationType
  integration?: IntegrationManifest
  category?: IntegrationCategory
  fixAction?: string
  isDriftPresent?: boolean
  hasLedgerViolations?: boolean
  healthCheckPassed?: boolean
  auditorPassed?: boolean
  strategistPassed?: boolean
  isExperimental?: boolean
}

// ============================================
// MAIN EVALUATOR
// ============================================

/**
 * Evaluate an operation against the active environment profile
 */
export function evaluateEnvironment(context: EnvironmentContext): EnvironmentEvaluation {
  const profile = getActiveProfile()
  const environment = getActiveEnvironment()
  const violations: EnvironmentViolation[] = []
  
  // Collect all violations
  const integrationViolations = evaluateIntegrationRules(profile, context)
  const autoFixViolations = evaluateAutoFixRules(profile, context)
  const categoryViolations = evaluateCategoryRules(profile, context)
  const shippingViolations = evaluateShippingRules(profile, context)
  
  violations.push(
    ...integrationViolations,
    ...autoFixViolations,
    ...categoryViolations,
    ...shippingViolations
  )
  
  // Determine blocking status
  const blockingViolations = violations.filter(v => v.blocking)
  const requiresApproval = violations.some(v => v.requiresHumanApproval)
  
  return {
    allowed: blockingViolations.length === 0,
    environment,
    violations,
    requiresHumanApproval: requiresApproval,
    evaluatedAt: new Date().toISOString(),
    message: blockingViolations.length > 0
      ? `This action is restricted in the ${environment} environment.`
      : undefined,
  }
}

/**
 * Check if an operation would be allowed in a specific environment
 */
export function wouldBeAllowedIn(
  env: EnvironmentName,
  context: EnvironmentContext
): boolean {
  // Temporarily evaluate against a different environment
  const { getProfile } = require('./loader')
  const profile = getProfile(env)
  
  const violations = [
    ...evaluateIntegrationRules(profile, context),
    ...evaluateAutoFixRules(profile, context),
    ...evaluateCategoryRules(profile, context),
    ...evaluateShippingRules(profile, context),
  ]
  
  return !violations.some(v => v.blocking)
}

// ============================================
// INTEGRATION RULES
// ============================================

function evaluateIntegrationRules(
  profile: EnvironmentProfile,
  context: EnvironmentContext
): EnvironmentViolation[] {
  const violations: EnvironmentViolation[] = []
  
  if (!context.integration) return violations
  
  const integrationId = context.integration.id
  const environment = profile.name
  
  // Check experimental blocking
  if (context.isExperimental && !profile.integrations.allowExperimental) {
    violations.push({
      type: 'ENVIRONMENT_EXPERIMENTAL_BLOCKED',
      environment,
      severity: 'error',
      message: `Experimental integrations are not allowed in ${environment}.`,
      blocking: true,
      requiresHumanApproval: false,
      rule: `${environment}.integrations.allowExperimental = false`,
    })
  }
  
  // Check deny list with wildcard support
  for (const pattern of profile.integrations.deny) {
    if (matchesPattern(integrationId, pattern)) {
      violations.push({
        type: 'ENVIRONMENT_INTEGRATION_DENIED',
        environment,
        severity: 'error',
        message: `Integration "${integrationId}" is denied in ${environment}.`,
        blocking: true,
        requiresHumanApproval: false,
        rule: `${environment}.integrations.deny includes "${pattern}"`,
      })
    }
  }
  
  return violations
}

// ============================================
// AUTO-FIX RULES
// ============================================

function evaluateAutoFixRules(
  profile: EnvironmentProfile,
  context: EnvironmentContext
): EnvironmentViolation[] {
  const violations: EnvironmentViolation[] = []
  const environment = profile.name
  
  if (context.operation !== 'auto-fix') return violations
  
  // Check if auto-fix is disabled
  if (!profile.autoFix.enabled) {
    violations.push({
      type: 'ENVIRONMENT_AUTOFIX_DISABLED',
      environment,
      severity: 'error',
      message: `Auto-fix is disabled in ${environment}.`,
      blocking: true,
      requiresHumanApproval: false,
      rule: `${environment}.autoFix.enabled = false`,
    })
    return violations
  }
  
  // Check if specific action is allowed
  if (
    context.fixAction &&
    profile.autoFix.allowedActions.length > 0 &&
    !profile.autoFix.allowedActions.includes(context.fixAction)
  ) {
    violations.push({
      type: 'ENVIRONMENT_AUTOFIX_DISABLED',
      environment,
      severity: 'error',
      message: `Auto-fix action "${context.fixAction}" is not allowed in ${environment}.`,
      blocking: true,
      requiresHumanApproval: false,
      rule: `${environment}.autoFix.allowedActions does not include "${context.fixAction}"`,
    })
  }
  
  // Check if approval is required
  if (profile.autoFix.requireApproval) {
    violations.push({
      type: 'ENVIRONMENT_REQUIRES_APPROVAL',
      environment,
      severity: 'warning',
      message: `Auto-fix requires approval in ${environment}.`,
      blocking: false,
      requiresHumanApproval: true,
      rule: `${environment}.autoFix.requireApproval = true`,
    })
  }
  
  return violations
}

// ============================================
// CATEGORY RULES
// ============================================

function evaluateCategoryRules(
  profile: EnvironmentProfile,
  context: EnvironmentContext
): EnvironmentViolation[] {
  const violations: EnvironmentViolation[] = []
  const environment = profile.name
  
  const category = context.category || context.integration?.category
  if (!category) return violations
  
  // Check if category is blocked
  if (profile.categories.blocked.includes(category)) {
    violations.push({
      type: 'ENVIRONMENT_CATEGORY_BLOCKED',
      environment,
      severity: 'error',
      message: `Category "${category}" is blocked in ${environment}.`,
      blocking: true,
      requiresHumanApproval: false,
      rule: `${environment}.categories.blocked includes "${category}"`,
    })
  }
  
  // Check if category requires human approval
  if (profile.categories.requireHumanApproval.includes(category)) {
    violations.push({
      type: 'ENVIRONMENT_REQUIRES_APPROVAL',
      environment,
      severity: 'warning',
      message: `Category "${category}" requires approval in ${environment}.`,
      blocking: false,
      requiresHumanApproval: true,
      rule: `${environment}.categories.requireHumanApproval includes "${category}"`,
    })
  }
  
  return violations
}

// ============================================
// SHIPPING RULES
// ============================================

function evaluateShippingRules(
  profile: EnvironmentProfile,
  context: EnvironmentContext
): EnvironmentViolation[] {
  const violations: EnvironmentViolation[] = []
  const environment = profile.name
  
  if (context.operation !== 'export' && context.operation !== 'deploy') {
    return violations
  }
  
  // Check drift blocking
  if (profile.shipping.blockOnDrift && context.isDriftPresent) {
    violations.push({
      type: 'ENVIRONMENT_DRIFT_BLOCKING',
      environment,
      severity: 'error',
      message: `Export blocked: Version drift detected in ${environment}.`,
      blocking: true,
      requiresHumanApproval: false,
      rule: `${environment}.shipping.blockOnDrift = true`,
    })
  }
  
  // Check clean ledger requirement
  if (profile.shipping.requireCleanLedger && context.hasLedgerViolations) {
    violations.push({
      type: 'ENVIRONMENT_LEDGER_DIRTY',
      environment,
      severity: 'error',
      message: `Export blocked: Ledger has unresolved violations in ${environment}.`,
      blocking: true,
      requiresHumanApproval: false,
      rule: `${environment}.shipping.requireCleanLedger = true`,
    })
  }
  
  // Check health check requirement
  if (profile.shipping.requireHealthCheck && !context.healthCheckPassed) {
    violations.push({
      type: 'ENVIRONMENT_HEALTH_REQUIRED',
      environment,
      severity: 'error',
      message: `Export blocked: Health check required in ${environment}.`,
      blocking: true,
      requiresHumanApproval: false,
      rule: `${environment}.shipping.requireHealthCheck = true`,
    })
  }
  
  // Check Auditor requirement
  if (profile.shipping.requireAuditorPass && !context.auditorPassed) {
    violations.push({
      type: 'ENVIRONMENT_AUDITOR_REQUIRED',
      environment,
      severity: 'error',
      message: `Export blocked: Auditor approval required in ${environment}.`,
      blocking: true,
      requiresHumanApproval: false,
      rule: `${environment}.shipping.requireAuditorPass = true`,
    })
  }
  
  // Check Strategist requirement
  if (profile.shipping.requireStrategistReview && !context.strategistPassed) {
    violations.push({
      type: 'ENVIRONMENT_STRATEGIST_REQUIRED',
      environment,
      severity: 'error',
      message: `Export blocked: Strategist review required in ${environment}.`,
      blocking: true,
      requiresHumanApproval: false,
      rule: `${environment}.shipping.requireStrategistReview = true`,
    })
  }
  
  return violations
}

// ============================================
// UTILITIES
// ============================================

/**
 * Match an integration ID against a pattern with wildcard support
 */
function matchesPattern(id: string, pattern: string): boolean {
  if (pattern.endsWith('*')) {
    const prefix = pattern.slice(0, -1)
    return id.startsWith(prefix)
  }
  return id === pattern
}

/**
 * Format a violation for display
 */
export function formatEnvironmentViolation(violation: EnvironmentViolation): string {
  const icon = violation.blocking ? '🚫' : violation.requiresHumanApproval ? '⚠️' : 'ℹ️'
  return `${icon} ${violation.message}`
}

/**
 * Format an evaluation result for display
 */
export function formatEnvironmentEvaluation(evaluation: EnvironmentEvaluation): string {
  if (evaluation.allowed && evaluation.violations.length === 0) {
    return `✅ Environment check passed (${evaluation.environment})`
  }
  
  const lines = [
    evaluation.allowed
      ? `⚠️ Environment warnings (${evaluation.environment})`
      : `🚫 Environment violation (${evaluation.environment})`,
    '',
    ...evaluation.violations.map(formatEnvironmentViolation),
  ]
  
  return lines.join('\n')
}
