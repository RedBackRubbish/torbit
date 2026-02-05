/**
 * TORBIT - Environment Loader
 * 
 * Loads, parses, and validates environment profiles.
 * Manages active environment state.
 */

import type {
  EnvironmentName,
  EnvironmentProfile,
  EnvironmentConfiguration,
} from './types'
import {
  DEFAULT_ENVIRONMENT_CONFIG,
  LOCAL_PROFILE,
  STAGING_PROFILE,
  PRODUCTION_PROFILE,
} from './types'

// ============================================
// CONSTANTS
// ============================================

export const ENVIRONMENT_FILENAME = '.integrations/environments.json'
export const ENVIRONMENT_VERSION = '1.0.0'

// ============================================
// ENVIRONMENT STATE
// ============================================

let currentConfig: EnvironmentConfiguration = DEFAULT_ENVIRONMENT_CONFIG
let configSource: 'default' | 'file' | 'remote' = 'default'

/**
 * Get the current environment configuration (read-only)
 */
export function getEnvironmentConfig(): Readonly<EnvironmentConfiguration> {
  return currentConfig
}

/**
 * Get the active environment name
 */
export function getActiveEnvironment(): EnvironmentName {
  return currentConfig.active
}

/**
 * Get the active environment profile
 */
export function getActiveProfile(): Readonly<EnvironmentProfile> {
  return currentConfig.environments[currentConfig.active]
}

/**
 * Get a specific environment profile
 */
export function getProfile(env: EnvironmentName): Readonly<EnvironmentProfile> {
  return currentConfig.environments[env]
}

/**
 * Get the configuration source
 */
export function getConfigSource(): 'default' | 'file' | 'remote' {
  return configSource
}

/**
 * Check if a custom configuration is loaded
 */
export function hasCustomConfig(): boolean {
  return configSource !== 'default'
}

// ============================================
// ENVIRONMENT SWITCHING
// ============================================

/**
 * Switch the active environment
 * This triggers re-evaluation of health + policies
 */
export function setActiveEnvironment(env: EnvironmentName): {
  success: boolean
  previousEnvironment: EnvironmentName
  newEnvironment: EnvironmentName
} {
  const previous = currentConfig.active
  
  currentConfig = {
    ...currentConfig,
    active: env,
    updatedAt: new Date().toISOString(),
  }
  
  return {
    success: true,
    previousEnvironment: previous,
    newEnvironment: env,
  }
}

// ============================================
// CONFIGURATION LOADING
// ============================================

/**
 * Load configuration from JSON string
 */
export function loadEnvironmentConfig(json: string): {
  success: boolean
  config?: EnvironmentConfiguration
  errors?: string[]
} {
  try {
    const parsed = JSON.parse(json)
    const validation = validateConfig(parsed)
    
    if (!validation.valid) {
      return { success: false, errors: validation.errors }
    }
    
    // Merge with defaults for missing fields
    const config = mergeWithDefaults(parsed)
    
    currentConfig = config
    configSource = 'file'
    
    return { success: true, config }
  } catch (error) {
    return {
      success: false,
      errors: [`Invalid JSON: ${error instanceof Error ? error.message : 'unknown error'}`],
    }
  }
}

/**
 * Set configuration directly (for programmatic use)
 */
export function setEnvironmentConfig(
  config: EnvironmentConfiguration,
  source: 'file' | 'remote' = 'file'
): void {
  currentConfig = config
  configSource = source
}

/**
 * Reset to default configuration
 */
export function resetToDefaultConfig(): void {
  currentConfig = DEFAULT_ENVIRONMENT_CONFIG
  configSource = 'default'
}

// ============================================
// CONFIGURATION VALIDATION
// ============================================

interface ValidationResult {
  valid: boolean
  errors: string[]
}

/**
 * Validate a configuration object
 */
export function validateConfig(config: unknown): ValidationResult {
  const errors: string[] = []
  
  if (!config || typeof config !== 'object') {
    return { valid: false, errors: ['Configuration must be an object'] }
  }
  
  const c = config as Record<string, unknown>
  
  // Version check
  if (c.version && c.version !== ENVIRONMENT_VERSION) {
    errors.push(`Unsupported config version: ${c.version}. Expected ${ENVIRONMENT_VERSION}`)
  }
  
  // Active environment check
  if (c.active && !['local', 'staging', 'production'].includes(c.active as string)) {
    errors.push(`Invalid active environment: ${c.active}`)
  }
  
  // Environments validation
  if (c.environments) {
    if (typeof c.environments !== 'object') {
      errors.push('environments must be an object')
    } else {
      const envs = c.environments as Record<string, unknown>
      
      for (const env of ['local', 'staging', 'production']) {
        if (envs[env]) {
          const profile = envs[env] as Record<string, unknown>
          const profileErrors = validateProfile(profile, env)
          errors.push(...profileErrors)
        }
      }
    }
  }
  
  return { valid: errors.length === 0, errors }
}

