/**
 * TORBIT Integration System - Core Types
 * 
 * An Integration is a first-class governed artifact, not a package install.
 * All packages must be pinned. All secrets must be injected, never written.
 */

export type IntegrationCategory = 
  | "payments" 
  | "auth" 
  | "maps" 
  | "analytics" 
  | "storage" 
  | "email"
  | "database";

export type IntegrationPlatform = "web" | "mobile";

export type SecretPolicy = "server-only" | "client-safe";

export interface IntegrationPermissions {
  /** Allowed network domains */
  network?: string[];
  /** Required secret keys (env var names) */
  secrets?: string[];
  /** Requires local storage access */
  storage?: boolean;
}

export interface IntegrationPackages {
  /** Frontend packages with pinned versions: { "package-name": "1.0.0" } */
  frontend?: Record<string, string>;
  /** Backend packages with pinned versions */
  backend?: Record<string, string>;
  /** Mobile packages with pinned versions */
  mobile?: Record<string, string>;
}

export interface IntegrationFiles {
  /** Frontend files to generate */
  frontend?: string[];
  /** Backend files to generate */
  backend?: string[];
  /** Mobile files to generate */
  mobile?: string[];
}

export interface IntegrationDocs {
  /** Setup steps shown to user */
  setupSteps: string[];
}

export interface IntegrationManifest {
  /** Unique integration ID (e.g., "stripe", "google-maps") */
  id: string;
  /** Display name */
  name: string;
  /** Category for governance routing */
  category: IntegrationCategory;
  /** Supported platforms */
  platforms: IntegrationPlatform[];
  /** Required permissions */
  permissions: IntegrationPermissions;
  /** Packages with PINNED versions - unpinned is a hard failure */
  packages: IntegrationPackages;
  /** Files to generate */
  files: IntegrationFiles;
  /** How secrets are handled */
  secretPolicy: SecretPolicy;
  /** Must user explicitly consent? */
  requiresUserConsent: boolean;
  /** Must Strategist review before execution? */
  requiresStrategistReview: boolean;
  /** Must Auditor review after execution? */
  requiresAuditorReview: boolean;
  /** Documentation for setup */
  docs: IntegrationDocs;
  /** Integration version (for future registry compatibility) */
  version: string;
}

// ============================================================================
// Execution Types
// ============================================================================

export type IntegrationStatus = 
  | "pending"
  | "awaiting-consent"
  | "awaiting-strategist"
  | "executing"
  | "awaiting-auditor"
  | "completed"
  | "failed"
  | "rejected";

export interface IntegrationPlan {
  integrationId: string;
  manifest: IntegrationManifest;
  targetPlatform: IntegrationPlatform;
  providedSecrets: string[];
  status: IntegrationStatus;
}

export type GovernanceVerdict = "APPROVED" | "NEEDS_REVISION" | "REJECTED";

export interface StrategistReview {
  verdict: GovernanceVerdict;
  reason?: string;
  timestamp: number;
}

export interface AuditorReview {
  verdict: "PASSED" | "FAILED" | "NEEDS_WORK";
  issues?: string[];
  timestamp: number;
}

export interface IntegrationResult {
  success: boolean;
  integrationId: string;
  installedPackages: string[];
  createdFiles: string[];
  strategistReview?: StrategistReview;
  auditorReview?: AuditorReview;
  error?: string;
}

// ============================================================================
// Validation Types
// ============================================================================

export interface ValidationError {
  code: "MANIFEST_MISSING" | "VERSION_NOT_PINNED" | "SECRET_MISSING" | "UNDECLARED_PACKAGE" | "PLATFORM_UNSUPPORTED";
  message: string;
  field?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

// ============================================================================
// Guards
// ============================================================================

const SEMVER_REGEX = /^\d+\.\d+\.\d+(-[\w.]+)?(\+[\w.]+)?$/;

export function isPinnedVersion(version: string): boolean {
  // Must be exact semver, no ranges, no "latest", no "^", no "~"
  return SEMVER_REGEX.test(version);
}

export function isValidManifest(manifest: unknown): manifest is IntegrationManifest {
  if (!manifest || typeof manifest !== "object") return false;
  const m = manifest as IntegrationManifest;
  
  return (
    typeof m.id === "string" &&
    typeof m.name === "string" &&
    typeof m.category === "string" &&
    Array.isArray(m.platforms) &&
    typeof m.version === "string" &&
    typeof m.secretPolicy === "string" &&
    typeof m.requiresUserConsent === "boolean" &&
    typeof m.requiresStrategistReview === "boolean" &&
    typeof m.requiresAuditorReview === "boolean"
  );
}

export function validatePackageVersions(packages: Record<string, string>): ValidationError[] {
  const errors: ValidationError[] = [];
  
  for (const [name, version] of Object.entries(packages)) {
    if (!isPinnedVersion(version)) {
      errors.push({
        code: "VERSION_NOT_PINNED",
        message: `Package "${name}" version "${version}" is not pinned. Use exact semver (e.g., "1.0.0").`,
        field: name,
      });
    }
  }
  
  return errors;
}
