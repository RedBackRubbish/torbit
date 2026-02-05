'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Zap, 
  Check, 
  CreditCard, 
  ArrowUpRight, 
  Shield, 
  Clock,
  TrendingUp,
  ChevronRight,
  Loader2,
  AlertCircle
} from 'lucide-react'
import { useFuelStore } from '@/store/fuel'

// ============================================
// TYPES
// ============================================

interface BillingStatus {
  tier: 'free' | 'pro' | 'team' | 'enterprise'
  status: 'active' | 'canceled' | 'past_due' | 'trialing'
  currentPeriodEnd: string | null
  fuelBalance: number
  fuelAllowance: number
  nextRefill: string | null
}

interface FuelTransaction {
  id: string
  type: 'usage' | 'refill' | 'purchase' | 'refund'
  amount: number
  description: string
  timestamp: string
  model?: string
}

// ============================================
// MAIN COMPONENT
// ============================================

function BillingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [billingStatus, setBillingStatus] = useState<BillingStatus | null>(null)
  const [transactions, setTransactions] = useState<FuelTransaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUpgrading, setIsUpgrading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  
  const { currentFuel, maxFuel, tier: localTier, getFuelPercentage } = useFuelStore()
  
  // Map FuelTier to BillingStatus tier
  const mappedTier = (localTier === 'standard' ? 'free' : localTier) as BillingStatus['tier']

  // Check for checkout success
  useEffect(() => {
    if (searchParams.get('checkout') === 'success') {
      setShowSuccess(true)
      // Clear the URL param
      router.replace('/dashboard/billing')
      setTimeout(() => setShowSuccess(false), 5000)
    }
  }, [searchParams, router])

  // Fetch billing status
  useEffect(() => {
    const fetchBilling = async () => {
      try {
        const response = await fetch('/api/billing/status')
        if (response.ok) {
          const data = await response.json()
          setBillingStatus(data)
          setTransactions(data.recentTransactions || [])
        } else {
          // Fallback to local state
          setBillingStatus({
            tier: mappedTier,
            status: 'active',
            currentPeriodEnd: null,
            fuelBalance: currentFuel,
            fuelAllowance: maxFuel,
            nextRefill: null,
          })
        }
      } catch {
        // Fallback to local state
        setBillingStatus({
          tier: mappedTier,
          status: 'active',
          currentPeriodEnd: null,
          fuelBalance: currentFuel,
          fuelAllowance: maxFuel,
          nextRefill: null,
        })
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchBilling()
  }, [currentFuel, maxFuel, mappedTier])

  const handleUpgrade = async (targetTier: 'pro' | 'team') => {
    setIsUpgrading(true)
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'subscription',
          tier: targetTier,
        }),
      })
      
      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error('Upgrade failed:', error)
    } finally {
      setIsUpgrading(false)
    }
  }

  const handleManageBilling = async () => {
    try {
      const response = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error('Portal redirect failed:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 text-neutral-500 animate-spin" />
      </div>
    )
  }

  const percentage = getFuelPercentage()
  const tierConfig = {
    free: { name: 'Free', color: 'text-neutral-400', bg: 'bg-neutral-800' },
    pro: { name: 'Pro', color: 'text-[#c0c0c0]', bg: 'bg-[#c0c0c0]/10' },
    team: { name: 'Team', color: 'text-purple-400', bg: 'bg-purple-500/10' },
    enterprise: { name: 'Enterprise', color: 'text-amber-400', bg: 'bg-amber-500/10' },
  }[billingStatus?.tier || 'free']

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Success Banner */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl"
          >
            <Check className="w-5 h-5 text-emerald-500" />
            <span className="text-emerald-400">Payment successful. Your account has been updated.</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-white">Billing & Usage</h1>
        <p className="text-neutral-500 mt-1">Manage your subscription and fuel balance</p>
      </div>

      {/* Current Plan Card */}
      <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-2xl">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${tierConfig.bg} ${tierConfig.color}`}>
                {tierConfig.name}
              </span>
              {billingStatus?.status === 'active' && (
                <span className="px-2 py-0.5 text-xs text-emerald-500 bg-emerald-500/10 rounded-full">
                  Active
                </span>
              )}
            </div>
            <h2 className="text-lg font-medium text-white">Current Plan</h2>
          </div>
          
          {billingStatus?.tier !== 'enterprise' && billingStatus?.tier !== 'team' && (
            <button
              onClick={() => handleUpgrade(billingStatus?.tier === 'free' ? 'pro' : 'team')}
              disabled={isUpgrading}
              className="flex items-center gap-2 px-4 py-2 bg-[#c0c0c0] text-black text-sm font-medium rounded-lg hover:bg-white transition-colors disabled:opacity-50"
            >
              {isUpgrading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowUpRight className="w-4 h-4" />
              )}
              Upgrade
            </button>
          )}
        </div>

        {/* Fuel Gauge */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <span className="text-neutral-300">Fuel Balance</span>
            </div>
            <span className="text-white font-medium">
              {billingStatus?.fuelBalance.toLocaleString()} / {billingStatus?.fuelAllowance.toLocaleString()}
            </span>
          </div>
          
          <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>

          {billingStatus?.nextRefill && (
            <div className="flex items-center gap-2 text-xs text-neutral-500">
              <Clock className="w-3 h-3" />
              <span>Refills {billingStatus.nextRefill}</span>
            </div>
          )}
        </div>

        {/* Auditor Guarantee */}
        <div className="flex items-center gap-2 mt-6 pt-6 border-t border-neutral-800">
          <Shield className="w-4 h-4 text-emerald-500" />
          <span className="text-sm text-neutral-400">
            Auditor Guarantee: Rejected builds don't consume fuel
          </span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Buy Fuel */}
        <button
          onClick={() => router.push('/dashboard/billing/fuel')}
          className="flex items-center gap-4 p-4 bg-neutral-900 border border-neutral-800 rounded-xl hover:border-neutral-700 transition-colors text-left"
        >
          <div className="p-3 bg-amber-500/10 rounded-lg">
            <Zap className="w-5 h-5 text-amber-500" />
          </div>
          <div className="flex-1">
            <span className="text-white font-medium">Buy Fuel Packs</span>
            <p className="text-neutral-500 text-sm mt-0.5">One-time purchases from $9</p>
          </div>
          <ChevronRight className="w-5 h-5 text-neutral-600" />
        </button>

        {/* Manage Billing */}
        {billingStatus?.tier !== 'free' && (
          <button
            onClick={handleManageBilling}
            className="flex items-center gap-4 p-4 bg-neutral-900 border border-neutral-800 rounded-xl hover:border-neutral-700 transition-colors text-left"
          >
            <div className="p-3 bg-neutral-800 rounded-lg">
              <CreditCard className="w-5 h-5 text-neutral-400" />
            </div>
            <div className="flex-1">
              <span className="text-white font-medium">Payment Settings</span>
              <p className="text-neutral-500 text-sm mt-0.5">Update card, view invoices</p>
            </div>
            <ChevronRight className="w-5 h-5 text-neutral-600" />
          </button>
        )}
      </div>

      {/* Usage History */}
      <div className="p-6 bg-neutral-900 border border-neutral-800 rounded-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-white">Recent Usage</h3>
          <TrendingUp className="w-4 h-4 text-neutral-500" />
        </div>

        {transactions.length > 0 ? (
          <div className="space-y-3">
            {transactions.slice(0, 10).map((tx) => (
              <div key={tx.id} className="flex items-center justify-between py-3 border-b border-neutral-800 last:border-0">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    tx.type === 'usage' ? 'bg-amber-500' :
                    tx.type === 'refill' ? 'bg-emerald-500' :
                    tx.type === 'refund' ? 'bg-blue-500' :
                    'bg-purple-500'
                  }`} />
                  <div>
                    <span className="text-sm text-white">{tx.description}</span>
                    {tx.model && (
                      <span className="ml-2 text-xs text-neutral-600">via {tx.model}</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-sm font-medium ${
                    tx.amount > 0 ? 'text-emerald-400' : 'text-neutral-400'
                  }`}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount}
                  </span>
                  <p className="text-xs text-neutral-600">{tx.timestamp}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-neutral-500">
            <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">No usage yet. Start building to see activity.</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================
// PAGE EXPORT
// ============================================

export default function BillingPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 text-neutral-500 animate-spin" />
      </div>
    }>
      <BillingContent />
    </Suspense>
  )
}
