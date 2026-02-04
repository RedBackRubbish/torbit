/**
 * TORBIT MODEL CONFIGURATION
 * 
 * Centralized model configuration for consistency across the AI system.
 * Both the API route and orchestrator use these definitions.
 */

import { anthropic } from '@ai-sdk/anthropic'
import { google } from '@ai-sdk/google'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import type { LanguageModel } from 'ai'
import type { AgentId } from '../tools/definitions'

// OpenRouter client for Kimi
const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
})

// ============================================
// MODEL TYPES
// ============================================

export type ModelProvider = 'claude-opus' | 'claude-sonnet' | 'gemini-pro' | 'gemini-flash' | 'kimi'
export type TaskComplexity = 'high' | 'medium' | 'low'

export interface ModelConfig {
  provider: ModelProvider
  model: string
  description: string
  costTier: 'premium' | 'standard' | 'economy'
  inputCostPer1k: number  // $ per 1k tokens
  outputCostPer1k: number // $ per 1k tokens
}

// ============================================
// MODEL DEFINITIONS
// ============================================

export const MODEL_CONFIGS: Record<ModelProvider, ModelConfig> = {
  'claude-opus': {
    provider: 'claude-opus',
    model: 'claude-opus-4-20250514',
    description: 'Boss brain - plans builds, orchestrates architecture',
    costTier: 'premium',
    inputCostPer1k: 0.015,
    outputCostPer1k: 0.075,
  },
  'claude-sonnet': {
    provider: 'claude-sonnet',
    model: 'claude-sonnet-4-20250514',
    description: 'Executor - code generation, implements the plan',
    costTier: 'standard',
    inputCostPer1k: 0.003,
    outputCostPer1k: 0.015,
  },
  'gemini-pro': {
    provider: 'gemini-pro',
    model: 'gemini-1.5-pro',
    description: 'Big brain - handles large context windows, full codebase analysis',
    costTier: 'standard',
    inputCostPer1k: 0.00125,
    outputCostPer1k: 0.005,
  },
  'gemini-flash': {
    provider: 'gemini-flash',
    model: 'gemini-1.5-flash',
    description: 'The rabbit - cleanup, small fixes, dirty work',
    costTier: 'economy',
    inputCostPer1k: 0.000075,
    outputCostPer1k: 0.0003,
  },
  'kimi': {
    provider: 'kimi',
    model: 'moonshotai/kimi-k2-instruct',
    description: 'Kimi K2.5 - multilingual powerhouse, complex reasoning',
    costTier: 'standard',
    inputCostPer1k: 0.0014,
    outputCostPer1k: 0.0055,
  },
}

// ============================================
// AGENT TO MODEL MAPPING
// ============================================

/**
 * Default model for each agent - optimized for their specialty
 * 
 * NOTE: Using Gemini as primary while Anthropic credits are low
 * Switch back to claude-opus for architect when credits are topped up
 * 
 * OPUS 4.5 = The Boss (plans everything)
 * SONNET 4.5 = The Executor (builds what Opus plans)
 * GEMINI PRO = Big brain (large context, full codebase analysis)
 * GEMINI FLASH = The Rabbit (cleanup, small fixes, dirty work)
 * KIMI K2.5 = Multilingual powerhouse (complex reasoning, internationalization)
 */
export const AGENT_MODEL_MAP: Record<AgentId, ModelProvider> = {
  architect: 'gemini-pro',       // Using Gemini while Anthropic credits low
  planner: 'gemini-pro',         // Using Gemini while Anthropic credits low
  frontend: 'gemini-pro',        // Gemini executes frontend code
  backend: 'kimi',               // KIMI handles backend logic
  database: 'gemini-pro',        // PRO handles large schema context
  devops: 'gemini-flash',        // FLASH handles config cleanup
  qa: 'gemini-flash',            // FLASH writes quick tests
  auditor: 'gemini-pro',         // PRO reviews full codebase
}

// ============================================
// MODEL FACTORY
// ============================================

/**
 * Get a language model instance for a provider
 */
export function getModel(provider: ModelProvider): LanguageModel {
  const config = MODEL_CONFIGS[provider]
  
  switch (provider) {
    case 'claude-opus':
    case 'claude-sonnet':
      return anthropic(config.model)
    case 'gemini-pro':
    case 'gemini-flash':
      return google(config.model)
    case 'kimi':
      return openrouter(config.model)
    default:
      return anthropic('claude-sonnet-4-20250514')
  }
}

/**
 * Get model for a specific agent
 */
export function getModelForAgent(agentId: AgentId): LanguageModel {
  const provider = AGENT_MODEL_MAP[agentId]
  return getModel(provider)
}

/**
 * Get model based on task complexity
 * Override for high complexity tasks uses premium model
 */
export function getModelForTask(
  agentId: AgentId, 
  complexity: TaskComplexity
): LanguageModel {
  // High complexity always uses premium model
  if (complexity === 'high' && agentId !== 'architect' && agentId !== 'auditor') {
    return getModel('claude-sonnet')
  }
  
  return getModelForAgent(agentId)
}

/**
 * Analyze task complexity from message content
 */
export function analyzeTaskComplexity(
  messages: Array<{ role: string; content: string }>
): TaskComplexity {
  const lastMessage = messages[messages.length - 1]?.content || ''
  const wordCount = lastMessage.split(/\s+/).length
  
  // High complexity indicators
  const highComplexityKeywords = [
    'refactor', 'architecture', 'design system', 'complex', 
    'optimize', 'performance', 'audit', 'review', 'migrate',
    'security', 'scale', 'distributed'
  ]
  const hasHighComplexity = highComplexityKeywords.some(kw => 
    lastMessage.toLowerCase().includes(kw)
  )
  
  if (hasHighComplexity || wordCount > 200) return 'high'
  if (wordCount > 50) return 'medium'
  return 'low'
}

// ============================================
// COST CALCULATION
// ============================================

export interface UsageMetrics {
  inputTokens: number
  outputTokens: number
  estimatedCost: number
  provider: ModelProvider
}

/**
 * Calculate cost for a request
 */
export function calculateCost(
  provider: ModelProvider,
  inputTokens: number,
  outputTokens: number
): number {
  const config = MODEL_CONFIGS[provider]
  const inputCost = (inputTokens / 1000) * config.inputCostPer1k
  const outputCost = (outputTokens / 1000) * config.outputCostPer1k
  return inputCost + outputCost
}

/**
 * Format cost for display
 */
export function formatCost(cost: number): string {
  if (cost < 0.01) return `$${cost.toFixed(4)}`
  if (cost < 1) return `$${cost.toFixed(3)}`
  return `$${cost.toFixed(2)}`
}
