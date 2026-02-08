'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Zap, Users, Building2, Shield, Loader2 } from 'lucide-react'

/**
 * PricingSection — Landing Page Pricing
 * 
 * Design principles:
 * - Calm, confident. No urgency tricks.
 * - Fuel-based, not seat-based.
 * - Auditor guarantee front and center.
 * - "Of course this costs money — it already saved me time."
 */

// ============================================
// PRICING DATA
// ============================================

interface PricingTier {
  id: 'free' | 'pro' | 'team' | 'enterprise'
  name: string
  price: number | null // null = custom
  period: string
  fuel: string
  fuelNote: string
  description: string
  features: string[]
  cta: string
  popular?: boolean
  icon: typeof Zap
}

const FUEL_REFERENCE = [
  { label: 'Small patch', range: '50-150 fuel', output: 'Bug fix + validation pass' },
  { label: 'Feature slice', range: '300-900 fuel', output: '1 scoped feature with tests' },
  { label: 'MVP sprint', range: '2,500-8,000 fuel', output: 'Core app flows and export prep' },
]

const ROI_EXAMPLES = [
  { scenario: 'Landing + auth scaffold', saved: '8-12 engineering hours' },
  { scenario: 'Billing + webhook wiring', saved: '12-20 engineering hours' },
  { scenario: 'Audit-ready release package', saved: '6-10 QA/compliance hours' },
]

const TIERS: PricingTier[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: '',
    fuel: '100',
    fuelNote: 'per day',
    description: 'Try TORBIT. No credit card.',
    features: [
      'All AI models',
      'Unlimited projects',
      'Live preview in browser',
      'Export to GitHub',
      'Audit ledger included',
    ],
    cta: 'Start Building',
    icon: Zap,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 29,
    period: '/mo',
    fuel: '5,000',
    fuelNote: 'per month',
    description: 'For builders who ship regularly.',
    features: [
      'Everything in Free',
      'Export to Xcode (iOS)',
      'Deploy to Vercel & Netlify',
      'Buy fuel packs anytime',
      'Priority support',
    ],
    cta: 'Start Pro',
    popular: true,
    icon: Zap,
  },
  {
    id: 'team',
    name: 'Team',
    price: 99,
    period: '/mo',
    fuel: '25,000',
    fuelNote: 'shared pool',
    description: 'For teams building together.',
    features: [
      'Everything in Pro',
      'Up to 5 team members',
      'Shared fuel pool',
      'Usage analytics',
      'Team audit trail',
    ],
    cta: 'Start Team',
    icon: Users,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: null,
    period: '',
    fuel: 'Custom',
    fuelNote: 'allocation',
    description: 'For organizations with compliance needs.',
    features: [
      'Everything in Team',
      'Unlimited members',
      'Custom fuel allocation',
      'SSO / SAML',
      'SLA guarantees',
      'Dedicated support',
    ],
    cta: 'Contact Sales',
    icon: Building2,
  },
]

// ============================================
// COMPONENT
// ============================================

