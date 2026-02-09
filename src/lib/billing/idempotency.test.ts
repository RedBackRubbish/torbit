import { describe, expect, it } from 'vitest'
import { isDuplicateStripeCreditError } from './idempotency'

describe('isDuplicateStripeCreditError', () => {
  it('detects postgres unique violation codes', () => {
    expect(isDuplicateStripeCreditError({ code: '23505' })).toBe(true)
  })

  it('detects duplicate errors from stripe payment intent constraints', () => {
    expect(isDuplicateStripeCreditError({
      message: 'duplicate key value violates unique constraint idx_billing_transactions_stripe_payment_intent_unique',
    })).toBe(true)
  })

  it('ignores non-duplicate errors', () => {
    expect(isDuplicateStripeCreditError({ code: '42501', message: 'permission denied' })).toBe(false)
    expect(isDuplicateStripeCreditError(null)).toBe(false)
  })
})
