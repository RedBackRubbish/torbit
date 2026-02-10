/**
 * TORBIT MODEL CONFIGURATION
 * 
 * Centralized model configuration for consistency across the AI system.
 * Both the API route and orchestrator use these definitions.
 */

import { anthropic } from '@ai-sdk/anthropic'
import { google } from '@ai-sdk/google'
import { openai } from '@ai-sdk/openai'
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

export type ModelProvider = 'claude-opus' | 'claude-sonnet' | 'gpt-5.2' | 'gpt-5-mini' | 'gemini-pro' | 'gemini-flash' | 'kimi' | 'codex'
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
    model: 'claude-opus-4-6-20260206',
    description: 'Claude Opus 4.6 - most intelligent for complex reasoning',
    costTier: 'premium',
    inputCostPer1k: 0.015,
    outputCostPer1k: 0.075,
  },
  'claude-sonnet': {
    provider: 'claude-sonnet',
    model: 'claude-sonnet-4-5-20250929',
    description: 'Claude Sonnet 4.5 - fast, intelligent, great for code generation',
    costTier: 'standard',
    inputCostPer1k: 0.003,
    outputCostPer1k: 0.015,
  },
  'gpt-5.2': {
    provider: 'gpt-5.2',
    model: 'gpt-5.2',
    description: 'OpenAI flagship - best for coding and agentic tasks',
    costTier: 'premium',
    inputCostPer1k: 0.00175,
    outputCostPer1k: 0.014,
  },
  'gpt-5-mini': {
    provider: 'gpt-5-mini',
    model: 'gpt-5-mini',
    description: 'Fast, cheap GPT-5 for well-defined tasks',
    costTier: 'economy',
    inputCostPer1k: 0.00025,
    outputCostPer1k: 0.002,
  },
  'gemini-pro': {
    provider: 'gemini-pro',
    model: 'gemini-3-pro-preview',
    description: 'Gemini 3 Pro - large-context synthesis and deep reasoning',
    costTier: 'standard',
    inputCostPer1k: 0.00125,
    outputCostPer1k: 0.005,
  },
  'gemini-flash': {
    provider: 'gemini-flash',
    model: 'gemini-2.5-flash',
    description: 'Gemini 2.5 Flash - balanced speed + intelligence',
    costTier: 'economy',
    inputCostPer1k: 0.000075,
    outputCostPer1k: 0.0003,
  },
  'kimi': {
    provider: 'kimi',
    model: 'moonshotai/kimi-k2.5',
    description: 'Kimi K2.5 - THE BEAST. 1T params, 32B active MoE. Beats Claude/GPT/Gemini on code.',
    costTier: 'standard',
    inputCostPer1k: 0.00045,
    outputCostPer1k: 0.0025,
  },
  'codex': {
    provider: 'codex',
    model: 'gpt-5.3-codex',
    description: 'Codex-grade GPT model optimized for coding workflows.',
    costTier: 'standard',
    inputCostPer1k: 0.0015,
    outputCostPer1k: 0.012,
  },
}

// ============================================
// AGENT TO MODEL MAPPING
// ============================================

/**
 * Default model for each agent - optimized for their specialty
 * 
 * MODEL HIERARCHY & GOVERNANCE:
 * ═══════════════════════════════════════════════════════════════
 * 
 * GOVERNANCE LAYER (<10% combined tokens)
 * ───────────────────────────────────────
 * STRATEGIST (GPT-5.2) - Plan Validator
 *   → Reviews/validates plans from Planner
 *   → NEVER the first mover - only approves/vetoes/amends
 *   → Read-only access, produces verdicts not code
 * 
 * AUDITOR (Claude Opus 4.5) - Quality Gate
 *   → Deep inspection, critical path safety
 *   → JUDGES ONLY - does not fix freely
 *   → Different brain than builders (catches what they miss)
 * 
 * BUILDER LAYER (Cognitive Diversity)
 * ────────────────────────────────────
 * PLANNER (Kimi K2.5) - Orchestration
 *   → Designs API contracts, dependency mapping
 *   → 256K context for full codebase understanding
 *   → Leaves "BUILDER CONTEXT" summary for handoffs
 * 
 * ARCHITECT (Gemini 3 Pro) - System Design [DIFFERENT BRAIN]
 *   → File structure, component organization
 *   → Different perspective catches Planner blind spots
 *   → Validates structure before implementation
 * 
 * FULLSTACK CORE (Kimi K2.5) - Implementation
 *   → Backend + Database merged vertical
 *   → Schema + API stay in sync (no drift)
 *   → Query optimization (knows access patterns)
 * 
 * FRONTEND (Claude Sonnet 4.5) - UI [DIFFERENT BRAIN]
 *   → Visual/spatial reasoning - different modality
 *   → Precision UI, pixel-perfect implementation
 * 
 * FAST OPS (Gemini 3 Flash)
 *   → DevOps, QA loops - speed > reasoning
 *   → Cheap iteration, self-healing tests
 * 
 * COGNITIVE DIVERSITY RULE:
 *   Planner → Architect → Backend uses 2 different brains
 *   Same blind spot won't propagate through entire pipeline
 * 
 * COST RULE: GPT-5.2 + Opus combined < 10% of total tokens
 * ═══════════════════════════════════════════════════════════════
 */
const DEFAULT_AGENT_MODEL_MAP: Record<AgentId, ModelProvider> = {
  planner: 'kimi',
  architect: 'gemini-pro',
  backend: 'kimi',
  database: 'kimi',
  frontend: 'kimi',
  devops: 'claude-sonnet',
  qa: 'claude-sonnet',
  strategist: 'gpt-5.2',
  auditor: 'claude-opus',
}

const CODEX_AGENT_MODEL_MAP: Record<AgentId, ModelProvider> = {
  planner: 'kimi',
  architect: 'gemini-pro',
  backend: 'kimi',
  database: 'kimi',
  frontend: 'kimi',
  devops: 'claude-sonnet',
  qa: 'claude-sonnet',
  strategist: 'gpt-5.2',
  auditor: 'claude-opus',
}

export const AGENT_MODEL_MAP: Record<AgentId, ModelProvider> =
  process.env.TORBIT_USE_CODEX_PRIMARY === 'true'
    ? CODEX_AGENT_MODEL_MAP
    : DEFAULT_AGENT_MODEL_MAP

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
    case 'gpt-5.2':
    case 'gpt-5-mini':
      return openai(config.model)
    case 'gemini-pro':
    case 'gemini-flash':
      return google(config.model)
    case 'kimi':
      return openrouter(config.model)
    case 'codex': {
      const codexModel = process.env.TORBIT_CODEX_MODEL || process.env.OPENAI_CODEX_MODEL || config.model
      return openai(codexModel)
    }
    default:
      return anthropic('claude-sonnet-4-5-20250929')
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
