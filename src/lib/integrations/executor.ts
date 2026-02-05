/**
 * TORBIT Integration Executor
 * 
 * Governs the entire integration lifecycle:
 * 1. Plan → 2. Strategist Review → 3. User Consent → 4. Execute → 5. Auditor Review
 * 
 * All governance rules are enforced. Violations abort execution.
 */

import type {
  IntegrationManifest,
  IntegrationPlan,
  IntegrationResult,
  IntegrationPlatform,
  StrategistReview,
  AuditorReview,
  GovernanceVerdict,
  ValidationError,
} from "./types";
import {
  getIntegration,
  integrationExists,
  validateManifest,
  validateSecrets,
  getAllowedPackages,
} from "./registry";

// ============================================================================
// Governance Categories Requiring Strategist
// ============================================================================

const STRATEGIST_REQUIRED_CATEGORIES = new Set([
  "payments",
  "auth",
  "maps",
  "analytics",
]);

// ============================================================================
// Plan Creation
// ============================================================================

export interface CreatePlanOptions {
  integrationId: string;
  platform: IntegrationPlatform;
  providedSecrets?: string[];
}

export interface PlanResult {
  success: boolean;
  plan?: IntegrationPlan;
  error?: string;
  validationErrors?: ValidationError[];
}

/**
 * Create an integration plan.
 * This validates the manifest and checks all prerequisites.
 */
export function createIntegrationPlan(options: CreatePlanOptions): PlanResult {
  const { integrationId, platform, providedSecrets = [] } = options;

  // Check integration exists
  if (!integrationExists(integrationId)) {
    return {
      success: false,
      error: `Integration "${integrationId}" does not exist. Only verified integrations can be installed.`,
    };
  }

  const manifest = getIntegration(integrationId)!;

  // Check platform support
  if (!manifest.platforms.includes(platform)) {
    return {
      success: false,
      error: `Integration "${manifest.name}" does not support platform "${platform}".`,
      validationErrors: [{
        code: "PLATFORM_UNSUPPORTED",
        message: `Platform "${platform}" is not supported by this integration.`,
      }],
    };
  }

  // Validate manifest structure and pinned versions
  const manifestValidation = validateManifest(manifest);
  if (!manifestValidation.valid) {
    return {
      success: false,
      error: "Integration manifest has invalid package versions.",
      validationErrors: manifestValidation.errors,
    };
  }

  // Validate secrets
  const secretsValidation = validateSecrets(manifest, providedSecrets);
  if (!secretsValidation.valid) {
    return {
      success: false,
      error: "Required secrets are missing.",
      validationErrors: secretsValidation.errors,
    };
  }

  // Create plan
  const plan: IntegrationPlan = {
    integrationId,
    manifest,
    targetPlatform: platform,
    providedSecrets,
    status: "pending",
  };

  return { success: true, plan };
}

// ============================================================================
// Governance Checks
// ============================================================================

/**
 * Check if Strategist review is required for this integration.
 */
export function requiresStrategistReview(plan: IntegrationPlan): boolean {
  const { manifest } = plan;
  
  // Explicit flag takes precedence
  if (manifest.requiresStrategistReview) return true;
  
  // Category-based requirement
  return STRATEGIST_REQUIRED_CATEGORIES.has(manifest.category);
}

/**
 * Check if Auditor review is required for this integration.
 */
export function requiresAuditorReview(plan: IntegrationPlan): boolean {
  return plan.manifest.requiresAuditorReview;
}

/**
 * Check if user consent is required.
 */
export function requiresUserConsent(plan: IntegrationPlan): boolean {
  return plan.manifest.requiresUserConsent;
}

// ============================================================================
// Execution
// ============================================================================

export interface ExecuteOptions {
  plan: IntegrationPlan;
  strategistReview?: StrategistReview;
  userConsented: boolean;
  /** Callback to install a package - must validate against manifest */
  installPackage: (name: string, version: string) => Promise<void>;
  /** Callback to create a file */
  createFile: (path: string, content: string) => Promise<void>;
  /** Callback to inject a secret into secure environment */
  injectSecureEnv: (key: string, value: string) => Promise<void>;
}

