/**
 * TORBIT Integration Executor
 * 
 * Governs the entire integration lifecycle:
 * 1. Plan → 2. Strategist Review → 3. User Consent → 4. Execute → 5. Auditor Review
 * 
 * All governance rules are enforced. Violations abort execution.
 */

import type {
  IntegrationPlan,
  IntegrationResult,
  IntegrationPlatform,
  StrategistReview,
  AuditorReview,
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
  createdFileContents: Record<string, string>;
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
  const createdFileContents: Record<string, string> = {};

  // ========== GOVERNANCE GATE: Strategist ==========
  if (requiresStrategistReview(plan)) {
    if (!strategistReview) {
      return {
        success: false,
        installedPackages: [],
        createdFiles: [],
        createdFileContents: {},
        error: "Strategist review is required but not provided.",
      };
    }

    if (strategistReview.verdict !== "APPROVED") {
      return {
        success: false,
        installedPackages: [],
        createdFiles: [],
        createdFileContents: {},
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
      createdFileContents: {},
      error: "User consent is required but not provided.",
    };
  }

  // ========== INSTALL PACKAGES ==========
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
    if (isPlaceholderIntegrationTemplate(content)) {
      return {
        success: false,
        installedPackages,
        createdFiles,
        createdFileContents,
        error: `Integration "${manifest.id}" is missing a production template for "${filePath}".`,
      };
    }
    await createFile(filePath, content);
    createdFiles.push(filePath);
    createdFileContents[filePath] = content;
  }

  return {
    success: true,
    installedPackages,
    createdFiles,
    createdFileContents,
  };
}

// ============================================================================
// File Content Generation
// ============================================================================

/**
 * Generate boilerplate file content for an integration.
 * This is a simplified version - in production, these would be more complete.
 */
function isPlaceholderIntegrationTemplate(content: string): boolean {
  return (
    content.includes("Generated by TORBIT Integration System") &&
    /TODO:\s*Implement this file/i.test(content)
  );
}

export const PRODUCTION_INTEGRATION_TEMPLATES: Record<string, Record<string, string>> = {
  stripe: {
    "src/lib/stripe/client.ts": `/**
 * Stripe Client Configuration
 * Generated by TORBIT Integration System
 */

import { loadStripe } from "@stripe/stripe-js";
const PUBLIC_STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

if (!PUBLIC_STRIPE_PUBLISHABLE_KEY) {
  throw new Error("Stripe publishable key is not configured");
}

export const stripePromise = loadStripe(PUBLIC_STRIPE_PUBLISHABLE_KEY);
`,
    "src/lib/stripe/server.ts": `/**
 * Stripe Server Configuration
 * Generated by TORBIT Integration System
 *
 * SECURITY: This file runs server-side only.
 * The secret key is never exposed to the client.
 */

import Stripe from "stripe";
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!STRIPE_SECRET_KEY) {
  throw new Error("Stripe secret key is not configured");
}

export const stripe = new Stripe(STRIPE_SECRET_KEY, {
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
const PUBLIC_GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

if (!PUBLIC_GOOGLE_MAPS_API_KEY) {
  throw new Error("Google Maps API key is not configured");
}

export const mapsLoader = new Loader({
  apiKey: PUBLIC_GOOGLE_MAPS_API_KEY,
  version: "weekly",
  libraries: ["places", "geometry"],
});
`,
  },
  clerk: {
    "src/lib/auth/clerk.ts": `/**
 * Clerk Authentication Configuration
 * Generated by TORBIT Integration System
 *
 * Note: Use Clerk's Next.js SDK for full integration.
 */

import Clerk from "@clerk/clerk-js";
const PUBLIC_CLERK_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

let clerkInstance: Clerk | null = null;

export async function getClerk(): Promise<Clerk> {
  if (!clerkInstance) {
    clerkInstance = new Clerk(PUBLIC_CLERK_PUBLISHABLE_KEY);
    await clerkInstance.load();
  }
  return clerkInstance;
}
`,
  },
  supabase: {
    "src/lib/supabase/client.ts": `/**
 * Supabase Client Configuration
 * Generated by TORBIT Integration System
 */

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
const PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!PUBLIC_SUPABASE_URL || !PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error("Supabase configuration is missing");
}

export function createClient() {
  return createSupabaseClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);
}
`,
    "src/lib/supabase/server.ts": `/**
 * Supabase Server Configuration
 * Generated by TORBIT Integration System
 *
 * SECURITY: This file runs server-side only.
 * Use in server-only API routes or server components.
 */

import { createClient } from "@supabase/supabase-js";
const PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!PUBLIC_SUPABASE_URL || !PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error("Supabase configuration is missing");
}

export function createServerClient() {
  return createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);
}
`,
  },
}

