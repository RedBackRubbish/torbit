/**
 * TORBIT — Environment Variable Contract
 *
 * Single source of truth for every environment variable the app touches.
 * Variables are categorised by the runtime that may access them:
 *
 *   • **public**  – NEXT_PUBLIC_* vars inlined into the client bundle.
 *   • **server**  – Node.js-only secrets (API keys, tokens, webhook secrets).
 *   • **edge**    – The minimal subset safe for the Edge Runtime (proxy.ts).
 *
 * Import this module at the top of your server/edge entrypoint.
 * It validates eagerly on first access and fails loudly with actionable
 * error messages when anything is missing or malformed.
 *
 * @example Server entrypoint (API route)
 * ```ts
 * import { serverEnv, publicEnv } from '@/lib/env.contract'
 *
 * const supabase = createClient(publicEnv.NEXT_PUBLIC_SUPABASE_URL, serverEnv.SUPABASE_SERVICE_ROLE_KEY)
 * ```
 *
 * @example Edge entrypoint (proxy.ts)
 * ```ts
 * import { edgeEnv } from '@/lib/env.contract'
 *
 * // edgeEnv.STRIPE_SECRET_KEY → throws at runtime
 * const url = edgeEnv.NEXT_PUBLIC_SUPABASE_URL // ✓ safe
 * ```
 *
 * @module env.contract
 */

import { z } from 'zod'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Coerces "true"/"false"/undefined env strings into booleans. */
const boolStr = z
  .enum(['true', 'false', '1', '0', ''])
  .optional()
  .transform((v) => v === 'true' || v === '1')

/** Positive-integer string (e.g. circuit-breaker thresholds, fuel amounts). */
const positiveInt = z
  .string()
  .regex(/^\d+$/, 'Must be a positive integer string')
  .transform(Number)

/**
 * Normalizes optional secret-like env vars:
 * - empty/whitespace => undefined
 * - common placeholder values => undefined
 */
function normalizeOptionalSecret(value: unknown): unknown {
  if (typeof value !== 'string') return value
  const trimmed = value.trim()
  if (!trimmed) return undefined

  const placeholderPatterns = [
    /^paste_/i,
    /^replace_/i,
    /^your_/i,
    /^example$/i,
    /^todo$/i,
    /^changeme$/i,
    /^<.+>$/i,
  ]

  if (placeholderPatterns.some((pattern) => pattern.test(trimmed))) {
    return undefined
  }

  return trimmed
}

function optionalPrefixed(prefix: string) {
  return z.preprocess(
    normalizeOptionalSecret,
    z.string().startsWith(prefix).optional()
  )
}

// ---------------------------------------------------------------------------
// 1. PUBLIC — Client-safe (NEXT_PUBLIC_*)
// ---------------------------------------------------------------------------

/**
 * Schema for environment variables exposed to the browser.
 * Every key MUST start with `NEXT_PUBLIC_` so Next.js inlines it at build time.
 */
export const publicSchema = z.object({
  // ---- Supabase (required in production) ----
  /** Supabase project URL — required for auth & data access. */
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Must be a valid Supabase project URL'),
  /** Supabase anonymous/public key — safe to expose. */
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key cannot be empty'),

  // ---- Stripe ----
  /** Stripe publishable key — safe to expose, powers <Elements>. */
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: optionalPrefixed('pk_'),

  // ---- E2B Sandbox ----
  /** E2B API key exposed client-side (browser → API route → E2B). */
  NEXT_PUBLIC_E2B_API_KEY: z.string().optional(),
  /** When "true", stubs E2B calls for local testing. */
  NEXT_PUBLIC_E2B_MOCK: boolStr,

  // ---- Monitoring ----
  /** Sentry DSN for client-side error reporting. */
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),

  // ---- Feature toggles (client-side) ----
  /** Bypass fuel-consumption gating in the UI. */
  NEXT_PUBLIC_FUEL_DISABLED: boolStr,
  /** Enable background-run queue hooks in the UI. */
  NEXT_PUBLIC_ENABLE_BACKGROUND_RUNS: boolStr,
  /** Enable real-time project presence indicators. */
  NEXT_PUBLIC_ENABLE_PROJECT_PRESENCE: boolStr,
  /** Allows synthetic E2E-test auth bypass (never enable in production). */
  NEXT_PUBLIC_E2E_AUTH: boolStr,
})

export type PublicEnv = z.infer<typeof publicSchema>

// ---------------------------------------------------------------------------
// 2. SERVER — Node.js runtime only (secrets, tokens, heavy config)
// ---------------------------------------------------------------------------

