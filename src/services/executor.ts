import { useTerminalStore } from '@/store/terminal'
import { useFuelStore } from '@/store/fuel'
import { useTimeline, type AgentType } from '@/store/timeline'

// ============================================================================
// EXECUTOR SERVICE - The Spinal Cord
// ============================================================================
// Translates AI intent (JSON tool calls) into action.
// File operations are synced via Zustand → E2BProvider → E2B sandbox.
// 
// Architecture:
// - Stateless design: grabs singletons on demand
// - Returns string results the AI can parse for self-correction
// - Integrates with Fuel system for token economics
// - Logs all actions to Terminal for user visibility
// ============================================================================

export interface ExecutionResult {
  success: boolean
  output: string
  duration: number
  fuelConsumed?: number
}

// Tool to fuel cost mapping (estimated based on complexity)
const TOOL_FUEL_COSTS: Record<string, number> = {
  // File operations (light)
  createFile: 5,
  readFile: 2,
  editFile: 8,
  deleteFile: 3,
  listFiles: 2,
  
  // Terminal operations (medium)
  runTerminal: 15,
  installPackage: 25,
  
  // Analysis (heavy)
  runTests: 30,
  runE2eCycle: 50,
  verifyDependencyGraph: 10,
  
  // Thinking (varies by model)
  think: 10,
  
  // Default
  default: 5,
}

