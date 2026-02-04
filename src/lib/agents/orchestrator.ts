/**
 * TORBIT ORCHESTRATOR
 * 
 * The central nervous system that wires agents to the Vercel AI SDK.
 * This file handles tool execution, agent routing, and the audit pipeline.
 * 
 * NOW WITH KIMI K2.5 INTELLIGENT ROUTING:
 * - Task complexity assessment
 * - Smart agent selection
 * - Multimodal detection (vision tasks)
 * - Thinking mode for complex problems
 */

import { streamText, stepCountIs } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { google } from '@ai-sdk/google'
import { TOOL_DEFINITIONS, AGENT_TOOLS, type ToolName, type AgentId } from '../tools/definitions'
import { executeTool, createExecutionContext, type ToolExecutionContext, type ToolResult } from '../tools/executor'
import { KimiRouter, type RoutingDecision, isKimiConfigured } from './router'

// Agent prompts
import { AUDITOR_SYSTEM_PROMPT } from './prompts/auditor'
import { ARCHITECT_SYSTEM_PROMPT } from './prompts/architect'
import { PLANNER_SYSTEM_PROMPT } from './prompts/planner'
import { FRONTEND_SYSTEM_PROMPT } from './prompts/frontend'
import { DEVOPS_SYSTEM_PROMPT } from './prompts/devops'
import { QA_SYSTEM_PROMPT, QA_TOOLS } from './prompts/qa'

// ============================================
// TYPES
// ============================================

export type ModelTier = 'opus' | 'sonnet' | 'flash'

export interface OrchestrationConfig {
  projectId: string
  userId: string
  modelTier?: ModelTier
  enableAudit?: boolean
  enableTicketSync?: boolean
  mcpServers?: Array<{ name: string; url: string }>
  /** Enable Kimi K2.5 intelligent routing (default: true if API key configured) */
  enableKimiRouter?: boolean
  /** Use fast routing mode (kimi-k2-turbo) for quicker decisions */
  fastRouting?: boolean
}

export interface AgentResult {
  agentId: AgentId
  success: boolean
  output: string
  toolCalls: Array<{
    name: string
    args: Record<string, unknown>
    result: unknown
    duration: number
  }>
  duration: number
}

export interface AuditResult {
  passed: boolean
  gates: {
    visual: { passed: boolean; issues: string[] }
    functional: { passed: boolean; issues: string[] }
    hygiene: { passed: boolean; issues: string[] }
  }
}

// ============================================
// MODEL SELECTION (Opus-Sonnet Handoff + Kimi Router)
// ============================================

const MODELS = {
  opus: anthropic('claude-sonnet-4-20250514'), // Use Sonnet as Opus proxy for now
  sonnet: anthropic('claude-sonnet-4-20250514'),
  flash: google('gemini-2.0-flash'),
} as const

/**
 * Select model based on task complexity (legacy fallback)
 * - Opus: Architecture planning, complex debugging, multi-file refactors
 * - Sonnet: Standard code generation, single-file edits
 * - Flash: Simple queries, formatting, quick lookups
 */
function selectModel(taskComplexity: 'high' | 'medium' | 'low', preferredTier?: ModelTier) {
  if (preferredTier) return MODELS[preferredTier]
  
  switch (taskComplexity) {
    case 'high': return MODELS.opus
    case 'medium': return MODELS.sonnet
    case 'low': return MODELS.flash
  }
}

/**
 * Map complexity from Kimi router to legacy format
 */
function mapComplexityToLegacy(complexity: RoutingDecision['complexity']): 'high' | 'medium' | 'low' {
  switch (complexity) {
    case 'architectural':
    case 'complex':
      return 'high'
    case 'moderate':
      return 'medium'
    case 'simple':
    case 'trivial':
      return 'low'
  }
}

// ============================================
// AGENT SYSTEM PROMPTS
// ============================================

const AGENT_PROMPTS: Record<AgentId, string> = {
  architect: ARCHITECT_SYSTEM_PROMPT,
  frontend: FRONTEND_SYSTEM_PROMPT,
  backend: `You are THE BACKEND AGENT. You build APIs, business logic, and server-side code...`,
  database: `You are THE DATABASE AGENT. You design schemas, write migrations, and optimize queries...`,
  devops: DEVOPS_SYSTEM_PROMPT,
  qa: QA_SYSTEM_PROMPT,
  planner: PLANNER_SYSTEM_PROMPT,
  auditor: AUDITOR_SYSTEM_PROMPT,
}

// ============================================
// TOOL CONVERSION FOR AI SDK
// ============================================

/**
 * Get tools for an agent - returns the AGENT_TOOLS directly
 * In AI SDK v6, tools are already properly formatted in definitions.ts
 */
function getToolsForAgent(agentId: AgentId) {
  return AGENT_TOOLS[agentId]
}

/**
 * Create tool executor for handling tool calls
 */
function createToolExecutor(context: ToolExecutionContext) {
  return async (toolName: string, args: Record<string, unknown>) => {
    return executeTool(toolName as ToolName, args, context)
  }
}

