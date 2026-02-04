import { useFuelStore } from '@/store/fuel'
import { useTimeline, TOOL_TO_AGENT, TOOL_FUEL_COSTS } from '@/store/timeline'

// ============================================================================
// AGENT MIDDLEWARE - The Nervous System
// ============================================================================
// Intercepts every tool call from the Vercel AI SDK and:
// 1. Updates the Neural Timeline with agent activity
// 2. Manages fuel holds/burns based on the Auditor Guarantee
// 3. Streams thinking output to the UI
// ============================================================================

interface ToolCallContext {
  toolName: string
  args: Record<string, unknown>
  agentId?: string
}

interface ToolCallResult {
  success: boolean
  output?: unknown
  error?: string
}

// Track active step IDs and transaction IDs per tool call
const activeToolSteps = new Map<string, { stepId: string; transactionId?: string }>()

/**
 * Called BEFORE a tool executes
 * Creates timeline step and manages fuel holds
 */
export function onToolCallStart(context: ToolCallContext): string {
  const { toolName, args } = context
  const fuelStore = useFuelStore.getState()
  const timelineStore = useTimeline.getState()
  
  // 1. Determine agent from tool
  const agent = TOOL_TO_AGENT[toolName] || 'Builder'
  const fuelCost = TOOL_FUEL_COSTS[toolName] || 3
  
  // 2. Create human-readable label
  const label = getToolLabel(toolName, args)
  const description = getToolDescription(toolName, args)
  
  // 3. Determine initial status based on agent type
  const status = agent === 'Auditor' ? 'auditing' 
               : agent === 'Planner' || agent === 'Architect' ? 'thinking' 
               : 'active'
  
  // 4. Add step to timeline
  const stepId = timelineStore.addStep({
    agent,
    label,
    description,
    status,
    fuelCost: agent === 'Builder' ? fuelCost : undefined, // Only show fuel risk for builders
  })
  
  // 5. Handle fuel based on agent type
  let transactionId: string | undefined
  
  if (agent === 'Builder') {
    // Builder actions are HELD (pending) until Auditor approves
    // This is the "Auditor Guarantee" - user doesn't pay if build fails audit
    const taskId = `task-${toolName}-${Date.now()}`
    transactionId = fuelStore.holdBuilderCost(fuelCost, taskId, label)
    
    // Update timeline to show pending state
    timelineStore.appendThinking(stepId, `Holding ${fuelCost} fuel (pending audit)...`)
  } 
  else if (agent === 'Auditor') {
    // Auditor burns fuel immediately (verification costs money)
    fuelStore.deductAuditor(2, 'Auditor verification')
    timelineStore.appendThinking(stepId, 'Running verification checks...')
  }
  else if (agent === 'Planner' || agent === 'Architect') {
    // Planning/Architecture has minimal cost
    fuelStore.deductPlanner(1, `${agent} analysis`)
    timelineStore.appendThinking(stepId, 'Analyzing requirements...')
  }
  
  // Store step ID and transaction for later completion
  const stepKey = toolName + JSON.stringify(args)
  activeToolSteps.set(stepKey, { stepId, transactionId })
  
  return stepId
}

/**
 * Called AFTER a tool executes
 * Completes timeline step and finalizes fuel
 */
