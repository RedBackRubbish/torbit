/**
 * TORBIT - Environment Profile Types
 * 
 * Environment-aware governance: Local ≠ Staging ≠ Production
 * Rules change by environment. Most restrictive wins.
 */

import type { IntegrationCategory } from '../types'

// ============================================
// ENVIRONMENT NAMES
// ============================================

export type EnvironmentName = 'local' | 'staging' | 'production'

export const ENVIRONMENT_NAMES: readonly EnvironmentName[] = [
  'local',
  'staging',
  'production',
] as const

// ============================================
// ENVIRONMENT PROFILE
// ============================================

export interface EnvironmentProfile {
  /**
   * Environment identifier
   */
  name: EnvironmentName
  
  /**
   * Human-readable description
   */
  description?: string
  
  /**
   * Integration rules for this environment
   */
  integrations: EnvironmentIntegrationRules
  
  /**
   * Auto-fix rules for this environment
   */
  autoFix: EnvironmentAutoFixRules
  
  /**
   * Shipping rules for this environment
   */
  shipping: EnvironmentShippingRules
  
  /**
   * Category-specific rules
   */
  categories: EnvironmentCategoryRules
}

// ============================================
// INTEGRATION RULES
// ============================================

export interface EnvironmentIntegrationRules {
  /**
   * Allow experimental/beta integrations
   * @default true for local, false for staging/production
   */
  allowExperimental: boolean
  
  /**
   * Integrations denied in this environment
   * Supports wildcards: "experimental-*"
   */
  deny: string[]
  
  /**
   * Require specific versions in this environment
   */
  requireStableVersions: boolean
}

// ============================================
// AUTO-FIX RULES
// ============================================

export interface EnvironmentAutoFixRules {
  /**
   * Allow auto-fix in this environment
   * @default true for local, false for staging/production
   */
  enabled: boolean
  
  /**
   * Actions allowed in this environment
   */
  allowedActions: string[]
  
  /**
   * Require human approval for all fixes
   */
  requireApproval: boolean
}

// ============================================
// SHIPPING RULES
// ============================================

export interface EnvironmentShippingRules {
  /**
   * Block export if version drift detected
   */
  blockOnDrift: boolean
  
  /**
   * Require clean ledger (no unresolved violations)
   */
  requireCleanLedger: boolean
  
  /**
   * Require health check pass before export
   */
  requireHealthCheck: boolean
  
  /**
   * Require Auditor approval before export
   */
  requireAuditorPass: boolean
  
  /**
   * Require Strategist review before export
   */
  requireStrategistReview: boolean
}

// ============================================
// CATEGORY RULES
// ============================================

export interface EnvironmentCategoryRules {
  /**
   * Categories requiring human approval in this environment
   */
  requireHumanApproval: IntegrationCategory[]
  
  /**
   * Categories blocked in this environment
   */
  blocked: IntegrationCategory[]
}

// ============================================
// ENVIRONMENT CONFIGURATION
// ============================================

export interface EnvironmentConfiguration {
  /**
   * Config version
   */
  version: string
  
  /**
   * Active environment
   */
  active: EnvironmentName
  
  /**
   * Environment profiles
   */
  environments: {
    local: EnvironmentProfile
    staging: EnvironmentProfile
    production: EnvironmentProfile
  }
  
  /**
   * Last updated timestamp
   */
  updatedAt: string
}

// ============================================
// ENVIRONMENT VIOLATION
// ============================================

export type EnvironmentViolationType =
  | 'ENVIRONMENT_AUTOFIX_DISABLED'
  | 'ENVIRONMENT_INTEGRATION_DENIED'
  | 'ENVIRONMENT_EXPERIMENTAL_BLOCKED'
  | 'ENVIRONMENT_CATEGORY_BLOCKED'
  | 'ENVIRONMENT_REQUIRES_APPROVAL'
  | 'ENVIRONMENT_DRIFT_BLOCKING'
  | 'ENVIRONMENT_LEDGER_DIRTY'
  | 'ENVIRONMENT_HEALTH_REQUIRED'
  | 'ENVIRONMENT_AUDITOR_REQUIRED'
  | 'ENVIRONMENT_STRATEGIST_REQUIRED'

export interface EnvironmentViolation {
  type: EnvironmentViolationType
  environment: EnvironmentName
  severity: 'error' | 'warning' | 'info'
  message: string
  blocking: boolean
  requiresHumanApproval: boolean
  rule: string
}

// ============================================
// ENVIRONMENT EVALUATION
// ============================================

export interface EnvironmentEvaluation {
  /**
   * Is the operation allowed in this environment?
   */
  allowed: boolean
  
  /**
   * Active environment
   */
  environment: EnvironmentName
  
  /**
   * Violations found
   */
  violations: EnvironmentViolation[]
  
  /**
   * Does this require human approval?
   */
  requiresHumanApproval: boolean
  
  /**
   * Evaluation timestamp
   */
  evaluatedAt: string
  
  /**
   * User-facing message if blocked
   */
  message?: string
}

// ============================================
// DEFAULT PROFILES
// ============================================

export const LOCAL_PROFILE: EnvironmentProfile = {
  name: 'local',
  description: 'Local development environment',
  integrations: {
    allowExperimental: true,
    deny: [],
    requireStableVersions: false,
  },
  autoFix: {
    enabled: true,
    allowedActions: ['install', 'update', 'remove', 'configure'],
    requireApproval: false,
  },
  shipping: {
    blockOnDrift: false,
    requireCleanLedger: false,
    requireHealthCheck: false,
    requireAuditorPass: false,
    requireStrategistReview: false,
  },
  categories: {
    requireHumanApproval: [],
    blocked: [],
  },
}

export const STAGING_PROFILE: EnvironmentProfile = {
  name: 'staging',
  description: 'Staging environment for testing',
  integrations: {
    allowExperimental: false,
    deny: [],
    requireStableVersions: true,
  },
  autoFix: {
    enabled: false,
    allowedActions: [],
    requireApproval: true,
  },
  shipping: {
    blockOnDrift: true,
    requireCleanLedger: false,
    requireHealthCheck: true,
    requireAuditorPass: false,
    requireStrategistReview: false,
  },
  categories: {
    requireHumanApproval: ['payments', 'auth'],
    blocked: [],
  },
}

export const PRODUCTION_PROFILE: EnvironmentProfile = {
  name: 'production',
  description: 'Production environment',
  integrations: {
    allowExperimental: false,
    deny: ['experimental-*'],
    requireStableVersions: true,
  },
  autoFix: {
    enabled: false,
    allowedActions: [],
    requireApproval: true,
  },
  shipping: {
    blockOnDrift: true,
    requireCleanLedger: true,
    requireHealthCheck: true,
    requireAuditorPass: true,
    requireStrategistReview: true,
  },
  categories: {
    requireHumanApproval: ['payments', 'auth', 'database'],
    blocked: [],
  },
}

export const DEFAULT_ENVIRONMENT_CONFIG: EnvironmentConfiguration = {
  version: '1.0.0',
  active: 'local',
  environments: {
    local: LOCAL_PROFILE,
    staging: STAGING_PROFILE,
    production: PRODUCTION_PROFILE,
  },
  updatedAt: new Date().toISOString(),
}
