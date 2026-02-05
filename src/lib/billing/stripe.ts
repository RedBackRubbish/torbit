/**
 * TORBIT Stripe Client
 * 
 * Server-side Stripe client for billing operations.
 * 
 * ⚠️ SERVER-ONLY - Never import in client components
 */

import Stripe from 'stripe'

// Validate we're on the server
if (typeof window !== 'undefined') {
  throw new Error(
    'SECURITY: stripe.ts was imported on the client. ' +
    'This module must ONLY be used server-side.'
  )
}

// Singleton Stripe client
let stripeClient: Stripe | null = null

/**
 * Get the Stripe client instance (lazy initialization)
 */
export function getStripe(): Stripe {
  if (!stripeClient) {
    const secretKey = process.env.STRIPE_SECRET_KEY
    
    if (!secretKey) {
      throw new Error(
        'STRIPE_SECRET_KEY is not set. ' +
        'Add it to your .env.local file.'
      )
    }

    stripeClient = new Stripe(secretKey, {
      apiVersion: '2026-01-28.clover',
      typescript: true,
    })
  }
  
  return stripeClient
}

/**
 * Stripe Price IDs from environment
 */
export const STRIPE_PRICES = {
  // Subscriptions
  pro: process.env.STRIPE_PRICE_PRO_MONTHLY,
  team: process.env.STRIPE_PRICE_TEAM_MONTHLY,
  
  // Fuel packs
  fuel_500: process.env.STRIPE_PRICE_FUEL_500,
  fuel_2500: process.env.STRIPE_PRICE_FUEL_2500,
  fuel_10000: process.env.STRIPE_PRICE_FUEL_10000,
} as const

/**
 * Get price ID for a subscription tier
 */
export function getSubscriptionPriceId(tier: 'pro' | 'team'): string | undefined {
  return STRIPE_PRICES[tier]
}

/**
 * Get price ID for a fuel pack
 */
export function getFuelPackPriceId(packId: string): string | undefined {
  const key = packId as keyof typeof STRIPE_PRICES
  return STRIPE_PRICES[key]
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  
  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not set')
  }

  return getStripe().webhooks.constructEvent(
    payload,
    signature,
    webhookSecret
  )
}
