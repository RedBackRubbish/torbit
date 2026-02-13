export function getClientCorrelationId(): string | undefined {
  if (typeof window === 'undefined') return undefined
  // set by CorrelationProvider
  // @ts-ignore
  return (window as any).__TORBIT_CORRELATION_ID
}

export function setClientCorrelationId(id: string) {
  if (typeof window === 'undefined') return
  // @ts-ignore
  window.__TORBIT_CORRELATION_ID = id
}
