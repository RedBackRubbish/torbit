import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  validatePublicEnv,
  validateServerEnv,
  validateEdgeEnv,
  assertEnvContract,
  createEdgeSafeProxy,
  hasAnyAIProvider,
  hasUpstash,
  EnvValidationError,
  _resetForTesting,
  publicEnv,
  serverEnv,
  edgeEnv,
} from './env.contract'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal valid public env. */
const VALID_PUBLIC = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://abc.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiJ9.test',
} as const

/** Minimal valid server env (one AI key set). */
const VALID_SERVER = {
  ANTHROPIC_API_KEY: 'sk-ant-test-key',
} as const

/** Minimal valid edge env. */
const VALID_EDGE = {
  ...VALID_PUBLIC,
  NODE_ENV: 'test',
} as const

/**
 * Set process.env to a known state, clearing everything first.
 * Restores original env in afterEach via savedEnv.
 */
let savedEnv: NodeJS.ProcessEnv

function setEnv(overrides: Record<string, string | undefined> = {}): void {
  // Clear all env vars that our schemas care about
  const keysToClean = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    'NEXT_PUBLIC_E2B_API_KEY',
    'NEXT_PUBLIC_E2B_MOCK',
    'NEXT_PUBLIC_SENTRY_DSN',
    'NEXT_PUBLIC_FUEL_DISABLED',
    'NEXT_PUBLIC_ENABLE_BACKGROUND_RUNS',
    'NEXT_PUBLIC_ENABLE_PROJECT_PRESENCE',
    'NEXT_PUBLIC_E2E_AUTH',
    'ANTHROPIC_API_KEY',
    'GOOGLE_GENERATIVE_AI_API_KEY',
    'OPENAI_API_KEY',
    'OPENROUTER_API_KEY',
    'KIMI_API_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'E2B_API_KEY',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'STRIPE_PRICE_PRO_MONTHLY',
    'STRIPE_PRICE_TEAM_MONTHLY',
    'STRIPE_PRICE_FUEL_500',
    'STRIPE_PRICE_FUEL_2500',
    'STRIPE_PRICE_FUEL_10000',
    'GITHUB_TOKEN',
    'VERCEL_TOKEN',
    'NETLIFY_TOKEN',
    'EXPO_TOKEN',
    'TORBIT_WORKER_TOKEN',
    'CRON_SECRET',
    'TORBIT_AUDIT_SIGNING_SECRET',
    'TORBIT_AUDIT_SIGNING_KEY_ID',
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN',
    'SENTRY_DSN',
    'SENTRY_AUTH_TOKEN',
    'TORBIT_SUPERVISOR_MODEL',
    'TORBIT_CONTEXT_COMPILER_MODEL',
    'TORBIT_WORKER_MODEL',
    'TORBIT_CRITICAL_MODEL',
    'TORBIT_JANITOR_MODEL',
    'TORBIT_ANTHROPIC_OPUS_MODEL',
    'TORBIT_ANTHROPIC_SONNET_MODEL',
    'TORBIT_CODEX_MODEL',
    'TORBIT_CODEX_FAST_MODEL',
    'TORBIT_VIBE_AUDIT',
    'TORBIT_DEPLOY_VIBE_BLOCK',
    'TORBIT_USE_CODEX_PRIMARY',
    'TORBIT_KIMI_ROUTER',
    'TORBIT_FAST_ROUTING',
    'TORBIT_AUTO_HEAL',
    'TORBIT_FUEL_ENABLED',
    'TORBIT_WORLD_CLASS_ORCHESTRATION',
    'TORBIT_DEFAULT_FUEL',
    'TORBIT_CHAT_CB_FAILURE_THRESHOLD',
    'TORBIT_CHAT_CB_COOLDOWN_MS',
    'TORBIT_CHAT_CB_MAX_COOLDOWN_MS',
    'TORBIT_DATA_DIR',
    'VERCEL',
    'NODE_ENV',
  ]
  for (const key of keysToClean) {
    delete process.env[key]
  }
  for (const [key, value] of Object.entries(overrides)) {
    if (value !== undefined) {
      process.env[key] = value
    }
  }
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  savedEnv = { ...process.env }
  _resetForTesting()
})

afterEach(() => {
  // Restore original env
  for (const key of Object.keys(process.env)) {
    if (!(key in savedEnv)) delete process.env[key]
  }
  for (const [key, value] of Object.entries(savedEnv)) {
    process.env[key] = value
  }
  _resetForTesting()
})

// ===========================================================================
// PUBLIC ENV
// ===========================================================================

