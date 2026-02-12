import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/auth', () => ({
  getAuthenticatedUser: vi.fn(),
}))

vi.mock('@/lib/rate-limit', () => ({
  chatRateLimiter: { check: vi.fn().mockResolvedValue({ success: true }) },
  getClientIP: vi.fn().mockReturnValue('127.0.0.1'),
  rateLimitResponse: vi.fn(),
}))

vi.mock('@/lib/env.contract', () => ({
  assertEnvContract: vi.fn(),
}))

// Stub heavy AI SDK / orchestrator imports so the module loads without provider keys
vi.mock('ai', () => ({ streamText: vi.fn() }))
vi.mock('@ai-sdk/anthropic', () => ({ anthropic: vi.fn() }))
vi.mock('@ai-sdk/google', () => ({ google: vi.fn() }))
vi.mock('@ai-sdk/openai', () => ({ openai: vi.fn() }))
vi.mock('@/lib/agents/orchestrator', () => ({
  createOrchestrator: vi.fn(),
}))
vi.mock('@/lib/intent/classifier', () => ({
  classifyIntent: vi.fn().mockReturnValue('chat'),
  isActionIntent: vi.fn().mockReturnValue(false),
  resolveIntent: vi.fn().mockReturnValue('chat'),
}))
vi.mock('@/lib/vibe-audit', () => ({ runVibeAudit: vi.fn() }))
vi.mock('@/lib/vibe-autofix', () => ({ runVibeAutofix: vi.fn() }))
vi.mock('@/lib/supervisor/events', () => ({
  makeSupervisorEvent: vi.fn(),
}))
vi.mock('@/lib/supervisor/fallback', () => ({
  isTransientModelError: vi.fn().mockReturnValue(false),
}))
vi.mock('@/lib/supervisor/chat-health', () => ({
  rankConversationProviders: vi.fn().mockReturnValue([]),
  recordConversationProviderFailure: vi.fn(),
  recordConversationProviderSuccess: vi.fn(),
}))

import { getAuthenticatedUser } from '@/lib/supabase/auth'
import { POST } from './route'

describe('/api/chat', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects unauthenticated requests with 401', async () => {
    ;(getAuthenticatedUser as ReturnType<typeof vi.fn>).mockResolvedValue(null)

    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'hello' }] }),
    })

    const res = await POST(req)
    expect(res.status).toBe(401)

    const body = await res.json()
    expect(body.error).toMatch(/unauthorized/i)
  })

  it('rejects invalid JSON with 400', async () => {
    ;(getAuthenticatedUser as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'user-1', email: 'test@torbit.dev' })

    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('rejects empty messages array with 400', async () => {
    ;(getAuthenticatedUser as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'user-1', email: 'test@torbit.dev' })

    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [] }),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)

    const body = await res.json()
    expect(body.error).toMatch(/invalid/i)
  })

  it('rejects malformed message schema with 400', async () => {
    ;(getAuthenticatedUser as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'user-1', email: 'test@torbit.dev' })

    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: 'not-an-array' }),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})
