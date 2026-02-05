/**
 * TORBIT - Policy Enforcement Hooks
 * 
 * Lifecycle gates that enforce policy at critical moments.
 * These are the walls that cannot be bypassed.
 * 
 * Rule: Policies override user intent, Planner plans, and auto-fix.
 */

import type { IntegrationManifest } from '../manifests/types'
import type { PolicyEvaluation } from './types'
import { evaluatePolicy, type EvaluationContext, type OperationType } from './evaluator'
import { getPolicy } from './loader'

// ============================================
// ENFORCEMENT RESULT
// ============================================

export interface EnforcementResult {
  proceed: boolean
  evaluation: PolicyEvaluation
  userMessage: string
  ledgerEvent: PolicyLedgerEvent
}

export interface PolicyLedgerEvent {
  type: 'POLICY_CHECK' | 'POLICY_BLOCK' | 'POLICY_APPROVAL_REQUIRED'
  operation: OperationType
  integrationId?: string
  violations: string[]
  timestamp: string
}

// ============================================
// PRE-INSTALL GATE
// ============================================

/**
 * Enforce policy before installing an integration
 * 
 * @returns EnforcementResult - proceed=false means ABORT
 */
export function enforcePreInstall(manifest: IntegrationManifest): EnforcementResult {
  const context: EvaluationContext = {
    operation: 'install',
    integration: manifest,
    category: manifest.category,
  }
  
  const evaluation = evaluatePolicy(context)
  
  return createEnforcementResult('install', evaluation, manifest.id)
}

// ============================================
// PRE-UPDATE GATE
// ============================================

/**
 * Enforce policy before updating an integration
 */
export function enforcePreUpdate(manifest: IntegrationManifest): EnforcementResult {
  const context: EvaluationContext = {
    operation: 'update',
    integration: manifest,
    category: manifest.category,
  }
  
  const evaluation = evaluatePolicy(context)
  
  return createEnforcementResult('update', evaluation, manifest.id)
}

// ============================================
// PRE-REMOVE GATE
// ============================================

/**
 * Enforce policy before removing an integration
 */
export function enforcePreRemove(manifest: IntegrationManifest): EnforcementResult {
  const context: EvaluationContext = {
    operation: 'remove',
    integration: manifest,
    category: manifest.category,
  }
  
  const evaluation = evaluatePolicy(context)
  
  return createEnforcementResult('remove', evaluation, manifest.id)
}

// ============================================
// PRE-AUTOFIX GATE
// ============================================

/**
 * Enforce policy before applying an auto-fix
 */
export function enforcePreAutoFix(
  fixAction: string,
  manifest?: IntegrationManifest
): EnforcementResult {
  const context: EvaluationContext = {
    operation: 'auto-fix',
    integration: manifest,
    category: manifest?.category,
    fixAction,
  }
  
  const evaluation = evaluatePolicy(context)
  
  return createEnforcementResult('auto-fix', evaluation, manifest?.id)
}

// ============================================
// PRE-EXPORT GATE
// ============================================

export interface ExportContext {
  isDriftPresent: boolean
  hasLedgerViolations: boolean
  healthCheckPassed: boolean
  auditorPassed: boolean
  target?: string
}

/**
 * Enforce policy before exporting
 */
export function enforcePreExport(context: ExportContext): EnforcementResult {
  const policy = getPolicy()
  
  // Check target restrictions
  if (
    context.target &&
    policy.shipping.allowedTargets &&
    policy.shipping.allowedTargets.length > 0 &&
    !policy.shipping.allowedTargets.includes(context.target)
  ) {
    const evaluation: PolicyEvaluation = {
      allowed: false,
      violations: [{
        type: 'EXPORT_TARGET_NOT_ALLOWED',
        severity: 'error',
        message: `Export target "${context.target}" is not allowed.`,
        blocking: true,
        requiresHumanApproval: false,
        policyRule: `shipping.allowedTargets does not include "${context.target}"`,
      }],
      requiresHumanApproval: false,
      policyVersion: policy.version,
      evaluatedAt: new Date().toISOString(),
      message: 'This action is restricted by organization policy.',
    }
    
    return createEnforcementResult('export', evaluation)
  }
  
  const evalContext: EvaluationContext = {
    operation: 'export',
    isDriftPresent: context.isDriftPresent,
    hasLedgerViolations: context.hasLedgerViolations,
    healthCheckPassed: context.healthCheckPassed,
    auditorPassed: context.auditorPassed,
  }
  
  const evaluation = evaluatePolicy(evalContext)
  
  return createEnforcementResult('export', evaluation)
}

