import { describe, expect, it, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from './route'
import { createClient } from '@/lib/supabase/server'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

function makeAuthUser(id = '11111111-1111-4111-8111-111111111111') {
  return {
    data: { user: { id } },
    error: null,
  }
}

describe('/api/background-runs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns degraded success payload when background_runs table is missing', async () => {
    const query = {
      data: null,
      error: { code: '42P01', message: 'relation "background_runs" does not exist' },
      select: vi.fn(),
      order: vi.fn(),
      limit: vi.fn(),
      eq: vi.fn(),
    }
    query.select.mockReturnValue(query)
    query.order.mockReturnValue(query)
    query.limit.mockReturnValue(query)
    query.eq.mockReturnValue(query)

    ;(createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue(makeAuthUser()),
      },
      from: vi.fn().mockReturnValue(query),
    })

    const request = new NextRequest('http://localhost/api/background-runs?projectId=11111111-1111-4111-8111-111111111111')
    const response = await GET(request)
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.success).toBe(true)
    expect(payload.degraded).toBe(true)
    expect(Array.isArray(payload.runs)).toBe(true)
    expect(payload.runs).toHaveLength(0)
  })

  it('returns typed INVALID_REQUEST envelope for malformed POST body', async () => {
    ;(createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue(makeAuthUser()),
      },
    })

    const request = new NextRequest('http://localhost/api/background-runs', {
      method: 'POST',
      body: JSON.stringify({
        projectId: 'not-a-uuid',
        runType: '',
      }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await POST(request)
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.success).toBe(false)
    expect(payload.error.code).toBe('INVALID_REQUEST')
    expect(typeof payload.error.message).toBe('string')
    expect(payload.error.retryable).toBe(false)
  })
})

