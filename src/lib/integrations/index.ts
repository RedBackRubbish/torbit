/**
 * TORBIT Integration System
 * 
 * Enterprise-grade integration management with:
 * - Manifest-first architecture
 * - Pinned package versions
 * - Governance gates (Strategist + Auditor)
 * - Secret injection (never written to files)
 * - User consent requirements
 * 
 * An Integration is a first-class governed artifact, not a package install.
 */

// Types
export type {
  IntegrationManifest,
  IntegrationCategory,
  IntegrationPlatform,
  IntegrationPermissions,
  IntegrationPackages,
  IntegrationFiles,
  IntegrationPlan,
  IntegrationResult,
  IntegrationStatus,
  StrategistReview,
  AuditorReview,
  GovernanceVerdict,
  SecretPolicy,
  ValidationResult,
  ValidationError,
} from "./types";

// Type guards
export {
  isPinnedVersion,
  isValidManifest,
  validatePackageVersions,
} from "./types";

// Registry
export {
  getIntegration,
  integrationExists,
  getAllIntegrations,
  getIntegrationsByCategory,
  getIntegrationsByPlatform,
  searchIntegrations,
  validateManifest,
  validateSecrets,
  isPackageAllowed,
  getAllowedPackages,
} from "./registry";

// Executor
export {
  createIntegrationPlan,
  requiresStrategistReview,
  requiresAuditorReview,
  requiresUserConsent,
  executeIntegrationPlan,
  auditIntegration,
  runIntegrationFlow,
} from "./executor";

export type {
  CreatePlanOptions,
  PlanResult,
  ExecuteOptions,
  ExecuteResult,
  AuditOptions,
  IntegrationFlowOptions,
} from "./executor";

// Manifests - Payments
export { stripeManifest } from "./stripe/manifest";
export { paypalManifest } from "./paypal/manifest";

// Manifests - Auth
export { clerkManifest } from "./clerk/manifest";
export { authJsManifest } from "./authjs/manifest";
export { firebaseAuthManifest } from "./firebase-auth/manifest";

// Manifests - Database
export { supabaseManifest } from "./supabase/manifest";
export { firebaseManifest } from "./firebase/manifest";
export { neonManifest } from "./neon/manifest";

// Manifests - Maps
export { googleMapsManifest } from "./google-maps/manifest";
export { mapboxManifest } from "./mapbox/manifest";

// Manifests - Email & Messaging
export { sendgridManifest } from "./sendgrid/manifest";
export { resendManifest } from "./resend/manifest";
export { twilioManifest } from "./twilio/manifest";
export { slackManifest } from "./slack/manifest";

// Manifests - Analytics
export { googleAnalyticsManifest } from "./google-analytics/manifest";
export { posthogManifest } from "./posthog/manifest";
export { sentryManifest } from "./sentry/manifest";

// Manifests - Storage
export { s3Manifest } from "./aws-s3/manifest";
export { r2Manifest } from "./cloudflare-r2/manifest";

// Health Check System
export {
  // Types
  type HealthStatus,
  type IssueType,
  type DriftIssue,
  type MissingPackageIssue,
  type OrphanPackageIssue,
  type DeprecationIssue,
  type SecurityIssue,
  type PeerMismatchIssue,
  type HealthIssue,
  type HealthReport,
  type IntegrationHealth,
  type PackageHealth,
  type HealthCheckTrigger,
  type HealthCheckOptions,
  type HealthFix,
  type HealthCheckResult,
  type TriggerContext,
  type DeprecatedPackage,
  // Core checker
  checkIntegrationHealth,
  isHealthy,
  formatHealthSummary,
  // Triggers
  onProjectLoad,
  onPreExport,
  onPreDeploy,
  onManualCheck,
  shouldBlock,
  getBlockMessage,
  createTriggerContext,
  // Deprecation registry
  DEPRECATED_PACKAGES,
  checkDeprecation,
  getDeprecations,
} from "./health";

// Audit Ledger System
export {
  // Types
  type LedgerEventType,
  type GovernanceSnapshot,
  type PackageRecord,
  type ConsentRecord,
  type DriftRecord,
  type FixRecord,
  type ExportContext,
  type LedgerEntry,
  type IntegrationLedger,
  type LedgerQueryOptions,
  type LedgerExport,
  type LedgerWriteResult,
  // Service
  createEmptyLedger,
  createEntry,
  appendEntry,
  queryEntries,
  getLatestEntry,
  getTrackedIntegrations,
  getEventCounts,
  exportLedger,
  verifyIntegrity,
  serializeLedger,
  parseLedger,
  recordInstallApproved,
  recordDriftDetected,
  recordFixApplied,
  recordExportApproved,
  recordExportBlocked,
  recordStrategistReview,
  recordAuditorReview,
  recordUserConsent,
  recordHealthCheck,
  // Hooks
  initializeLedger,
  getLedger,
  setSessionId,
  loadLedger,
  onInstallRequested,
  onStrategistReview,
  onAuditorReview,
  onUserConsent,
  onInstallCompleted,
  onInstallFailed,
  onHealthCheckComplete,
  onDriftDetected,
  onDeprecationDetected,
  onFixProposed,
  onFixApproved,
  onFixRejected,
  onFixApplied,
  onFixFailed,
  onExportRequested,
  onExportApproved,
  onExportBlocked,
  onDeployRequested,
  onDeployApproved,
  onDeployBlocked,
  // Export integration
  LEDGER_EXPORT_FILENAME,
  generateLedgerExportContent,
  generateComplianceSummary,
  generateComplianceReport,
  getComplianceFiles,
} from "./ledger";