export default function PricingSection() {
  const router = useRouter()
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly')
  const [loadingTier, setLoadingTier] = useState<string | null>(null)
  const annualDiscount = 0.17 // 17% off = ~2 months free

  const getPrice = (tier: PricingTier) => {
    if (tier.price === null || tier.price === 0) return tier.price
    if (billingPeriod === 'annual') {
      return Math.round(tier.price * (1 - annualDiscount))
    }
    return tier.price
  }

  const handleCTA = async (tier: PricingTier) => {
    // Free tier — go to dashboard to start building
    if (tier.id === 'free') {
      router.push('/dashboard')
      return
    }
    
    // Enterprise — contact page
    if (tier.id === 'enterprise') {
      router.push('/contact?plan=enterprise')
      return
    }
    
    // Pro/Team — Stripe checkout
    setLoadingTier(tier.id)
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'subscription',
          tier: tier.id,
        }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        // If unauthorized, redirect to login
        if (response.status === 401) {
          router.push(`/login?redirect=/dashboard/billing&plan=${tier.id}`)
          return
        }
        console.error('Checkout error:', data.error)
        return
      }
      
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error('Checkout error:', error)
    } finally {
      setLoadingTier(null)
    }
  }

  return (
    <section id="pricing" className="relative py-24 px-6">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-neutral-950/50 to-transparent" />
      
      <div className="relative max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-semibold text-white mb-4">
            Fuel your builds
          </h2>
          <p className="text-neutral-400 text-lg max-w-2xl mx-auto mb-8">
            Pay for what you use. If the Auditor rejects a build, you don&apos;t pay for it.
          </p>
          
          {/* Auditor Guarantee Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-900 border border-neutral-800 rounded-full">
            <Shield className="w-4 h-4 text-emerald-500" />
            <span className="text-sm text-neutral-300">
              Auditor Guarantee: Rejected builds are free
            </span>
          </div>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-3 mb-12">
          <span className={`text-sm ${billingPeriod === 'monthly' ? 'text-white' : 'text-neutral-500'}`}>
            Monthly
          </span>
          <button
            onClick={() => setBillingPeriod(billingPeriod === 'monthly' ? 'annual' : 'monthly')}
            className="relative w-12 h-6 bg-neutral-800 rounded-full transition-colors"
            aria-label="Toggle billing period"
          >
            <motion.div
              className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full"
              animate={{ x: billingPeriod === 'annual' ? 24 : 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </button>
          <span className={`text-sm ${billingPeriod === 'annual' ? 'text-white' : 'text-neutral-500'}`}>
            Annual
          </span>
          <AnimatePresence>
            {billingPeriod === 'annual' && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="text-xs text-emerald-500 font-medium"
              >
                Save 17%
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {TIERS.map((tier, index) => (
            <motion.div
              key={tier.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className={`relative flex flex-col p-6 rounded-2xl border ${
                tier.popular
                  ? 'bg-neutral-900 border-[#c0c0c0]/30'
                  : 'bg-neutral-950 border-neutral-800'
              }`}
            >
              {/* Popular Badge */}
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 bg-[#c0c0c0] text-black text-xs font-medium rounded-full">
                    Most Popular
                  </span>
                </div>
              )}

              {/* Tier Header */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <tier.icon className={`w-5 h-5 ${tier.popular ? 'text-[#c0c0c0]' : 'text-neutral-500'}`} />
                  <h3 className="text-lg font-semibold text-white">{tier.name}</h3>
                </div>
                <p className="text-sm text-neutral-500">{tier.description}</p>
              </div>

              {/* Price */}
              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  {tier.price === null ? (
                    <span className="text-3xl font-semibold text-white">Custom</span>
                  ) : tier.price === 0 ? (
                    <span className="text-3xl font-semibold text-white">$0</span>
                  ) : (
                    <>
                      <span className="text-3xl font-semibold text-white">
                        ${getPrice(tier)}
                      </span>
                      <span className="text-neutral-500">{tier.period}</span>
                    </>
                  )}
                </div>
                
                {/* Fuel Allocation */}
                <div className="flex items-center gap-2 mt-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span className="text-sm text-neutral-300">
                    {tier.fuel} fuel
                  </span>
                  <span className="text-xs text-neutral-600">
                    {tier.fuelNote}
                  </span>
                </div>
              </div>

              {/* Features */}
              <ul className="flex-1 space-y-3 mb-6">
                {tier.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-neutral-400">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <button
                onClick={() => handleCTA(tier)}
                disabled={loadingTier === tier.id}
                className={`w-full py-3 px-4 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                  tier.popular
                    ? 'bg-[#c0c0c0] text-black hover:bg-white'
                    : tier.id === 'enterprise'
                    ? 'bg-neutral-800 text-white hover:bg-neutral-700 border border-neutral-700'
                    : 'bg-neutral-900 text-white hover:bg-neutral-800 border border-neutral-800'
                }`}
              >
                {loadingTier === tier.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  tier.cta
                )}
              </button>
            </motion.div>
          ))}
        </div>

        {/* Bottom Note */}
        <div className="mt-16 text-center space-y-10">
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Fuel reference</h3>
            <div className="grid md:grid-cols-3 gap-3 text-left">
              {FUEL_REFERENCE.map((item) => (
                <div key={item.label} className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
                  <p className="text-sm text-white font-medium mb-1">{item.label}</p>
                  <p className="text-xs text-amber-400 mb-2">{item.range}</p>
                  <p className="text-xs text-neutral-400">{item.output}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Typical ROI snapshots</h3>
            <div className="grid md:grid-cols-3 gap-3 text-left">
              {ROI_EXAMPLES.map((item) => (
                <div key={item.scenario} className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
                  <p className="text-sm text-white font-medium mb-1">{item.scenario}</p>
                  <p className="text-xs text-emerald-400">{item.saved}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-sm text-neutral-500 max-w-xl mx-auto">
            All plans include the full audit ledger, verification proofs, and export bundles. 
            Fuel packs can be purchased anytime on Pro and Team plans.
          </p>
        </div>
      </div>
    </section>
  )
}
