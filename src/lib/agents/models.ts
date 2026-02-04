/**
 * TORBIT MODEL CONFIGURATION
 * 
 * Centralized model configuration for consistency across the AI system.
 * Both the API route and orchestrator use these definitions.
 */

import { anthropic } from '@ai-sdk/anthropic'
import { google } from '@ai-sdk/google'
import type { LanguageModel } from 'ai'
import type { AgentId } from '../tools/definitions'

// ============================================
// MODEL TYPES
// ============================================

export type ModelProvider = 'claude-opus' | 'claude-sonnet' | 'gemini-pro' | 'gemini-flash'
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
    model: 'claude-sonnet-4-20250514', // Using Sonnet as Opus proxy until Opus 4 available
    description: 'Best reasoning - system design, complex debugging',
    costTier: 'premium',
    inputCostPer1k: 0.015,
    outputCostPer1k: 0.075,
  },
  'claude-sonnet': {
    provider: 'claude-sonnet',
    model: 'claude-sonnet-4-20250514',
    description: 'Balanced - code generation, standard tasks',
    costTier: 'standard',
    inputCostPer1k: 0.003,
    outputCostPer1k: 0.015,
  },
  'gemini-pro': {
    provider: 'gemini-pro',
    model: 'gemini-2.5-pro-preview-06-05',
    description: 'Analytical - schema design, data processing',
    costTier: 'standard',
    inputCostPer1k: 0.00125,
    outputCostPer1k: 0.005,
  },
  'gemini-flash': {
    provider: 'gemini-flash',
    model: 'gemini-2.0-flash',
    description: 'Fast & cheap - config files, test generation',
    costTier: 'economy',
    inputCostPer1k: 0.000075,
    outputCostPer1k: 0.0003,
  },
}

// ============================================
// AGENT TO MODEL MAPPING
// ============================================

/**
 * Default model for each agent - optimized for their specialty
 */
export const AGENT_MODEL_MAP: Record<AgentId, ModelProvider> = {
  architect: 'claude-opus',      // Best reasoning for system design
  frontend: 'claude-sonnet',     // Great for React/Next.js UI code
  backend: 'claude-sonnet',      // Strong API design
  database: 'gemini-pro',        // Analytical schema design
  devops: 'gemini-flash',        // Config files are templated, speed matters
  qa: 'gemini-flash',            // Test generation is formulaic, high volume
  planner: 'claude-sonnet',      // Ticket management needs reasoning
  auditor: 'claude-opus',        // Hostile QA needs best model
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