export interface ExecuteResult {
  success: boolean;
  installedPackages: string[];
  createdFiles: string[];
  error?: string;
}

/**
 * Execute an integration plan.
 * 
 * This function enforces all governance rules:
 * - Strategist must approve if required
 * - User must consent
 * - Only manifest-declared packages may be installed
 * - Secrets are never written to files
 */
export async function executeIntegrationPlan(options: ExecuteOptions): Promise<ExecuteResult> {
  const { plan, strategistReview, userConsented, installPackage, createFile } = options;
  const { manifest, targetPlatform } = plan;

  const installedPackages: string[] = [];
  const createdFiles: string[] = [];

  // ========== GOVERNANCE GATE: Strategist ==========
  if (requiresStrategistReview(plan)) {
    if (!strategistReview) {
      return {
        success: false,
        installedPackages: [],
        createdFiles: [],
        error: "Strategist review is required but not provided.",
      };
    }

    if (strategistReview.verdict !== "APPROVED") {
      return {
        success: false,
        installedPackages: [],
        createdFiles: [],
        error: `Strategist review: ${strategistReview.verdict}. ${strategistReview.reason ?? ""}`,
      };
    }
  }

  // ========== GOVERNANCE GATE: User Consent ==========
  if (requiresUserConsent(plan) && !userConsented) {
    return {
      success: false,
      installedPackages: [],
      createdFiles: [],
      error: "User consent is required but not provided.",
    };
  }

  // ========== INSTALL PACKAGES ==========
  const targetKey = targetPlatform === "mobile" ? "mobile" : "frontend";
  const frontendPackages = getAllowedPackages(manifest, "frontend");
  const backendPackages = getAllowedPackages(manifest, "backend");
  const mobilePackages = targetPlatform === "mobile" ? getAllowedPackages(manifest, "mobile") : {};

  // Install frontend packages (or mobile if mobile platform)
  const clientPackages = targetPlatform === "mobile" ? mobilePackages : frontendPackages;
  for (const [name, version] of Object.entries(clientPackages)) {
    await installPackage(name, version);
    installedPackages.push(`${name}@${version}`);
  }

  // Install backend packages (web only)
  if (targetPlatform === "web") {
    for (const [name, version] of Object.entries(backendPackages)) {
      // Skip duplicates
      if (!clientPackages[name]) {
        await installPackage(name, version);
        installedPackages.push(`${name}@${version}`);
      }
    }
  }

  // ========== CREATE FILES ==========
  const filesToCreate = targetPlatform === "mobile" 
    ? manifest.files.mobile ?? []
    : [...(manifest.files.frontend ?? []), ...(manifest.files.backend ?? [])];

  for (const filePath of filesToCreate) {
    // Generate file content based on integration
    const content = generateFileContent(manifest.id, filePath);
    await createFile(filePath, content);
    createdFiles.push(filePath);
  }

  return {
    success: true,
    installedPackages,
    createdFiles,
  };
}

// ============================================================================
// File Content Generation
// ============================================================================

/**
 * Generate boilerplate file content for an integration.
 * This is a simplified version - in production, these would be more complete.
 */
