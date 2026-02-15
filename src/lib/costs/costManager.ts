/**
 * Cost Manager - Agent Execution Cost Accounting
 *
 * Tracks and enforces budget constraints for agent executions:
 * - Token consumption (input/output at different rates)
 * - Tool execution costs (per-tool pricing)
 * - External request costs (per-provider pricing)
 * - Budget enforcement with abort mechanism
 * - Comprehensive cost audit logging
 */

import type { AgentId } from '@/lib/tools/definitions'
import type { ToolName } from '@/lib/tools/firewall'

// ============================================
// TYPES
// ============================================

/**
 * Cost calculation result
 */
export interface CostCalculation {
  amount: number
  unit: 'tokens' | 'cents' | 'units'
  breakdown: Record<string, number>
  reason: string
}

/**
 * Cost event (transaction)
 */
export interface CostEvent {
  id: string
  executionId: string
  timestamp: string
  agentId: AgentId
  type: 'token' | 'tool' | 'external_request' | 'buffer' | 'penalty'
  amount: number
  unit: 'tokens' | 'cents' | 'units'
  metadata: Record<string, unknown>
  description: string
}

/**
 * Cost metrics for execution
 */
export interface CostMetrics {
  totalCost: number
  tokensCost: number
  toolCallsCost: number
  externalRequestsCost: number
  penaltiesCost: number
  costByTool: Record<ToolName, number>
  costByProvider: Record<string, number>
  costByType: Record<string, number>
}

/**
 * Execution budget
 */
export interface ExecutionBudget {
  executionId: string
  agentId: AgentId
  maxBudget: number
  remainingBudget: number
  initialBudget: number
  exceeded: boolean
  exceedAt?: string
  warnThreshold: number // Warn at 80% of budget
}

/**
 * Cost event log entry
 */
export interface CostLog {
  id: string
  timestamp: string
  executionId: string
  agentId: AgentId
  status: 'active' | 'aborted' | 'completed' | 'warned'
  metrics: CostMetrics
  events: CostEvent[]
  finalBudget: ExecutionBudget
}

/**
 * Cost manager configuration
 */
export interface CostManagerConfig {
  tokenInputCost: number // $ per 1000 tokens
  tokenOutputCost: number // $ per 1000 tokens
  toolBaseCost: number // $ per tool call
  externalRequestBaseCost: number // $ per request
  enablePenalties: boolean
  penaltyMultiplier: number // 2x cost for policy violations
  maxCostLogs: number
  defaultBudget: number // cents
}

/**
 * Cost manager state for an execution
 */
export interface ExecutionCostState {
  executionId: string
  agentId: AgentId
  budget: ExecutionBudget
  events: CostEvent[]
  metrics: CostMetrics
  startTime: number
  endTime?: number
}

// ============================================
// PRICING MODELS
// ============================================

/**
 * Tool execution costs by tool type
 */
export const TOOL_PRICING: Record<ToolName, number> = {
  readFile: 1, // cents
  writeFile: 2,
  appendFile: 1,
  deleteFile: 3, // Destructive = more expensive
  listDir: 1,
  httpRequest: 5, // External = more expensive
  dbRead: 3,
  dbWrite: 5,
  dbMigrate: 10, // Very expensive
  externalApi: 7, // External calls with auth
  createCheckpoint: 4,
  restoreCheckpoint: 4,
  executeCommand: 8, // Powerful = expensive
  deployService: 50, // Production changes = very expensive
  getSecrets: 12, // Security-sensitive = expensive
  setSecrets: 15, // Write secrets = very expensive
}

/**
 * External provider costs
 */
export const PROVIDER_PRICING: Record<string, number> = {
  stripe: 2, // cents per request
  slack: 1,
  github: 3,
  anthropic: 0.01, // per token (separate calculation)
  openai: 0.015,
  default: 2,
}

/**
 * Agent tier multipliers (premium agents cost more)
 */
