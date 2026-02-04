/**
 * KIMI INTELLIGENT ROUTER
 *
 * Uses Kimi K2.5 (Moonshot AI) as the master router/orchestrator.
 * Kimi K2.5 excels at:
 * - Task decomposition and complexity assessment
 * - Multi-step agentic tool use
 * - 256K context for understanding full codebase
 * - Native multimodal (vision) for UI/design tasks
 * - Strong reasoning for architectural decisions
 *
 * API: OpenAI-compatible (https://api.moonshot.cn/v1)
 * Model: kimi-k2.5 (1T params, 32B active MoE, 256K context)
 */

import { z } from 'zod'
import type { AgentId } from '../tools/definitions'
import { createKimiClient, type KimiModel } from '../providers/kimi'

// ============================================
// ROUTING TYPES
// ============================================

export const TaskComplexitySchema = z.enum(['trivial', 'simple', 'moderate', 'complex', 'architectural'])
export type TaskComplexity = z.infer<typeof TaskComplexitySchema>

export const TaskCategorySchema = z.enum([
  'code-generation',
  'code-review',
  'refactoring',
  'debugging',
  'testing',
  'documentation',
  'architecture',
  'ui-design',
  'api-design',
  'database',
  'devops',
  'general-query',
])
export type TaskCategory = z.infer<typeof TaskCategorySchema>

export interface RoutingDecision {
  /** Which agent should handle this task */
  targetAgent: AgentId
  /** Preferred model tier based on complexity */
  modelTier: 'opus' | 'sonnet' | 'flash'
  /** Assessed task complexity */
  complexity: TaskComplexity
  /** Primary task category */
  category: TaskCategory
  /** Whether this requires multimodal (vision) processing */
  requiresVision: boolean
  /** Whether this should use thinking mode (for complex reasoning) */
  useThinking: boolean
  /** Reasoning for the decision */
  reasoning: string
  /** Confidence score (0-1) */
  confidence: number
  /** Suggested sub-tasks if task should be decomposed */
  subtasks?: string[]
}

export interface RouterConfig {
  /** Enable thinking mode for complex tasks (slower but more accurate) */
  enableThinking?: boolean
  /** Timeout for router decisions (ms) */
  timeout?: number
  /** Fallback model tier if router fails */
  fallbackTier?: 'opus' | 'sonnet' | 'flash'
  /** Use fast routing (kimi-k2-turbo) vs accurate routing (kimi-k2.5) */
  fastMode?: boolean
}

// ============================================
// ROUTING PROMPT
// ============================================

const ROUTER_SYSTEM_PROMPT = `You are Kimi, the intelligent router for TORBIT - an AI-powered development platform.

Your job is to analyze incoming user requests and determine:
1. Which specialized agent should handle the task
2. What model tier (opus/sonnet/flash) is appropriate based on complexity
3. Whether the task requires vision/multimodal capabilities
4. Whether the task needs deep thinking (reasoning chains)

AVAILABLE AGENTS:
- architect: High-level design, system architecture, multi-file planning, complex refactors
- frontend: React/Next.js components, UI implementation, styling, client-side logic
- backend: API routes, server logic, business rules, integrations
- database: Schema design, migrations, queries, data modeling
- devops: CI/CD, deployment, infrastructure, containerization
- qa: Testing, E2E, unit tests, quality assurance
- planner: Breaking down features into actionable tasks
- auditor: Code review, security audit, performance analysis

MODEL TIER SELECTION:
- opus: Architecture planning, complex multi-file refactors, debugging tricky issues, security-critical code
- sonnet: Standard code generation, single-file edits, moderate complexity tasks
- flash: Quick queries, simple lookups, formatting, straightforward tasks

COMPLEXITY LEVELS:
- trivial: Single-line changes, simple lookups, formatting
- simple: Single-file edits, straightforward implementations
- moderate: Multi-file changes, some design decisions needed
- complex: Architectural changes, tricky debugging, security-sensitive
- architectural: System-wide redesigns, new subsystems, major refactors

RESPOND IN JSON FORMAT:
{
  "targetAgent": "<agent-id>",
  "modelTier": "<opus|sonnet|flash>",
  "complexity": "<trivial|simple|moderate|complex|architectural>",
  "category": "<category>",
  "requiresVision": <boolean>,
  "useThinking": <boolean>,
  "reasoning": "<brief explanation>",
  "confidence": <0-1>,
  "subtasks": ["<optional subtask list for complex tasks>"]
}`

// ============================================
// KIMI ROUTER CLASS
// ============================================

export class KimiRouter {
  private config: Required<RouterConfig>

