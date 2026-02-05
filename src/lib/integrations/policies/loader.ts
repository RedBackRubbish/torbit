/**
 * TORBIT - Policy Loader
 * 
 * Loads, parses, and validates organization policies.
 * Policies are read-only to agents.
 */

import type { OrganizationPolicy } from './types'
import { DEFAULT_POLICY } from './types'

// ============================================
// CONSTANTS
// ============================================

export const POLICY_FILENAME = '.integrations/policies.json'
export const POLICY_VERSION = '1.0.0'

// ============================================
// POLICY STATE
// ============================================

let currentPolicy: OrganizationPolicy = DEFAULT_POLICY
let policySource: 'default' | 'file' | 'remote' = 'default'

/**
 * Get the current active policy (read-only)
 */
export function getPolicy(): Readonly<OrganizationPolicy> {
  return currentPolicy
}

/**
 * Get the policy source
 */
export function getPolicySource(): 'default' | 'file' | 'remote' {
  return policySource
}

/**
 * Check if a custom policy is loaded
 */
export function hasCustomPolicy(): boolean {
  return policySource !== 'default'
}

// ============================================
// POLICY LOADING
// ============================================

/**
 * Load policy from JSON string
 */
export function loadPolicyFromJson(json: string): {
  success: boolean
  policy?: OrganizationPolicy
  errors?: string[]
} {
  try {
    const parsed = JSON.parse(json)
    const validation = validatePolicy(parsed)
    
    if (!validation.valid) {
      return { success: false, errors: validation.errors }
    }
    
    // Merge with defaults for missing fields
    const policy = mergeWithDefaults(parsed)
    
    currentPolicy = policy
    policySource = 'file'
    
    return { success: true, policy }
  } catch (error) {
    return {
      success: false,
      errors: [`Invalid JSON: ${error instanceof Error ? error.message : 'unknown error'}`],
    }
  }
}

/**
 * Set policy directly (for programmatic use)
 */
export function setPolicy(policy: OrganizationPolicy, source: 'file' | 'remote' = 'file'): void {
  currentPolicy = policy
  policySource = source
}

/**
 * Reset to default policy
 */
export function resetToDefaultPolicy(): void {
  currentPolicy = DEFAULT_POLICY
  policySource = 'default'
}

// ============================================
// POLICY VALIDATION
// ============================================

interface ValidationResult {
  valid: boolean
  errors: string[]
}

/**
 * Validate a policy object
 */
