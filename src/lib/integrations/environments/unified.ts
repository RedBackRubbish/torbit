/**
 * TORBIT - Unified Enforcement
 * 
 * Combines environment profiles + organization policies.
 * Most restrictive rule always wins.
 * 
 * Rule Resolution Order:
 * 1. Environment profile (highest priority)
 * 2. Organization policy
 * 3. Integration manifest
 * 4. User intent (lowest priority)
 */

import type { IntegrationManifest } from '../types'
import type { PolicyEvaluation } from '../policies/types'
import type { EnvironmentEvaluation, EnvironmentName } from './types'
import { evaluatePolicy, type EvaluationContext as PolicyContext } from '../policies/evaluator'
import { evaluateEnvironment, type EnvironmentContext } from './evaluator'
import { getActiveEnvironment, getActiveProfile } from './loader'

// ============================================
// UNIFIED EVALUATION RESULT
// ============================================

export interface UnifiedEvaluation {
  /**
   * Is the operation allowed after all checks?
   */
  allowed: boolean
  
  /**
   * Active environment
   */
  environment: EnvironmentName
  
  /**
   * Environment-specific evaluation
   */
  environmentEvaluation: EnvironmentEvaluation
  
  /**
   * Organization policy evaluation
   */
  policyEvaluation: PolicyEvaluation
  
  /**
   * Does this require human approval?
   */
  requiresHumanApproval: boolean
  
  /**
   * Combined user-facing message
   */
  message?: string
  
  /**
   * Evaluation timestamp
   */
  evaluatedAt: string
  
  /**
   * Which layer blocked the operation?
   */
  blockedBy?: 'environment' | 'policy' | null
}

// ============================================
// UNIFIED ENFORCEMENT CONTEXT
// ============================================

export interface UnifiedContext {
  operation: 'install' | 'update' | 'remove' | 'auto-fix' | 'export' | 'deploy' | 'configure'
  integration?: IntegrationManifest
  fixAction?: string
  isDriftPresent?: boolean
  hasLedgerViolations?: boolean
  healthCheckPassed?: boolean
  auditorPassed?: boolean
  strategistPassed?: boolean
  isExperimental?: boolean
}

// ============================================
// UNIFIED EVALUATOR
// ============================================

/**
 * Evaluate an operation against both environment and policy rules
 * Most restrictive wins.
 */
export function evaluateUnified(context: UnifiedContext): UnifiedEvaluation {
  const environment = getActiveEnvironment()
  
  // Build context for environment evaluation
  const envContext: EnvironmentContext = {
    operation: context.operation,
    integration: context.integration,
    category: context.integration?.category,
    fixAction: context.fixAction,
    isDriftPresent: context.isDriftPresent,
    hasLedgerViolations: context.hasLedgerViolations,
    healthCheckPassed: context.healthCheckPassed,
    auditorPassed: context.auditorPassed,
    strategistPassed: context.strategistPassed,
    isExperimental: context.isExperimental,
  }
  
  // Build context for policy evaluation
  const policyContext: PolicyContext = {
    operation: context.operation,
    integration: context.integration,
    category: context.integration?.category,
    fixAction: context.fixAction,
    isDriftPresent: context.isDriftPresent,
    hasLedgerViolations: context.hasLedgerViolations,
    healthCheckPassed: context.healthCheckPassed,
    auditorPassed: context.auditorPassed,
  }
  
  // Evaluate both layers
  const environmentEvaluation = evaluateEnvironment(envContext)
  const policyEvaluation = evaluatePolicy(policyContext)
  
  // Most restrictive wins
  const envBlocked = !environmentEvaluation.allowed
  const policyBlocked = !policyEvaluation.allowed
  const allowed = !envBlocked && !policyBlocked
  
  // Determine which layer blocked
  let blockedBy: 'environment' | 'policy' | null = null
  if (envBlocked) {
    blockedBy = 'environment'
  } else if (policyBlocked) {
    blockedBy = 'policy'
  }
  
  // Combine approval requirements
  // PolicyEvaluation uses violations, not requiresHumanApproval flag directly
  const requiresHumanApproval = 
    environmentEvaluation.requiresHumanApproval || 
    false // Policy violations handled via violations array
  
  // Build message
  let message: string | undefined
  if (envBlocked) {
    message = `This action is restricted in the ${environment} environment.`
  } else if (policyBlocked) {
    message = 'This action is restricted by organization policy.'
  }
  
  return {
    allowed,
    environment,
    environmentEvaluation,
    policyEvaluation,
    requiresHumanApproval,
    message,
    evaluatedAt: new Date().toISOString(),
    blockedBy,
  }
}