/**
 * Schema for server-only variables.
 * These MUST NEVER be prefixed with `NEXT_PUBLIC_` and are only available in
 * Node.js (API routes, server components, scripts). Accessing any of these
 * from the Edge Runtime will throw.
 */
export const serverSchema = z.object({
  // ---- AI Provider Keys (at least one required) ----
  /** Anthropic API key — powers Claude Opus / Sonnet agents. */
  ANTHROPIC_API_KEY: z.string().optional(),
  /** Google AI (Gemini) API key. */
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
  /** OpenAI API key — powers Codex models when enabled. */
  OPENAI_API_KEY: z.string().optional(),
  /** OpenRouter API key — used by Kimi fallback routing. */
  OPENROUTER_API_KEY: z.string().optional(),
  /** Moonshot/Kimi API key — powers the intelligent router. */
  KIMI_API_KEY: z.string().optional(),

  // ---- Supabase (server) ----
  /** Supabase service-role key — full admin access, keep secret! */
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  // ---- E2B Sandbox ----
  /** E2B server-side API key. */
  E2B_API_KEY: z.string().optional(),

  // ---- Stripe ----
  /** Stripe secret key — server-side only. */
  STRIPE_SECRET_KEY: optionalPrefixed('sk_'),
  /** Stripe webhook signing secret. */
  STRIPE_WEBHOOK_SECRET: optionalPrefixed('whsec_'),
  /** Stripe price IDs for subscription tiers and fuel packs. */
  STRIPE_PRICE_PRO_MONTHLY: optionalPrefixed('price_'),
  STRIPE_PRICE_TEAM_MONTHLY: optionalPrefixed('price_'),
  STRIPE_PRICE_FUEL_500: optionalPrefixed('price_'),
  STRIPE_PRICE_FUEL_2500: optionalPrefixed('price_'),
  STRIPE_PRICE_FUEL_10000: optionalPrefixed('price_'),

  // ---- Shipping providers ----
  /** GitHub PAT with repo permissions. */
  GITHUB_TOKEN: z.string().optional(),
  /** Vercel deployment token. */
  VERCEL_TOKEN: z.string().optional(),
  /** Netlify PAT. */
  NETLIFY_TOKEN: z.string().optional(),
  /** Expo access token for mobile CI builds. */
  EXPO_TOKEN: z.string().optional(),

  // ---- Workers / Cron ----
  /** Shared secret for background-run worker dispatch. */
  TORBIT_WORKER_TOKEN: z.string().optional(),
  /** Vercel cron secret (Authorization: Bearer header). */
  CRON_SECRET: z.string().optional(),

  // ---- Governance ----
  /** HMAC signing secret for audit bundles. */
  TORBIT_AUDIT_SIGNING_SECRET: z.string().optional(),
  /** Key ID included in signature metadata. */
  TORBIT_AUDIT_SIGNING_KEY_ID: z.string().optional(),

  // ---- Upstash Redis (rate limiting) ----
  /** Upstash REST API URL. */
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  /** Upstash REST API token. */
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),

  // ---- Monitoring ----
  /** Server-side Sentry DSN. */
  SENTRY_DSN: z.string().url().optional(),
  /** Sentry auth token for source-map uploads. */
  SENTRY_AUTH_TOKEN: z.string().optional(),

  // ---- Torbit model overrides (all optional, have in-code defaults) ----
  TORBIT_SUPERVISOR_MODEL: z.string().optional(),
  TORBIT_CONTEXT_COMPILER_MODEL: z.string().optional(),
  TORBIT_WORKER_MODEL: z.string().optional(),
  TORBIT_CRITICAL_MODEL: z.string().optional(),
  TORBIT_JANITOR_MODEL: z.string().optional(),
  TORBIT_ANTHROPIC_OPUS_MODEL: z.string().optional(),
  TORBIT_ANTHROPIC_SONNET_MODEL: z.string().optional(),
  TORBIT_CODEX_MODEL: z.string().optional(),
  TORBIT_CODEX_FAST_MODEL: z.string().optional(),

  // ---- Torbit feature flags (server-evaluated) ----
  TORBIT_VIBE_AUDIT: boolStr,
  TORBIT_DEPLOY_VIBE_BLOCK: boolStr,
  TORBIT_USE_CODEX_PRIMARY: boolStr,
  TORBIT_KIMI_ROUTER: boolStr,
  TORBIT_FAST_ROUTING: boolStr,
  TORBIT_AUTO_HEAL: boolStr,
  TORBIT_FUEL_ENABLED: boolStr,
  TORBIT_WORLD_CLASS_ORCHESTRATION: boolStr,

  // ---- Torbit tunables ----
  /** Default fuel allocation per session. */
  TORBIT_DEFAULT_FUEL: positiveInt.optional(),
  /** Circuit-breaker: consecutive failures before tripping. */
  TORBIT_CHAT_CB_FAILURE_THRESHOLD: positiveInt.optional(),
  /** Circuit-breaker: initial cooldown (ms). */
  TORBIT_CHAT_CB_COOLDOWN_MS: positiveInt.optional(),
  /** Circuit-breaker: maximum cooldown (ms). */
  TORBIT_CHAT_CB_MAX_COOLDOWN_MS: positiveInt.optional(),

  // ---- Data / Infrastructure ----
  /** Override persistence directory for checkpoints. */
  TORBIT_DATA_DIR: z.string().optional(),
})

