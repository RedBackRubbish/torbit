import { AsyncLocalStorage } from 'async_hooks'

const als = new AsyncLocalStorage<Record<string, string>>()

export function createCorrelationId() {
  // RFC4122 v4-like simple random id
  return 'cid-' + ([1e7]+-1e3+-4e3+-8e3+-1e11).toString().replace(/[018]/g, c =>
    (Number(c) ^ cryptoRandom()).toString(16)
  )
}

function cryptoRandom() {
  // small portable random nibble
  return Math.floor(Math.random() * 16)
}

export function runWithCorrelation(id: string, fn: (...args: any[]) => any) {
  return als.run({ correlationId: id }, fn)
}

export function getCorrelationId(): string | undefined {
  const store = als.getStore()
  return store && store.correlationId
}

// Simple export for middleware use
export default { runWithCorrelation, getCorrelationId, createCorrelationId }
