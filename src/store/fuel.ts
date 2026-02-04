import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

// ============================================
// TORBIT FUEL SYSTEM
// "If the Auditor rejects it, you don't pay for the Build"
// ============================================

export type FuelTier = 'standard' | 'pro' | 'enterprise'

export interface FuelTransaction {
  id: string
  type: 'planner' | 'auditor' | 'builder' | 'refund' | 'topup'
  amount: number
  status: 'pending' | 'finalized' | 'refunded'
  description: string
  agentId?: string
  taskId?: string
  timestamp: number
}

export interface FuelState {
  // Current fuel levels
  currentFuel: number
  maxFuel: number
  tier: FuelTier
  
  // Ghost usage (pre-flight estimate shown on hover)
  ghostUsage: number
  estimatedRange: { min: number; max: number } | null
  
  // Pending builder costs (held until auditor approves)
  pendingBuilderCost: number
  pendingTransactions: FuelTransaction[]
  
  // Transaction history
  transactions: FuelTransaction[]
  
  // Status flags
  isEstimating: boolean
  isAuditorChecking: boolean
  showAuthorizeBurn: boolean
  pendingTaskDescription: string | null
}

export interface FuelActions {
  // Pre-flight estimation
  estimateCost: (complexity: 'low' | 'medium' | 'high', description?: string) => { min: number; max: number }
  clearEstimate: () => void
  
  // Authorization flow
  showBurnAuthorization: (description: string, estimate: { min: number; max: number }) => void
  authorizeBurn: () => void
  cancelBurn: () => void
  
  // Fuel consumption
  deductPlanner: (amount: number, description: string) => boolean
  deductAuditor: (amount: number, description: string) => boolean
  holdBuilderCost: (amount: number, taskId: string, description: string) => string // Returns transaction ID
  
  // Auditor Guarantee
  finalizeBuilderCost: (transactionId: string) => void // Auditor approved - charge user
  refundBuilderCost: (transactionId: string) => void // Auditor rejected - refund user
  
  // Admin
  topUp: (amount: number) => void
  setTier: (tier: FuelTier) => void
  
  // Computed
  getFuelPercentage: () => number
  getFuelStatus: () => 'full' | 'good' | 'low' | 'critical'
  canAfford: (amount: number) => boolean
}

// Cost multipliers by complexity
const COMPLEXITY_COSTS = {
  low: { min: 5, max: 15 },
  medium: { min: 20, max: 60 },
  high: { min: 80, max: 200 },
} as const

// Tier configurations
const TIER_CONFIG = {
  standard: { maxFuel: 1000, monthlyPrice: 20 },
  pro: { maxFuel: 5000, monthlyPrice: 50 },
  enterprise: { maxFuel: 25000, monthlyPrice: 200 },
} as const