export type ServerEnv = z.infer<typeof serverSchema>

// ---------------------------------------------------------------------------
// 3. EDGE — Minimal subset for the Edge Runtime (proxy.ts)
// ---------------------------------------------------------------------------

/**
 * Schema for variables available in the Edge Runtime.
 *
 * The Edge Runtime cannot use Node.js APIs and MUST NOT have access to
 * server-only secrets. This schema intentionally includes only the
 * public vars needed by Supabase middleware and basic platform detection.
 */
export const edgeSchema = z.object({
  /** Supabase URL — needed by the auth middleware in proxy.ts. */
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Must be a valid Supabase project URL'),
  /** Supabase anon key — needed by the auth middleware in proxy.ts. */
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  /** Standard Node environment indicator. */
  NODE_ENV: z.enum(['development', 'production', 'test']).optional(),
  /** Set automatically on Vercel deployments. */
  VERCEL: z.string().optional(),
})

export type EdgeEnv = z.infer<typeof edgeSchema>

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/** Names of every key in the server schema — used to build the edge guard. */
const SERVER_ONLY_KEYS = new Set(Object.keys(serverSchema.shape))

/**
 * Format Zod errors into a human-readable, CI-friendly string.
 * Each line shows the variable name and what's wrong with it.
 */
function formatErrors(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.join('.')
      return `  ✗ ${path}: ${issue.message}`
    })
    .join('\n')
}

/**
 * Validate public (client) environment variables.
 * @throws {EnvValidationError} when any variable is missing or malformed.
 */
export function validatePublicEnv(): PublicEnv {
  const result = publicSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_E2B_API_KEY: process.env.NEXT_PUBLIC_E2B_API_KEY,
    NEXT_PUBLIC_E2B_MOCK: process.env.NEXT_PUBLIC_E2B_MOCK,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
    NEXT_PUBLIC_FUEL_DISABLED: process.env.NEXT_PUBLIC_FUEL_DISABLED,
    NEXT_PUBLIC_ENABLE_BACKGROUND_RUNS: process.env.NEXT_PUBLIC_ENABLE_BACKGROUND_RUNS,
    NEXT_PUBLIC_ENABLE_PROJECT_PRESENCE: process.env.NEXT_PUBLIC_ENABLE_PROJECT_PRESENCE,
    NEXT_PUBLIC_E2E_AUTH: process.env.NEXT_PUBLIC_E2E_AUTH,
  })
  if (!result.success) {
    const msg = `[env.contract] Public env validation failed:\n${formatErrors(result.error)}`
    console.error(msg)
    throw new EnvValidationError('public', msg)
  }
  return result.data
}

/**
 * Validate server-only environment variables.
 * @throws {EnvValidationError} when any variable is malformed.
 */
export function validateServerEnv(): ServerEnv {
  const result = serverSchema.safeParse(process.env)
  if (!result.success) {
    const msg = `[env.contract] Server env validation failed:\n${formatErrors(result.error)}`
    console.error(msg)
    throw new EnvValidationError('server', msg)
  }
  return result.data
}

/**
 * Validate edge-safe environment variables.
 * @throws {EnvValidationError} when any variable is missing or malformed.
 */
export function validateEdgeEnv(): EdgeEnv {
  const result = edgeSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NODE_ENV: process.env.NODE_ENV,
    VERCEL: process.env.VERCEL,
  })
  if (!result.success) {
    const msg = `[env.contract] Edge env validation failed:\n${formatErrors(result.error)}`
    console.error(msg)
    throw new EnvValidationError('edge', msg)
  }
  return result.data
}

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------

/**
 * Typed error thrown when env validation fails.
 * Includes the runtime category so callers can distinguish which layer broke.
 */
export class EnvValidationError extends Error {
  constructor(
    public readonly runtime: 'public' | 'server' | 'edge',
    message: string
  ) {
    super(message)
    this.name = 'EnvValidationError'
  }
}

// ---------------------------------------------------------------------------
// Business-logic guards
// ---------------------------------------------------------------------------

