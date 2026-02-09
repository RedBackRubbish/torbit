interface StripeErrorLike {
  code?: string
  message?: string
  details?: string
}

export function isDuplicateStripeCreditError(error: StripeErrorLike | null): boolean {
  if (!error) return false
  if (error.code === '23505') return true

  const combined = `${error.message || ''} ${error.details || ''}`.toLowerCase()
  return combined.includes('duplicate key') && (
    combined.includes('stripe_payment_intent') ||
    combined.includes('stripe_invoice') ||
    combined.includes('billing_transactions')
  )
}
