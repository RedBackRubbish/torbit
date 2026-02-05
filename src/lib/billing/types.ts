/**
 * TORBIT Billing Types
 * 
 * Type definitions for Stripe integration and fuel system.
 */

// ============================================
// SUBSCRIPTION TIERS
// ============================================

export type SubscriptionTier = 'free' | 'pro' | 'team' | 'enterprise'

export type SubscriptionStatus = 
  | 'active' 
  | 'canceled' 
  | 'past_due' 
  | 'trialing' 
  | 'incomplete'

export interface TierConfig {
  name: string
  price: number // Monthly price in USD
  fuelAllowance: number // Fuel per period
  refillPeriod: 'daily' | 'monthly'
  seats: number
  features: string[]
}

export const TIER_CONFIG: Record<SubscriptionTier, TierConfig> = {
  free: {
    name: 'Free',
    price: 0,
    fuelAllowance: 100,
    refillPeriod: 'daily',
    seats: 1,
    features: [
      '100 fuel per day',
      'All AI models (Flash, Sonnet, Opus)',
      'Unlimited projects',
      'Basic support',
    ],
  },
  pro: {
    name: 'Pro',
    price: 29,
    fuelAllowance: 5000,
    refillPeriod: 'monthly',
    seats: 1,
    features: [
      '5,000 fuel per month',
      'All AI models (Flash, Sonnet, Opus)',
      'Unlimited projects',
      'Priority support',
      'Buy extra fuel packs',
    ],
  },
  team: {
    name: 'Team',
    price: 99,
    fuelAllowance: 25000,
    refillPeriod: 'monthly',
    seats: 5,
    features: [
      '25,000 fuel per month (shared)',
      'All AI models (Flash, Sonnet, Opus)',
      'Up to 5 team members',
      'Unlimited projects',
      'Priority support',
      'Buy extra fuel packs',
      'Usage analytics',
    ],
  },
  enterprise: {
    name: 'Enterprise',
    price: 0, // Custom pricing
    fuelAllowance: 100000,
    refillPeriod: 'monthly',
    seats: 999,
    features: [
      'Custom fuel allocation',
      'All AI models (Flash, Sonnet, Opus)',
      'Unlimited team members',
      'Dedicated support',
      'SLA guarantees',
      'Custom integrations',
      'On-premise option',
    ],
  },
}

// ============================================
// FUEL PACKS (One-time purchases)
// ============================================

export interface FuelPack {
  id: string
  name: string
  amount: number
  price: number // USD
  stripePriceId: string | null // Set from env
  description: string
  popular?: boolean
}

export const FUEL_PACKS: FuelPack[] = [
  {
    id: 'fuel_500',
    name: 'Emergency Rod',
    amount: 500,
    price: 9,
    stripePriceId: null, // Set at runtime from env
    description: 'Quick fixes & patches',
  },
  {
    id: 'fuel_2500',
    name: 'Jerry Can',
    amount: 2500,
    price: 29,
    stripePriceId: null,
    description: 'Feature build & refactor',
    popular: true,
  },
  {
    id: 'fuel_10000',
    name: 'Reactor Core',
    amount: 10000,
    price: 99,
    stripePriceId: null,
    description: 'Full MVP development',
  },
]

// Helper to get fuel packs with Stripe price IDs
export function getFuelPacksWithPrices(): FuelPack[] {
  return FUEL_PACKS.map((pack) => ({
    ...pack,
    stripePriceId: 
      pack.id === 'fuel_500' ? process.env.STRIPE_PRICE_FUEL_500 || null :
      pack.id === 'fuel_2500' ? process.env.STRIPE_PRICE_FUEL_2500 || null :
      pack.id === 'fuel_10000' ? process.env.STRIPE_PRICE_FUEL_10000 || null :
      null,
  }))
}

// ============================================
// BILLING TRANSACTIONS
// ============================================

export type BillingTransactionType =
  | 'subscription_refill'
  | 'daily_refill'
  | 'purchase'
  | 'usage'
  | 'refund'
  | 'bonus'
  | 'adjustment'

export interface BillingTransaction {
  id: string
  userId: string
  projectId: string | null
  type: BillingTransactionType
  amount: number // Positive = credit, negative = debit
  balanceAfter: number
  description: string | null
  stripePaymentIntentId: string | null
  stripeInvoiceId: string | null
  metadata: Record<string, unknown>
  createdAt: Date
}

// ============================================
// FUEL BALANCE
// ============================================

export interface FuelBalance {
  id: string
  userId: string
  currentFuel: number
  lifetimeFuelPurchased: number
  lifetimeFuelUsed: number
  lastDailyRefillAt: Date | null
  lastMonthlyRefillAt: Date | null
  userTimezone: string
  createdAt: Date
  updatedAt: Date
}

// ============================================
// SUBSCRIPTION
// ============================================

export interface Subscription {
  id: string
  userId: string
  stripeSubscriptionId: string | null
  stripePriceId: string | null
  tier: SubscriptionTier
  status: SubscriptionStatus
  monthlyFuelAllowance: number
  currentPeriodStart: Date | null
  currentPeriodEnd: Date | null
  cancelAtPeriodEnd: boolean
  trialEnd: Date | null
  createdAt: Date
  updatedAt: Date
}

// ============================================
// STRIPE CUSTOMER
// ============================================

export interface StripeCustomer {
  id: string
  userId: string
  stripeCustomerId: string
  createdAt: Date
}

// ============================================
// CHECKOUT SESSION TYPES
// ============================================

export type CheckoutMode = 'subscription' | 'payment'

export interface CreateCheckoutParams {
  userId: string
  email: string
  mode: CheckoutMode
  priceId?: string // For subscriptions
  fuelPackId?: string // For one-time fuel purchases
  successUrl: string
  cancelUrl: string
}

export interface CheckoutResult {
  sessionId: string
  url: string
}

// ============================================
// WEBHOOK EVENTS
// ============================================

export interface WebhookEventData {
  userId: string
  stripeCustomerId: string
  subscriptionId?: string
  invoiceId?: string
  paymentIntentId?: string
  amount?: number
  tier?: SubscriptionTier
  fuelAmount?: number
  periodStart?: Date
  periodEnd?: Date
}

// ============================================
// API REQUEST/RESPONSE TYPES
// ============================================

export interface CheckoutRequest {
  mode: CheckoutMode
  tier?: SubscriptionTier // For subscription mode
  fuelPackId?: string // For payment mode
}

export interface CheckoutResponse {
  success: boolean
  sessionId?: string
  url?: string
  error?: string
}

export interface FuelBalanceResponse {
  currentFuel: number
  tier: SubscriptionTier
  status: SubscriptionStatus
  nextRefillAt: Date | null
  canPurchaseFuel: boolean
}

export interface UseFuelRequest {
  projectId: string
  amount: number
  description: string
  metadata?: Record<string, unknown>
}

export interface UseFuelResponse {
  success: boolean
  newBalance?: number
  error?: string
}
