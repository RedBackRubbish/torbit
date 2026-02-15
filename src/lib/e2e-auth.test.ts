import { describe, expect, it } from 'vitest'
import {
  E2E_AUTH_COOKIE_NAME,
  E2E_AUTH_COOKIE_VALUE,
  hasE2EAuthCookie,
  isE2EAuthenticatedRequest,
} from './e2e-auth'

function makeRequest(headers: Record<string, string>): Request {
  return new Request('https://torbit.dev', { headers })
}

describe('e2e-auth', () => {
  it('requires cookie presence', () => {
    expect(hasE2EAuthCookie('')).toBe(false)
    expect(hasE2EAuthCookie(`${E2E_AUTH_COOKIE_NAME}=0`)).toBe(false)
    expect(hasE2EAuthCookie(`${E2E_AUTH_COOKIE_NAME}=${E2E_AUTH_COOKIE_VALUE}`)).toBe(true)
  })

  it('allows auth when server flag is explicitly enabled', () => {
    const request = makeRequest({
      host: 'app.example.com',
      cookie: `${E2E_AUTH_COOKIE_NAME}=${E2E_AUTH_COOKIE_VALUE}`,
    })

    expect(isE2EAuthenticatedRequest(request, { TORBIT_E2E_AUTH: 'true' } as NodeJS.ProcessEnv)).toBe(true)
  })

  it('allows localhost in development/test without production bypass', () => {
    const request = makeRequest({
      host: 'localhost:3000',
      cookie: `${E2E_AUTH_COOKIE_NAME}=${E2E_AUTH_COOKIE_VALUE}`,
    })

    expect(isE2EAuthenticatedRequest(request, { NODE_ENV: 'development' } as NodeJS.ProcessEnv)).toBe(true)
    expect(isE2EAuthenticatedRequest(request, { NODE_ENV: 'test' } as NodeJS.ProcessEnv)).toBe(true)
    expect(isE2EAuthenticatedRequest(request, { NODE_ENV: 'production' } as NodeJS.ProcessEnv)).toBe(false)
  })

  it('rejects non-local hosts when flag is not enabled', () => {
    const request = makeRequest({
      host: 'app.example.com',
      cookie: `${E2E_AUTH_COOKIE_NAME}=${E2E_AUTH_COOKIE_VALUE}`,
    })

    expect(isE2EAuthenticatedRequest(request, { NODE_ENV: 'development' } as NodeJS.ProcessEnv)).toBe(false)
  })

  it('ignores spoofed x-forwarded-host values', () => {
    const request = makeRequest({
      host: 'app.example.com',
      'x-forwarded-host': 'localhost:3000',
      cookie: `${E2E_AUTH_COOKIE_NAME}=${E2E_AUTH_COOKIE_VALUE}`,
    })

    expect(isE2EAuthenticatedRequest(request, { NODE_ENV: 'development' } as NodeJS.ProcessEnv)).toBe(false)
  })
})
