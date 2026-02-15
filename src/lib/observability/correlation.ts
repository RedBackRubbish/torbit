import { randomUUID } from 'node:crypto'
import { AsyncLocalStorage } from 'async_hooks'

const als = new AsyncLocalStorage<Record<string, string>>()

export function createCorrelationId() {
  return `cid-${randomUUID()}`
}

export function runWithCorrelation(id: string, fn: (...args: any[]) => any) {
  return als.run({ correlationId: id }, fn)
}

export function getCorrelationId(): string | undefined {
  const store = als.getStore()
  return store && store.correlationId
}

const correlation = { runWithCorrelation, getCorrelationId, createCorrelationId }

export default correlation