// ============================================
// UNIFIED ENFORCEMENT GATES
// ============================================

export interface UnifiedEnforcementResult {
  proceed: boolean
  evaluation: UnifiedEvaluation
  userMessage: string
  ledgerEvents: {
    environment: {
      type: 'ENVIRONMENT_CHECK' | 'ENVIRONMENT_BLOCK' | 'ENVIRONMENT_APPROVED'
      environment: EnvironmentName
      violations: string[]
    }
    policy: {
      type: 'POLICY_CHECK' | 'POLICY_BLOCK' | 'POLICY_APPROVED'
      violations: string[]
    }
  }
}

/**
 * Enforce unified rules before an operation
 */
export function enforceUnified(context: UnifiedContext): UnifiedEnforcementResult {
  const evaluation = evaluateUnified(context)
  
  const envViolations = evaluation.environmentEvaluation.violations.map(v => v.message)
  const policyViolations = evaluation.policyEvaluation.violations.map(v => v.message)
  
  let userMessage: string
  if (!evaluation.allowed) {
    userMessage = evaluation.message || 'This action is restricted.'
  } else if (evaluation.requiresHumanApproval) {
    userMessage = 'This action requires approval before proceeding.'
  } else {
    userMessage = 'All checks passed.'
  }
  
  return {
    proceed: evaluation.allowed,
    evaluation,
    userMessage,
    ledgerEvents: {
      environment: {
        type: evaluation.environmentEvaluation.allowed
          ? 'ENVIRONMENT_CHECK'
          : 'ENVIRONMENT_BLOCK',
        environment: evaluation.environment,
        violations: envViolations,
      },
      policy: {
        type: evaluation.policyEvaluation.allowed
          ? 'POLICY_CHECK'
          : 'POLICY_BLOCK',
        violations: policyViolations,
      },
    },
  }
}

/**
 * Pre-install unified gate
 */
export function enforcePreInstallUnified(
  manifest: IntegrationManifest,
  isExperimental = false
): UnifiedEnforcementResult {
  return enforceUnified({
    operation: 'install',
    integration: manifest,
    isExperimental,
  })
}

/**
 * Pre-export unified gate
 */
export function enforcePreExportUnified(context: {
  isDriftPresent: boolean
  hasLedgerViolations: boolean
  healthCheckPassed: boolean
  auditorPassed: boolean
  strategistPassed: boolean
}): UnifiedEnforcementResult {
  return enforceUnified({
    operation: 'export',
    ...context,
  })
}

/**
 * Pre-deploy unified gate
 */
export function enforcePreDeployUnified(context: {
  isDriftPresent: boolean
  hasLedgerViolations: boolean
  healthCheckPassed: boolean
  auditorPassed: boolean
  strategistPassed: boolean
}): UnifiedEnforcementResult {
  return enforceUnified({
    operation: 'deploy',
    ...context,
  })
}

/**
 * Pre-auto-fix unified gate
 */
export function enforcePreAutoFixUnified(
  fixAction: string,
  manifest?: IntegrationManifest
): UnifiedEnforcementResult {
  return enforceUnified({
    operation: 'auto-fix',
    integration: manifest,
    fixAction,
  })
}

// ============================================
// QUICK CHECKS
// ============================================

/**
 * Quick check if an operation would be allowed
 */
export function wouldBeAllowedUnified(context: UnifiedContext): boolean {
  const evaluation = evaluateUnified(context)
  return evaluation.allowed
}

/**
 * Get a summary of restrictions for the current environment
 */
export function getCurrentRestrictions(): {
  environment: EnvironmentName
  autoFixEnabled: boolean
  experimentalAllowed: boolean
  requiresCleanLedger: boolean
  requiresAuditor: boolean
  blockedCategories: string[]
} {
  const profile = getActiveProfile()
  
  return {
    environment: profile.name,
    autoFixEnabled: profile.autoFix.enabled,
    experimentalAllowed: profile.integrations.allowExperimental,
    requiresCleanLedger: profile.shipping.requireCleanLedger,
    requiresAuditor: profile.shipping.requireAuditorPass,
    blockedCategories: profile.categories.blocked,
  }
}
