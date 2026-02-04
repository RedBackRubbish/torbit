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
import { checkCircuitBreaker, calculateFuelCost, useFuelStore, type ModelTier as FuelModelTier } from '@/store/fuel'

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
    security: { passed: boolean; issues: string[] }
  }
}

export interface PreflightResult {
  feasible: boolean
  reason?: string
  estimatedComplexity: 'trivial' | 'simple' | 'moderate' | 'complex' | 'architectural'
  estimatedFuel: { min: number; max: number }
  warnings?: string[]
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
// UNFEASIBLE REQUEST PATTERNS
// ============================================

const UNFEASIBLE_PATTERNS = [
  { pattern: /build\s+(me\s+)?(a\s+)?facebook/i, reason: 'Request scope too large - Facebook-scale projects require months of work' },
  { pattern: /build\s+(me\s+)?(a\s+)?twitter/i, reason: 'Request scope too large - Twitter-scale projects require months of work' },
  { pattern: /build\s+(me\s+)?(a\s+)?amazon/i, reason: 'Request scope too large - Amazon-scale projects require months of work' },
  { pattern: /clone\s+(of\s+)?(facebook|twitter|instagram|tiktok|youtube)/i, reason: 'Social platform clones are beyond single-session scope' },
  { pattern: /hack|exploit|malware|virus|keylogger/i, reason: 'Malicious intent detected - request rejected' },
  { pattern: /bypass\s+(auth|security|paywall)/i, reason: 'Security bypass requests are not permitted' },
]

// ============================================
// MAIN ORCHESTRATOR
// ============================================

export class TorbitOrchestrator {
  private context: ToolExecutionContext
  private config: OrchestrationConfig
  private kimiRouter: KimiRouter | null = null
  
  // Circuit breaker state for this orchestration session
  private sessionStartTime: number = Date.now()
  private sessionRetries: number = 0
  private sessionFuelSpent: number = 0
  
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
   * Pre-flight check - validate request before spending fuel
   * Uses Flash (cheap) to catch unreasonable requests early
   */
  async preflight(userPrompt: string): Promise<PreflightResult> {
    // Fast pattern matching first (no API call)
    for (const { pattern, reason } of UNFEASIBLE_PATTERNS) {
      if (pattern.test(userPrompt)) {
        return {
          feasible: false,
          reason,
          estimatedComplexity: 'architectural',
          estimatedFuel: { min: 0, max: 0 },
          warnings: ['Request rejected during pre-flight check'],
        }
      }
    }
    
    // Quick complexity estimation based on prompt characteristics
    const wordCount = userPrompt.split(/\s+/).length
    const hasMultipleFeatures = /and|also|plus|additionally|furthermore/i.test(userPrompt)
    const mentionsMultipleFiles = /files?|components?|pages?/gi.test(userPrompt)
    
    let estimatedComplexity: PreflightResult['estimatedComplexity'] = 'moderate'
    let estimatedFuel = { min: 20, max: 60 }
    const warnings: string[] = []
    
    if (wordCount > 200) {
      estimatedComplexity = 'complex'
      estimatedFuel = { min: 80, max: 200 }
      warnings.push('Long request - consider breaking into smaller tasks')
    } else if (wordCount < 10 && !hasMultipleFeatures) {
      estimatedComplexity = 'simple'
      estimatedFuel = { min: 5, max: 15 }
    } else if (hasMultipleFeatures || mentionsMultipleFiles) {
      estimatedComplexity = 'moderate'
      estimatedFuel = { min: 40, max: 100 }
    }
    
    // Check for architectural keywords
    if (/architect|redesign|refactor\s+(entire|all|whole)|migrate|rewrite/i.test(userPrompt)) {
      estimatedComplexity = 'architectural'
      estimatedFuel = { min: 150, max: 400 }
      warnings.push('Architectural change detected - high fuel consumption expected')
    }
    
    return {
      feasible: true,
      estimatedComplexity,
      estimatedFuel,
      warnings: warnings.length > 0 ? warnings : undefined,
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
    
    // Check circuit breaker before execution
    const circuitCheck = checkCircuitBreaker(
      this.sessionFuelSpent,
      this.sessionRetries,
      this.sessionStartTime
    )
    if (circuitCheck.triggered) {
      return {
        agentId,
        success: false,
        output: `Circuit breaker tripped: ${circuitCheck.reason}`,
        toolCalls: [],
        duration: 0,
      }
    }
    
    const model = selectModel('medium', options?.modelTier)
    const tools = getToolsForAgent(agentId)
    const systemPrompt = AGENT_PROMPTS[agentId]
    
    // Map model tier to fuel model tier for cost calculation
    const fuelModelTier: FuelModelTier = options?.modelTier === 'opus' ? 'opus' :
                                          options?.modelTier === 'sonnet' ? 'sonnet' : 'flash'
    
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
              
              // Track fuel cost per tool call with model tier multiplier
              const baseFuelCost = 1 // Base cost per tool call
              const adjustedCost = calculateFuelCost(baseFuelCost, fuelModelTier)
              this.sessionFuelSpent += adjustedCost
              
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
      // Track retry count for circuit breaker
      this.sessionRetries++
      
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
      security: { passed: boolean; issues: string[] }
    }
    fixes: string[]
  }> {
    const gates = {
      visual: { passed: true, issues: [] as string[] },
      functional: { passed: true, issues: [] as string[] },
      hygiene: { passed: true, issues: [] as string[] },
      security: { passed: true, issues: [] as string[] },
    }
    const fixes: string[] = []
    
    // Type helper for tool results
    type VisualResult = { passed: boolean; violations?: Array<{ element: string; issue: string }> }
    type E2EResult = { passed: boolean; healedCount?: number }
    type LogsResult = { logs: Array<{ message: string; level: string }> }
    type SecurityResult = { passed: boolean; vulnerabilities?: Array<{ type: string; severity: string; message: string; file?: string }> }
    
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
    
    // Gate 4: Security Scan (NEW)
    const securityResult = await this.runSecurityScan()
    if (!securityResult.passed) {
      gates.security.passed = false
      gates.security.issues = securityResult.vulnerabilities?.map((v) => 
        `[${v.severity.toUpperCase()}] ${v.type}: ${v.message}${v.file ? ` (${v.file})` : ''}`
      ) || ['Security scan detected issues']
    }
    
    return {
      passed: gates.visual.passed && gates.functional.passed && gates.hygiene.passed && gates.security.passed,
      gates,
      fixes,
    }
  }
  