function toPascalCase(value: string): string {
  return value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('')
}

function getManifestFiles(integrationId: string): Set<string> {
  const manifest = getIntegration(integrationId)
  if (!manifest) return new Set()

  return new Set([
    ...(manifest.files.frontend ?? []),
    ...(manifest.files.backend ?? []),
    ...(manifest.files.mobile ?? []),
  ])
}

function generateManifestFallbackTemplate(integrationId: string, filePath: string): string {
  const manifest = getIntegration(integrationId)
  const integrationName = manifest?.name || integrationId
  const baseName = filePath.split('/').pop() || 'module'
  const stem = baseName.replace(/\.(tsx|ts|jsx|js)$/, '')
  const componentName = toPascalCase(stem || integrationId)
  const humanPath = filePath.replace(/^src\//, '')

  if (filePath === 'src/middleware.ts') {
    return `/**
 * ${integrationName} middleware scaffold
 * Generated by TORBIT Integration System
 */

import { NextResponse, type NextRequest } from "next/server";

export function middleware(_request: NextRequest) {
  return NextResponse.next();
}
`
  }

  if (filePath.endsWith('/route.ts') || filePath.endsWith('/route.tsx')) {
    return `/**
 * ${integrationName} API route scaffold
 * Generated by TORBIT Integration System
 */

export async function GET() {
  return Response.json({
    integration: "${integrationId}",
    file: "${humanPath}",
    status: "ok",
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  return Response.json({
    integration: "${integrationId}",
    file: "${humanPath}",
    received: Boolean(body),
  });
}
`
  }

  if (filePath.endsWith('/page.tsx') || filePath.endsWith('/page.jsx')) {
    return `/**
 * ${integrationName} page scaffold
 * Generated by TORBIT Integration System
 */

export default function ${componentName}Page() {
  return (
    <main className="min-h-screen p-6 bg-black text-white">
      <section className="max-w-2xl mx-auto space-y-3">
        <h1 className="text-2xl font-semibold">${integrationName}</h1>
        <p className="text-sm text-white/70">
          This route was scaffolded for ${integrationId} at ${humanPath}.
        </p>
      </section>
    </main>
  );
}
`
  }

  if (/\.(tsx|jsx)$/.test(filePath)) {
    return `/**
 * ${integrationName} component scaffold
 * Generated by TORBIT Integration System
 */

export interface ${componentName}Props {
  className?: string;
}

export function ${componentName}(props: ${componentName}Props) {
  return (
    <section className={props.className}>
      <p>${integrationName} component scaffold (${humanPath})</p>
    </section>
  );
}

export default ${componentName};
`
  }

  return `/**
 * ${integrationName} module scaffold
 * Generated by TORBIT Integration System
 */

export const INTEGRATION_ID = "${integrationId}";
export const INTEGRATION_FILE = "${humanPath}";

export function get${componentName}Config() {
  return {
    integrationId: INTEGRATION_ID,
    file: INTEGRATION_FILE,
  };
}
`
}

function generateFileContent(integrationId: string, filePath: string): string {
  const integrationTemplates = PRODUCTION_INTEGRATION_TEMPLATES[integrationId];
  if (integrationTemplates && integrationTemplates[filePath]) {
    return integrationTemplates[filePath];
  }

  const manifestFiles = getManifestFiles(integrationId)
  if (manifestFiles.has(filePath)) {
    return generateManifestFallbackTemplate(integrationId, filePath)
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
  createdFileContents?: Record<string, string>;
  /** Check if a secret was written to any file */
  checkSecretLeakage: () => Promise<boolean>;
}

/**
 * Run auditor verification on an executed integration.
 * Returns a structured verdict.
 */
export async function auditIntegration(options: AuditOptions): Promise<AuditorReview> {
  const { plan, installedPackages, createdFiles, createdFileContents = {}, checkSecretLeakage } = options;
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

  for (const [filePath, content] of Object.entries(createdFileContents)) {
    if (isPlaceholderIntegrationTemplate(content)) {
      issues.push(`Placeholder template generated: ${filePath}`);
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
      createdFileContents: executeResult.createdFileContents,
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
