import { performance } from 'perf_hooks'
import { info, warn, error } from './logger.server'
import { getClientCorrelationId } from './clientCorrelation'

async function getServerCorrelationId(): Promise<string | undefined> {
  if (typeof window !== 'undefined') return undefined
  try {
    // lazy require to avoid bundling issues
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getCorrelationId } = require('./correlation')
    return getCorrelationId()
  } catch (_e) {
    return undefined
  }
}

function injectHeader(init: RequestInit | undefined, cid: string) {
  const headers = new Headers(init?.headers as HeadersInit)
  if (!headers.has('x-correlation-id')) headers.set('x-correlation-id', cid)
  return { ...init, headers }
}

export async function fetchWithCorrelation(input: RequestInfo, init?: RequestInit): Promise<Response> {
  let cid: string | undefined
  if (typeof window === 'undefined') {
    cid = await getServerCorrelationId()
  } else {
    cid = getClientCorrelationId()
  }

  // Fallback: allow tests or non-ALS environments to expose a global correlation id
  if (!cid && typeof (globalThis as any).__TORBIT_CORRELATION_ID === 'string') {
    cid = (globalThis as any).__TORBIT_CORRELATION_ID
  }

  const start = Date.now()
  const finalInit = cid ? injectHeader(init, cid) : init

  try {
    if (cid) info('outbound.request.start', { url: String(input), correlationId: cid })
    const res = await fetch(input, finalInit)
    const duration = Date.now() - start
    if (cid) info('outbound.request.end', { url: String(input), status: res.status, duration, correlationId: cid })
    return res
  } catch (err: any) {
    const duration = Date.now() - start
    if (cid) error('outbound.request.error', { url: String(input), message: err.message, duration, correlationId: cid })
    throw err
  }
}

// Client helper for cases where caller has explicit cid (rare)
export function fetchWithCorrelationClient(input: RequestInfo, init?: RequestInit, cid?: string) {
  const ID = cid || getClientCorrelationId()
  const finalInit = ID ? injectHeader(init, ID) : init
  const start = Date.now()
  if (ID) console.log(JSON.stringify({ ts: new Date().toISOString(), event: 'outbound.request.start', url: String(input), correlationId: ID }))
  return fetch(input, finalInit).then(res => {
    const duration = Date.now() - start
    if (ID) console.log(JSON.stringify({ ts: new Date().toISOString(), event: 'outbound.request.end', url: String(input), status: res.status, duration, correlationId: ID }))
    return res
  }).catch(err => {
    const duration = Date.now() - start
    if (ID) console.error(JSON.stringify({ ts: new Date().toISOString(), event: 'outbound.request.error', url: String(input), message: err.message, duration, correlationId: ID }))
    throw err
  })
}

export default fetchWithCorrelation