export const AGENT_COST_MULTIPLIER: Record<AgentId, number> = {
  architect: 1.5, // Complex operations
  frontend: 1.0,
  backend: 1.2, // More resource-intensive
  database: 1.3, // Database ops are expensive
  devops: 1.8, // Production changes = highest cost
  qa: 1.1,
  planner: 1.0,
  strategist: 1.1,
  auditor: 0.8, // Read-only = discount
}

// ============================================
// COST MANAGER
// ============================================

export class CostManager {
  private costs = new Map<string, ExecutionCostState>()
  private costLogs: CostLog[] = []
  private config: CostManagerConfig

  constructor(config: Partial<CostManagerConfig> = {}) {
    this.config = {
      tokenInputCost: 0.03, // $0.03 per 1k input tokens
      tokenOutputCost: 0.06, // $0.06 per 1k output tokens
      toolBaseCost: 1, // 1 cent per tool
      externalRequestBaseCost: 2, // 2 cents per request
      enablePenalties: true,
      penaltyMultiplier: 2,
      maxCostLogs: 500,
      defaultBudget: 10000, // 100 dollars default
      ...config,
    }
  }

  /**
   * Create execution budget
   */
  createExecution(
    executionId: string,
    agentId: AgentId,
    budgetCents?: number
  ): ExecutionBudget {
    const initialBudget = budgetCents ?? this.config.defaultBudget
    const multiplier = AGENT_COST_MULTIPLIER[agentId] ?? 1
    const adjustedBudget = Math.floor(initialBudget * multiplier)

    const budget: ExecutionBudget = {
      executionId,
      agentId,
      maxBudget: adjustedBudget,
      remainingBudget: adjustedBudget,
      initialBudget: adjustedBudget,
      exceeded: false,
      warnThreshold: adjustedBudget * 0.8,
    }

    const state: ExecutionCostState = {
      executionId,
      agentId,
      budget,
      events: [],
      metrics: {
        totalCost: 0,
        tokensCost: 0,
        toolCallsCost: 0,
        externalRequestsCost: 0,
        penaltiesCost: 0,
        costByTool: {} as Record<ToolName, number>,
        costByProvider: {},
        costByType: {},
      },
      startTime: Date.now(),
    }

    this.costs.set(executionId, state)
    return budget
  }

  /**
   * Record token consumption
   */
  accountTokens(
    executionId: string,
    inputTokens: number,
    outputTokens: number
  ): CostCalculation {
    const state = this.costs.get(executionId)
    if (!state) {
      throw new Error(`Execution ${executionId} not found`)
    }

    // Convert token costs to cents
    const inputCost = Math.ceil((inputTokens / 1000) * this.config.tokenInputCost * 100)
    const outputCost = Math.ceil((outputTokens / 1000) * this.config.tokenOutputCost * 100)
    const totalCost = inputCost + outputCost

    const multiplier = AGENT_COST_MULTIPLIER[state.agentId] ?? 1
    const adjustedCost = Math.ceil(totalCost * multiplier)

    state.metrics.tokensCost += adjustedCost
    state.metrics.totalCost += adjustedCost

    const event: CostEvent = {
      id: this.generateEventId(),
      executionId,
      timestamp: new Date().toISOString(),
      agentId: state.agentId,
      type: 'token',
      amount: adjustedCost,
      unit: 'cents',
      metadata: { inputTokens, outputTokens, inputCost, outputCost, multiplier },
      description: `Token consumption: ${inputTokens} input + ${outputTokens} output tokens`,
    }

    state.events.push(event)
    this.updateBudget(executionId, adjustedCost)

    return {
      amount: adjustedCost,
      unit: 'cents',
      breakdown: { inputCost, outputCost, adjustment: adjustedCost - totalCost },
      reason: `Tokens: ${inputTokens} input + ${outputTokens} output @ ${this.config.tokenInputCost}/${this.config.tokenOutputCost}`,
    }
  }