// ============================================
// MAIN ORCHESTRATOR
// ============================================

export class TorbitOrchestrator {
  private context: ToolExecutionContext
  private config: OrchestrationConfig
  private kimiRouter: KimiRouter | null = null
  
  constructor(config: OrchestrationConfig) {
    this.config = config
    this.context = createExecutionContext(config.projectId, config.userId)
    
    // Initialize Kimi router if configured
    const useKimi = config.enableKimiRouter ?? isKimiConfigured()
    if (useKimi && isKimiConfigured()) {
      this.kimiRouter = new KimiRouter({
        fastMode: config.fastRouting ?? false,
        enableThinking: true,
      })
    }
    
    // Initialize MCP connections if provided
    if (config.mcpServers) {
      for (const server of config.mcpServers) {
        this.context.mcpServers.set(server.name, {
          url: server.url,
          tools: [],
        })
      }
    }
  }
  
  /**
   * Get routing decision from Kimi (or use legacy routing)
   */
  private async getRoutingDecision(
    prompt: string,
    context?: { hasImages?: boolean }
  ): Promise<RoutingDecision | null> {
    if (!this.kimiRouter) {
      return null
    }
    
    try {
      return await this.kimiRouter.route(prompt, context)
    } catch (error) {
      console.warn('[Orchestrator] Kimi routing failed, using legacy routing:', error)
      return null
    }
  }
  
  /**
   * Execute a task with a specific agent
   */
  async executeAgent(
    agentId: AgentId,
    prompt: string,
    options?: { modelTier?: ModelTier; maxSteps?: number }
  ): Promise<AgentResult> {
    const start = Date.now()
    const toolCalls: AgentResult['toolCalls'] = []
    const toolExecutor = createToolExecutor(this.context)
    
    const model = selectModel('medium', options?.modelTier)
    const tools = getToolsForAgent(agentId)
    const systemPrompt = AGENT_PROMPTS[agentId]
    
    try {
      const result = await streamText({
        model,
        system: systemPrompt,
        prompt,
        tools,
        stopWhen: stepCountIs(options?.maxSteps ?? 10),
        onStepFinish: async (step) => {
          // Track and execute tool calls
          if (step.toolCalls) {
            for (const tc of step.toolCalls) {
              const toolStart = Date.now()
              // AI SDK v6: access input property - cast to any for compatibility
              const toolInput = (tc as { input?: unknown }).input ?? {}
              const toolResult = await toolExecutor(tc.toolName, toolInput as Record<string, unknown>)
              toolCalls.push({
                name: tc.toolName,
                args: toolInput as Record<string, unknown>,
                result: toolResult,
                duration: Date.now() - toolStart,
              })
            }
          }
        },
      })
      
      // Collect full response
      let output = ''
      for await (const chunk of result.textStream) {
        output += chunk
      }
      
      return {
        agentId,
        success: true,
        output,
        toolCalls,
        duration: Date.now() - start,
      }
    } catch (error) {
      return {
        agentId,
        success: false,
        output: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        toolCalls,
        duration: Date.now() - start,
      }
    }
  }
  
  /**
   * Run the full audit pipeline
   */
  async runAuditPipeline(): Promise<{
    passed: boolean
    gates: {
      visual: { passed: boolean; issues: string[] }
      functional: { passed: boolean; issues: string[] }
      hygiene: { passed: boolean; issues: string[] }
    }
    fixes: string[]
  }> {
    const gates = {
      visual: { passed: true, issues: [] as string[] },
      functional: { passed: true, issues: [] as string[] },
      hygiene: { passed: true, issues: [] as string[] },
    }
    const fixes: string[] = []
    
    // Type helper for tool results
    type VisualResult = { passed: boolean; violations?: Array<{ element: string; issue: string }> }
    type E2EResult = { passed: boolean; healedCount?: number }
    type LogsResult = { logs: Array<{ message: string; level: string }> }
    
    // Gate 1: Visual Inspection
    const screenshotResult = await executeTool('captureScreenshot', { route: '/' }, this.context)
    if (screenshotResult.success && screenshotResult.data) {
      const visualResult = await executeTool('verifyVisualMatch', {
        url: 'http://localhost:3000',
        compareWith: 'design-tokens',
        strict: false,
      }, this.context)
      
      const visualData = visualResult.data as VisualResult | undefined
      if (visualData && !visualData.passed) {
        gates.visual.passed = false
        gates.visual.issues = (visualData.violations || []).map((v) => 
          `${v.element}: ${v.issue}`
        )
      }
    }
    
    // Gate 2: Functional Rigor
    const e2eResult = await executeTool('runE2eCycle', {
      feature: 'core flow',
      healOnFailure: true,
      maxHealAttempts: 3,
    }, this.context)
    
    const e2eData = e2eResult.data as E2EResult | undefined
    if (!e2eResult.success || (e2eData && !e2eData.passed)) {
      gates.functional.passed = false
      gates.functional.issues.push('E2E tests failed after 3 heal attempts')
    }
    
    // Gate 3: Code Hygiene
    const logsResult = await executeTool('getBrowserLogs', {
      level: 'error',
      limit: 10,
    }, this.context)
    
    const logsData = logsResult.data as LogsResult | undefined
    if (logsData && logsData.logs && logsData.logs.length > 0) {
      gates.hygiene.passed = false
      gates.hygiene.issues = logsData.logs.map((l) => l.message)
    }
    
    return {
      passed: gates.visual.passed && gates.functional.passed && gates.hygiene.passed,
      gates,
      fixes,
    }
  }
  
