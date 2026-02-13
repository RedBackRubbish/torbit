/**
 * Tests for Cost Manager - Budget Enforcement and Runaway Detection
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  CostManager,
  getCostManager,
  resetCostManager,
  BudgetExceededError,
  TOOL_PRICING,
  AGENT_COST_MULTIPLIER,
} from '../costManager'

describe('CostManager - Core Functionality', () => {
  let manager: CostManager

  beforeEach(() => {
    manager = new CostManager()
  })

  // ============================================
  // BUDGET CREATION
  // ============================================

  it('creates execution budget', () => {
    const budget = manager.createExecution('exec-1', 'frontend')
    expect(budget.executionId).toBe('exec-1')
    expect(budget.maxBudget).toBeGreaterThan(0)
    expect(budget.remainingBudget).toBe(budget.maxBudget)
  })

  it('applies agent multiplier to budget', () => {
    const fe = manager.createExecution('exec-fe', 'frontend', 10000)
    const devops = manager.createExecution('exec-do', 'devops', 10000)

    // DevOps multiplier (1.8) > Frontend (1.0)
    expect(devops.maxBudget).toBeGreaterThan(fe.maxBudget)
  })

  // ============================================
  // TOKEN ACCOUNTING
  // ============================================

  it('accounts token costs', () => {
    manager.createExecution('exec-1', 'frontend', 1000000)
    const cost = manager.accountTokens('exec-1', 1000, 0)

    expect(cost.amount).toBeGreaterThan(0)
    expect(cost.unit).toBe('cents')
    expect(cost.breakdown).toHaveProperty('inputCost')
  })

  it('tracks token costs in metrics', () => {
    manager.createExecution('exec-1', 'frontend', 1000000)
    manager.accountTokens('exec-1', 10000, 10000)

    const metrics = manager.getMetrics('exec-1')
    expect(metrics?.tokensCost).toBeGreaterThan(0)
  })

  // ============================================
  // TOOL CALL ACCOUNTING
  // ============================================

  it('charges for tool calls', () => {
    manager.createExecution('exec-1', 'frontend', 1000000)
    const cost = manager.accountToolCall('exec-1', 'readFile')

    expect(cost.amount).toBeGreaterThan(0)
    expect(TOOL_PRICING.readFile).toBe(1)
  })

  it('charges more for expensive tools', () => {
    manager.createExecution('exec-1', 'backend', 1000000)
    manager.createExecution('exec-2', 'backend', 1000000)

    const httpCost = manager.accountToolCall('exec-1', 'httpRequest')
    const readCost = manager.accountToolCall('exec-2', 'readFile')

    expect(httpCost.amount).toBeGreaterThan(readCost.amount)
    expect(TOOL_PRICING.httpRequest).toBeGreaterThan(TOOL_PRICING.readFile)
  })

  it('tracks tool costs by name', () => {
    manager.createExecution('exec-1', 'frontend', 1000000)
    manager.accountToolCall('exec-1', 'readFile')
    manager.accountToolCall('exec-1', 'readFile')

    const metrics = manager.getMetrics('exec-1')
    expect(metrics?.costByTool['readFile']).toBeGreaterThan(0)
  })

  // ============================================
  // EXTERNAL REQUEST ACCOUNTING
  // ============================================

  it('charges for external requests', () => {
    manager.createExecution('exec-1', 'backend', 1000000)
    const cost = manager.accountExternalRequest('exec-1', 'stripe', 1)

    expect(cost.amount).toBeGreaterThan(0)
  })

  it('charges more requests at higher rate', () => {
    manager.createExecution('exec-1', 'backend', 1000000)
    const single = manager.accountExternalRequest('exec-1', 'stripe', 1)
    
    manager.createExecution('exec-2', 'backend', 1000000)
    const multiple = manager.accountExternalRequest('exec-2', 'stripe', 5)

    expect(multiple.amount).toBeGreaterThan(single.amount)
  })

  it('tracks costs by provider', () => {
    manager.createExecution('exec-1', 'backend', 1000000)
    manager.accountExternalRequest('exec-1', 'stripe', 3)
    manager.accountExternalRequest('exec-1', 'slack', 2)

    const metrics = manager.getMetrics('exec-1')
    expect(metrics?.costByProvider['stripe']).toBeGreaterThan(0)
    expect(metrics?.costByProvider['slack']).toBeGreaterThan(0)
  })

  // ============================================
  // PENALTIES
  // ============================================

  it('applies penalties to total cost', () => {
    manager.createExecution('exec-1', 'frontend', 1000000)
    manager.accountTokens('exec-1', 10000, 10000)
    const baseCost = manager.getMetrics('exec-1')!.totalCost

    manager.applyPenalty('exec-1', 'Unauthorized access')
    const metrics = manager.getMetrics('exec-1')

    expect(metrics!.penaltiesCost).toBeGreaterThan(0)
    expect(metrics!.totalCost).toBeGreaterThanOrEqual(baseCost)
  })

  it('disables penalties when configured', () => {
    const mgr = new CostManager({ enablePenalties: false })
    mgr.createExecution('exec-1', 'frontend', 1000000)
    
    const penalty = mgr.applyPenalty('exec-1', 'Test')
    expect(penalty.amount).toBe(0)
  })

  // ============================================
  // COST LOGGING & HISTORY
  // ============================================

  it('generates cost log on completion', () => {
    manager.createExecution('exec-1', 'frontend', 1000000)
    manager.accountTokens('exec-1', 1000, 1000)
    manager.accountToolCall('exec-1', 'readFile')

    const log = manager.completeExecution('exec-1')

    expect(log.id).toMatch(/^costlog-/)
    expect(log.executionId).toBe('exec-1')
    expect(log.agentId).toBe('frontend')
    expect(log.status).toBe('completed')
    expect(log.events.length).toBe(2)
  })

  it('retrieves and filters cost logs', () => {
    manager.createExecution('exec-1', 'frontend', 1000000)
    manager.completeExecution('exec-1')

    manager.createExecution('exec-2', 'backend', 1000000)
    manager.completeExecution('exec-2')

    const all = manager.getCostLogs()
    expect(all.length).toBe(2)

    const frontend = manager.getCostLogs({ agentId: 'frontend' })
    expect(frontend.length).toBe(1)
    expect(frontend[0].agentId).toBe('frontend')
  })

  it('tracks cost history by agent', () => {
    for (let i = 0; i < 3; i++) {
      manager.createExecution(`exec-${i}`, 'frontend', 1000000)
      manager.completeExecution(`exec-${i}`)
    }

    const history = manager.getAgentCostHistory('frontend', 2)
    expect(history.length).toBe(2)
  })

  it('calculates total cost by agent', () => {
    manager.createExecution('exec-1', 'frontend', 1000000)
    manager.accountTokens('exec-1', 1000, 1000)
    manager.completeExecution('exec-1')

    manager.createExecution('exec-2', 'backend', 1000000)
    manager.accountTokens('exec-2', 1000, 1000)
    manager.completeExecution('exec-2')

    const totals = manager.getTotalCostByAgent()
    expect(totals.frontend).toBeGreaterThan(0)
    expect(totals.backend).toBeGreaterThan(0)
  })

  // ============================================
  // COST TRACKING METRICS
  // ============================================

  it('provides complete cost metrics', () => {
    manager.createExecution('exec-1', 'frontend', 1000000)
    manager.accountTokens('exec-1', 1000, 1000)
    manager.accountToolCall('exec-1', 'readFile')
    manager.accountExternalRequest('exec-1', 'stripe')

    const metrics = manager.getMetrics('exec-1')
    expect(metrics?.totalCost).toBe(
      metrics!.tokensCost + metrics!.toolCallsCost + metrics!.externalRequestsCost + metrics!.penaltiesCost
    )
  })

  it('provides cost breakdown', () => {
    manager.createExecution('exec-1', 'frontend', 1000000)
    const cost = manager.accountTokens('exec-1', 1000, 5000)

    expect(cost.breakdown).toHaveProperty('inputCost')
    expect(cost.breakdown).toHaveProperty('outputCost')
  })

  it('generates detailed cost events', () => {
    manager.createExecution('exec-1', 'frontend', 1000000)
    manager.accountTokens('exec-1', 1000, 0)
    manager.accountToolCall('exec-1', 'readFile')

    const log = manager.completeExecution('exec-1')

    const tokenEvent = log.events.find(e => e.type === 'token')
    expect(tokenEvent).toBeDefined()
    expect(tokenEvent?.metadata?.inputTokens).toBe(1000)

    const toolEvent = log.events.find(e => e.type === 'tool')
    expect(toolEvent).toBeDefined()
    expect(toolEvent?.metadata?.toolName).toBe('readFile')
  })

  // ============================================
  // ERROR HANDLING
  // ============================================

  it('throws on unknown execution', () => {
    expect(() => manager.accountTokens('unknown', 1000, 1000)).toThrow()
  })

  it('returns null for unknown metrics', () => {
    expect(manager.getMetrics('unknown')).toBeNull()
  })

  it('handles empty logs gracefully', () => {
    const logs = manager.getCostLogs()
    expect(logs).toEqual([])
  })

  // ============================================
  // GLOBAL INSTANCE
  // ============================================

  afterEach(() => {
    resetCostManager()
  })

  it('maintains singleton instance', () => {
    const mgr1 = getCostManager()
    const mgr2 = getCostManager()
    expect(mgr1).toBe(mgr2)
  })

  it('resets global instance', () => {
    const mgr1 = getCostManager()
    resetCostManager()
    const mgr2 = getCostManager()
    expect(mgr1).not.toBe(mgr2)
  })

  // ============================================
  // BUDGET EXCEEDED ERROR
  // ============================================

  it('creates BudgetExceededError with details', () => {
    const error = new BudgetExceededError('exec-1', 'frontend', 15000, 10000)
    
    expect(error).toBeInstanceOf(BudgetExceededError)
    expect(error.executionId).toBe('exec-1')
    expect(error.agentId).toBe('frontend')
    expect(error.spent).toBe(15000)
    expect(error.budget).toBe(10000)
  })
})

// ============================================
// RUNAWAY DETECTION
// ============================================

describe('CostManager - Runaway Detection', () => {
  it('detects runaway token generation', () => {
    const manager = new CostManager()
    manager.createExecution('runaway-1', 'frontend', 100) // Small budget
    
    let iterations = 0
    while (!manager.isBudgetExceeded('runaway-1') && iterations < 1000) {
      manager.accountTokens('runaway-1', 1000, 1000)
      iterations++
    }

    // Should stop before hitting 1000 iterations
    expect(manager.isBudgetExceeded('runaway-1')).toBe(true)
    expect(iterations).toBeLessThan(1000)
  })

  it('detects runaway tool execution', () => {
    const manager = new CostManager()
    manager.createExecution('runaway-2', 'backend', 200) // $2 budget
    
    let iterations = 0
    while (!manager.isBudgetExceeded('runaway-2') && iterations < 1000) {
      manager.accountToolCall('runaway-2', 'deployService') // $0.50 each
      iterations++
    }

    expect(manager.isBudgetExceeded('runaway-2')).toBe(true)
    expect(iterations).toBeLessThan(1000)
  })

  it('detects runaway external requests', () => {
    const manager = new CostManager()
    manager.createExecution('runaway-3', 'backend', 150) // $1.50 budget
    
    let iterations = 0
    while (!manager.isBudgetExceeded('runaway-3') && iterations < 1000) {
      manager.accountExternalRequest('runaway-3', 'stripe', 10)
      iterations++
    }

    expect(manager.isBudgetExceeded('runaway-3')).toBe(true)
    expect(iterations).toBeLessThan(1000)
  })

  it('aborts execution when budget exceeded', () => {
    const manager = new CostManager()
    manager.createExecution('runaway', 'backend', 50) // Very small budget
    
    // Trigger budget exceeded
    for (let i = 0; i < 100; i++) {
      manager.accountToolCall('runaway', 'deployService')
      if (manager.isBudgetExceeded('runaway')) break
    }

    const log = manager.completeExecution('runaway')
    expect(log.status).toBe('aborted')
    expect(log.finalBudget.exceeded).toBe(true)
  })

  it('records event history of runaway execution', () => {
    const manager = new CostManager()
    manager.createExecution('runaway', 'backend', 100)
    
    // Trigger runaway
    for (let i = 0; i < 50; i++) {
      manager.accountToolCall('runaway', 'httpRequest')
      if (manager.isBudgetExceeded('runaway')) break
    }

    const log = manager.completeExecution('runaway')
    expect(log.events.length).toBeGreaterThan(0)
    expect(log.events.every(e => e.type === 'tool')).toBe(true)
  })

  it('enriches events with cost information', () => {
    const manager = new CostManager()
    manager.createExecution('cost-tracking', 'backend', 1000000)
    
    manager.accountTokens('cost-tracking', 5000, 5000)
    manager.accountToolCall('cost-tracking', 'httpRequest')
    manager.accountExternalRequest('cost-tracking', 'stripe', 2)
    manager.applyPenalty('cost-tracking', 'Test violation')

    const log = manager.completeExecution('cost-tracking')
    
    expect(log.events.some(e => e.type === 'token')).toBe(true)
    expect(log.events.some(e => e.type === 'tool')).toBe(true)
    expect(log.events.some(e => e.type === 'external_request')).toBe(true)
    expect(log.events.some(e => e.type === 'penalty')).toBe(true)
  })

  it('enforces budget across multiple cost types', () => {
    const manager = new CostManager()
    manager.createExecution('mixed', 'backend', 50) // Small budget to trigger exceeded

    let exceeded = false
    manager.accountTokens('mixed', 1000, 1000)
    if (manager.isBudgetExceeded('mixed')) {
      exceeded = true
    } else {
      manager.accountToolCall('mixed', 'deployService')
      exceeded = manager.isBudgetExceeded('mixed')
    }

    // With mix of operations and strict budget, should exceed
    expect(exceeded).toBe(true)
  })

  it('applies cost penalties as escalation', () => {
    const manager = new CostManager({ enablePenalties: true })
    manager.createExecution('penalties', 'backend', 5000) // $50
    
    let callCount = 0
    while (!manager.isBudgetExceeded('penalties') && callCount < 100) {
      manager.accountToolCall('penalties', 'readFile')
      if (callCount % 10 === 0 && callCount > 0) {
        manager.applyPenalty('penalties', `Violation #${callCount}`)
      }
      callCount++
    }

    const log = manager.completeExecution('penalties')
    expect(log.metrics.penaltiesCost).toBeGreaterThan(0)
    expect(log.events.some(e => e.type === 'penalty')).toBe(true)
  })

  it('tracks budget exceeded timestamp', () => {
    const manager = new CostManager()
    const before = new Date().toISOString()
    
    manager.createExecution('timestamp-test', 'backend', 50)
    for (let i = 0; i < 100; i++) {
      manager.accountToolCall('timestamp-test', 'httpRequest')
      if (manager.isBudgetExceeded('timestamp-test')) break
    }

    const after = new Date().toISOString()
    const log = manager.completeExecution('timestamp-test')
    
    expect(log.finalBudget.exceedAt).toBeDefined()
    expect(log.finalBudget.exceedAt! >= before).toBe(true)
    expect(log.finalBudget.exceedAt! <= after).toBe(true)
  })
})
