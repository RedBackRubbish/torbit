#!/usr/bin/env npx tsx
/**
 * Pre-flight environment validation.
 *
 * Run before `next dev` or `next build` to surface missing/invalid
 * env vars immediately instead of at runtime.
 *
 * Usage:  npx tsx scripts/validate-env.ts
 */

import { z } from 'zod'

const serverSchema = z.object({
  ANTHROPIC_API_KEY: z.string().optional(),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),
  KIMI_API_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  E2B_API_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
})

const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
})

function main() {
  const isCI = !!process.env.CI || !!process.env.VERCEL
  const warnings: string[] = []
  let fatal = false

  // Server env (format validation only — all optional)
  const serverResult = serverSchema.safeParse(process.env)
  if (!serverResult.success) {
    console.error('\x1b[31m✗ Server env validation failed:\x1b[0m')
    for (const [key, errs] of Object.entries(serverResult.error.flatten().fieldErrors)) {
      console.error(`  ${key}: ${(errs as string[]).join(', ')}`)
    }
    fatal = true
  }

  // Client env (required for app to boot)
  const clientResult = clientSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  })
  if (!clientResult.success) {
    console.error('\x1b[31m✗ Client env validation failed:\x1b[0m')
    for (const [key, errs] of Object.entries(clientResult.error.flatten().fieldErrors)) {
      console.error(`  ${key}: ${(errs as string[]).join(', ')}`)
    }
    fatal = true
  }

  // Warn if no AI provider is configured
  const hasAI =
    process.env.ANTHROPIC_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.OPENROUTER_API_KEY
  if (!hasAI) {
    warnings.push('No AI provider key found. Set ANTHROPIC_API_KEY, OPENAI_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY, or OPENROUTER_API_KEY.')
  }

  // Warn if E2B is missing (live preview won't work)
  if (!process.env.E2B_API_KEY) {
    warnings.push('E2B_API_KEY not set — live preview will be disabled.')
  }

  // Print results
  if (warnings.length > 0) {
    console.warn('\x1b[33m⚠ Warnings:\x1b[0m')
    for (const w of warnings) {
      console.warn(`  ${w}`)
    }
  }

  if (fatal) {
    if (isCI) {
      console.warn('\n\x1b[33m⚠ Environment validation issues detected (non-blocking in CI)\x1b[0m')
    } else {
      console.error('\n\x1b[31mEnvironment validation failed. Fix the errors above before starting.\x1b[0m')
      process.exit(1)
    }
  } else {
    console.log('\x1b[32m✓ Environment validated\x1b[0m')
  }
}

main()
