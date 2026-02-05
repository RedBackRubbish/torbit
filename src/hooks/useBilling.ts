'use client'

import { useState, useEffect, useCallback } from 'react'
import type { SubscriptionTier } from '@/lib/billing/types'

interface BillingStatus {
  currentFuel: number
  tier: SubscriptionTier
  tierName: string
  status: string
  fuelAllowance: number
  refillPeriod: 'daily' | 'monthly'
  nextRefillAt: Date | null
  canPurchaseFuel: boolean
  lifetimePurchased: number
  lifetimeUsed: number
  cancelAtPeriodEnd: boolean
}

interface DailyRefill {
  refilled: boolean
  amount?: number
  hoursUntilRefill?: number
}

interface UseBillingReturn {
  status: BillingStatus | null
  dailyRefill: DailyRefill | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  openCheckout: (mode: 'subscription' | 'payment', options?: { tier?: string; fuelPackId?: string }) => Promise<void>
  openPortal: () => Promise<void>
}

/**
 * Hook to manage billing status and operations
 */
export function useBilling(): UseBillingReturn {
  const [status, setStatus] = useState<BillingStatus | null>(null)
  const [dailyRefill, setDailyRefill] = useState<DailyRefill | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/billing/status')
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch billing status')
      }

      setStatus({
        currentFuel: data.currentFuel,
        tier: data.tier,
        tierName: data.tierName,
        status: data.status,
        fuelAllowance: data.fuelAllowance,
        refillPeriod: data.refillPeriod,
        nextRefillAt: data.nextRefillAt ? new Date(data.nextRefillAt) : null,
        canPurchaseFuel: data.canPurchaseFuel,
        lifetimePurchased: data.lifetimePurchased,
        lifetimeUsed: data.lifetimeUsed,
        cancelAtPeriodEnd: data.cancelAtPeriodEnd,
      })

      if (data.dailyRefill) {
        setDailyRefill(data.dailyRefill)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  const openCheckout = useCallback(async (
    mode: 'subscription' | 'payment',
    options?: { tier?: string; fuelPackId?: string }
  ) => {
    try {
      setError(null)

      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          tier: options?.tier,
          fuelPackId: options?.fuelPackId,
        }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to create checkout')
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed')
      throw err
    }
  }, [])

  const openPortal = useCallback(async () => {
    try {
      setError(null)

      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to open portal')
      }

      // Redirect to Stripe Customer Portal
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Portal failed')
      throw err
    }
  }, [])

  // Fetch on mount
  useEffect(() => {
    refresh()
  }, [refresh])

  return {
    status,
    dailyRefill,
    loading,
    error,
    refresh,
    openCheckout,
    openPortal,
  }
}
