import { vi, describe, it, expect, beforeEach } from 'vitest'
import { fetchWithCorrelationClient } from '../fetcher'

declare global {
  var __TORBIT_CORRELATION_ID: string | undefined
}

describe('fetcher', () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn(() => Promise.resolve(new Response(null, { status: 200 }))) as typeof fetch
  })

  it('injects x-correlation-id header on client when global set', async () => {
    globalThis.__TORBIT_CORRELATION_ID = 'test-cid-42'
    await fetchWithCorrelationClient('/api/echo', { method: 'GET' })
    expect(globalThis.fetch).toHaveBeenCalled()
    const called = (globalThis.fetch as unknown as { mock: { calls: Array<[string, RequestInit]> } }).mock.calls[0]
    const init = called[1]
    // Headers are a Headers instance
    expect(init.headers.get('x-correlation-id')).toBe('test-cid-42')
  })
})
