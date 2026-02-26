/**
 * TORBIT - Integration Health Index
 * 
 * Central exports for the health check system.
 */

// Types
export type {
  HealthStatus,
  IssueType,
  DriftIssue,
  MissingPackageIssue,
  OrphanPackageIssue,
  DeprecationIssue,
  SecurityIssue,
  PeerMismatchIssue,
  HealthIssue,
  TemplateCompletenessSummary,
  HealthReport,
  IntegrationHealth,
  PackageHealth,
  HealthCheckTrigger,
  HealthCheckOptions,
  HealthFix,
  HealthCheckResult,
} from './types'

// Core checker
export {
  checkIntegrationHealth,
  isHealthy,
  formatHealthSummary,
} from './checker'

// Triggers
export {
  onProjectLoad,
  onPreExport,
  onPreDeploy,
  onManualCheck,
  shouldBlock,
  getBlockMessage,
  createTriggerContext,
  type TriggerContext,
} from './triggers'

// Deprecation registry
export {
  DEPRECATED_PACKAGES,
  checkDeprecation,
  getDeprecations,
  type DeprecatedPackage,
} from './deprecations'