function generateFileContent(integrationId: string, filePath: string): string {
  // This would be expanded with actual templates
  const templates: Record<string, Record<string, string>> = {
    stripe: {
      "src/lib/stripe/client.ts": `/**
 * Stripe Client Configuration
 * Generated by TORBIT Integration System
 */

import { loadStripe } from "@stripe/stripe-js";

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

if (!publishableKey) {
  throw new Error("Stripe publishable key is not configured");
}

export const stripePromise = loadStripe(publishableKey);
`,
      "src/lib/stripe/server.ts": `/**
 * Stripe Server Configuration
 * Generated by TORBIT Integration System
 * 
 * SECURITY: This file runs server-side only.
 * The secret key is never exposed to the client.
 */

import Stripe from "stripe";

const secretKey = process.env.STRIPE_SECRET_KEY;

if (!secretKey) {
  throw new Error("Stripe secret key is not configured");
}

export const stripe = new Stripe(secretKey, {
  apiVersion: "2023-10-16",
  typescript: true,
});
`,
    },
    "google-maps": {
      "src/lib/maps/google.ts": `/**
 * Google Maps Configuration
 * Generated by TORBIT Integration System
 */

import { Loader } from "@googlemaps/js-api-loader";

const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

if (!apiKey) {
  throw new Error("Google Maps API key is not configured");
}

export const mapsLoader = new Loader({
  apiKey,
  version: "weekly",
  libraries: ["places", "geometry"],
});
`,
    },
    clerk: {
      "src/lib/auth/clerk.ts": `/**
 * Clerk Authentication Configuration
 * Generated by TORBIT Integration System
 */

export { auth, currentUser } from "@clerk/nextjs/server";

export function getAuthSession() {
  return auth();
}
`,
    },
    supabase: {
      "src/lib/supabase/client.ts": `/**
 * Supabase Client Configuration
 * Generated by TORBIT Integration System
 */

import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase configuration is missing");
}

export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
`,
      "src/lib/supabase/server.ts": `/**
 * Supabase Server Configuration
 * Generated by TORBIT Integration System
 * 
 * SECURITY: This file runs server-side only.
 */

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function createServerSupabase() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      },
    },
  });
}
`,
    },
  };

  const integrationTemplates = templates[integrationId];
  if (integrationTemplates && integrationTemplates[filePath]) {
    return integrationTemplates[filePath];
  }

  // Default placeholder for files without templates
  return `/**
 * ${filePath}
 * Generated by TORBIT Integration System
 * Integration: ${integrationId}
 * 
 * TODO: Implement this file
 */

export {};
`;
}

// ============================================================================
// Auditor Verification
// ============================================================================

export interface AuditOptions {
  plan: IntegrationPlan;
  installedPackages: string[];
  createdFiles: string[];
  /** Check if a secret was written to any file */
  checkSecretLeakage: () => Promise<boolean>;
}

/**
 * Run auditor verification on an executed integration.
 * Returns a structured verdict.
 */
export async function auditIntegration(options: AuditOptions): Promise<AuditorReview> {
  const { plan, installedPackages, createdFiles, checkSecretLeakage } = options;
  const { manifest } = plan;
  const issues: string[] = [];

  // Check for secret leakage
  const hasSecretLeak = await checkSecretLeakage();
  if (hasSecretLeak) {
    issues.push("Secret leakage detected in generated files.");
  }

  // Check for undeclared packages
  const allowedPackages = new Set<string>();
  for (const [name, version] of Object.entries(manifest.packages.frontend ?? {})) {
    allowedPackages.add(`${name}@${version}`);
  }
  for (const [name, version] of Object.entries(manifest.packages.backend ?? {})) {
    allowedPackages.add(`${name}@${version}`);
  }
  for (const [name, version] of Object.entries(manifest.packages.mobile ?? {})) {
    allowedPackages.add(`${name}@${version}`);
  }

  for (const pkg of installedPackages) {
    if (!allowedPackages.has(pkg)) {
      issues.push(`Undeclared package installed: ${pkg}`);
    }
  }

  // Check for undeclared files
  const allowedFiles = new Set<string>([
    ...(manifest.files.frontend ?? []),
    ...(manifest.files.backend ?? []),
    ...(manifest.files.mobile ?? []),
  ]);

  for (const file of createdFiles) {
    if (!allowedFiles.has(file)) {
      issues.push(`Undeclared file created: ${file}`);
    }
  }

  if (issues.length > 0) {
    return {
      verdict: "FAILED",
      issues,
      timestamp: Date.now(),
    };
  }

  return {
    verdict: "PASSED",
    timestamp: Date.now(),
  };
}

