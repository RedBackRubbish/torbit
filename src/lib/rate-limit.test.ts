import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const ORIGINAL_FETCH = globalThis.fetch
const ORIGINAL_UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL
const ORIGINAL_UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN

describe('rate-limit', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
    globalThis.fetch = ORIGINAL_FETCH
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
  })

  afterEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
    globalThis.fetch = ORIGINAL_FETCH

    if (ORIGINAL_UPSTASH_URL) {
      process.env.UPSTASH_REDIS_REST_URL = ORIGINAL_UPSTASH_URL
    } else {
      delete process.env.UPSTASH_REDIS_REST_URL
    }

    if (ORIGINAL_UPSTASH_TOKEN) {
      process.env.UPSTASH_REDIS_REST_TOKEN = ORIGINAL_UPSTASH_TOKEN
    } else {
      delete process.env.UPSTASH_REDIS_REST_TOKEN
    }
  })

  it('falls back to in-memory limiter when Upstash is not configured', async () => {
    const module = await import('./rate-limit')
    const result = await module.chatRateLimiter.check('127.0.0.1')

    expect(result.success).toBe(true)
    expect(result.limit).toBe(30)
    expect(result.remaining).toBe(29)
  })

  it('exposes a higher-throughput limiter for E2B sync operations', async () => {
    const module = await import('./rate-limit')
    const result = await module.e2bSyncRateLimiter.check('127.0.0.1:writeFile')

    expect(result.success).toBe(true)
    expect(result.limit).toBe(300)
    expect(result.remaining).toBe(299)
  })

  it('uses Upstash pipeline when configured', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token'

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          { result: 1 },
          { result: 1 },
          { result: 60000 },
        ]),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    )

    globalThis.fetch = fetchMock as typeof fetch

    const module = await import('./rate-limit')
    const result = await module.strictRateLimiter.check('203.0.113.1')

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(result.success).toBe(true)
    expect(result.limit).toBe(5)
    expect(result.remaining).toBe(4)
  })

  it('falls back to in-memory when Upstash request fails', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token'

    const fetchMock = vi.fn().mockRejectedValue(new Error('network failure'))
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    globalThis.fetch = fetchMock as typeof fetch

    const module = await import('./rate-limit')
    const result = await module.strictRateLimiter.check('198.51.100.4')

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(result.success).toBe(true)
    expect(result.limit).toBe(5)
    expect(result.remaining).toBe(4)
    expect(warnSpy).toHaveBeenCalledOnce()
  })

  it('extracts IP from common proxy headers', async () => {
    const module = await import('./rate-limit')
    const request = new Request('https://example.com', {
      headers: {
        'x-forwarded-for': '203.0.113.2, 10.0.0.1',
      },
    })

    expect(module.getClientIP(request)).toBe('203.0.113.2')
  })
})
