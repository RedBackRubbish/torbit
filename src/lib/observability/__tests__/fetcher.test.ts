import { vi, describe, it, expect, beforeEach } from 'vitest'
import { fetchWithCorrelation, fetchWithCorrelationClient } from '../fetcher'

describe('fetcher', () => {
  beforeEach(() => {
    // @ts-ignore
    globalThis.fetch = vi.fn(() => Promise.resolve(new Response(null, { status: 200 })))
  })

  it('injects x-correlation-id header on client when global set', async () => {
    // @ts-ignore
    globalThis.__TORBIT_CORRELATION_ID = 'test-cid-42'
    // @ts-ignore
    const res = await fetchWithCorrelationClient('/api/echo', { method: 'GET' })
    expect(globalThis.fetch).toHaveBeenCalled()
    const called = (globalThis.fetch as any).mock.calls[0]
    const init = called[1]
    // Headers are a Headers instance
    expect(init.headers.get('x-correlation-id')).toBe('test-cid-42')
  })
})
