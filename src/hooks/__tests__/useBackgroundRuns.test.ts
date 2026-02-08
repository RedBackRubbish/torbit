import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'

const realtimeChain = {
  on: vi.fn(() => realtimeChain),
  subscribe: vi.fn(() => realtimeChain),
}

const mockSupabase = {
  channel: vi.fn(() => realtimeChain),
  removeChannel: vi.fn(() => Promise.resolve('ok')),
}

vi.mock('@/lib/supabase/client', () => ({
  getSupabase: () => mockSupabase,
}))

const baseRun = {
  id: 'run-1',
  project_id: 'project-1',
  user_id: 'user-1',
  run_type: 'mobile-release',
  status: 'queued',
  input: {},
  output: null,
  error_message: null,
  progress: 0,
  started_at: null,
  finished_at: null,
  created_at: '2026-02-08T00:00:00Z',
  updated_at: '2026-02-08T00:00:00Z',
}

describe('useBackgroundRuns', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)

      if (!init || init.method === 'GET') {
        return Promise.resolve(new Response(JSON.stringify({
          success: true,
          runs: [baseRun],
        }), { status: 200 }))
      }

      if (url.endsWith('/api/background-runs') && init.method === 'POST') {
        return Promise.resolve(new Response(JSON.stringify({
          success: true,
          run: baseRun,
        }), { status: 201 }))
      }

      if (url.includes('/api/background-runs/run-1') && init.method === 'PATCH') {
        return Promise.resolve(new Response(JSON.stringify({
          success: true,
          run: {
            ...baseRun,
            status: 'running',
            progress: 50,
          },
        }), { status: 200 }))
      }

      if (url.endsWith('/api/background-runs/dispatch') && init.method === 'POST') {
        return Promise.resolve(new Response(JSON.stringify({
          success: true,
          processed: 1,
          outcomes: [{
            runId: 'run-1',
            status: 'succeeded',
            retried: false,
            attemptCount: 1,
            progress: 100,
            output: { message: 'ok' },
            nextRetryAt: null,
            startedAt: '2026-02-08T00:00:00Z',
            finishedAt: '2026-02-08T00:01:00Z',
          }],
        }), { status: 200 }))
      }

      return Promise.resolve(new Response(JSON.stringify({ error: 'Not found' }), { status: 404 }))
    }))
  })

  it('loads runs and supports create/update actions', async () => {
    const { useBackgroundRuns } = await import('../useBackgroundRuns')
    const { result } = renderHook(() => useBackgroundRuns('project-1'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.runs).toHaveLength(1)

    await act(async () => {
      await result.current.createRun({ runType: 'mobile-release' })
    })

    await act(async () => {
      await result.current.updateRun('run-1', { status: 'running', progress: 50 })
    })

    await act(async () => {
      const dispatch = await result.current.dispatchRun({ runId: 'run-1' })
      expect(dispatch.processed).toBe(1)
      expect(dispatch.outcomes[0]?.status).toBe('succeeded')
    })

    expect(result.current.runs[0]?.status).toBe('running')
  })
})
