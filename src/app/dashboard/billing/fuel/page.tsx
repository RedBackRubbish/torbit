'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Zap, ArrowLeft, Loader2, Check, Shield } from 'lucide-react'

// ============================================
// FUEL PACKS
// ============================================

interface FuelPack {
  id: string
  name: string
  amount: number
  price: number
  description: string
  popular?: boolean
}

const FUEL_PACKS: FuelPack[] = [
  {
    id: 'fuel_500',
    name: 'Emergency Rod',
    amount: 500,
    price: 9,
    description: 'Quick fixes & patches',
  },
  {
    id: 'fuel_2500',
    name: 'Jerry Can',
    amount: 2500,
    price: 29,
    description: 'Feature build & refactor',
    popular: true,
  },
  {
    id: 'fuel_10000',
    name: 'Reactor Core',
    amount: 10000,
    price: 99,
    description: 'Full MVP development',
  },
]

// ============================================
// COMPONENT
// ============================================

export default function FuelPacksPage() {
  const router = useRouter()
  const [selectedPack, setSelectedPack] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const handlePurchase = async (pack: FuelPack) => {
    setSelectedPack(pack.id)
    setIsProcessing(true)

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'payment',
          fuelPackId: pack.id,
        }),
      })

      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error('No checkout URL returned')
      }
    } catch (error) {
      console.error('Purchase failed:', error)
      setIsProcessing(false)
      setSelectedPack(null)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Back Button */}
      <button
        onClick={() => router.push('/dashboard/billing')}
        className="flex items-center gap-2 text-neutral-500 hover:text-neutral-300 transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm">Back to Billing</span>
      </button>

      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-amber-500/10 rounded-2xl mb-4">
          <Zap className="w-7 h-7 text-amber-500" />
        </div>
        <h1 className="text-2xl font-semibold text-white mb-2">Fuel Packs</h1>
        <p className="text-neutral-500">One-time purchases. No subscription required.</p>
      </div>

      {/* Fuel Packs */}
      <div className="space-y-4 mb-8">
        {FUEL_PACKS.map((pack, index) => (
          <motion.button
            key={pack.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => handlePurchase(pack)}
            disabled={isProcessing}
            className={`relative w-full flex items-center gap-4 p-5 rounded-xl border transition-all text-left ${
              pack.popular
                ? 'bg-[#c0c0c0]/5 border-[#c0c0c0]/30 hover:border-[#c0c0c0]/60'
                : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700'
            } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {/* Popular Badge */}
            {pack.popular && (
              <div className="absolute -top-2.5 right-4">
                <span className="px-2 py-0.5 bg-[#c0c0c0] text-black text-[10px] font-medium rounded-full uppercase tracking-wide">
                  Popular
                </span>
              </div>
            )}

            {/* Amount */}
            <div className={`flex items-center justify-center w-14 h-14 rounded-xl ${
              pack.popular ? 'bg-[#c0c0c0]/10' : 'bg-neutral-800'
            }`}>
              <div className="text-center">
                <Zap className={`w-5 h-5 mx-auto mb-0.5 ${pack.popular ? 'text-[#c0c0c0]' : 'text-amber-500'}`} />
                <span className={`text-xs font-medium ${pack.popular ? 'text-[#c0c0c0]' : 'text-neutral-400'}`}>
                  {(pack.amount / 1000).toFixed(pack.amount < 1000 ? 1 : 0)}k
                </span>
              </div>
            </div>

            {/* Details */}
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-white font-medium">{pack.name}</span>
                <span className="text-neutral-500">·</span>
                <span className="text-amber-500 text-sm">{pack.amount.toLocaleString()} fuel</span>
              </div>
              <p className="text-neutral-500 text-sm mt-0.5">{pack.description}</p>
            </div>

            {/* Price / Loading */}
            <div className="flex items-center gap-3">
              {isProcessing && selectedPack === pack.id ? (
                <Loader2 className="w-5 h-5 text-neutral-500 animate-spin" />
              ) : (
                <span className="text-xl font-semibold text-white">${pack.price}</span>
              )}
            </div>
          </motion.button>
        ))}
      </div>

      {/* Guarantee */}
      <div className="flex items-center justify-center gap-2 p-4 bg-neutral-900/50 border border-neutral-800 rounded-xl">
        <Shield className="w-4 h-4 text-emerald-500" />
        <span className="text-sm text-neutral-400">
          Auditor Guarantee: Rejected builds don't consume fuel
        </span>
      </div>

      {/* Fine Print */}
      <p className="text-center text-xs text-neutral-600 mt-6">
        Fuel packs never expire. Available on Pro and Team plans, or as standalone purchases.
      </p>
    </div>
  )
}
