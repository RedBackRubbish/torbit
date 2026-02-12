#!/usr/bin/env npx tsx
/**
 * Pre-flight environment validation.
 *
 * Run before `next dev` or `next build` to surface missing/invalid
 * env vars immediately instead of at runtime.
 *
 * Delegates to the canonical env contract so schemas are never duplicated.
 *
 * Usage:  npx tsx scripts/validate-env.ts
 */

import {
  validatePublicEnv,
  validateServerEnv,
  hasAnyAIProvider,
  EnvValidationError,
} from '../src/lib/env.contract'

function main() {
  const isCI = !!process.env.CI || !!process.env.VERCEL
  const warnings: string[] = []
  let fatal = false

  // --- Server env (format validation) ---
  try {
    validateServerEnv()
  } catch (e) {
    if (e instanceof EnvValidationError) {
      console.error(`\x1b[31m✗ ${e.message}\x1b[0m`)
      fatal = true
    } else {
      throw e
    }
  }

  // --- Client / public env ---
  try {
    validatePublicEnv()
  } catch (e) {
    if (e instanceof EnvValidationError) {
      console.error(`\x1b[31m✗ ${e.message}\x1b[0m`)
      fatal = true
    } else {
      throw e
    }
  }

  // --- Warn if no AI provider is configured ---
  try {
    if (!hasAnyAIProvider()) {
      warnings.push(
        'No AI provider key found. Set ANTHROPIC_API_KEY, OPENAI_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY, OPENROUTER_API_KEY, or KIMI_API_KEY.'
      )
    }
  } catch {
    // If server validation already failed, hasAnyAIProvider will throw — skip
  }

  // --- Warn if E2B is missing ---
  if (!process.env.E2B_API_KEY) {
    warnings.push('E2B_API_KEY not set — live preview will be disabled.')
  }

  // --- Print results ---
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