  /**
   * Record tool execution cost
   */
  accountToolCall(executionId: string, toolName: ToolName): CostCalculation {
    const state = this.costs.get(executionId)
    if (!state) {
      throw new Error(`Execution ${executionId} not found`)
    }

    const baseCost = TOOL_PRICING[toolName] ?? this.config.toolBaseCost
    const multiplier = AGENT_COST_MULTIPLIER[state.agentId] ?? 1
    const adjustedCost = Math.ceil(baseCost * multiplier)

    state.metrics.toolCallsCost += adjustedCost
    state.metrics.totalCost += adjustedCost
    state.metrics.costByTool[toolName] = (state.metrics.costByTool[toolName] ?? 0) + adjustedCost

    const event: CostEvent = {
      id: this.generateEventId(),
      executionId,
      timestamp: new Date().toISOString(),
      agentId: state.agentId,
      type: 'tool',
      amount: adjustedCost,
      unit: 'cents',
      metadata: { toolName, baseCost, multiplier },
      description: `Tool call: ${toolName}`,
    }

    state.events.push(event)
    this.updateBudget(executionId, adjustedCost)

    return {
      amount: adjustedCost,
      unit: 'cents',
      breakdown: { baseCost, adjustment: adjustedCost - baseCost },
      reason: `Tool ${toolName}: ${baseCost} base × ${multiplier} multiplier`,
    }
  }

  /**
   * Record external request cost
   */
  accountExternalRequest(
    executionId: string,
    provider: string,
    requestCount: number = 1
  ): CostCalculation {
    const state = this.costs.get(executionId)
    if (!state) {
      throw new Error(`Execution ${executionId} not found`)
    }

    const baseCost = PROVIDER_PRICING[provider] ?? PROVIDER_PRICING.default
    const totalCost = baseCost * requestCount
    const multiplier = AGENT_COST_MULTIPLIER[state.agentId] ?? 1
    const adjustedCost = Math.ceil(totalCost * multiplier)

    state.metrics.externalRequestsCost += adjustedCost
    state.metrics.totalCost += adjustedCost
    state.metrics.costByProvider[provider] = (state.metrics.costByProvider[provider] ?? 0) + adjustedCost

    const event: CostEvent = {
      id: this.generateEventId(),
      executionId,
      timestamp: new Date().toISOString(),
      agentId: state.agentId,
      type: 'external_request',
      amount: adjustedCost,
      unit: 'cents',
      metadata: { provider, requestCount, baseCost, multiplier },
      description: `External request: ${provider} (${requestCount} request(s))`,
    }

    state.events.push(event)
    this.updateBudget(executionId, adjustedCost)

    return {
      amount: adjustedCost,
      unit: 'cents',
      breakdown: { baseCost, requestCount, totalCost, adjustment: adjustedCost - totalCost },
      reason: `External ${provider}: ${baseCost} cents × ${requestCount} × ${multiplier} multiplier`,
    }
  }

  /**
   * Apply penalty for policy violation
   */
  applyPenalty(executionId: string, reason: string, multiplier: number = 1): CostCalculation {
    const state = this.costs.get(executionId)
    if (!state) {
      throw new Error(`Execution ${executionId} not found`)
    }

    if (!this.config.enablePenalties) {
      return { amount: 0, unit: 'cents', breakdown: {}, reason: 'Penalties disabled' }
    }

    const penaltyCost = Math.ceil(
      (state.metrics.totalCost * this.config.penaltyMultiplier * multiplier) / 100
    )

    state.metrics.penaltiesCost += penaltyCost
    state.metrics.totalCost += penaltyCost

    const event: CostEvent = {
      id: this.generateEventId(),
      executionId,
      timestamp: new Date().toISOString(),
      agentId: state.agentId,
      type: 'penalty',
      amount: penaltyCost,
      unit: 'cents',
      metadata: { reason, baseMultiplier: this.config.penaltyMultiplier, multiplier },
      description: `Penalty: ${reason}`,
    }

    state.events.push(event)
    this.updateBudget(executionId, penaltyCost)

    return {
      amount: penaltyCost,
      unit: 'cents',
      breakdown: { baseCost: state.metrics.totalCost, multiplier: this.config.penaltyMultiplier },
      reason: `Policy violation penalty: ${reason}`,
    }
  }