export const useFuelStore = create<FuelState & FuelActions>()(
  persist(
    immer((set, get) => ({
      // Initial state
      currentFuel: 1000,
      maxFuel: 1000,
      tier: 'standard' as FuelTier,
      ghostUsage: 0,
      estimatedRange: null,
      pendingBuilderCost: 0,
      pendingTransactions: [],
      transactions: [],
      isEstimating: false,
      isAuditorChecking: false,
      showAuthorizeBurn: false,
      pendingTaskDescription: null,

      // ============================================
      // PRE-FLIGHT ESTIMATION
      // ============================================
      
      estimateCost: (complexity, description) => {
        const range = COMPLEXITY_COSTS[complexity]
        set((state) => {
          state.ghostUsage = Math.round((range.min + range.max) / 2)
          state.estimatedRange = range
          state.isEstimating = true
        })
        return range
      },

      clearEstimate: () => {
        set((state) => {
          state.ghostUsage = 0
          state.estimatedRange = null
          state.isEstimating = false
        })
      },

      // ============================================
      // AUTHORIZATION FLOW
      // ============================================
      
      showBurnAuthorization: (description, estimate) => {
        set((state) => {
          state.showAuthorizeBurn = true
          state.pendingTaskDescription = description
          state.estimatedRange = estimate
          state.ghostUsage = Math.round((estimate.min + estimate.max) / 2)
        })
      },

      authorizeBurn: () => {
        set((state) => {
          state.showAuthorizeBurn = false
          // Task is now authorized to run
        })
      },

      cancelBurn: () => {
        set((state) => {
          state.showAuthorizeBurn = false
          state.pendingTaskDescription = null
          state.ghostUsage = 0
          state.estimatedRange = null
        })
      },

      // ============================================
      // FUEL CONSUMPTION
      // ============================================
      
      deductPlanner: (amount, description) => {
        const state = get()
        if (state.currentFuel < amount) return false
        
        const transaction: FuelTransaction = {
          id: `txn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          type: 'planner',
          amount,
          status: 'finalized',
          description,
          timestamp: Date.now(),
        }
        
        set((s) => {
          s.currentFuel -= amount
          s.transactions.unshift(transaction)
        })
        
        return true
      },

      deductAuditor: (amount, description) => {
        const state = get()
        if (state.currentFuel < amount) return false
        
        const transaction: FuelTransaction = {
          id: `txn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          type: 'auditor',
          amount,
          status: 'finalized',
          description,
          timestamp: Date.now(),
        }
        
        set((s) => {
          s.currentFuel -= amount
          s.transactions.unshift(transaction)
          s.isAuditorChecking = true
        })
        
        return true
      },

      holdBuilderCost: (amount, taskId, description) => {
        const transaction: FuelTransaction = {
          id: `txn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          type: 'builder',
          amount,
          status: 'pending',
          description,
          taskId,
          timestamp: Date.now(),
        }
        
        set((s) => {
          s.pendingBuilderCost += amount
          s.pendingTransactions.push(transaction)
        })
        
        return transaction.id
      },

      // ============================================
      // AUDITOR GUARANTEE
      // ============================================
      
      finalizeBuilderCost: (transactionId) => {
        set((s) => {
          const txnIndex = s.pendingTransactions.findIndex(t => t.id === transactionId)
          if (txnIndex === -1) return
          
          const txn = s.pendingTransactions[txnIndex]
          txn.status = 'finalized'
          
          // Actually deduct the fuel now
          s.currentFuel -= txn.amount
          s.pendingBuilderCost -= txn.amount
          
          // Move to finalized transactions
          s.transactions.unshift(txn)
          s.pendingTransactions.splice(txnIndex, 1)
          s.isAuditorChecking = false
        })
      },

      refundBuilderCost: (transactionId) => {
        set((s) => {
          const txnIndex = s.pendingTransactions.findIndex(t => t.id === transactionId)
          if (txnIndex === -1) return
          
          const txn = s.pendingTransactions[txnIndex]
          txn.status = 'refunded'
          
          // Don't deduct - this is the "Auditor Guarantee"
          s.pendingBuilderCost -= txn.amount
          
          // Log refund transaction
          const refundTxn: FuelTransaction = {
            id: `txn_${Date.now()}_refund`,
            type: 'refund',
            amount: 0, // No cost to user!
            status: 'finalized',
            description: `Build rejected by Auditor - ${txn.description}`,
            timestamp: Date.now(),
          }
          s.transactions.unshift(refundTxn)
          s.pendingTransactions.splice(txnIndex, 1)
          s.isAuditorChecking = false
        })
      },

      // ============================================
      // ADMIN
      // ============================================
      
      topUp: (amount) => {
        set((s) => {
          s.currentFuel = Math.min(s.currentFuel + amount, s.maxFuel)
          s.transactions.unshift({
            id: `txn_${Date.now()}_topup`,
            type: 'topup',
            amount,
            status: 'finalized',
            description: 'Fuel top-up',
            timestamp: Date.now(),
          })
        })
      },

      setTier: (tier) => {
        set((s) => {
          s.tier = tier
          s.maxFuel = TIER_CONFIG[tier].maxFuel
          s.currentFuel = TIER_CONFIG[tier].maxFuel // Full tank on upgrade
        })
      },

      // ============================================
      // COMPUTED
      // ============================================
      
      getFuelPercentage: () => {
        const { currentFuel, maxFuel } = get()
        return Math.round((currentFuel / maxFuel) * 100)
      },

      getFuelStatus: () => {
        const percentage = get().getFuelPercentage()
        if (percentage > 75) return 'full'
        if (percentage > 40) return 'good'
        if (percentage > 15) return 'low'
        return 'critical'
      },

      canAfford: (amount) => {
        return get().currentFuel >= amount
      },
    })),
    {
      name: 'torbit-fuel',
      partialize: (state) => ({
        currentFuel: state.currentFuel,
        maxFuel: state.maxFuel,
        tier: state.tier,
        transactions: state.transactions.slice(0, 100), // Keep last 100
      }),
    }
  )
)

// Convenience hooks
export const useFuelStatus = () => useFuelStore((s) => s.getFuelStatus())
export const useFuelPercentage = () => useFuelStore((s) => s.getFuelPercentage())
export const useCanAfford = (amount: number) => useFuelStore((s) => s.canAfford(amount))
