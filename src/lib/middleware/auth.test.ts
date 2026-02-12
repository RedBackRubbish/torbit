import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { User } from '@supabase/supabase-js'
import {
  withAuth,
  withOptionalAuth,
  type UserSession,
  type AuthContext,
  type OptionalAuthContext,
} from './auth'

// ---------------------------------------------------------------------------
// Mock getAuthenticatedUser
// ---------------------------------------------------------------------------

const mockGetAuthenticatedUser = vi.fn<(req: Request) => Promise<User | null>>()

vi.mock('@/lib/supabase/auth', () => ({
  getAuthenticatedUser: (...args: unknown[]) => mockGetAuthenticatedUser(args[0] as Request),
}))

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function fakeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-123',
    email: 'test@torbit.dev',
    app_metadata: { provider: 'email' },
    user_metadata: { full_name: 'Test User' },
    aud: 'authenticated',
    phone: '',
    created_at: '2026-01-01T00:00:00Z',
    last_sign_in_at: '2026-02-12T00:00:00Z',
    role: 'authenticated',
    updated_at: '2026-02-12T00:00:00Z',
    identities: [],
    factors: [],
    is_anonymous: false,
    ...overrides,
  } as User
}

function fakeRequest(method = 'GET', body?: unknown): Request {
  const init: RequestInit = { method, headers: { 'Content-Type': 'application/json' } }
  if (body) {
    init.body = JSON.stringify(body)
  }
  return new Request('https://torbit.dev/api/test', init)
}

function fakeSegmentData(params: Record<string, string>) {
  return { params: Promise.resolve(params) }
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockGetAuthenticatedUser.mockReset()
})

// ===========================================================================
// withAuth
// ===========================================================================

describe('withAuth', () => {
  it('returns 401 when user is not authenticated', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null)

    const handler = vi.fn()
    const wrapped = withAuth(handler)
    const res = await wrapped(fakeRequest())

    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toMatch(/unauthorized/i)
    expect(handler).not.toHaveBeenCalled()
  })

  it('calls handler with UserSession when authenticated', async () => {
    const user = fakeUser()
    mockGetAuthenticatedUser.mockResolvedValue(user)

    const handler = vi.fn(async (_req: Request, ctx: AuthContext) => {
      return Response.json({ userId: ctx.user.id, email: ctx.user.email })
    })

    const wrapped = withAuth(handler)
    const res = await wrapped(fakeRequest())

    expect(res.status).toBe(200)
    expect(handler).toHaveBeenCalledOnce()

    const body = await res.json()
    expect(body.userId).toBe('user-123')
    expect(body.email).toBe('test@torbit.dev')
  })

  it('provides the raw Supabase User object', async () => {
    const user = fakeUser({ id: 'raw-check' })
    mockGetAuthenticatedUser.mockResolvedValue(user)

    let capturedSession: UserSession | null = null
    const handler = vi.fn(async (_req: Request, ctx: AuthContext) => {
      capturedSession = ctx.user
      return Response.json({})
    })

    const wrapped = withAuth(handler)
    await wrapped(fakeRequest())

    expect(capturedSession).not.toBeNull()
    expect(capturedSession!.raw.id).toBe('raw-check')
    expect(capturedSession!.raw.app_metadata).toEqual({ provider: 'email' })
  })

  it('passes through the original request', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(fakeUser())

    let capturedReq: Request | null = null
    const handler = vi.fn(async (req: Request) => {
      capturedReq = req
      return Response.json({})
    })

    const origReq = fakeRequest('POST', { hello: 'world' })
    const wrapped = withAuth(handler)
    await wrapped(origReq)

    expect(capturedReq).toBe(origReq)
  })

  it('resolves route params from Next.js segment data', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(fakeUser())

    const handler = vi.fn(async (_req: Request, ctx: AuthContext<{ runId: string }>) => {
      return Response.json({ runId: ctx.params.runId })
    })

    const wrapped = withAuth(handler, { params: ['runId'] })
    const res = await wrapped(fakeRequest(), fakeSegmentData({ runId: 'run-abc' }))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.runId).toBe('run-abc')
  })

  it('provides empty params when no segment data', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(fakeUser())

    let capturedParams: Record<string, string> = { unexpected: 'value' }
    const handler = vi.fn(async (_req: Request, ctx: AuthContext) => {
      capturedParams = ctx.params
      return Response.json({})
    })

    const wrapped = withAuth(handler)
    await wrapped(fakeRequest())

    expect(capturedParams).toEqual({})
  })

  it('handles user with no email (throws)', async () => {
    const user = fakeUser({ email: undefined })
    mockGetAuthenticatedUser.mockResolvedValue(user)

    const handler = vi.fn(async () => Response.json({}))
    const wrapped = withAuth(handler)

    await expect(wrapped(fakeRequest())).rejects.toThrow(/no email/)
    expect(handler).not.toHaveBeenCalled()
  })

  it('returns correct Content-Type on 401', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null)

    const wrapped = withAuth(async () => Response.json({}))
    const res = await wrapped(fakeRequest())

    expect(res.headers.get('content-type')).toContain('application/json')
  })

  it('does not swallow handler errors', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(fakeUser())

    const wrapped = withAuth(async () => {
      throw new Error('handler boom')
    })

    await expect(wrapped(fakeRequest())).rejects.toThrow('handler boom')
  })
})