export function onToolCallComplete(
  context: ToolCallContext, 
  result: ToolCallResult
): void {
  const { toolName, args } = context
  const fuelStore = useFuelStore.getState()
  const timelineStore = useTimeline.getState()
  
  const stepKey = toolName + JSON.stringify(args)
  const stepData = activeToolSteps.get(stepKey)
  
  if (!stepData) {
    console.warn(`[AgentMiddleware] No step found for ${toolName}`)
    return
  }
  
  const { stepId, transactionId } = stepData
  const agent = TOOL_TO_AGENT[toolName] || 'Builder'
  
  if (result.success) {
    // Success path
    timelineStore.completeStep(stepId, true)
    
    // Special case: Auditor approval finalizes builder costs
    if (toolName === 'runE2eCycle' || toolName === 'verifyVisualMatch') {
      // The Guarantee: Code passed! Finalize all pending builder costs
      const auditPassed = result.output && typeof result.output === 'object' && 
                          (result.output as { passed?: boolean }).passed === true
      
      if (auditPassed && transactionId) {
        fuelStore.finalizeBuilderCost(transactionId)
        timelineStore.appendThinking(stepId, '✓ Audit passed - fuel charges finalized')
      } else if (transactionId) {
        // Audit failed - refund pending costs
        fuelStore.refundBuilderCost(transactionId)
        timelineStore.appendThinking(stepId, '✗ Audit failed - fuel refunded')
      }
    }
  } else {
    // Failure path
    timelineStore.failStep(stepId, result.error || 'Unknown error')
    
    // If a builder tool fails, refund the held cost
    if (agent === 'Builder' && transactionId) {
      fuelStore.refundBuilderCost(transactionId)
      timelineStore.appendThinking(stepId, `Failed: ${result.error} - fuel refunded`)
    }
  }
  
  // Cleanup
  activeToolSteps.delete(stepKey)
}

/**
 * Stream thinking output to the timeline
 * Call this during tool execution to show progress
 */
export function streamThinking(stepId: string, line: string): void {
  const timelineStore = useTimeline.getState()
  timelineStore.appendThinking(stepId, line)
}

/**
 * Handle the special "rollback" case
 * When code fails audit and needs to be reverted
 */
export function onRollback(reason: string, transactionId?: string): void {
  const fuelStore = useFuelStore.getState()
  const timelineStore = useTimeline.getState()
  
  // The Guarantee: Code failed. Refund the pending builder cost
  if (transactionId) {
    fuelStore.refundBuilderCost(transactionId)
  }
  
  // Add a rollback step to the timeline
  timelineStore.addStep({
    agent: 'Auditor',
    label: 'Rollback',
    description: reason,
    status: 'complete',
  })
}

// ============================================================================
// Helper Functions
// ============================================================================

function getToolLabel(toolName: string, args: Record<string, unknown>): string {
  const labels: Record<string, (args: Record<string, unknown>) => string> = {
    // File operations
    createFile: (a) => `Create ${getFileName(a.path as string)}`,
    editFile: (a) => `Edit ${getFileName(a.path as string)}`,
    deleteFile: (a) => `Delete ${getFileName(a.path as string)}`,
    
    // Generation
    generateComponent: (a) => `Generate ${a.componentName || 'component'}`,
    createApiRoute: (a) => `Create API ${a.route || 'route'}`,
    
    // Testing
    runTests: () => 'Running tests',
    lintCode: () => 'Linting code',
    verifyVisualMatch: () => 'Visual verification',
    runE2eCycle: () => 'End-to-end testing',
    
    // Planning
    planSteps: () => 'Planning approach',
    analyzeRequirements: () => 'Analyzing requirements',
    designArchitecture: () => 'Designing architecture',
    
    // Deployment
    deployToProduction: () => 'Deploying to production',
    syncToGithub: () => 'Syncing to GitHub',
  }
  
  const labelFn = labels[toolName]
  if (labelFn) {
    return labelFn(args)
  }
  
  // Fallback: convert camelCase to Title Case
  return toolName
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim()
}

function getToolDescription(toolName: string, args: Record<string, unknown>): string | undefined {
  // Extract meaningful description from args
  if (args.path) {
    return args.path as string
  }
  if (args.description) {
    return args.description as string
  }
  if (args.componentName && args.type) {
    return `${args.type} component`
  }
  return undefined
}

function getFileName(path: string | undefined): string {
  if (!path) return 'file'
  const parts = path.split('/')
  return parts[parts.length - 1] || 'file'
}

// ============================================================================
// Integration with Vercel AI SDK
// ============================================================================