  constructor(config: RouterConfig = {}) {
    this.config = {
      enableThinking: config.enableThinking ?? true,
      timeout: config.timeout ?? 10000,
      fallbackTier: config.fallbackTier ?? 'sonnet',
      fastMode: config.fastMode ?? false,
    }
  }

  /**
   * Analyze a user request and determine routing
   */
  async route(userPrompt: string, context?: {
    hasImages?: boolean
    codebaseSize?: 'small' | 'medium' | 'large'
    previousAgents?: AgentId[]
  }): Promise<RoutingDecision> {
    // Quick heuristics for obvious cases (skip API call)
    const quickDecision = this.quickRoute(userPrompt, context)
    if (quickDecision) {
      return quickDecision
    }

    // Use Kimi K2.5 for intelligent routing
    try {
      const client = createKimiClient()
      const model: KimiModel = this.config.fastMode ? 'kimi-k2-turbo-preview' : 'kimi-k2.5'

      const contextInfo = context ? `
Context:
- Has images/designs: ${context.hasImages ?? false}
- Codebase size: ${context.codebaseSize ?? 'unknown'}
- Previously involved agents: ${context.previousAgents?.join(', ') || 'none'}
` : ''

      const response = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: ROUTER_SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Analyze this request and determine routing:\n\n"${userPrompt}"${contextInfo}`,
          },
        ],
        response_format: { type: 'json_object' },
        ...(this.config.enableThinking && !this.config.fastMode
          ? {} // thinking is enabled by default for kimi-k2.5
          : { extra_body: { thinking: { type: 'disabled' } } }),
      })

      const content = response.choices[0]?.message?.content
      if (!content) {
        return this.fallbackDecision(userPrompt)
      }

      const parsed = JSON.parse(content) as RoutingDecision
      return this.validateDecision(parsed, userPrompt)
    } catch (error) {
      console.error('[KimiRouter] Routing failed, using fallback:', error)
      return this.fallbackDecision(userPrompt)
    }
  }

  /**
   * Quick routing for obvious cases (no API call needed)
   */
  private quickRoute(
    prompt: string,
    context?: { hasImages?: boolean }
  ): RoutingDecision | null {
    const lower = prompt.toLowerCase()

    // Vision tasks
    if (context?.hasImages || /screenshot|image|design|figma|mockup|ui\s*\/\s*ux/i.test(prompt)) {
      return {
        targetAgent: 'frontend',
        modelTier: 'opus',
        complexity: 'moderate',
        category: 'ui-design',
        requiresVision: true,
        useThinking: true,
        reasoning: 'Task involves visual content - routing to frontend with vision',
        confidence: 0.9,
      }
    }

    // Trivial/Flash-tier tasks
    if (/^(what is|explain|describe|list|show me|how do i)\s/i.test(prompt) && prompt.length < 100) {
      return {
        targetAgent: 'architect',
        modelTier: 'flash',
        complexity: 'trivial',
        category: 'general-query',
        requiresVision: false,
        useThinking: false,
        reasoning: 'Simple informational query',
        confidence: 0.95,
      }
    }

    // Testing tasks
    if (/\b(test|spec|e2e|unit test|playwright|vitest|jest)\b/i.test(prompt)) {
      return {
        targetAgent: 'qa',
        modelTier: 'sonnet',
        complexity: 'moderate',
        category: 'testing',
        requiresVision: false,
        useThinking: false,
        reasoning: 'Testing-related task',
        confidence: 0.85,
      }
    }

    // DevOps tasks
    if (/\b(deploy|docker|kubernetes|k8s|ci\/cd|github actions|vercel|aws)\b/i.test(prompt)) {
      return {
        targetAgent: 'devops',
        modelTier: 'sonnet',
        complexity: 'moderate',
        category: 'devops',
        requiresVision: false,
        useThinking: false,
        reasoning: 'DevOps/infrastructure task',
        confidence: 0.85,
      }
    }

    // Database tasks
    if (/\b(database|schema|migration|sql|prisma|drizzle|postgres|mongo)\b/i.test(prompt)) {
      return {
        targetAgent: 'database',
        modelTier: 'sonnet',
        complexity: 'moderate',
        category: 'database',
        requiresVision: false,
        useThinking: false,
        reasoning: 'Database-related task',
        confidence: 0.85,
      }
    }

    // Architecture tasks (complex)
    if (/\b(architect|design|system|refactor entire|restructure|rewrite)\b/i.test(prompt)) {
      return {
        targetAgent: 'architect',
        modelTier: 'opus',
        complexity: 'architectural',
        category: 'architecture',
        requiresVision: false,
        useThinking: true,
        reasoning: 'Architectural planning task - requires deep thinking',
        confidence: 0.8,
      }
    }

    // No quick match - need full routing
    return null
  }

  /**
   * Fallback decision when routing fails
   */
  private fallbackDecision(prompt: string): RoutingDecision {
    const lower = prompt.toLowerCase()

    // Basic keyword matching for fallback
    let targetAgent: AgentId = 'architect'
    let category: TaskCategory = 'code-generation'

    if (/component|page|ui|react|css|tailwind/i.test(prompt)) {
      targetAgent = 'frontend'
      category = 'code-generation'
    } else if (/api|endpoint|route|server/i.test(prompt)) {
      targetAgent = 'backend'
      category = 'api-design'
    } else if (/test|spec/i.test(prompt)) {
      targetAgent = 'qa'
      category = 'testing'
    }

    return {
      targetAgent,
      modelTier: this.config.fallbackTier,
      complexity: 'moderate',
      category,
      requiresVision: false,
      useThinking: false,
      reasoning: 'Fallback routing - Kimi router unavailable',
      confidence: 0.5,
    }
  }

  /**
   * Validate and sanitize parsed decision
   */
  private validateDecision(parsed: Partial<RoutingDecision>, prompt: string): RoutingDecision {
    const validAgents: AgentId[] = ['architect', 'frontend', 'backend', 'database', 'devops', 'qa', 'planner', 'auditor']
    const validTiers = ['opus', 'sonnet', 'flash'] as const
    const validComplexity: TaskComplexity[] = ['trivial', 'simple', 'moderate', 'complex', 'architectural']

    return {
      targetAgent: validAgents.includes(parsed.targetAgent as AgentId)
        ? (parsed.targetAgent as AgentId)
        : 'architect',
      modelTier: validTiers.includes(parsed.modelTier as typeof validTiers[number])
        ? (parsed.modelTier as 'opus' | 'sonnet' | 'flash')
        : this.config.fallbackTier,
      complexity: validComplexity.includes(parsed.complexity as TaskComplexity)
        ? (parsed.complexity as TaskComplexity)
        : 'moderate',
      category: parsed.category ?? 'code-generation',
      requiresVision: parsed.requiresVision ?? false,
      useThinking: parsed.useThinking ?? false,
      reasoning: parsed.reasoning ?? 'Decision made by Kimi router',
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.7,
      subtasks: Array.isArray(parsed.subtasks) ? parsed.subtasks : undefined,
    }
  }

  /**
   * Decompose a complex task into subtasks
   */
  async decompose(userPrompt: string): Promise<{
    subtasks: Array<{
      description: string
      targetAgent: AgentId
      priority: number
      dependencies: number[]
    }>
    reasoning: string
  }> {
    try {
      const client = createKimiClient()

      const response = await client.chat.completions.create({
        model: 'kimi-k2.5',
        messages: [
          {
            role: 'system',
            content: `You are a task decomposition expert. Break down the user's request into atomic subtasks.

Each subtask should:
1. Be completable by a single agent
2. Have clear dependencies
3. Be prioritized (1 = highest priority)

AVAILABLE AGENTS: architect, frontend, backend, database, devops, qa, planner, auditor

RESPOND IN JSON:
{
  "subtasks": [
    {
      "description": "<what needs to be done>",
      "targetAgent": "<agent-id>",
      "priority": <1-10>,
      "dependencies": [<indices of dependent subtasks>]
    }
  ],
  "reasoning": "<explanation of decomposition>"
}`,
          },
          { role: 'user', content: `Decompose this request:\n\n"${userPrompt}"` },
        ],
        response_format: { type: 'json_object' },
      })

      const content = response.choices[0]?.message?.content
      if (!content) {
        return { subtasks: [], reasoning: 'Failed to decompose task' }
      }

      return JSON.parse(content)
    } catch (error) {
      console.error('[KimiRouter] Decomposition failed:', error)
      return { subtasks: [], reasoning: 'Decomposition failed - router error' }
    }
  }
}

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

let defaultRouter: KimiRouter | null = null

/**
 * Get or create the default router instance
 */
export function getRouter(config?: RouterConfig): KimiRouter {
  if (!defaultRouter || config) {
    defaultRouter = new KimiRouter(config)
  }
  return defaultRouter
}

/**
 * Quick route a request
 */
export async function routeRequest(
  prompt: string,
  context?: Parameters<KimiRouter['route']>[1]
): Promise<RoutingDecision> {
  return getRouter().route(prompt, context)
}

/**
 * Check if Kimi API is configured
 */
export function isKimiConfigured(): boolean {
  return Boolean(process.env.KIMI_API_KEY || process.env.MOONSHOT_API_KEY)
}
