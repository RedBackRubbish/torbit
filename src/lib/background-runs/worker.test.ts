import { describe, expect, it } from 'vitest'
import {
  authorizeWorkerRequest,
  getConfiguredWorkerTokens,
  parseBearerToken,
} from './worker'

describe('parseBearerToken', () => {
  it('extracts bearer token', () => {
    expect(parseBearerToken('Bearer token-123')).toBe('token-123')
  })

  it('accepts case-insensitive bearer prefix', () => {
    expect(parseBearerToken('bearer token-123')).toBe('token-123')
  })

  it('returns null for invalid format', () => {
    expect(parseBearerToken('token-123')).toBeNull()
    expect(parseBearerToken(null)).toBeNull()
  })
})

describe('getConfiguredWorkerTokens', () => {
  it('returns deduplicated configured tokens', () => {
    const tokens = getConfiguredWorkerTokens({
      TORBIT_WORKER_TOKEN: 'abc',
      CRON_SECRET: 'abc',
    } as NodeJS.ProcessEnv)

    expect(tokens).toEqual(['abc'])
  })
})

describe('authorizeWorkerRequest', () => {
  it('authorizes via x-torbit-worker-token', () => {
    const headers = new Headers({ 'x-torbit-worker-token': 'worker-secret' })
    const result = authorizeWorkerRequest(headers, {
      TORBIT_WORKER_TOKEN: 'worker-secret',
    } as NodeJS.ProcessEnv)

    expect(result).toEqual({
      ok: true,
      method: 'header-token',
    })
  })

  it('authorizes via authorization bearer token', () => {
    const headers = new Headers({ authorization: 'Bearer cron-secret' })
    const result = authorizeWorkerRequest(headers, {
      CRON_SECRET: 'cron-secret',
    } as NodeJS.ProcessEnv)

    expect(result).toEqual({
      ok: true,
      method: 'bearer-token',
    })
  })

  it('rejects when no worker token is configured', () => {
    const headers = new Headers({ 'x-torbit-worker-token': 'worker-secret' })
    const result = authorizeWorkerRequest(headers, {} as NodeJS.ProcessEnv)

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toContain('not configured')
  })

  it('rejects invalid tokens', () => {
    const headers = new Headers({ authorization: 'Bearer nope' })
    const result = authorizeWorkerRequest(headers, {
      TORBIT_WORKER_TOKEN: 'worker-secret',
    } as NodeJS.ProcessEnv)

    expect(result).toEqual({
      ok: false,
      error: 'Invalid worker token.',
    })
  })
})