// ============================================================================
// Full Integration Flow
// ============================================================================

export interface IntegrationFlowOptions {
  integrationId: string;
  platform: IntegrationPlatform;
  providedSecrets: string[];
  secretValues: Record<string, string>;
  
  /** Get Strategist review (called if required) */
  getStrategistReview: (plan: IntegrationPlan) => Promise<StrategistReview>;
  /** Get user consent (called if required) */
  getUserConsent: (plan: IntegrationPlan) => Promise<boolean>;
  /** Install a package */
  installPackage: (name: string, version: string) => Promise<void>;
  /** Create a file */
  createFile: (path: string, content: string) => Promise<void>;
  /** Inject secret into secure environment */
  injectSecureEnv: (key: string, value: string) => Promise<void>;
  /** Check for secret leakage */
  checkSecretLeakage: () => Promise<boolean>;
}

/**
 * Execute the full integration flow with all governance gates.
 */
export async function runIntegrationFlow(options: IntegrationFlowOptions): Promise<IntegrationResult> {
  const {
    integrationId,
    platform,
    providedSecrets,
    secretValues,
    getStrategistReview,
    getUserConsent,
    installPackage,
    createFile,
    injectSecureEnv,
    checkSecretLeakage,
  } = options;

  // Step 1: Create plan
  const planResult = createIntegrationPlan({
    integrationId,
    platform,
    providedSecrets,
  });

  if (!planResult.success || !planResult.plan) {
    return {
      success: false,
      integrationId,
      installedPackages: [],
      createdFiles: [],
      error: planResult.error,
    };
  }

  const plan = planResult.plan;

  // Step 2: Strategist review (if required)
  let strategistReview: StrategistReview | undefined;
  if (requiresStrategistReview(plan)) {
    strategistReview = await getStrategistReview(plan);
    if (strategistReview.verdict !== "APPROVED") {
      return {
        success: false,
        integrationId,
        installedPackages: [],
        createdFiles: [],
        strategistReview,
        error: `Integration rejected by governance review: ${strategistReview.verdict}`,
      };
    }
  }

  // Step 3: User consent (if required)
  let userConsented = true;
  if (requiresUserConsent(plan)) {
    userConsented = await getUserConsent(plan);
    if (!userConsented) {
      return {
        success: false,
        integrationId,
        installedPackages: [],
        createdFiles: [],
        strategistReview,
        error: "User declined integration.",
      };
    }
  }

  // Step 4: Inject secrets
  for (const secretKey of providedSecrets) {
    const value = secretValues[secretKey];
    if (value) {
      await injectSecureEnv(secretKey, value);
    }
  }

  // Step 5: Execute
  const executeResult = await executeIntegrationPlan({
    plan,
    strategistReview,
    userConsented,
    installPackage,
    createFile,
    injectSecureEnv,
  });

  if (!executeResult.success) {
    return {
      success: false,
      integrationId,
      installedPackages: executeResult.installedPackages,
      createdFiles: executeResult.createdFiles,
      strategistReview,
      error: executeResult.error,
    };
  }

  // Step 6: Auditor review (if required)
  let auditorReview: AuditorReview | undefined;
  if (requiresAuditorReview(plan)) {
    auditorReview = await auditIntegration({
      plan,
      installedPackages: executeResult.installedPackages,
      createdFiles: executeResult.createdFiles,
      checkSecretLeakage,
    });

    if (auditorReview.verdict === "FAILED") {
      return {
        success: false,
        integrationId,
        installedPackages: executeResult.installedPackages,
        createdFiles: executeResult.createdFiles,
        strategistReview,
        auditorReview,
        error: `Integration failed audit: ${auditorReview.issues?.join(", ")}`,
      };
    }
  }

  return {
    success: true,
    integrationId,
    installedPackages: executeResult.installedPackages,
    createdFiles: executeResult.createdFiles,
    strategistReview,
    auditorReview,
  };
}