  /**
   * Check if budget exceeded
   */
  isBudgetExceeded(executionId: string): boolean {
    const state = this.costs.get(executionId)
    if (!state) return false
    return state.budget.exceeded
  }

  /**
   * Check if budget warning threshold exceeded
   */
  isBudgetWarning(executionId: string): boolean {
    const state = this.costs.get(executionId)
    if (!state) return false
    return state.metrics.totalCost >= state.budget.warnThreshold && !state.budget.exceeded
  }

  /**
   * Get remaining budget
   */
  getRemainingBudget(executionId: string): number {
    const state = this.costs.get(executionId)
    if (!state) return 0
    return state.budget.remainingBudget
  }

  /**
   * Get execution metrics
   */
  getMetrics(executionId: string): CostMetrics | null {
    const state = this.costs.get(executionId)
    return state?.metrics ?? null
  }

  /**
   * Complete execution and generate log
   */
  completeExecution(executionId: string): CostLog {
    const state = this.costs.get(executionId)
    if (!state) {
      throw new Error(`Execution ${executionId} not found`)
    }

    state.endTime = Date.now()

    const log: CostLog = {
      id: this.generateLogId(),
      timestamp: new Date().toISOString(),
      executionId,
      agentId: state.agentId,
      status: state.budget.exceeded ? 'aborted' : this.isBudgetWarning(executionId) ? 'warned' : 'completed',
      metrics: state.metrics,
      events: state.events,
      finalBudget: state.budget,
    }

    this.costLogs.push(log)
    if (this.costLogs.length > this.config.maxCostLogs) {
      this.costLogs.shift()
    }

    this.costs.delete(executionId)
    return log
  }

  /**
   * Get cost logs
   */
  getCostLogs(filter?: { agentId?: AgentId; status?: string }): CostLog[] {
    return this.costLogs.filter((log) => {
      if (filter?.agentId && log.agentId !== filter.agentId) return false
      if (filter?.status && log.status !== filter.status) return false
      return true
    })
  }

  /**
   * Get cost history for agent
   */
  getAgentCostHistory(agentId: AgentId, limit: number = 10): CostLog[] {
    return this.costLogs
      .filter((log) => log.agentId === agentId)
      .slice(-limit)
  }

  /**
   * Get total cost by agent
   */
  getTotalCostByAgent(): Record<AgentId, number> {
    const totals: Record<string, number> = {}
    for (const log of this.costLogs) {
      totals[log.agentId] = (totals[log.agentId] ?? 0) + log.metrics.totalCost
    }
    return totals as Record<AgentId, number>
  }

  /**
   * Internal: Update budget
   */
  private updateBudget(executionId: string, cost: number): void {
    const state = this.costs.get(executionId)
    if (!state) return

    state.budget.remainingBudget -= cost

    if (state.budget.remainingBudget <= 0 && !state.budget.exceeded) {
      state.budget.exceeded = true
      state.budget.exceedAt = new Date().toISOString()
    }
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Generate unique log ID
   */
  private generateLogId(): string {
    return `costlog-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}

// ============================================
// GLOBAL INSTANCE
// ============================================

let globalCostManager: CostManager | null = null

export function getCostManager(config?: Partial<CostManagerConfig>): CostManager {
  if (!globalCostManager) {
    globalCostManager = new CostManager(config)
  }
  return globalCostManager
}

export function resetCostManager(): void {
  globalCostManager = null
}

// ============================================
// ABORT ERROR
// ============================================

export class BudgetExceededError extends Error {
  constructor(
    public executionId: string,
    public agentId: AgentId,
    public spent: number,
    public budget: number
  ) {
    super(
      `Budget exceeded for ${agentId}: spent ${(spent / 100).toFixed(2)}$ ` +
        `exceeds limit ${(budget / 100).toFixed(2)}$`
    )
    this.name = 'BudgetExceededError'
  }
}
