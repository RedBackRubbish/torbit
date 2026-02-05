/**
 * TORBIT - Organization Policy Types
 * 
 * Policy as code for enterprise control.
 * 
 * Enforcement Rules (Non-Negotiable):
 * - Policies override user intent
 * - Policies override Planner plans
 * - Policies override auto-fix
 * - No exceptions. No hidden bypasses.
 */

import type { IntegrationCategory } from '../types'

/**
 * Core organization policy structure
 */
export interface OrganizationPolicy {
  /** Policy format version */
  version: '1.0.0'
  
  /** Organization identifier */
  organizationId?: string
  
  /** Policy name */
  name?: string
  
  /** When policy was last updated */
  updatedAt: string
  
  /** Integration allowlist/denylist */
  integrations: IntegrationPolicyRules
  
  /** Category-level rules */
  categories: CategoryPolicyRules
  
  /** Auto-fix behavior */
  autoFix: AutoFixPolicy
  
  /** Export/deploy gates */
  shipping: ShippingPolicy
  
  /** Governance overrides */
  governance: GovernancePolicy
}

/**
 * Integration-level policy rules
 */
export interface IntegrationPolicyRules {
  /** Explicit allowlist (if set, only these are allowed) */
  allow?: string[]
  
  /** Explicit denylist (always blocked) */
  deny?: string[]
  
  /** Version constraints per integration */
  versionConstraints?: Record<string, VersionConstraint>
}

/**
 * Version constraint for an integration
 */
export interface VersionConstraint {
  /** Minimum allowed version */
  minVersion?: string
  
  /** Maximum allowed version */
  maxVersion?: string
  
  /** Exact required version */
  exactVersion?: string
  
  /** Denied versions (security, deprecated) */
  denyVersions?: string[]
}

/**
 * Category-level policy rules
 */
export interface CategoryPolicyRules {
  /** Categories that always require human approval */
  requireHumanApproval?: IntegrationCategory[]
  
  /** Categories that are completely blocked */
  blocked?: IntegrationCategory[]
  
  /** Categories that require Strategist review */
  requireStrategist?: IntegrationCategory[]
  
  /** Categories that require Auditor review */
  requireAuditor?: IntegrationCategory[]
}

/**
 * Auto-fix behavior policy
 */
export interface AutoFixPolicy {
  /** Whether auto-fix is allowed at all */
  enabled: boolean
  
  /** Allowed fix actions */
  allowedActions?: ('install' | 'update' | 'remove' | 'replace')[]
  
  /** Maximum fixes per session */
  maxFixesPerSession?: number
  
  /** Require human approval for each fix */
  requireApproval?: boolean
}

/**
 * Export and deploy policy
 */
export interface ShippingPolicy {
  /** Block export if any drift detected */
  blockOnDrift: boolean
  
  /** Block export if ledger has any FAILED events */
  requireCleanLedger: boolean
  
  /** Block export if health check not passed */
  requireHealthCheck: boolean
  
  /** Allowed export targets */
  allowedTargets?: ('ios' | 'android' | 'vercel' | 'netlify' | 'other')[]
  
  /** Blocked export targets */
  blockedTargets?: ('ios' | 'android' | 'vercel' | 'netlify' | 'other')[]
  
  /** Require Auditor pass before export */
  requireAuditorPass: boolean
}

/**
 * Governance behavior overrides
 */
export interface GovernancePolicy {
  /** Always require Strategist for any operation */
  alwaysRequireStrategist: boolean
  
  /** Always require Auditor for any operation */
  alwaysRequireAuditor: boolean
  
  /** Minimum token budget for premium models (0-100) */
  premiumModelBudgetPercent?: number
  
  /** Disable certain agents entirely */
  disabledAgents?: string[]
}

/**
 * Policy violation types
 */
export type PolicyViolationType =
  | 'INTEGRATION_DENIED'
  | 'INTEGRATION_NOT_ALLOWED'
  | 'VERSION_CONSTRAINT_FAILED'
  | 'CATEGORY_BLOCKED'
  | 'CATEGORY_REQUIRES_APPROVAL'
  | 'AUTOFIX_DISABLED'
  | 'AUTOFIX_ACTION_DENIED'
  | 'EXPORT_TARGET_BLOCKED'
  | 'EXPORT_DRIFT_BLOCKED'
  | 'EXPORT_LEDGER_DIRTY'
  | 'EXPORT_HEALTH_FAILED'
  | 'GOVERNANCE_REQUIRED'

/**
 * A policy violation record
 */
export interface PolicyViolation {
  type: PolicyViolationType
  rule: string
  message: string
  integration?: string
  category?: IntegrationCategory
  target?: string
  blockedAction?: string
}

/**
 * Result of policy evaluation
 */
export interface PolicyEvaluation {
  /** Whether the operation is allowed */
  allowed: boolean
  
  /** Violations found (empty if allowed) */
  violations: PolicyViolation[]
  
  /** Human-readable summary */
  summary: string
  
  /** Policy that was evaluated */
  policyName?: string
  
  /** Evaluation timestamp */
  timestamp: string
}

/**
 * Policy check context
 */
export type PolicyCheckContext =
  | { type: 'install'; integrationId: string; category: IntegrationCategory }
  | { type: 'fix'; integrationId: string; action: string }
  | { type: 'export'; target: string; integrations: string[]; healthStatus: string }
  | { type: 'deploy'; target: string; integrations: string[] }
  | { type: 'category'; category: IntegrationCategory }

/**
 * Ledger event types for policies
 */
export type PolicyLedgerEvent =
  | 'POLICY_CHECK_PASSED'
  | 'POLICY_CHECK_FAILED'
  | 'POLICY_BLOCK'
  | 'POLICY_OVERRIDE'
  | 'POLICY_LOADED'
  | 'POLICY_UPDATED'

/**
 * Default policy (permissive)
 */
export const DEFAULT_POLICY: OrganizationPolicy = {
  version: '1.0.0',
  name: 'Default Policy',
  updatedAt: new Date().toISOString(),
  integrations: {
    allow: undefined, // All allowed by default
    deny: [],
  },
  categories: {
    requireHumanApproval: ['payments', 'auth'],
    blocked: [],
  },
  autoFix: {
    enabled: true,
    allowedActions: ['install', 'update', 'remove', 'replace'],
    requireApproval: true,
  },
  shipping: {
    blockOnDrift: false,
    requireCleanLedger: false,
    requireHealthCheck: true,
    requireAuditorPass: true,
  },
  governance: {
    alwaysRequireStrategist: false,
    alwaysRequireAuditor: false,
  },
}

/**
 * Strict enterprise policy template
 */
export const STRICT_POLICY: OrganizationPolicy = {
  version: '1.0.0',
  name: 'Strict Enterprise Policy',
  updatedAt: new Date().toISOString(),
  integrations: {
    allow: undefined,
    deny: [],
  },
  categories: {
    requireHumanApproval: ['payments', 'auth', 'analytics', 'storage'],
    blocked: [],
    requireStrategist: ['payments', 'auth'],
    requireAuditor: ['payments', 'auth', 'database', 'storage'],
  },
  autoFix: {
    enabled: true,
    allowedActions: ['update'],
    maxFixesPerSession: 5,
    requireApproval: true,
  },
  shipping: {
    blockOnDrift: true,
    requireCleanLedger: true,
    requireHealthCheck: true,
    requireAuditorPass: true,
    blockedTargets: [],
  },
  governance: {
    alwaysRequireStrategist: false,
    alwaysRequireAuditor: true,
    premiumModelBudgetPercent: 10,
  },
}