  /**
   * Full orchestration: Plan → Execute → Audit
   * Now powered by Kimi K2.5 intelligent routing!
   */
  async orchestrate(userPrompt: string, context?: { hasImages?: boolean }): Promise<{
    plan: AgentResult
    execution: AgentResult[]
    audit: AuditResult
    routing?: RoutingDecision
  }> {
    // 1. Create checkpoint before any work
    await executeTool('createCheckpoint', {
      name: 'pre-orchestration',
      reason: 'Before executing user request',
    }, this.context)
    
    // 2. Get routing decision from Kimi (if available)
    const routing = await this.getRoutingDecision(userPrompt, context)
    
    // 3. Plan with Architect (using Kimi-recommended model tier if available)
    const planModelTier = routing?.complexity === 'architectural' ? 'opus' : 
                          routing?.modelTier ?? 'opus'
    const plan = await this.executeAgent('architect', `
      Plan the implementation for this user request:
      "${userPrompt}"
      
      Break it down into steps and identify which agents should handle each step.
      ${routing ? `\nRouting analysis suggests: ${routing.reasoning}` : ''}
    `, { modelTier: planModelTier })
    
    // 4. Execute with appropriate agents (Kimi-routed or heuristic fallback)
    const execution: AgentResult[] = []
    
    if (routing) {
      // Use Kimi's routing decision
      const result = await this.executeAgent(
        routing.targetAgent,
        userPrompt,
        { modelTier: routing.modelTier }
      )
      execution.push(result)
      
      // If Kimi decomposed into subtasks, execute them
      if (routing.subtasks && routing.subtasks.length > 1) {
        for (const subtask of routing.subtasks.slice(1)) { // First one already done
          const subtaskRouting = await this.getRoutingDecision(subtask)
          if (subtaskRouting) {
            const subtaskResult = await this.executeAgent(
              subtaskRouting.targetAgent,
              subtask,
              { modelTier: subtaskRouting.modelTier }
            )
            execution.push(subtaskResult)
          }
        }
      }
    } else {
      // Legacy heuristic routing
      if (userPrompt.toLowerCase().includes('component') || 
          userPrompt.toLowerCase().includes('page') ||
          userPrompt.toLowerCase().includes('ui')) {
        const frontendResult = await this.executeAgent('frontend', userPrompt)
        execution.push(frontendResult)
      }
    }
    
    // 5. Run audit pipeline
    const audit = await this.runAuditPipeline()
    
    // 6. If audit failed and we have fixes, apply them
    if (!audit.passed && this.config.enableAudit) {
      await this.executeAgent('auditor', `
        The following issues were detected:
        Visual: ${audit.gates.visual.issues.join(', ') || 'None'}
        Functional: ${audit.gates.functional.issues.join(', ') || 'None'}
        Hygiene: ${audit.gates.hygiene.issues.join(', ') || 'None'}
        
        Fix these issues.
      `)
    }
    
    return { plan, execution, audit, routing: routing ?? undefined }
  }
  
  /**
   * Smart execution: Let Kimi decide which agent to use
   */
  async smartExecute(
    prompt: string,
    context?: { hasImages?: boolean }
  ): Promise<AgentResult & { routing?: RoutingDecision }> {
    const routing = await this.getRoutingDecision(prompt, context)
    
    if (routing) {
      const result = await this.executeAgent(
        routing.targetAgent,
        prompt,
        { modelTier: routing.modelTier }
      )
      return { ...result, routing }
    }
    
    // Fallback: use architect with sonnet
    const result = await this.executeAgent('architect', prompt, { modelTier: 'sonnet' })
    return result
  }
  
  /**
   * Get the current execution context (for inspection/debugging)
   */
  getContext(): ToolExecutionContext {
    return this.context
  }
  
  /**
   * Check if Kimi routing is enabled
   */
  isKimiRoutingEnabled(): boolean {
    return this.kimiRouter !== null
  }
}

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

/**
 * Create a new orchestrator instance
 */
export function createOrchestrator(config: OrchestrationConfig): TorbitOrchestrator {
  return new TorbitOrchestrator(config)
}

/**
 * Quick single-agent execution
 */
export async function executeWithAgent(
  agentId: AgentId,
  prompt: string,
  projectId: string,
  userId: string
): Promise<AgentResult> {
  const orchestrator = new TorbitOrchestrator({ projectId, userId })
  return orchestrator.executeAgent(agentId, prompt)
}
