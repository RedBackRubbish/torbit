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

import fs from 'node:fs'
import path from 'node:path'
import {
  validatePublicEnv,
  validateServerEnv,
  hasAnyAIProvider,
  EnvValidationError,
} from '../src/lib/env.contract'

const KEY_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/

function stripInlineComment(value: string): string {
  const hashIndex = value.indexOf('#')
  if (hashIndex === -1) return value
  const preceding = value[hashIndex - 1]
  if (preceding && !/\s/.test(preceding)) return value
  return value.slice(0, hashIndex).trimEnd()
}

function parseEnvValue(rawValue: string): string {
  const trimmed = rawValue.trim()
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1).replace(/\\n/g, '\n')
  }
  if (trimmed.startsWith('\'') && trimmed.endsWith('\'')) {
    return trimmed.slice(1, -1)
  }
  return stripInlineComment(trimmed).trim()
}

function parseEnvFile(filePath: string): Record<string, string> {
  const parsed: Record<string, string> = {}
  const content = fs.readFileSync(filePath, 'utf8')
  const lines = content.split(/\r?\n/)

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const normalized = trimmed.startsWith('export ') ? trimmed.slice(7).trim() : trimmed
    const separatorIndex = normalized.indexOf('=')
    if (separatorIndex <= 0) continue

    const key = normalized.slice(0, separatorIndex).trim()
    if (!KEY_PATTERN.test(key)) continue

    const rawValue = normalized.slice(separatorIndex + 1)
    parsed[key] = parseEnvValue(rawValue)
  }

  return parsed
}

function loadLocalEnvFiles(projectRoot: string): void {
  const nodeEnv = process.env.NODE_ENV || 'development'
  const candidateFiles = [
    '.env',
    `.env.${nodeEnv}`,
    '.env.local',
    `.env.${nodeEnv}.local`,
  ]

  const shellDefinedKeys = new Set(Object.keys(process.env))

  for (const fileName of candidateFiles) {
    const filePath = path.join(projectRoot, fileName)
    if (!fs.existsSync(filePath)) continue

    let parsed: Record<string, string>
    try {
      parsed = parseEnvFile(filePath)
    } catch (error) {
      console.warn(`[validate-env] Failed to parse ${fileName}:`, error)
      continue
    }

    for (const [key, value] of Object.entries(parsed)) {
      if (shellDefinedKeys.has(key)) continue
      process.env[key] = value
    }
  }
}

function main() {
  loadLocalEnvFiles(process.cwd())

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
