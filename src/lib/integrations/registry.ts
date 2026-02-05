/**
 * TORBIT Integration Registry
 * 
 * Local registry for integration manifests.
 * Future: This will be replaced with a remote signed registry.
 * 
 * If a manifest does not exist here, the integration does not exist.
 */

import type { IntegrationManifest, IntegrationCategory, IntegrationPlatform, ValidationResult, ValidationError } from "./types";
import { validatePackageVersions, isValidManifest } from "./types";

import { stripeManifest } from "./stripe/manifest";
import { googleMapsManifest } from "./google-maps/manifest";
import { clerkManifest } from "./clerk/manifest";
import { supabaseManifest } from "./supabase/manifest";

// ============================================================================
// Registry
// ============================================================================

const INTEGRATION_REGISTRY: Map<string, IntegrationManifest> = new Map([
  ["stripe", stripeManifest],
  ["google-maps", googleMapsManifest],
  ["clerk", clerkManifest],
  ["supabase", supabaseManifest],
]);

// ============================================================================
// Registry API
// ============================================================================

/**
 * Get an integration manifest by ID.
 * Returns undefined if the integration does not exist.
 */
export function getIntegration(id: string): IntegrationManifest | undefined {
  return INTEGRATION_REGISTRY.get(id);
}

/**
 * Check if an integration exists in the registry.
 */
export function integrationExists(id: string): boolean {
  return INTEGRATION_REGISTRY.has(id);
}

/**
 * Get all available integrations.
 */
export function getAllIntegrations(): IntegrationManifest[] {
  return Array.from(INTEGRATION_REGISTRY.values());
}

/**
 * Get integrations by category.
 */
export function getIntegrationsByCategory(category: IntegrationCategory): IntegrationManifest[] {
  return getAllIntegrations().filter(m => m.category === category);
}

/**
 * Get integrations by platform.
 */
export function getIntegrationsByPlatform(platform: IntegrationPlatform): IntegrationManifest[] {
  return getAllIntegrations().filter(m => m.platforms.includes(platform));
}

/**
 * Search integrations by name or ID.
 */
export function searchIntegrations(query: string): IntegrationManifest[] {
  const q = query.toLowerCase();
  return getAllIntegrations().filter(
    m => m.id.includes(q) || m.name.toLowerCase().includes(q)
  );
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate a manifest for completeness and pinned versions.
 * This is called at runtime before any integration is executed.
 */
export function validateManifest(manifest: IntegrationManifest): ValidationResult {
  const errors: ValidationError[] = [];

  // Check basic structure
  if (!isValidManifest(manifest)) {
    errors.push({
      code: "MANIFEST_MISSING",
      message: "Invalid manifest structure",
    });
    return { valid: false, errors };
  }

  // Check all package versions are pinned
  if (manifest.packages.frontend) {
    errors.push(...validatePackageVersions(manifest.packages.frontend));
  }
  if (manifest.packages.backend) {
    errors.push(...validatePackageVersions(manifest.packages.backend));
  }
  if (manifest.packages.mobile) {
    errors.push(...validatePackageVersions(manifest.packages.mobile));
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if required secrets are provided.
 */
export function validateSecrets(
  manifest: IntegrationManifest,
  providedSecrets: string[]
): ValidationResult {
  const errors: ValidationError[] = [];
  const required = manifest.permissions.secrets ?? [];

  for (const secret of required) {
    if (!providedSecrets.includes(secret)) {
      errors.push({
        code: "SECRET_MISSING",
        message: `Required secret "${secret}" is not provided`,
        field: secret,
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if a package is allowed by the manifest.
 */
export function isPackageAllowed(
  manifest: IntegrationManifest,
  packageName: string,
  version: string,
  target: "frontend" | "backend" | "mobile"
): boolean {
  const packages = manifest.packages[target];
  if (!packages) return false;

  const allowedVersion = packages[packageName];
  if (!allowedVersion) return false;

  // Must match exactly
  return allowedVersion === version;
}

/**
 * Get all allowed packages for a manifest and target.
 */
export function getAllowedPackages(
  manifest: IntegrationManifest,
  target: "frontend" | "backend" | "mobile"
): Record<string, string> {
  return manifest.packages[target] ?? {};
}
