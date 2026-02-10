import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'

const missingTableError = {
  code: 'PGRST205',
  message: 'Could not find the table public.project_presence in the schema cache',
}

const realtimeChannel = {
  on: vi.fn(() => realtimeChannel),
  subscribe: vi.fn(() => realtimeChannel),
}

const queryChain = {
  select: vi.fn(() => queryChain),
  eq: vi.fn(() => queryChain),
  order: vi.fn(() => Promise.resolve({ data: null, error: missingTableError })),
  upsert: vi.fn(() => Promise.resolve({ error: missingTableError })),
}

const mockSupabase = {
  auth: {
    getUser: vi.fn(() => Promise.resolve({
      data: { user: { id: 'user-1' } },
    })),
  },
  from: vi.fn(() => queryChain),
  channel: vi.fn(() => realtimeChannel),
  removeChannel: vi.fn(() => Promise.resolve('ok')),
}

vi.mock('@/lib/supabase/client', () => ({
  getSupabase: () => mockSupabase,
}))

describe('useProjectPresence', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('disables presence and skips realtime subscription when table is missing', async () => {
    const { useProjectPresence } = await import('../useProjectPresence')
    const { result } = renderHook(() => useProjectPresence('11111111-1111-4111-8111-111111111111'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.members).toHaveLength(0)
    expect(mockSupabase.channel).not.toHaveBeenCalled()

    await act(async () => {
      await result.current.upsertPresence('online')
    })

    expect(queryChain.upsert).not.toHaveBeenCalled()
  })

  it('disables presence when the endpoint responds with generic 404 metadata', async () => {
    queryChain.order.mockResolvedValueOnce({
      data: null,
      error: { status: 404, statusText: 'Not Found' },
    })

    const { useProjectPresence } = await import('../useProjectPresence')
    const { result } = renderHook(() => useProjectPresence('11111111-1111-4111-8111-111111111111'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await act(async () => {
      await result.current.upsertPresence('online')
    })

    expect(mockSupabase.channel).not.toHaveBeenCalled()
    expect(queryChain.upsert).not.toHaveBeenCalled()
  })

  it('skips presence calls for non-UUID project ids', async () => {
    const { useProjectPresence } = await import('../useProjectPresence')
    renderHook(() => useProjectPresence('local-project-id'))

    await waitFor(() => {
      expect(queryChain.order).not.toHaveBeenCalled()
    })

    expect(mockSupabase.from).not.toHaveBeenCalled()
  })
})
