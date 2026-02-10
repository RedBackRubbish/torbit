import { describe, expect, it } from 'vitest'
import { isTransientModelError } from './fallback'

describe('isTransientModelError', () => {
  it('detects transient provider failures', () => {
    expect(isTransientModelError('Request timed out after 30s')).toBe(true)
    expect(isTransientModelError('HTTP 503 service unavailable')).toBe(true)
    expect(isTransientModelError('Rate limit exceeded')).toBe(true)
  })

  it('does not mark deterministic failures as transient', () => {
    expect(isTransientModelError('Authentication failed: invalid API key')).toBe(false)
    expect(isTransientModelError('Validation error: invalid payload')).toBe(false)
  })
})