describe('validatePublicEnv', () => {
  it('passes with valid Supabase config', () => {
    setEnv(VALID_PUBLIC)
    const result = validatePublicEnv()
    expect(result.NEXT_PUBLIC_SUPABASE_URL).toBe(VALID_PUBLIC.NEXT_PUBLIC_SUPABASE_URL)
    expect(result.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe(VALID_PUBLIC.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  })

  it('throws EnvValidationError when SUPABASE_URL is not a valid URL', () => {
    setEnv({ ...VALID_PUBLIC, NEXT_PUBLIC_SUPABASE_URL: 'not-a-url' })
    expect(() => validatePublicEnv()).toThrow(EnvValidationError)
  })

  it('throws when SUPABASE_ANON_KEY is empty string', () => {
    setEnv({ ...VALID_PUBLIC, NEXT_PUBLIC_SUPABASE_ANON_KEY: '' })
    expect(() => validatePublicEnv()).toThrow(EnvValidationError)
  })

  it('coerces boolean feature flags correctly', () => {
    setEnv({
      ...VALID_PUBLIC,
      NEXT_PUBLIC_FUEL_DISABLED: 'true',
      NEXT_PUBLIC_ENABLE_BACKGROUND_RUNS: 'false',
      NEXT_PUBLIC_E2E_AUTH: '1',
    })
    const result = validatePublicEnv()
    expect(result.NEXT_PUBLIC_FUEL_DISABLED).toBe(true)
    expect(result.NEXT_PUBLIC_ENABLE_BACKGROUND_RUNS).toBe(false)
    expect(result.NEXT_PUBLIC_E2E_AUTH).toBe(true)
  })

  it('treats missing boolean flags as false', () => {
    setEnv(VALID_PUBLIC)
    const result = validatePublicEnv()
    expect(result.NEXT_PUBLIC_FUEL_DISABLED).toBe(false)
    expect(result.NEXT_PUBLIC_ENABLE_PROJECT_PRESENCE).toBe(false)
  })

  it('validates Stripe publishable key prefix', () => {
    setEnv({ ...VALID_PUBLIC, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'sk_bad_prefix' })
    expect(() => validatePublicEnv()).toThrow(EnvValidationError)
  })

  it('accepts valid Stripe publishable key', () => {
    setEnv({ ...VALID_PUBLIC, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_test_abc123' })
    const result = validatePublicEnv()
    expect(result.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY).toBe('pk_test_abc123')
  })

  it('includes runtime category in error', () => {
    setEnv({})
    try {
      validatePublicEnv()
      expect.fail('should have thrown')
    } catch (e) {
      expect(e).toBeInstanceOf(EnvValidationError)
      expect((e as EnvValidationError).runtime).toBe('public')
    }
  })
})

// ===========================================================================
// SERVER ENV
// ===========================================================================

describe('validateServerEnv', () => {
  it('passes with no keys (all optional)', () => {
    setEnv(VALID_PUBLIC) // server schema uses process.env directly
    const result = validateServerEnv()
    expect(result).toBeDefined()
  })

  it('parses AI provider keys', () => {
    setEnv({ ...VALID_PUBLIC, ...VALID_SERVER })
    const result = validateServerEnv()
    expect(result.ANTHROPIC_API_KEY).toBe('sk-ant-test-key')
  })

  it('validates Stripe secret key prefix', () => {
    setEnv({ ...VALID_PUBLIC, STRIPE_SECRET_KEY: 'pk_wrong_prefix' })
    expect(() => validateServerEnv()).toThrow(EnvValidationError)
  })

  it('validates webhook secret prefix', () => {
    setEnv({ ...VALID_PUBLIC, STRIPE_WEBHOOK_SECRET: 'bad_prefix' })
    expect(() => validateServerEnv()).toThrow(EnvValidationError)
  })

  it('coerces server-side boolean flags', () => {
    setEnv({
      ...VALID_PUBLIC,
      TORBIT_KIMI_ROUTER: 'true',
      TORBIT_FAST_ROUTING: 'false',
      TORBIT_AUTO_HEAL: '1',
    })
    const result = validateServerEnv()
    expect(result.TORBIT_KIMI_ROUTER).toBe(true)
    expect(result.TORBIT_FAST_ROUTING).toBe(false)
    expect(result.TORBIT_AUTO_HEAL).toBe(true)
  })

  it('parses positive integer tunables', () => {
    setEnv({
      ...VALID_PUBLIC,
      TORBIT_DEFAULT_FUEL: '500',
      TORBIT_CHAT_CB_FAILURE_THRESHOLD: '3',
      TORBIT_CHAT_CB_COOLDOWN_MS: '30000',
    })
    const result = validateServerEnv()
    expect(result.TORBIT_DEFAULT_FUEL).toBe(500)
    expect(result.TORBIT_CHAT_CB_FAILURE_THRESHOLD).toBe(3)
    expect(result.TORBIT_CHAT_CB_COOLDOWN_MS).toBe(30000)
  })

  it('rejects non-numeric integer tunables', () => {
    setEnv({ ...VALID_PUBLIC, TORBIT_DEFAULT_FUEL: 'not-a-number' })
    expect(() => validateServerEnv()).toThrow(EnvValidationError)
  })

  it('includes runtime category in error', () => {
    setEnv({ STRIPE_SECRET_KEY: 'bad' })
    try {
      validateServerEnv()
      expect.fail('should have thrown')
    } catch (e) {
      expect(e).toBeInstanceOf(EnvValidationError)
      expect((e as EnvValidationError).runtime).toBe('server')
    }
  })
})

// ===========================================================================
// EDGE ENV
// ===========================================================================

describe('validateEdgeEnv', () => {
  it('passes with valid Supabase config', () => {
    setEnv(VALID_EDGE)
    const result = validateEdgeEnv()
    expect(result.NEXT_PUBLIC_SUPABASE_URL).toBe(VALID_EDGE.NEXT_PUBLIC_SUPABASE_URL)
  })

  it('throws when Supabase URL is missing', () => {
    setEnv({ NODE_ENV: 'test' })
    expect(() => validateEdgeEnv()).toThrow(EnvValidationError)
  })

  it('validates NODE_ENV enum', () => {
    setEnv({ ...VALID_PUBLIC, NODE_ENV: 'staging' })
    expect(() => validateEdgeEnv()).toThrow(EnvValidationError)
  })

  it('accepts valid NODE_ENV values', () => {
    for (const env of ['development', 'production', 'test'] as const) {
      setEnv({ ...VALID_PUBLIC, NODE_ENV: env })
      const result = validateEdgeEnv()
      expect(result.NODE_ENV).toBe(env)
    }
  })
})

// ===========================================================================
// EDGE-SAFE PROXY
// ===========================================================================

describe('createEdgeSafeProxy', () => {
  it('allows access to edge-safe variables', () => {
    const proxy = createEdgeSafeProxy({
      NEXT_PUBLIC_SUPABASE_URL: 'https://abc.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-key',
      NODE_ENV: 'production',
    })
    expect(proxy.NEXT_PUBLIC_SUPABASE_URL).toBe('https://abc.supabase.co')
    expect(proxy.NODE_ENV).toBe('production')
  })

  it('throws when accessing server-only keys', () => {
    const proxy = createEdgeSafeProxy({
      NEXT_PUBLIC_SUPABASE_URL: 'https://abc.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-key',
    })
    expect(() => (proxy as Record<string, unknown>)['ANTHROPIC_API_KEY']).toThrow(
      /server-only variable "ANTHROPIC_API_KEY"/
    )
    expect(() => (proxy as Record<string, unknown>)['STRIPE_SECRET_KEY']).toThrow(
      /server-only variable "STRIPE_SECRET_KEY"/
    )
    expect(() => (proxy as Record<string, unknown>)['SUPABASE_SERVICE_ROLE_KEY']).toThrow(
      /server-only variable "SUPABASE_SERVICE_ROLE_KEY"/
    )
  })

  it('throws with actionable error message', () => {
    const proxy = createEdgeSafeProxy({
      NEXT_PUBLIC_SUPABASE_URL: 'https://abc.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-key',
    })
    try {
      ;(proxy as Record<string, unknown>)['GITHUB_TOKEN']
      expect.fail('should have thrown')
    } catch (e) {
      expect((e as Error).message).toContain('Edge Runtime')
      expect((e as Error).message).toContain('Node.js API route')
    }
  })
})

// ===========================================================================
// BUSINESS LOGIC GUARDS
// ===========================================================================

describe('hasAnyAIProvider', () => {
  it('returns true when Anthropic key is set', () => {
    setEnv({ ANTHROPIC_API_KEY: 'sk-ant-test' })
    expect(hasAnyAIProvider()).toBe(true)
  })

  it('returns true when OpenAI key is set', () => {
    setEnv({ OPENAI_API_KEY: 'sk-openai-test' })
    expect(hasAnyAIProvider()).toBe(true)
  })

  it('returns true when Google key is set', () => {
    setEnv({ GOOGLE_GENERATIVE_AI_API_KEY: 'AIza-test' })
    expect(hasAnyAIProvider()).toBe(true)
  })

  it('returns true when Kimi key is set', () => {
    setEnv({ KIMI_API_KEY: 'kimi-test' })
    expect(hasAnyAIProvider()).toBe(true)
  })

  it('returns false when no AI keys are set', () => {
    setEnv({})
    expect(hasAnyAIProvider()).toBe(false)
  })

  it('accepts a pre-validated env object', () => {
    const env = { ANTHROPIC_API_KEY: 'test' } as ReturnType<typeof validateServerEnv>
    expect(hasAnyAIProvider(env)).toBe(true)
  })
})

describe('hasUpstash', () => {
  it('returns true when both Upstash vars are set', () => {
    setEnv({
      UPSTASH_REDIS_REST_URL: 'https://test.upstash.io',
      UPSTASH_REDIS_REST_TOKEN: 'token123',
    })
    expect(hasUpstash()).toBe(true)
  })

  it('returns false when only URL is set', () => {
    setEnv({ UPSTASH_REDIS_REST_URL: 'https://test.upstash.io' })
    expect(hasUpstash()).toBe(false)
  })

  it('returns false when neither is set', () => {
    setEnv({})
    expect(hasUpstash()).toBe(false)
  })
})

// ===========================================================================
// BOOT-TIME ASSERTION
// ===========================================================================

describe('assertEnvContract', () => {
  it('skips validation in test mode', () => {
    setEnv({ NODE_ENV: 'test' })
    // Should not throw even with no vars set
    expect(() => assertEnvContract('server')).not.toThrow()
    expect(() => assertEnvContract('edge')).not.toThrow()
  })

  it('validates edge env in non-test mode', () => {
    setEnv({ NODE_ENV: 'production' })
    expect(() => assertEnvContract('edge')).toThrow(EnvValidationError)
  })

  it('passes edge validation with valid config', () => {
    setEnv({ ...VALID_PUBLIC, NODE_ENV: 'production' })
    expect(() => assertEnvContract('edge')).not.toThrow()
  })

  it('requires Supabase config for server boot', () => {
    setEnv({
      NODE_ENV: 'production',
      ANTHROPIC_API_KEY: 'sk-ant-test',
    })
    expect(() => assertEnvContract('server')).toThrow(EnvValidationError)
  })

  it('requires at least one AI provider for server boot', () => {
    setEnv({
      NODE_ENV: 'production',
      ...VALID_PUBLIC,
    })
    expect(() => assertEnvContract('server')).toThrow(/No AI provider configured/)
  })

  it('passes full server validation with complete config', () => {
    setEnv({
      NODE_ENV: 'production',
      ...VALID_PUBLIC,
      ...VALID_SERVER,
    })
    expect(() => assertEnvContract('server')).not.toThrow()
  })
})

// ===========================================================================
// LAZY SINGLETONS
// ===========================================================================

describe('lazy singletons', () => {
  it('publicEnv lazily validates and caches', () => {
    setEnv(VALID_PUBLIC)
    expect(publicEnv.NEXT_PUBLIC_SUPABASE_URL).toBe(VALID_PUBLIC.NEXT_PUBLIC_SUPABASE_URL)
    // Second access should not re-validate (mutation after first access is ignored)
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://changed.supabase.co'
    expect(publicEnv.NEXT_PUBLIC_SUPABASE_URL).toBe(VALID_PUBLIC.NEXT_PUBLIC_SUPABASE_URL)
  })

  it('serverEnv lazily validates and caches', () => {
    setEnv({ ...VALID_PUBLIC, ...VALID_SERVER })
    expect(serverEnv.ANTHROPIC_API_KEY).toBe('sk-ant-test-key')
  })

  it('edgeEnv blocks server-only access', () => {
    setEnv(VALID_EDGE)
    expect(edgeEnv.NEXT_PUBLIC_SUPABASE_URL).toBe(VALID_EDGE.NEXT_PUBLIC_SUPABASE_URL)
    expect(() => (edgeEnv as Record<string, unknown>)['STRIPE_SECRET_KEY']).toThrow(
      /server-only variable/
    )
  })

  it('_resetForTesting clears cached values', () => {
    setEnv(VALID_PUBLIC)
    // First access caches
    void publicEnv.NEXT_PUBLIC_SUPABASE_URL
    // Reset and change env
    _resetForTesting()
    setEnv({ ...VALID_PUBLIC, NEXT_PUBLIC_SUPABASE_URL: 'https://new.supabase.co' })
    expect(publicEnv.NEXT_PUBLIC_SUPABASE_URL).toBe('https://new.supabase.co')
  })
})

// ===========================================================================
// ERROR FORMATTING
// ===========================================================================

describe('error formatting', () => {
  it('produces actionable error messages with variable names', () => {
    setEnv({ NEXT_PUBLIC_SUPABASE_URL: 'not-a-url' })
    try {
      validatePublicEnv()
      expect.fail('should have thrown')
    } catch (e) {
      const msg = (e as Error).message
      expect(msg).toContain('NEXT_PUBLIC_SUPABASE_URL')
      expect(msg).toContain('✗')
    }
  })

  it('lists multiple failures at once', () => {
    setEnv({
      NEXT_PUBLIC_SUPABASE_URL: 'not-a-url',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: '',
    })
    try {
      validatePublicEnv()
      expect.fail('should have thrown')
    } catch (e) {
      const msg = (e as Error).message
      expect(msg).toContain('NEXT_PUBLIC_SUPABASE_URL')
      expect(msg).toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    }
  })
})