  /**
   * Run security scan (Gate 4)
   * Detects: hardcoded secrets, SQL injection, npm vulnerabilities, CORS issues
   */
  private async runSecurityScan(): Promise<{
    passed: boolean
    vulnerabilities?: Array<{ type: string; severity: string; message: string; file?: string }>
  }> {
    const vulnerabilities: Array<{ type: string; severity: string; message: string; file?: string }> = []
    
    // Pattern-based secret detection
    const secretPatterns = [
      { pattern: /['"`]sk[-_]live[-_][a-zA-Z0-9]{20,}['"`]/g, type: 'hardcoded_secret', message: 'Stripe live key detected' },
      { pattern: /['"`]AKIA[0-9A-Z]{16}['"`]/g, type: 'hardcoded_secret', message: 'AWS access key detected' },
      { pattern: /password\s*[:=]\s*['"`][^'"`]+['"`]/gi, type: 'hardcoded_secret', message: 'Hardcoded password detected' },
      { pattern: /api[-_]?key\s*[:=]\s*['"`][a-zA-Z0-9]{20,}['"`]/gi, type: 'hardcoded_secret', message: 'Hardcoded API key detected' },
      { pattern: /private[-_]?key\s*[:=]\s*['"`]-----BEGIN/gi, type: 'hardcoded_secret', message: 'Private key in source code' },
    ]
    
    // SQL injection patterns
    const sqlInjectionPatterns = [
      { pattern: /\$\{.*\}.*(?:SELECT|INSERT|UPDATE|DELETE|DROP)/gi, type: 'sql_injection', message: 'Potential SQL injection via template literal' },
      { pattern: /query\s*\(\s*['"`].*\+/gi, type: 'sql_injection', message: 'String concatenation in SQL query' },
    ]
    
    // CORS issues
    const corsPatterns = [
      { pattern: /Access-Control-Allow-Origin['":\s]+\*/g, type: 'cors_misconfiguration', message: 'Wildcard CORS origin detected' },
      { pattern: /credentials:\s*['"]include['"].*origin:\s*\*/g, type: 'cors_misconfiguration', message: 'Credentials with wildcard origin' },
    ]
    
    // Scan all files in context
    for (const [filePath, content] of this.context.files) {
      // Skip non-source files
      if (!filePath.match(/\.(ts|tsx|js|jsx|mjs|cjs)$/)) continue
      
      // Check secret patterns
      for (const { pattern, type, message } of secretPatterns) {
        if (pattern.test(content)) {
          vulnerabilities.push({ type, severity: 'critical', message, file: filePath })
        }
      }
      
      // Check SQL injection patterns
      for (const { pattern, type, message } of sqlInjectionPatterns) {
        if (pattern.test(content)) {
          vulnerabilities.push({ type, severity: 'high', message, file: filePath })
        }
      }
      
      // Check CORS patterns
      for (const { pattern, type, message } of corsPatterns) {
        if (pattern.test(content)) {
          vulnerabilities.push({ type, severity: 'medium', message, file: filePath })
        }
      }
    }
    
    return {
      passed: vulnerabilities.length === 0,
      vulnerabilities: vulnerabilities.length > 0 ? vulnerabilities : undefined,
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
    preflight?: PreflightResult
  }> {
    // 0. Pre-flight check: validate request before spending fuel
    const preflightResult = this.preflight(userPrompt)
    if (!preflightResult.feasible) {
      // Return early with empty results if request is unfeasible
      return {
        plan: {
          content: `Request rejected: ${preflightResult.reason}`,
          toolCalls: [],
          tokensUsed: 0,
        },
        execution: [],
        audit: {
          passed: false,
          timestamp: new Date().toISOString(),
          gates: {
            visual: { passed: false, issues: ['Pre-flight check failed'] },
            functional: { passed: false, issues: [] },
            hygiene: { passed: false, issues: [] },
            security: { passed: false },
          },
        },
        preflight: preflightResult,
      }
    }
    
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
    
    return { plan, execution, audit, routing: routing ?? undefined, preflight: preflightResult }
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