/**
 * Wrapper for the Vercel AI SDK onToolCall handler
 * Use this in your API route to automatically track all tool calls
 * 
 * Example usage in /api/chat/route.ts:
 * 
 * ```ts
 * import { wrapToolHandler } from '@/lib/agent-middleware'
 * 
 * const result = await streamText({
 *   model,
 *   messages,
 *   tools,
 *   onToolCall: wrapToolHandler(async ({ toolName, args }) => {
 *     // Your existing tool execution logic
 *     return executeToolCall(toolName, args)
 *   }),
 * })
 * ```
 */
export function wrapToolHandler<T>(
  handler: (context: ToolCallContext) => Promise<T>
): (context: ToolCallContext) => Promise<T> {
  return async (context: ToolCallContext): Promise<T> => {
    const _stepId = onToolCallStart(context)
    
    try {
      const result = await handler(context)
      
      onToolCallComplete(context, {
        success: true,
        output: result,
      })
      
      return result
    } catch (error) {
      onToolCallComplete(context, {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      
      throw error
    }
  }
}

// ============================================================================
// Demo/Testing Functions
// ============================================================================

/**
 * Simulate agent activity for testing the UI
 * Call this from a client component to see the timeline in action
 */
export async function simulateAgentActivity(): Promise<void> {
  const timeline = useTimeline.getState()
  
  // Clear previous
  timeline.clearTimeline()
  
  // Step 1: Planner thinks
  const step1 = timeline.addStep({
    agent: 'Planner',
    label: 'Analyzing request',
    description: 'Understanding what to build',
    status: 'thinking',
  })
  
  await delay(800)
  timeline.appendThinking(step1, 'Parsing user requirements...')
  await delay(600)
  timeline.appendThinking(step1, 'Identifying key features...')
  await delay(500)
  timeline.completeStep(step1)
  
  // Step 2: Architect designs
  const step2 = timeline.addStep({
    agent: 'Architect',
    label: 'Designing system',
    description: 'Creating component structure',
    status: 'thinking',
  })
  
  await delay(700)
  timeline.appendThinking(step2, 'Evaluating tech stack...')
  await delay(600)
  timeline.appendThinking(step2, 'Planning file structure...')
  await delay(500)
  timeline.completeStep(step2)
  
  // Step 3: Builder creates files
  const step3 = timeline.addStep({
    agent: 'Builder',
    label: 'Create Button.tsx',
    description: 'src/components/ui/Button.tsx',
    status: 'active',
    fuelCost: 5,
  })
  
  await delay(600)
  timeline.appendThinking(step3, 'Generating component code...')
  await delay(800)
  timeline.appendThinking(step3, 'Adding TypeScript types...')
  await delay(500)
  timeline.completeStep(step3)
  
  // Step 4: Builder creates more
  const step4 = timeline.addStep({
    agent: 'Builder',
    label: 'Create Card.tsx',
    description: 'src/components/ui/Card.tsx',
    status: 'active',
    fuelCost: 4,
  })
  
  await delay(700)
  timeline.completeStep(step4)
  
  // Step 5: Auditor verifies
  const step5 = timeline.addStep({
    agent: 'Auditor',
    label: 'Running E2E tests',
    description: 'Verifying all components work',
    status: 'auditing',
  })
  
  await delay(600)
  timeline.appendThinking(step5, 'Checking TypeScript errors...')
  await delay(700)
  timeline.appendThinking(step5, 'Running component tests...')
  await delay(800)
  timeline.appendThinking(step5, 'Verifying accessibility...')
  await delay(500)
  timeline.completeStep(step5)
  
  // Step 6: Deploy
  const step6 = timeline.addStep({
    agent: 'DevOps',
    label: 'Deploying to Vercel',
    description: 'Production deployment',
    status: 'active',
  })
  
  await delay(1000)
  timeline.completeStep(step6)
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
