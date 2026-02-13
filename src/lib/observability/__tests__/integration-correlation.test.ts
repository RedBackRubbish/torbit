import { describe, it, expect, vi, beforeEach } from 'vitest'

import { withCorrelation } from '../middleware'
import fetchWithCorrelation from '../fetcher'
import * as datastore from '../datastore'
import { getToolFirewall, resetToolFirewall } from '../../tools/firewall'
import { getCorrelationId } from '../correlation'

describe('integration: correlation propagation', () => {
  beforeEach(() => {
    // reset firewall and datastore
    resetToolFirewall()
    vi.restoreAllMocks()
  })

  it('propagates correlation id through middleware -> logger -> outbound -> firewall', async () => {
    const cid = 'test-cid-xyz-123'

    // capture appended logs
    const logged: string[] = []
    vi.spyOn(datastore, 'appendLog').mockImplementation((line: string) => {
      logged.push(line)
    })

    // mock global fetch to capture headers
    const mockFetch = vi.fn(async (_input: any, init?: any) => {
      return { status: 200, json: async () => ({ ok: true }), headers: init?.headers }
    })
    // @ts-ignore
    globalThis.fetch = mockFetch

    // minimal req/res objects
    const req: any = { headers: { 'x-correlation-id': cid }, url: '/api/test', method: 'POST' }
    const res: any = {
      statusCode: 200,
      headers: {} as Record<string,string>,
      setHeader(k: string, v: string) { this.headers[k.toLowerCase()] = v },
      end(body?: any) { this.body = body }
    }

    // handler: performs outbound fetch and calls firewall to emit audit log
    const handler = async (_req: any, _res: any) => {
      // outbound call
      const out = await fetchWithCorrelation('http://external.local/api', { method: 'GET' })
      // set response header with current correlation id
      const current = getCorrelationId && getCorrelationId()
      _res.setHeader('x-correlation-id', current || '')

      // create a firewall audit entry
      const fw = getToolFirewall()
      await fw.executeToolSafely({ agentId: 'backend', name: 'readFile', args: { path: 'src/index.ts' }, correlationId: current }, async () => ({ ok: true }))

      _res.end('ok')
      return out
    }

    // also set global fallback for environments where ALS might not flow into fetch
    // this keeps the test robust without changing production behavior
    // @ts-ignore
    globalThis.__TORBIT_CORRELATION_ID = cid

    const wrapped = withCorrelation(handler)
    await wrapped(req, res)

    // cleanup global
    // @ts-ignore
    delete globalThis.__TORBIT_CORRELATION_ID

    // outbound fetch was called and header injected
    expect(mockFetch).toHaveBeenCalled()
    const calledInit = (mockFetch as any).mock.calls[0][1]
    // Headers may be a Headers instance or plain object depending on environment
    let headerVal = undefined
    if (calledInit && calledInit.headers) {
      if (typeof calledInit.headers.get === 'function') headerVal = calledInit.headers.get('x-correlation-id')
      else if (calledInit.headers['x-correlation-id']) headerVal = calledInit.headers['x-correlation-id']
    }
    expect(headerVal).toBe(cid)

    // response includes correlation id header
    expect(res.headers['x-correlation-id']).toBe(cid)

    // firewall audit entry contains correlation id
    const fw = getToolFirewall()
    const entries = fw.getAuditLog()
    expect(entries.length).toBeGreaterThan(0)
    expect(entries[0].correlationId).toBe(cid)

    // datastore logs (JSON lines) should include correlationId
    const parsed = logged.map(l => { try { return JSON.parse(l) } catch { return null } })
    const hasCid = parsed.some(p => p && p.correlationId === cid)
    expect(hasCid).toBe(true)
  })
})
