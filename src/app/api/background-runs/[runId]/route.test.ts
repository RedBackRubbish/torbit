import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { PATCH } from './route'
import { createClient } from '@/lib/supabase/server'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

function makeExistingFailedRun() {
  return {
    id: '22222222-2222-4222-8222-222222222222',
    status: 'failed',
    progress: 0,
    attempt_count: 3,
    max_attempts: 3,
    retryable: true,
    cancel_requested: false,
    started_at: null,
    finished_at: '2026-02-10T00:00:00.000Z',
  }
}

describe('/api/background-runs/[runId] retry policy', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns conflict envelope when retry exceeds max attempts', async () => {
    const selectChain = {
      select: vi.fn(),
      eq: vi.fn(),
      single: vi.fn(),
    }

    selectChain.select.mockReturnValue(selectChain)
    selectChain.eq.mockReturnValue(selectChain)
    selectChain.single.mockResolvedValue({
      data: makeExistingFailedRun(),
      error: null,
    })

    ;(createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: '11111111-1111-4111-8111-111111111111' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue(selectChain),
    })

    const request = new NextRequest('http://localhost/api/background-runs/22222222-2222-4222-8222-222222222222', {
      method: 'PATCH',
      body: JSON.stringify({
        operation: 'retry',
      }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await PATCH(request, {
      params: Promise.resolve({
        runId: '22222222-2222-4222-8222-222222222222',
      }),
    })
    const payload = await response.json()

    expect(response.status).toBe(409)
    expect(payload.success).toBe(false)
    expect(payload.error.code).toBe('MAX_ATTEMPTS_REACHED')
    expect(payload.error.retryable).toBe(false)
  })
})

