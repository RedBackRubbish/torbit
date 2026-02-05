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
import { BACKEND_SYSTEM_PROMPT } from './prompts/backend'
import { PLANNER_SYSTEM_PROMPT } from './prompts/planner'
import { STRATEGIST_SYSTEM_PROMPT } from './prompts/strategist'
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

export interface ParallelTask {
  agent: AgentId
  prompt: string
  modelTier?: ModelTier
}

export interface ParallelResult {
  results: AgentResult[]
  merged?: AgentResult
  checkpoint: string
  totalDuration: number
  parallelSpeedup: number // Theoretical sequential time / actual parallel time
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
  backend: BACKEND_SYSTEM_PROMPT,           // Kimi K2.5: Fullstack Core (API + schemas)
  database: BACKEND_SYSTEM_PROMPT,          // Merged with backend - same prompt
  devops: DEVOPS_SYSTEM_PROMPT,
  qa: QA_SYSTEM_PROMPT,
  planner: PLANNER_SYSTEM_PROMPT,           // Kimi K2.5: Complex planning, dependency mapping
  strategist: STRATEGIST_SYSTEM_PROMPT,     // GPT-5.2: Reviews plans, NEVER first mover
  auditor: AUDITOR_SYSTEM_PROMPT,           // Opus: Judges quality, NEVER executes fixes
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
  preflight(userPrompt: string): PreflightResult {
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
   * ARCHITECT INTEGRITY CHECK
   * 
   * Uses Strategist (GPT-5.2) to validate Architect's file structure
   * BEFORE Backend starts building. Catches structural issues early.
   * 
   * Questions Strategist answers:
   * - Is responsibility clearly separated?
   * - Are there unnecessary abstractions?
   * - Does file layout match intent?
   * 
   * Returns: APPROVED / AMENDMENTS / REJECTED
   */
  async runArchitectIntegrityCheck(
    architectOutput: string,
    originalRequest: string
  ): Promise<{
    verdict: 'APPROVED' | 'AMENDMENTS' | 'REJECTED'
    issues?: string[]
    amendments?: string[]
  }> {
    const checkPrompt = `
You are validating the ARCHITECT's file structure before Backend implementation begins.

═══ ORIGINAL USER REQUEST ═══
${originalRequest}

═══ ARCHITECT'S PROPOSED STRUCTURE ═══
${architectOutput}

═══ YOUR TASK ═══
Evaluate the proposed structure. Answer these questions:

1. RESPONSIBILITY SEPARATION
   - Is each file's job clear and single-purpose?
   - Are there redundant files doing the same thing?

2. ABSTRACTION LEVEL
   - Are there unnecessary abstractions for this scope?
   - Is anything over-engineered?

3. FILE LAYOUT SANITY
   - Does the structure match the user's request?
   - Are related files co-located?
   - Does it follow Next.js App Router conventions?

4. BOUNDARY CLEANLINESS
   - Are component boundaries logical?
   - Is state scoped appropriately?

OUTPUT your verdict in the exact format from your system prompt.
`

    const result = await this.executeAgent('strategist', checkPrompt, { modelTier: 'sonnet' })
    
    // Parse Strategist's response for verdict
    const output = result.output.toUpperCase()
    
    if (output.includes('REJECTED')) {
      const reasonMatch = result.output.match(/REASON:\s*(.+?)(?:\n|$)/i)
      return {
        verdict: 'REJECTED',
        issues: reasonMatch ? [reasonMatch[1].trim()] : ['Structure rejected by Strategist'],
      }
    }
    
    if (output.includes('AMENDMENTS')) {
      const amendmentsMatch = result.output.match(/AMENDMENTS?:\s*([\s\S]+?)(?:RATIONALE|$)/i)
      const amendments = amendmentsMatch 
        ? amendmentsMatch[1].split('\n').filter(l => l.trim().match(/^\d+\./)).map(l => l.trim())
        : []
      return {
        verdict: 'AMENDMENTS',
        amendments: amendments.length > 0 ? amendments : ['Review suggested amendments'],
      }
    }
    
    return { verdict: 'APPROVED' }
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
          agentId: 'architect',
          success: false,
          output: `Request rejected: ${preflightResult.reason}`,
          toolCalls: [],
          duration: 0,
        },
        execution: [],
        audit: {
          passed: false,
          gates: {
            visual: { passed: false, issues: ['Pre-flight check failed'] },
            functional: { passed: false, issues: [] },
            hygiene: { passed: false, issues: [] },
            security: { passed: false, issues: [] },
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
    
    // 3.5 ARCHITECT INTEGRITY CHECK - Strategist validates structure before Backend builds
    // This catches structural issues early, with a different brain (GPT-5.2)
    if (plan.success) {
      const integrityCheck = await this.runArchitectIntegrityCheck(plan.output, userPrompt)
      
      if (integrityCheck.verdict === 'REJECTED') {
        // Structure rejected - return early with clear feedback
        return {
          plan: {
            ...plan,
            success: false,
            output: `Architect structure REJECTED by Strategist: ${integrityCheck.issues?.join(', ') || 'Structure validation failed'}`,
          },
          execution: [],
          audit: {
            passed: false,
            gates: {
              visual: { passed: false, issues: ['Architect Integrity Check failed'] },
              functional: { passed: false, issues: integrityCheck.issues || [] },
              hygiene: { passed: true, issues: [] },
              security: { passed: true, issues: [] },
            },
          },
          routing: routing ?? undefined,
          preflight: preflightResult,
        }
      }
      
      if (integrityCheck.verdict === 'AMENDMENTS') {
        // Amendments requested - re-run Architect with feedback
        const amendedPlan = await this.executeAgent('architect', `
          Your previous plan was reviewed by the Strategist who requested these amendments:
          ${integrityCheck.amendments?.join('\n') || 'Review and improve structure'}
          
          Original request: "${userPrompt}"
          
          Please revise your plan incorporating these amendments.
        `, { modelTier: planModelTier })
        
        // Replace plan with amended version
        Object.assign(plan, amendedPlan)
      }
      // APPROVED: continue to execution
    }
    
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
   * Execute multiple agents in parallel for faster full-stack development
   * 
   * Use case: "Build full-stack feature" → Frontend + Backend + Database run simultaneously
   * Then Architect merges results into a cohesive system.
   * 
   * Wall-clock speedup: ~3x for 3 parallel agents (network-bound, not compute-bound)
   */
  async executeParallel(
    tasks: ParallelTask[],
    options: {
      /** If true, use Architect with Opus to merge all outputs into cohesive result */
      mergeWithArchitect?: boolean
      /** Custom merge prompt (optional) */
      mergePrompt?: string
      /** Model tier for merge step (default: opus) */
      mergeModelTier?: ModelTier
    } = {}
  ): Promise<ParallelResult> {
    const startTime = Date.now()
    
    // 1. Create checkpoint for safety (rollback if parallel execution fails)
    const checkpointResult = await executeTool('createCheckpoint', {
      name: `parallel-execution-${Date.now()}`,
      reason: `Before parallel execution of ${tasks.length} agents: ${tasks.map(t => t.agent).join(', ')}`,
    }, this.context)
    const checkpoint = (checkpointResult.data as { checkpointId?: string })?.checkpointId ?? `checkpoint-${Date.now()}`
    
    // 2. Execute all agents in parallel
    const parallelStart = Date.now()
    const results = await Promise.all(
      tasks.map(({ agent, prompt, modelTier }) =>
        this.executeAgent(agent, prompt, { modelTier: modelTier ?? 'sonnet' })
      )
    )
    const parallelDuration = Date.now() - parallelStart
    
    // Calculate theoretical sequential time (sum of all durations)
    const theoreticalSequentialTime = results.reduce((sum, r) => sum + r.duration, 0)
    const parallelSpeedup = theoreticalSequentialTime / parallelDuration
    
    // 3. Optionally merge results with Architect
    let merged: AgentResult | undefined
    if (options.mergeWithArchitect) {
      const mergePrompt = options.mergePrompt ?? this.buildMergePrompt(tasks, results)
      merged = await this.executeAgent('architect', mergePrompt, {
        modelTier: options.mergeModelTier ?? 'opus',
      })
    }
    
    return {
      results,
      merged,
      checkpoint,
      totalDuration: Date.now() - startTime,
      parallelSpeedup,
    }
  }
  
  /**
   * Build default merge prompt for Architect
   */
  private buildMergePrompt(tasks: ParallelTask[], results: AgentResult[]): string {
    const sections = tasks.map((task, i) => {
      const result = results[i]
      const status = result.success ? '✅' : '❌'
      return `### ${task.agent.toUpperCase()} Agent ${status}
**Task:** ${task.prompt}
**Output:**
${result.output}
**Tool calls:** ${result.toolCalls.length} (${result.toolCalls.map(tc => tc.name).join(', ') || 'none'})`
    }).join('\n\n')
    
    return `You are integrating work from ${tasks.length} parallel agents.

Review their outputs and create a cohesive, working system:

${sections}

## Your Task:
1. Identify any conflicts or inconsistencies between the outputs
2. Resolve type mismatches (e.g., frontend expecting different API shape than backend provides)
3. Create any missing integration code (API clients, shared types, imports)
4. Ensure all pieces work together as a unified feature
5. List any remaining TODOs or manual steps needed

Output a clear integration plan and any necessary code changes.`
  }
  
  /**
   * Decompose a complex task into parallel subtasks using Planner
   * Then execute them in parallel and merge with Architect
   */
  async orchestrateParallel(
    userPrompt: string,
    options?: { maxParallelAgents?: number }
  ): Promise<ParallelResult & { plan: AgentResult }> {
    // 1. Use Planner to decompose into parallelizable tasks
    const planPrompt = `Decompose this request into parallel subtasks that can be executed simultaneously.
    
User request: "${userPrompt}"

Identify which agents should handle each subtask:
- frontend: UI components, pages, styling
- backend: APIs, business logic, server code
- database: Schema design, migrations, queries
- devops: Deployment, CI/CD, infrastructure
- qa: Tests, test data, coverage

Output a JSON array of tasks:
[
  { "agent": "frontend", "prompt": "Create the dashboard UI with...", "modelTier": "sonnet" },
  { "agent": "backend", "prompt": "Build the REST API for...", "modelTier": "sonnet" }
]

Rules:
- Maximum ${options?.maxParallelAgents ?? 4} parallel tasks
- Each task should be independent (no dependencies between them)
- Use "flash" for simple tasks, "sonnet" for moderate, "opus" for complex`

    const plan = await this.executeAgent('planner', planPrompt, { modelTier: 'sonnet' })
    
    // 2. Parse tasks from planner output
    let tasks: ParallelTask[] = []
    try {
      const jsonMatch = plan.output.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        tasks = parsed.map((t: { agent: string; prompt: string; modelTier?: string }) => ({
          agent: t.agent as AgentId,
          prompt: t.prompt,
          modelTier: (t.modelTier as ModelTier) ?? 'sonnet',
        }))
      }
    } catch {
      // Fallback: single agent execution if parsing fails
      console.warn('[Orchestrator] Failed to parse parallel tasks, falling back to single agent')
      tasks = [{ agent: 'architect', prompt: userPrompt, modelTier: 'sonnet' }]
    }
    
    // 3. Execute in parallel and merge
    const parallelResult = await this.executeParallel(tasks, { mergeWithArchitect: true })
    
    return { ...parallelResult, plan }
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
