/**
 * TORBIT - Environment System
 * 
 * Environment-aware governance: Local ≠ Staging ≠ Production
 * Rules change by environment. Most restrictive wins.
 * 
 * Rule Resolution Order:
 * 1. Environment profile (highest priority)
 * 2. Organization policy
 * 3. Integration manifest
 * 4. User intent (lowest priority)
 */

// Types
export type {
  EnvironmentName,
  EnvironmentProfile,
  EnvironmentConfiguration,
  EnvironmentIntegrationRules,
  EnvironmentAutoFixRules,
  EnvironmentShippingRules,
  EnvironmentCategoryRules,
  EnvironmentViolation,
  EnvironmentViolationType,
  EnvironmentEvaluation,
} from './types'

export {
  ENVIRONMENT_NAMES,
  LOCAL_PROFILE,
  STAGING_PROFILE,
  PRODUCTION_PROFILE,
  DEFAULT_ENVIRONMENT_CONFIG,
} from './types'

// Loader
export {
  getEnvironmentConfig,
  getActiveEnvironment,
  getActiveProfile,
  getProfile,
  getConfigSource,
  hasCustomConfig,
  setActiveEnvironment,
  loadEnvironmentConfig,
  setEnvironmentConfig,
  resetToDefaultConfig,
  validateConfig,
  serializeConfig,
  generateConfigTemplate,
  ENVIRONMENT_FILENAME,
  ENVIRONMENT_VERSION,
  ENVIRONMENT_INFO,
  type EnvironmentInfo,
} from './loader'

// Evaluator
export {
  evaluateEnvironment,
  wouldBeAllowedIn,
  formatEnvironmentViolation,
  formatEnvironmentEvaluation,
  type EnvironmentContext,
} from './evaluator'

// Unified Enforcement
export {
  evaluateUnified,
  enforceUnified,
  enforcePreInstallUnified,
  enforcePreExportUnified,
  enforcePreDeployUnified,
  enforcePreAutoFixUnified,
  wouldBeAllowedUnified,
  getCurrentRestrictions,
  type UnifiedEvaluation,
  type UnifiedContext,
  type UnifiedEnforcementResult,
} from './unified'

// Ledger Integration
export {
  recordEnvironmentEvent,
  recordUnifiedEnforcement,
  recordEnvironmentSwitch,
  recordEnvironmentConfigLoaded,
  recordEnvironmentBlock,
  recordEnvironmentApproval,
  getEnvironmentEventSummary,
  generateEnvironmentProof,
  type EnvironmentEventType,
  type EnvironmentExportProof,
} from './ledger-events'