// ============================================
// PRE-DEPLOY GATE
// ============================================

/**
 * Enforce policy before deploying
 */
export function enforcePreDeploy(context: ExportContext): EnforcementResult {
  const evalContext: EvaluationContext = {
    operation: 'deploy',
    isDriftPresent: context.isDriftPresent,
    hasLedgerViolations: context.hasLedgerViolations,
    healthCheckPassed: context.healthCheckPassed,
    auditorPassed: context.auditorPassed,
  }
  
  const evaluation = evaluatePolicy(evalContext)
  
  return createEnforcementResult('deploy', evaluation)
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function createEnforcementResult(
  operation: OperationType,
  evaluation: PolicyEvaluation,
  integrationId?: string
): EnforcementResult {
  const blocked = !evaluation.allowed
  const requiresApproval = evaluation.requiresHumanApproval
  
  let userMessage: string
  if (blocked) {
    userMessage = 'This action is restricted by organization policy.'
  } else if (requiresApproval) {
    userMessage = 'This action requires approval before proceeding.'
  } else {
    userMessage = 'Policy check passed.'
  }
  
  const ledgerEvent: PolicyLedgerEvent = {
    type: blocked
      ? 'POLICY_BLOCK'
      : requiresApproval
        ? 'POLICY_APPROVAL_REQUIRED'
        : 'POLICY_CHECK',
    operation,
    integrationId,
    violations: evaluation.violations.map(v => v.message),
    timestamp: new Date().toISOString(),
  }
  
  return {
    proceed: !blocked,
    evaluation,
    userMessage,
    ledgerEvent,
  }
}

// ============================================
// GATE DECORATOR
// ============================================

/**
 * Decorator to wrap any async function with policy enforcement
 */
export function withPolicyGate<T extends (...args: unknown[]) => Promise<unknown>>(
  operation: OperationType,
  getManifest: (...args: Parameters<T>) => IntegrationManifest | undefined
) {
  return function (fn: T): T {
    return (async (...args: Parameters<T>) => {
      const manifest = getManifest(...args)
      const context: EvaluationContext = {
        operation,
        integration: manifest,
        category: manifest?.category,
      }
      
      const evaluation = evaluatePolicy(context)
      
      if (!evaluation.allowed) {
        throw new PolicyViolationError(evaluation)
      }
      
      return fn(...args)
    }) as T
  }
}

// ============================================
// POLICY VIOLATION ERROR
// ============================================

export class PolicyViolationError extends Error {
  readonly evaluation: PolicyEvaluation
  
  constructor(evaluation: PolicyEvaluation) {
    super('This action is restricted by organization policy.')
    this.name = 'PolicyViolationError'
    this.evaluation = evaluation
  }
}

// ============================================
// QUICK CHECKS
// ============================================

/**
 * Quick check if an operation would be allowed
 */
export function wouldBeAllowed(
  operation: OperationType,
  manifest?: IntegrationManifest
): boolean {
  const context: EvaluationContext = {
    operation,
    integration: manifest,
    category: manifest?.category,
  }
  
  const evaluation = evaluatePolicy(context)
  return evaluation.allowed
}

/**
 * Get violations for an operation without blocking
 */
export function previewViolations(
  operation: OperationType,
  manifest?: IntegrationManifest
): PolicyEvaluation {
  const context: EvaluationContext = {
    operation,
    integration: manifest,
    category: manifest?.category,
  }
  
  return evaluatePolicy(context)
}
