import { describe, expect, it } from 'vitest'
import {
  createSandboxAccessToken,
  getSandboxAccessTokenSecret,
  verifySandboxAccessToken,
} from './sandbox-auth'

describe('sandbox access token', () => {
  it('creates and verifies a valid token', () => {
    const token = createSandboxAccessToken('sbx_123', 'user_123', {
      secret: 'test-secret',
      nowMs: Date.UTC(2026, 1, 9, 0, 0, 0),
      ttlSeconds: 3600,
    })

    const payload = verifySandboxAccessToken(token, {
      secret: 'test-secret',
      nowMs: Date.UTC(2026, 1, 9, 0, 30, 0),
    })

    expect(payload).not.toBeNull()
    expect(payload?.sandboxId).toBe('sbx_123')
    expect(payload?.userId).toBe('user_123')
  })

  it('rejects expired tokens', () => {
    const token = createSandboxAccessToken('sbx_123', 'user_123', {
      secret: 'test-secret',
      nowMs: Date.UTC(2026, 1, 9, 0, 0, 0),
      ttlSeconds: 60,
    })

    const payload = verifySandboxAccessToken(token, {
      secret: 'test-secret',
      nowMs: Date.UTC(2026, 1, 9, 0, 2, 0),
    })

    expect(payload).toBeNull()
  })

  it('rejects tampered tokens', () => {
    const token = createSandboxAccessToken('sbx_123', 'user_123', {
      secret: 'test-secret',
      nowMs: Date.UTC(2026, 1, 9, 0, 0, 0),
    })

    const tampered = `${token.split('.')[0]}.invalid-signature`
    const payload = verifySandboxAccessToken(tampered, {
      secret: 'test-secret',
      nowMs: Date.UTC(2026, 1, 9, 0, 1, 0),
    })

    expect(payload).toBeNull()
  })

  it('resolves secret fallback chain', () => {
    expect(getSandboxAccessTokenSecret({ E2B_API_KEY: 'e2b-secret' } as NodeJS.ProcessEnv)).toBe('e2b-secret')
    expect(
      getSandboxAccessTokenSecret({
        NEXTAUTH_SECRET: 'nextauth-secret',
        E2B_API_KEY: 'e2b-secret',
      } as NodeJS.ProcessEnv)
    ).toBe('nextauth-secret')
  })
})