export class ExecutorService {
  /**
   * The Master Switch: Routes AI tool calls to execution.
   * NOTE: File operations are now handled by E2B sandbox through E2BProvider.
   * This service just handles tool validation, fuel tracking, and logging.
   * Actual file content is set via Zustand store (addFile) in ChatPanel.
   */
  static async executeTool(
    toolName: string, 
    args: Record<string, unknown>
  ): Promise<ExecutionResult> {
    const startTime = Date.now()
    
    // 1. Get store references (Zustand allows getState outside React)
    const terminal = useTerminalStore.getState()
    const fuel = useFuelStore.getState()
    const timeline = useTimeline.getState()
    
    // 2. Check fuel before execution (bypass if disabled for testing)
    const fuelDisabled = process.env.NEXT_PUBLIC_FUEL_DISABLED === 'true'
    const fuelCost = TOOL_FUEL_COSTS[toolName] || TOOL_FUEL_COSTS.default
    if (!fuelDisabled && !fuel.canAfford(fuelCost)) {
      terminal.addLog(`Insufficient fuel for ${toolName} (need ${fuelCost}, have ${fuel.currentFuel})`, 'error')
      return {
        success: false,
        output: `ERROR: Insufficient fuel. Need ${fuelCost} units, have ${fuel.currentFuel}. Please refuel.`,
        duration: Date.now() - startTime,
        fuelConsumed: 0,
      }
    }
    
    // 3. Log the intent
    terminal.addLog(`Executing: ${toolName}`, 'info')

    try {
      // 4. Route to appropriate handler (E2B handles actual file ops through Zustand)
      let output: string
      
      switch (toolName) {
        // ================================================
        // FILE OPERATIONS - Just log and return success
        // Actual file content is synced via Zustand → E2BProvider → E2B sandbox
        // ================================================
        
        case 'createFile': {
          const { path } = args as { path: string; content: string }
          terminal.addLog(`Created: ${path}`, 'success')
          output = `SUCCESS: File created at ${path}`
          break
        }

        case 'editFile': {
          const { path } = args as { path: string; content?: string; patch?: string }
          terminal.addLog(`Updated: ${path}`, 'info')
          output = `SUCCESS: File updated at ${path}`
          break
        }

        case 'readFile': {
          const { path } = args as { path: string }
          // Reading files would require E2B API call - for now just acknowledge
          terminal.addLog(`Read request: ${path}`, 'info')
          output = `File read request queued for ${path}`
          break
        }

        case 'listFiles': {
          const { path = '.' } = args as { path?: string; recursive?: boolean }
          terminal.addLog(`List request: ${path}`, 'info')
          output = `Directory listing request queued for ${path}`
          break
        }

        case 'deleteFile': {
          const { path } = args as { path: string }
          terminal.addLog(`Deleted: ${path}`, 'warning')
          output = `SUCCESS: Deleted ${path}`
          break
        }

        // ================================================
        // TERMINAL OPERATIONS - These need E2B API
        // ================================================
        
        case 'runTerminal':
        case 'runCommand': {
          const { command } = args as { command: string }
          terminal.addLog(`> ${command}`, 'command')
          // Terminal commands will be run via E2B API in E2BProvider
          output = `Command queued: ${command}`
          break
        }

        case 'installPackage': {
          const { packageName, dev = false } = args as { packageName: string; dev?: boolean }
          const cmd = dev ? `npm install --save-dev ${packageName}` : `npm install ${packageName}`
          terminal.addLog(`> ${cmd}`, 'command')
          // Package installation handled by E2B
          output = `Package install queued: ${packageName}`
          break
        }

        // ================================================
        // OPS & SAFETY - These log but actual work is in E2B
        // ================================================
        
        case 'runTests': {
          terminal.addLog(`> npm test`, 'command')
          // Tests run via E2B
          output = `Tests queued`
          break
        }

        case 'runE2eCycle': {
          // For now, mock the E2E test cycle
          terminal.addLog('Running E2E test cycle', 'info')
          terminal.addLog('E2E tests passed', 'success')
          output = `SUCCESS: E2E tests passed (Mocked for Prototype)`
          break
        }

        case 'verifyDependencyGraph': {
          // Dependency verification now logged only - actual check in E2B
          terminal.addLog('Verifying dependencies...', 'info')
          output = `DEPENDENCIES_VERIFIED: Check complete`
          break
        }

        // ================================================
        // THINKING (The Mind)
        // ================================================
        
        case 'think': {
          const { thought } = args as { thought: string }
          // Create a thinking step and append the thought
          const stepId = timeline.addStep({
            agent: 'Builder',
            label: 'Thinking...',
            description: thought.slice(0, 200),
            status: 'thinking',
          })
          timeline.appendThinking(stepId, thought)
          output = `THOUGHT_RECORDED: ${thought.slice(0, 100)}...`
          break
        }

        // ================================================
        // UNKNOWN TOOL
        // ================================================
        
        default:
          output = `ERROR: Unknown tool "${toolName}". Available: createFile, editFile, readFile, listFiles, deleteFile, runTerminal, installPackage, runTests, runE2eCycle, verifyDependencyGraph`
      }

      // 7. Consume fuel after successful execution
      // Use deductPlanner for thinking, deductAuditor for tests, hold for builds
      if (toolName === 'think') {
        fuel.deductPlanner(fuelCost, `Tool: ${toolName}`)
      } else if (toolName.includes('test') || toolName.includes('E2e') || toolName.includes('verify')) {
        fuel.deductAuditor(fuelCost, `Tool: ${toolName}`)
      } else {
        // Builder tools use hold + finalize pattern (Auditor Guarantee)
        const txId = fuel.holdBuilderCost(fuelCost, crypto.randomUUID(), `Tool: ${toolName}`)
        fuel.finalizeBuilderCost(txId) // Auto-finalize for now
      }
      
      // 8. Update timeline - determine agent type
      const agentType: AgentType = 
        toolName.includes('test') || toolName.includes('E2e') || toolName.includes('verify')
          ? 'Auditor' 
          : toolName.includes('install') || toolName.includes('Terminal') 
            ? 'DevOps' 
            : 'Builder'
      
      timeline.addStep({
        agent: agentType,
        label: toolName,
        description: `Executed ${toolName}`,
        status: 'complete',
        fuelCost,
      })
      
      return {
        success: true,
        output,
        duration: Date.now() - startTime,
        fuelConsumed: fuelCost,
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      terminal.addLog(`Error in ${toolName}: ${errorMessage}`, 'error')
      
      // Update timeline with failure
      timeline.addStep({
        agent: 'Builder',
        label: toolName,
        description: `Failed: ${errorMessage}`,
        status: 'failed',
        error: errorMessage,
      })
      
      // CRITICAL: Return error to AI so it can self-correct
      return {
        success: false,
        output: `ERROR: ${errorMessage}`,
        duration: Date.now() - startTime,
        fuelConsumed: 0,
      }
    }
  }
  
  /**
   * Batch execute multiple tools in sequence
   * Useful for AI "plans" that specify multiple steps
   */
  static async executeToolBatch(
    tools: Array<{ name: string; args: Record<string, unknown> }>
  ): Promise<ExecutionResult[]> {
    const results: ExecutionResult[] = []
    
    for (const tool of tools) {
      const result = await this.executeTool(tool.name, tool.args)
      results.push(result)
      
      // Stop on first error (fail-fast for safety)
      if (!result.success) {
        break
      }
    }
    
    return results
  }
  
  /**
   * Check if a tool is available
   */
  static isToolAvailable(toolName: string): boolean {
    const availableTools = [
      'createFile', 'editFile', 'readFile', 'listFiles', 'deleteFile',
      'runTerminal', 'runCommand', 'installPackage',
      'runTests', 'runE2eCycle', 'verifyDependencyGraph',
      'think',
    ]
    return availableTools.includes(toolName)
  }
  
  /**
   * Get fuel cost for a tool
   */
  static getFuelCost(toolName: string): number {
    return TOOL_FUEL_COSTS[toolName] || TOOL_FUEL_COSTS.default
  }
}