/** Returns true when at least one AI provider API key is configured. */
export function hasAnyAIProvider(env?: ServerEnv): boolean {
  const e = env ?? validateServerEnv()
  return !!(
    e.ANTHROPIC_API_KEY ||
    e.GOOGLE_GENERATIVE_AI_API_KEY ||
    e.OPENAI_API_KEY ||
    e.OPENROUTER_API_KEY ||
    e.KIMI_API_KEY
  )
}

/** Returns true when Upstash Redis is configured for distributed rate limiting. */
export function hasUpstash(env?: ServerEnv): boolean {
  const e = env ?? validateServerEnv()
  return !!(e.UPSTASH_REDIS_REST_URL && e.UPSTASH_REDIS_REST_TOKEN)
}

// ---------------------------------------------------------------------------
// Edge-safe proxy
// ---------------------------------------------------------------------------

/**
 * Creates a Proxy around validated edge env that throws immediately if
 * code running in the Edge Runtime attempts to read a server-only secret.
 *
 * This is a defence-in-depth measure — the Edge Runtime won't have the
 * values anyway, but the proxy surfaces the mistake as a clear error
 * during development rather than a silent `undefined`.
 */
export function createEdgeSafeProxy(validated: EdgeEnv): EdgeEnv & Record<string, never> {
  return new Proxy(validated as EdgeEnv & Record<string, never>, {
    get(target, prop: string) {
      if (SERVER_ONLY_KEYS.has(prop)) {
        throw new Error(
          `[env.contract] Attempted to access server-only variable "${prop}" from the Edge Runtime. ` +
            `Move this logic to a Node.js API route or server component.`
        )
      }
      return Reflect.get(target, prop)
    },
  })
}

// ---------------------------------------------------------------------------
// Boot-time assertion
// ---------------------------------------------------------------------------

/**
 * Validate the full environment for a given runtime and fail loudly.
 *
 * Call this once at the top of your entrypoint:
 * - `assertEnvContract('server')` in API routes / server components
 * - `assertEnvContract('edge')` in proxy.ts
 *
 * In test mode (`NODE_ENV=test`) the assertion is skipped so unit tests
 * don't need every variable stubbed.
 *
 * @throws {EnvValidationError} with human-readable details on failure.
 */
export function assertEnvContract(runtime: 'server' | 'edge'): void {
  if (process.env.NODE_ENV === 'test') return

  if (runtime === 'edge') {
    validateEdgeEnv()
    return
  }

  // Full server boot: validate all three layers + business rules
  const pub = validatePublicEnv()
  const srv = validateServerEnv()
  validateEdgeEnv()

  if (!pub.NEXT_PUBLIC_SUPABASE_URL || !pub.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new EnvValidationError(
      'public',
      '[env.contract] Missing required Supabase config: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required.'
    )
  }

  if (!hasAnyAIProvider(srv)) {
    throw new EnvValidationError(
      'server',
      '[env.contract] No AI provider configured. Set at least one of: ' +
        'ANTHROPIC_API_KEY, OPENAI_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY, OPENROUTER_API_KEY, or KIMI_API_KEY.'
    )
  }
}

// ---------------------------------------------------------------------------
// Lazy singletons — validated once on first access
// ---------------------------------------------------------------------------

let _public: PublicEnv | null = null
let _server: ServerEnv | null = null
let _edge: (EdgeEnv & Record<string, never>) | null = null

/**
 * Validated public env singleton.
 * Safe to import in any runtime (values are inlined by Next.js at build time).
 */
export const publicEnv: PublicEnv = new Proxy({} as PublicEnv, {
  get(_, prop: string) {
    if (!_public) _public = validatePublicEnv()
    return Reflect.get(_public, prop)
  },
})

/**
 * Validated server env singleton.
 * Import ONLY in Node.js API routes and server components.
 */
export const serverEnv: ServerEnv = new Proxy({} as ServerEnv, {
  get(_, prop: string) {
    if (!_server) _server = validateServerEnv()
    return Reflect.get(_server, prop)
  },
})

/**
 * Validated edge env singleton with server-secret guard.
 * Import in proxy.ts and other Edge Runtime code.
 * Accessing a server-only key through this object throws immediately.
 */
export const edgeEnv: EdgeEnv = new Proxy({} as EdgeEnv, {
  get(_, prop: string) {
    if (!_edge) _edge = createEdgeSafeProxy(validateEdgeEnv())
    return Reflect.get(_edge, prop)
  },
})

// ---------------------------------------------------------------------------
// Reset (testing only)
// ---------------------------------------------------------------------------

/**
 * Clear cached singletons so the next access re-validates.
 * Exported for unit tests — never call in production code.
 */
export function _resetForTesting(): void {
  _public = null
  _server = null
  _edge = null
}
