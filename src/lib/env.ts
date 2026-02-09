/**
 * TORBIT - Environment Variable Validation
 *
 * Validates required environment variables at import time.
 * Import this module early (e.g., in layout.tsx or API routes) to
 * fail fast when configuration is missing.
 */

import { z } from 'zod'

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const serverSchema = z.object({
  // AI providers – at least one should be set, but none are individually required
  ANTHROPIC_API_KEY: z.string().optional(),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  KIMI_API_KEY: z.string().optional(),

  // Supabase (server)
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  // E2B sandbox
  E2B_API_KEY: z.string().optional(),

  // Stripe
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // Shipping
  GITHUB_TOKEN: z.string().optional(),

  // Workers / cron
  TORBIT_WORKER_TOKEN: z.string().optional(),
  CRON_SECRET: z.string().optional(),

  // Monitoring
  SENTRY_DSN: z.string().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),
})

const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
})

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

export type ServerEnv = z.infer<typeof serverSchema>
export type ClientEnv = z.infer<typeof clientSchema>

/** Validate server-side env vars. Throws on invalid values (not missing optionals). */
export function validateServerEnv(): ServerEnv {
  const result = serverSchema.safeParse(process.env)
  if (!result.success) {
    const formatted = result.error.flatten().fieldErrors
    console.error('[env] Server environment validation failed:', formatted)
    throw new Error(`Invalid server environment variables: ${JSON.stringify(formatted)}`)
  }
  return result.data
}

/** Validate client-side (NEXT_PUBLIC_*) env vars. */
export function validateClientEnv(): ClientEnv {
  const result = clientSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  })
  if (!result.success) {
    const formatted = result.error.flatten().fieldErrors
    console.error('[env] Client environment validation failed:', formatted)
    throw new Error(`Invalid client environment variables: ${JSON.stringify(formatted)}`)
  }
  return result.data
}

/** Check that at least one AI provider key is configured. */
export function hasAnyAIProvider(): boolean {
  return !!(
    process.env.ANTHROPIC_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.OPENROUTER_API_KEY
  )
}
