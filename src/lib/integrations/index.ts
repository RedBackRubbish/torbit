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

// Manifests
export { stripeManifest } from "./stripe/manifest";
export { googleMapsManifest } from "./google-maps/manifest";
export { clerkManifest } from "./clerk/manifest";
export { supabaseManifest } from "./supabase/manifest";