export function validatePolicy(policy: unknown): ValidationResult {
  const errors: string[] = []
  
  if (!policy || typeof policy !== 'object') {
    return { valid: false, errors: ['Policy must be an object'] }
  }
  
  const p = policy as Record<string, unknown>
  
  // Version check
  if (p.version && p.version !== POLICY_VERSION) {
    errors.push(`Unsupported policy version: ${p.version}. Expected ${POLICY_VERSION}`)
  }
  
  // Integrations validation
  if (p.integrations) {
    if (typeof p.integrations !== 'object') {
      errors.push('integrations must be an object')
    } else {
      const integrations = p.integrations as Record<string, unknown>
      
      if (integrations.allow && !Array.isArray(integrations.allow)) {
        errors.push('integrations.allow must be an array')
      }
      if (integrations.deny && !Array.isArray(integrations.deny)) {
        errors.push('integrations.deny must be an array')
      }
    }
  }
  
  // Categories validation
  if (p.categories) {
    if (typeof p.categories !== 'object') {
      errors.push('categories must be an object')
    } else {
      const categories = p.categories as Record<string, unknown>
      const validCategories = ['payments', 'auth', 'database', 'maps', 'analytics', 'storage', 'email']
      
      for (const key of ['requireHumanApproval', 'blocked', 'requireStrategist', 'requireAuditor']) {
        if (categories[key]) {
          if (!Array.isArray(categories[key])) {
            errors.push(`categories.${key} must be an array`)
          } else {
            for (const cat of categories[key] as string[]) {
              if (!validCategories.includes(cat)) {
                errors.push(`Invalid category in ${key}: ${cat}`)
              }
            }
          }
        }
      }
    }
  }
  
  // AutoFix validation
  if (p.autoFix) {
    if (typeof p.autoFix !== 'object') {
      errors.push('autoFix must be an object')
    } else {
      const autoFix = p.autoFix as Record<string, unknown>
      
      if (autoFix.enabled !== undefined && typeof autoFix.enabled !== 'boolean') {
        errors.push('autoFix.enabled must be a boolean')
      }
      if (autoFix.allowedActions && !Array.isArray(autoFix.allowedActions)) {
        errors.push('autoFix.allowedActions must be an array')
      }
      if (autoFix.maxFixesPerSession !== undefined && typeof autoFix.maxFixesPerSession !== 'number') {
        errors.push('autoFix.maxFixesPerSession must be a number')
      }
    }
  }
  
  // Shipping validation
  if (p.shipping) {
    if (typeof p.shipping !== 'object') {
      errors.push('shipping must be an object')
    } else {
      const shipping = p.shipping as Record<string, unknown>
      
      for (const key of ['blockOnDrift', 'requireCleanLedger', 'requireHealthCheck', 'requireAuditorPass']) {
        if (shipping[key] !== undefined && typeof shipping[key] !== 'boolean') {
          errors.push(`shipping.${key} must be a boolean`)
        }
      }
    }
  }
  
  return { valid: errors.length === 0, errors }
}

// ============================================
// POLICY MERGING
// ============================================

/**
 * Merge a partial policy with defaults
 */
function mergeWithDefaults(partial: Partial<OrganizationPolicy>): OrganizationPolicy {
  return {
    version: partial.version || DEFAULT_POLICY.version,
    organizationId: partial.organizationId,
    name: partial.name || DEFAULT_POLICY.name,
    updatedAt: partial.updatedAt || new Date().toISOString(),
    integrations: {
      ...DEFAULT_POLICY.integrations,
      ...partial.integrations,
    },
    categories: {
      ...DEFAULT_POLICY.categories,
      ...partial.categories,
    },
    autoFix: {
      ...DEFAULT_POLICY.autoFix,
      ...partial.autoFix,
    },
    shipping: {
      ...DEFAULT_POLICY.shipping,
      ...partial.shipping,
    },
    governance: {
      ...DEFAULT_POLICY.governance,
      ...partial.governance,
    },
  }
}

// ============================================
// POLICY SERIALIZATION
// ============================================

/**
 * Serialize policy to JSON
 */
export function serializePolicy(policy: OrganizationPolicy): string {
  return JSON.stringify(policy, null, 2)
}

/**
 * Generate a policy template
 */
export function generatePolicyTemplate(): string {
  const template: OrganizationPolicy = {
    version: '1.0.0',
    name: 'Organization Policy',
    updatedAt: new Date().toISOString(),
    integrations: {
      allow: ['stripe', 'supabase', 'clerk'],
      deny: [],
      versionConstraints: {
        stripe: { minVersion: '14.0.0' },
      },
    },
    categories: {
      requireHumanApproval: ['payments', 'auth'],
      blocked: [],
      requireStrategist: ['payments'],
      requireAuditor: ['payments', 'auth', 'database'],
    },
    autoFix: {
      enabled: true,
      allowedActions: ['install', 'update'],
      maxFixesPerSession: 10,
      requireApproval: true,
    },
    shipping: {
      blockOnDrift: true,
      requireCleanLedger: true,
      requireHealthCheck: true,
      requireAuditorPass: true,
      allowedTargets: ['ios', 'vercel'],
    },
    governance: {
      alwaysRequireStrategist: false,
      alwaysRequireAuditor: true,
      premiumModelBudgetPercent: 10,
    },
  }
  
  return JSON.stringify(template, null, 2)
}
