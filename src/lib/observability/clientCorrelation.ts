declare global {
  interface Window {
    __TORBIT_CORRELATION_ID?: string
  }
}

export function getClientCorrelationId(): string | undefined {
  if (typeof window === 'undefined') return undefined
  return window.__TORBIT_CORRELATION_ID
}

export function setClientCorrelationId(id: string) {
  if (typeof window === 'undefined') return
  window.__TORBIT_CORRELATION_ID = id
}