/**
 * Validate an individual profile
 */
function validateProfile(profile: Record<string, unknown>, envName: string): string[] {
  const errors: string[] = []
  
  // Integration rules
  if (profile.integrations) {
    if (typeof profile.integrations !== 'object') {
      errors.push(`${envName}.integrations must be an object`)
    } else {
      const integrations = profile.integrations as Record<string, unknown>
      if (integrations.deny && !Array.isArray(integrations.deny)) {
        errors.push(`${envName}.integrations.deny must be an array`)
      }
    }
  }
  
  // Auto-fix rules
  if (profile.autoFix) {
    if (typeof profile.autoFix !== 'object') {
      errors.push(`${envName}.autoFix must be an object`)
    }
  }
  
  // Shipping rules
  if (profile.shipping) {
    if (typeof profile.shipping !== 'object') {
      errors.push(`${envName}.shipping must be an object`)
    }
  }
  
  // Category rules
  if (profile.categories) {
    if (typeof profile.categories !== 'object') {
      errors.push(`${envName}.categories must be an object`)
    }
  }
  
  return errors
}

// ============================================
// CONFIGURATION MERGING
// ============================================

/**
 * Merge a partial config with defaults
 */
function mergeWithDefaults(partial: Partial<EnvironmentConfiguration>): EnvironmentConfiguration {
  const defaultProfiles = {
    local: LOCAL_PROFILE,
    staging: STAGING_PROFILE,
    production: PRODUCTION_PROFILE,
  }
  
  const mergedEnvironments = { ...defaultProfiles }
  
  if (partial.environments) {
    for (const env of ['local', 'staging', 'production'] as const) {
      if (partial.environments[env]) {
        mergedEnvironments[env] = mergeProfile(
          defaultProfiles[env],
          partial.environments[env] as Partial<EnvironmentProfile>
        )
      }
    }
  }
  
  return {
    version: partial.version || DEFAULT_ENVIRONMENT_CONFIG.version,
    active: partial.active || DEFAULT_ENVIRONMENT_CONFIG.active,
    environments: mergedEnvironments,
    updatedAt: partial.updatedAt || new Date().toISOString(),
  }
}

/**
 * Merge a partial profile with defaults
 */
function mergeProfile(
  base: EnvironmentProfile,
  partial: Partial<EnvironmentProfile>
): EnvironmentProfile {
  return {
    name: base.name,
    description: partial.description || base.description,
    integrations: {
      ...base.integrations,
      ...partial.integrations,
    },
    autoFix: {
      ...base.autoFix,
      ...partial.autoFix,
    },
    shipping: {
      ...base.shipping,
      ...partial.shipping,
    },
    categories: {
      ...base.categories,
      ...partial.categories,
    },
  }
}

// ============================================
// SERIALIZATION
// ============================================

/**
 * Serialize configuration to JSON
 */
export function serializeConfig(config: EnvironmentConfiguration): string {
  return JSON.stringify(config, null, 2)
}

/**
 * Generate a configuration template
 */
export function generateConfigTemplate(): string {
  return serializeConfig(DEFAULT_ENVIRONMENT_CONFIG)
}

// ============================================
// ENVIRONMENT INFO
// ============================================

export interface EnvironmentInfo {
  name: EnvironmentName
  label: string
  icon: string
  color: string
  description: string
}

export const ENVIRONMENT_INFO: Record<EnvironmentName, EnvironmentInfo> = {
  local: {
    name: 'local',
    label: 'Local',
    icon: '💻',
    color: 'text-green-400',
    description: 'Local development - full access',
  },
  staging: {
    name: 'staging',
    label: 'Staging',
    icon: '🧪',
    color: 'text-yellow-400',
    description: 'Staging - restricted auto-fix',
  },
  production: {
    name: 'production',
    label: 'Production',
    icon: '🚀',
    color: 'text-red-400',
    description: 'Production - maximum restrictions',
  },
}