// ===========================================================================
// withOptionalAuth
// ===========================================================================

describe('withOptionalAuth', () => {
  it('calls handler with user=null when unauthenticated', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null)

    const handler = vi.fn(async (_req: Request, ctx: OptionalAuthContext) => {
      return Response.json({ authed: ctx.user !== null })
    })

    const wrapped = withOptionalAuth(handler)
    const res = await wrapped(fakeRequest())

    expect(res.status).toBe(200)
    expect(handler).toHaveBeenCalledOnce()

    const body = await res.json()
    expect(body.authed).toBe(false)
  })

  it('calls handler with UserSession when authenticated', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(fakeUser())

    const handler = vi.fn(async (_req: Request, ctx: OptionalAuthContext) => {
      return Response.json({ userId: ctx.user?.id })
    })

    const wrapped = withOptionalAuth(handler)
    const res = await wrapped(fakeRequest())

    const body = await res.json()
    expect(body.userId).toBe('user-123')
  })

  it('never returns 401 — handler always runs', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null)

    const handler = vi.fn(async () => Response.json({ ok: true }))
    const wrapped = withOptionalAuth(handler)
    const res = await wrapped(fakeRequest())

    expect(res.status).toBe(200)
    expect(handler).toHaveBeenCalledOnce()
  })

  it('resolves route params', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null)

    const handler = vi.fn(async (_req: Request, ctx: OptionalAuthContext<{ slug: string }>) => {
      return Response.json({ slug: ctx.params.slug })
    })

    const wrapped = withOptionalAuth(handler, { params: ['slug'] })
    const res = await wrapped(fakeRequest(), fakeSegmentData({ slug: 'my-project' }))

    const body = await res.json()
    expect(body.slug).toBe('my-project')
  })
})

// ===========================================================================
// Integration: composing with other middleware concerns
// ===========================================================================

describe('integration', () => {
  it('works with rate limiting before auth', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(fakeUser())

    // Simulates the pattern: rate limit first, then withAuth
    const authedHandler = withAuth(async (_req, { user }) => {
      return Response.json({ userId: user.id })
    })

    // Rate limit check (simulated)
    async function routeHandler(req: Request) {
      const isRateLimited = false // simulate check
      if (isRateLimited) {
        return Response.json({ error: 'Rate limited' }, { status: 429 })
      }
      return authedHandler(req)
    }

    const res = await routeHandler(fakeRequest())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.userId).toBe('user-123')
  })

  it('handler can return any status code', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(fakeUser())

    const wrapped = withAuth(async () => {
      return Response.json({ error: 'Not found' }, { status: 404 })
    })

    const res = await wrapped(fakeRequest())
    expect(res.status).toBe(404)
  })

  it('handler can return streaming responses', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(fakeUser())

    const wrapped = withAuth(async () => {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('chunk1'))
          controller.close()
        },
      })
      return new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } })
    })

    const res = await wrapped(fakeRequest())
    expect(res.status).toBe(200)
    const text = await res.text()
    expect(text).toBe('chunk1')
  })

  it('multiple withAuth handlers are independent', async () => {
    const user1 = fakeUser({ id: 'user-1' })
    const user2 = fakeUser({ id: 'user-2' })

    const handler1 = withAuth(async (_req, { user }) => {
      return Response.json({ id: user.id })
    })

    const handler2 = withAuth(async (_req, { user }) => {
      return Response.json({ id: user.id })
    })

    mockGetAuthenticatedUser.mockResolvedValueOnce(user1)
    const res1 = await handler1(fakeRequest())
    const body1 = await res1.json()

    mockGetAuthenticatedUser.mockResolvedValueOnce(user2)
    const res2 = await handler2(fakeRequest())
    const body2 = await res2.json()

    expect(body1.id).toBe('user-1')
    expect(body2.id).toBe('user-2')
  })
})
