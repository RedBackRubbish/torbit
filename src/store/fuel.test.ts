import { describe, it, expect, beforeEach } from 'vitest'
import { useFuelStore, calculateFuelCost, checkCircuitBreaker, MODEL_COST_MULTIPLIERS, CIRCUIT_BREAKERS } from './fuel'

describe('FuelStore', () => {
  beforeEach(() => {
    // Reset store to initial state (matches actual initial values)
    useFuelStore.setState({
      currentFuel: 1000,
      maxFuel: 1000,
      tier: 'standard',
      ghostUsage: 0,
      estimatedRange: null,
      pendingBuilderCost: 0,
      pendingTransactions: [],
      transactions: [],
      isEstimating: false,
      isAuditorChecking: false,
      showAuthorizeBurn: false,
      pendingTaskDescription: null,
    })
  })

  describe('Initial State', () => {
    it('should have correct initial values', () => {
      const state = useFuelStore.getState()
      expect(state.currentFuel).toBe(1000)
      expect(state.maxFuel).toBe(1000)
      expect(state.tier).toBe('standard')
    })
  })

  describe('Fuel Estimation', () => {
    it('should estimate costs for low complexity tasks', () => {
      const { estimateCost } = useFuelStore.getState()
      const estimate = estimateCost('low')
      
      expect(estimate.min).toBeGreaterThan(0)
      expect(estimate.max).toBeGreaterThan(estimate.min)
      expect(estimate.max).toBeLessThanOrEqual(20)
    })

    it('should estimate costs for medium complexity tasks', () => {
      const { estimateCost } = useFuelStore.getState()
      const estimate = estimateCost('medium')
      
      expect(estimate.min).toBeGreaterThanOrEqual(15)
      expect(estimate.max).toBeLessThanOrEqual(80)
    })

    it('should estimate costs for high complexity tasks', () => {
      const { estimateCost } = useFuelStore.getState()
      const estimate = estimateCost('high')
      
      expect(estimate.min).toBeGreaterThanOrEqual(60)
      expect(estimate.max).toBeLessThanOrEqual(300)
    })

    it('should set ghost usage and estimated range', () => {
      const store = useFuelStore.getState()
      store.estimateCost('medium', 'Create a new component')
      
      const state = useFuelStore.getState()
      expect(state.ghostUsage).toBeGreaterThan(0)
      expect(state.estimatedRange).not.toBeNull()
    })

    it('should clear estimate', () => {
      const store = useFuelStore.getState()
      store.estimateCost('high')
      store.clearEstimate()
      
      const state = useFuelStore.getState()
      expect(state.ghostUsage).toBe(0)
      expect(state.estimatedRange).toBeNull()
    })
  })

  describe('Fuel Deduction', () => {
    it('should deduct planner fuel', () => {
      const store = useFuelStore.getState()
      const initialFuel = store.currentFuel
      
      const success = store.deductPlanner(10, 'Planning task')
      
      expect(success).toBe(true)
      expect(useFuelStore.getState().currentFuel).toBe(initialFuel - 10)
    })

    it('should deduct auditor fuel', () => {
      const store = useFuelStore.getState()
      const initialFuel = store.currentFuel
      
      const success = store.deductAuditor(15, 'Auditing code')
      
      expect(success).toBe(true)
      expect(useFuelStore.getState().currentFuel).toBe(initialFuel - 15)
    })

    it('should fail deduction when insufficient fuel', () => {
      useFuelStore.setState({ currentFuel: 5 })
      const store = useFuelStore.getState()
      
      const success = store.deductPlanner(10, 'Big task')
      
      expect(success).toBe(false)
      expect(useFuelStore.getState().currentFuel).toBe(5) // Unchanged
    })

    it('should track transactions', () => {
      const initialCount = useFuelStore.getState().transactions.length
      const store = useFuelStore.getState()
      store.deductPlanner(10, 'Task 1')
      store.deductAuditor(5, 'Task 2')
      
      const state = useFuelStore.getState()
      expect(state.transactions.length).toBe(initialCount + 2)
    })
  })

  describe('Builder Cost Management (Auditor Guarantee)', () => {
    it('should hold builder cost (not deduct until finalized)', () => {
      const store = useFuelStore.getState()
      const initialFuel = store.currentFuel
      
      const txId = store.holdBuilderCost(50, 'task-123', 'Building component')
      
      expect(txId).toBeTruthy()
      expect(useFuelStore.getState().pendingBuilderCost).toBe(50)
      // Fuel is NOT deducted yet - this is the Auditor Guarantee
      expect(useFuelStore.getState().currentFuel).toBe(initialFuel)
    })

    it('should finalize builder cost and deduct fuel (auditor approved)', () => {
      const store = useFuelStore.getState()
      const initialFuel = store.currentFuel
      const txId = store.holdBuilderCost(50, 'task-123', 'Building')
      
      // Before finalization - fuel not deducted
      expect(useFuelStore.getState().currentFuel).toBe(initialFuel)
      
      store.finalizeBuilderCost(txId)
      
      const state = useFuelStore.getState()
      expect(state.pendingBuilderCost).toBe(0)
      expect(state.currentFuel).toBe(initialFuel - 50) // Now deducted
      // Transaction should be finalized
      const tx = state.transactions.find(t => t.id === txId)
      expect(tx?.status).toBe('finalized')
    })

    it('should refund builder cost (auditor rejected)', () => {
      const store = useFuelStore.getState()
      const initialFuel = store.currentFuel
      const txId = store.holdBuilderCost(50, 'task-123', 'Building')
      
      store.refundBuilderCost(txId)
      
      const state = useFuelStore.getState()
      expect(state.pendingBuilderCost).toBe(0)
      expect(state.currentFuel).toBe(initialFuel) // Fuel refunded
      
      // Should have refund transaction
      const refundTx = state.transactions.find(t => t.type === 'refund')
      expect(refundTx).toBeTruthy()
    })
  })

  describe('Top Up', () => {
    it('should top up fuel', () => {
      useFuelStore.setState({ currentFuel: 100 })
      const store = useFuelStore.getState()
      
      store.topUp(200)
      
      expect(useFuelStore.getState().currentFuel).toBe(300)
    })

    it('should not exceed max fuel', () => {
      const store = useFuelStore.getState()
      store.topUp(10000)
      
      const state = useFuelStore.getState()
      expect(state.currentFuel).toBeLessThanOrEqual(state.maxFuel)
    })

    it('should record topup transaction', () => {
      const initialCount = useFuelStore.getState().transactions.length
      const store = useFuelStore.getState()
      store.topUp(100)
      
      const state = useFuelStore.getState()
      expect(state.transactions.length).toBe(initialCount + 1)
      const topupTx = state.transactions.find(t => t.type === 'topup')
      expect(topupTx).toBeTruthy()
    })
  })

  describe('Tier Management', () => {
    it('should set tier', () => {
      const store = useFuelStore.getState()
      store.setTier('pro')
      
      expect(useFuelStore.getState().tier).toBe('pro')
    })

    it('should update max fuel based on tier', () => {
      const store = useFuelStore.getState()
      store.setTier('enterprise')
      
      const state = useFuelStore.getState()
      expect(state.maxFuel).toBeGreaterThan(1000) // Enterprise has more
    })
  })

  describe('Computed Values', () => {
    it('should calculate fuel percentage', () => {
      useFuelStore.setState({ currentFuel: 500, maxFuel: 1000 })
      const store = useFuelStore.getState()
      
      expect(store.getFuelPercentage()).toBe(50)
    })

    it('should determine fuel status', () => {
      useFuelStore.setState({ currentFuel: 1000, maxFuel: 1000 })
      expect(useFuelStore.getState().getFuelStatus()).toBe('full')
      
      useFuelStore.setState({ currentFuel: 600, maxFuel: 1000 })
      expect(useFuelStore.getState().getFuelStatus()).toBe('good')
      
      useFuelStore.setState({ currentFuel: 200, maxFuel: 1000 })
      expect(useFuelStore.getState().getFuelStatus()).toBe('low')
      
      useFuelStore.setState({ currentFuel: 50, maxFuel: 1000 })
      expect(useFuelStore.getState().getFuelStatus()).toBe('critical')
    })

    it('should check affordability', () => {
      useFuelStore.setState({ currentFuel: 100 })
      const store = useFuelStore.getState()
      
      expect(store.canAfford(50)).toBe(true)
      expect(store.canAfford(100)).toBe(true)
      expect(store.canAfford(150)).toBe(false)
    })
  })

  describe('Authorization Flow', () => {
    it('should show burn authorization', () => {
      const store = useFuelStore.getState()
      store.showBurnAuthorization('Create landing page', { min: 50, max: 100 })
      
      const state = useFuelStore.getState()
      expect(state.showAuthorizeBurn).toBe(true)
      expect(state.pendingTaskDescription).toBe('Create landing page')
      expect(state.estimatedRange).toEqual({ min: 50, max: 100 })
    })

    it('should cancel burn', () => {
      const store = useFuelStore.getState()
      store.showBurnAuthorization('Task', { min: 10, max: 20 })
      store.cancelBurn()
      
      const state = useFuelStore.getState()
      expect(state.showAuthorizeBurn).toBe(false)
      expect(state.pendingTaskDescription).toBeNull()
    })
  })

  describe('Model Cost Multipliers', () => {
    it('should have correct multipliers for each model tier', () => {
      expect(MODEL_COST_MULTIPLIERS.flash).toBe(1)
      expect(MODEL_COST_MULTIPLIERS.kimi).toBe(0.9)
      expect(MODEL_COST_MULTIPLIERS.sonnet).toBe(5)
      expect(MODEL_COST_MULTIPLIERS.opus).toBe(8.3)
    })

    it('should calculate fuel cost with flash multiplier (1x)', () => {
      const cost = calculateFuelCost(10, 'flash')
      expect(cost).toBe(10)
    })

    it('should calculate fuel cost with kimi multiplier (0.9x)', () => {
      const cost = calculateFuelCost(10, 'kimi')
      expect(cost).toBe(9)
    })

    it('should calculate fuel cost with sonnet multiplier (5x)', () => {
      const cost = calculateFuelCost(10, 'sonnet')
      expect(cost).toBe(50)
    })

    it('should calculate fuel cost with opus multiplier (8.3x)', () => {
      const cost = calculateFuelCost(10, 'opus')
      expect(cost).toBe(83)
    })

    it('should default to flash multiplier for unknown model tier', () => {
      const cost = calculateFuelCost(10, 'unknown' as any)
      expect(cost).toBe(10)
    })
  })

  describe('Circuit Breakers', () => {
    it('should have correct circuit breaker constants', () => {
      expect(CIRCUIT_BREAKERS.maxRetries).toBe(3)
      expect(CIRCUIT_BREAKERS.maxTimeMs).toBe(300000) // 5 minutes
      expect(CIRCUIT_BREAKERS.maxFuelPerTask).toBe(500)
    })

    it('should not trigger when within limits', () => {
      const now = Date.now()
      const result = checkCircuitBreaker(100, 1, now - 60000) // 100 fuel, 1 retry, 1 min ago
      
      expect(result.triggered).toBe(false)
      expect(result.reason).toBeUndefined()
    })

    it('should trigger when max fuel exceeded', () => {
      const now = Date.now()
      const result = checkCircuitBreaker(501, 0, now)
      
      expect(result.triggered).toBe(true)
      expect(result.reason).toContain('fuel')
    })

    it('should trigger when max retries exceeded', () => {
      const now = Date.now()
      const result = checkCircuitBreaker(100, 4, now)
      
      expect(result.triggered).toBe(true)
      expect(result.reason).toContain('retries')
    })

    it('should trigger when max time exceeded', () => {
      const sixMinutesAgo = Date.now() - 360000 // 6 minutes
      const result = checkCircuitBreaker(100, 0, sixMinutesAgo)
      
      expect(result.triggered).toBe(true)
      expect(result.reason).toContain('timeout')
    })

    it('should not trigger at exact limits', () => {
      const now = Date.now()
      const result = checkCircuitBreaker(500, 3, now - 300000) // Exactly at limits
      
      expect(result.triggered).toBe(false)
    })
  })
})
