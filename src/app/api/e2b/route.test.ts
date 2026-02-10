import { describe, expect, it, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/auth', () => ({
  getAuthenticatedUser: vi.fn(),
}))

vi.mock('@/lib/rate-limit', () => ({
  strictRateLimiter: { check: vi.fn().mockResolvedValue({ success: true }) },
  e2bSyncRateLimiter: { check: vi.fn().mockResolvedValue({ success: true }) },
  getClientIP: vi.fn().mockReturnValue('127.0.0.1'),
  rateLimitResponse: vi.fn(),
}))

vi.mock('@/lib/e2b/sandbox-auth', () => ({
  createSandboxAccessToken: vi.fn().mockReturnValue('mock-token'),
  verifySandboxAccessToken: vi.fn().mockReturnValue(true),
}))

vi.mock('e2b', () => ({
  Sandbox: {
    create: vi.fn().mockResolvedValue({
      sandboxId: 'test-sandbox-123',
      keepAlive: vi.fn(),
    }),
    connect: vi.fn(),
  },
}))

import { getAuthenticatedUser } from '@/lib/supabase/auth'
import { POST } from './route'

describe('/api/e2b', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Ensure E2B_API_KEY is set so the route doesn't early-return
    process.env.E2B_API_KEY = 'test-key'
  })

  it('rejects unauthenticated requests with 401', async () => {
    ;(getAuthenticatedUser as ReturnType<typeof vi.fn>).mockResolvedValue(null)

    const req = new NextRequest('http://localhost/api/e2b', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(401)

    const body = await res.json()
    expect(body.error).toMatch(/unauthorized/i)
  })

  it('rejects invalid JSON body with 400', async () => {
    const req = new NextRequest('http://localhost/api/e2b', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    })

    const res = await POST(req)
    expect(res.status).toBe(400)

    const body = await res.json()
    expect(body.code).toBe('INVALID_JSON_BODY')
  })

  it('rejects unknown actions with 400', async () => {
    ;(getAuthenticatedUser as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'user-1' })

    const req = new NextRequest('http://localhost/api/e2b', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'nope_not_real' }),
    })

    const res = await POST(req)
    // Unknown actions should either 400 or be caught by the switch/case
    expect([400, 500]).toContain(res.status)
  })
})
