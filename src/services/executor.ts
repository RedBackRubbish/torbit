import { getWebContainer, isWebContainerSupported } from '@/lib/webcontainer'
import { useTerminalStore } from '@/store/terminal'
import { useFuelStore } from '@/store/fuel'
import { useTimeline, type AgentType } from '@/store/timeline'
import { NervousSystem } from '@/lib/nervous-system'

// ============================================================================
// EXECUTOR SERVICE - The Spinal Cord
// ============================================================================
// Translates AI intent (JSON tool calls) into physical action (WebContainer).
// This is the critical bridge between the Brain (AI) and Body (Runtime).
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
   * The Master Switch: Routes AI tool calls to WebContainer logic
   * Returns a string result that the AI can "read" to know if it succeeded.
   */
  static async executeTool(
    toolName: string, 
    args: Record<string, unknown>
  ): Promise<ExecutionResult> {
    const startTime = Date.now()
    
    // 1. Check WebContainer support (client-side only)
    if (!isWebContainerSupported()) {
      return {
        success: false,
        output: 'ERROR: WebContainer not supported in this browser. Requires SharedArrayBuffer.',
        duration: Date.now() - startTime,
      }
    }
    
    // 2. Get store references (Zustand allows getState outside React)
    const terminal = useTerminalStore.getState()
    const fuel = useFuelStore.getState()
    const timeline = useTimeline.getState()
    
    // 3. Check fuel before execution
    const fuelCost = TOOL_FUEL_COSTS[toolName] || TOOL_FUEL_COSTS.default
    if (!fuel.canAfford(fuelCost)) {
      terminal.addLog(`⛽ Insufficient fuel for ${toolName} (need ${fuelCost}, have ${fuel.currentFuel})`, 'error')
      return {
        success: false,
        output: `ERROR: Insufficient fuel. Need ${fuelCost} units, have ${fuel.currentFuel}. Please refuel.`,
        duration: Date.now() - startTime,
        fuelConsumed: 0,
      }
    }
    
    // 4. Log the intent (Ghost Text in terminal)
    console.log(`[Executor] 🤖 ${toolName}`, args)
    terminal.addLog(`🤖 Executing: ${toolName}`, 'info')

    try {
      // 5. Boot WebContainer (singleton, only boots once)
      const container = await getWebContainer()
      
      // 6. Route to appropriate handler
      let output: string
      
      switch (toolName) {
        // ================================================
        // FILE OPERATIONS (The Hands)
        // ================================================
        
        case 'createFile': {
          const { path, content } = args as { path: string; content: string }
          
          // Ensure parent directory exists
          const dir = path.split('/').slice(0, -1).join('/')
          if (dir) {
            await container.fs.mkdir(dir, { recursive: true })
          }
          
          await container.fs.writeFile(path, content)
          terminal.addLog(`✅ Created: ${path}`, 'success')
          output = `SUCCESS: File created at ${path}`
          break
        }

        case 'editFile': {
          const { path, content, patch } = args as { path: string; content?: string; patch?: string }
          
          // If content is provided, overwrite. If patch is provided, apply it.
          // For now, we treat both as full replacement (proper diff would need a library)
          const newContent = content || patch || ''
          await container.fs.writeFile(path, newContent)
          terminal.addLog(`📝 Updated: ${path}`, 'info')
          output = `SUCCESS: File updated at ${path}`
          break
        }

        case 'readFile': {
          const { path } = args as { path: string }
          const fileContent = await container.fs.readFile(path, 'utf-8')
          terminal.addLog(`📖 Read: ${path} (${fileContent.length} chars)`, 'info')
          output = fileContent
          break
        }

        case 'listFiles': {
          const { path = '.', recursive = false } = args as { path?: string; recursive?: boolean }
          
          const listDir = async (dir: string, depth = 0): Promise<string[]> => {
            const entries = await container.fs.readdir(dir, { withFileTypes: true })
            const lines: string[] = []
            
            for (const entry of entries) {
              const indent = '  '.repeat(depth)
              const name = entry.isDirectory() ? `${entry.name}/` : entry.name
              lines.push(`${indent}${name}`)
              
              if (entry.isDirectory() && recursive) {
                const subPath = dir === '.' ? entry.name : `${dir}/${entry.name}`
                const subLines = await listDir(subPath, depth + 1)
                lines.push(...subLines)
              }
            }
            
            return lines
          }
          
          const fileList = await listDir(path)
          output = `Directory listing for ${path}:\n${fileList.join('\n')}`
          terminal.addLog(`📁 Listed: ${path} (${fileList.length} items)`, 'info')
          break
        }

        case 'deleteFile': {
          const { path } = args as { path: string }
          await container.fs.rm(path, { recursive: true })
          terminal.addLog(`🗑️ Deleted: ${path}`, 'warning')
          output = `SUCCESS: Deleted ${path}`
          break
        }

        // ================================================
        // TERMINAL OPERATIONS (The Muscle)
        // ================================================
        
        case 'runTerminal':
        case 'runCommand': {
          const { command } = args as { command: string }
          const parts = command.split(' ')
          const cmd = parts[0]
          const cmdArgs = parts.slice(1)
          
          terminal.addLog(`> ${command}`, 'command')
          terminal.setRunning(true)
          
          const process = await container.spawn(cmd, cmdArgs)
          
          // Collect output and check for pain
          let processOutput = ''
          const outputStream = new WritableStream({
            write(data) {
              processOutput += data
              terminal.addLog(data, 'output')
              
              // NERVOUS SYSTEM: Check for pain in terminal output
              const pain = NervousSystem.analyzeLog(data)
              if (pain) {
                NervousSystem.dispatchPain(pain)
              }
            }
          })
          
          process.output.pipeTo(outputStream)
          const exitCode = await process.exit
          
          terminal.setRunning(false)
          terminal.setExitCode(exitCode)
          
          if (exitCode !== 0) {
            output = `ERROR: Command failed with exit code ${exitCode}\n${processOutput}`
          } else {
            output = `SUCCESS: Command completed\n${processOutput}`
          }
          break
        }

        case 'installPackage': {
          const { packageName, dev = false } = args as { packageName: string; dev?: boolean }
          const cmdArgs = dev 
            ? ['install', '--save-dev', packageName]
            : ['install', packageName]
          
          terminal.addLog(`> npm ${cmdArgs.join(' ')}`, 'command')
          terminal.setRunning(true)
          
          const process = await container.spawn('npm', cmdArgs)
          
          let processOutput = ''
          const outputStream = new WritableStream({
            write(data) {
              processOutput += data
              terminal.addLog(data, 'output')
              
              // NERVOUS SYSTEM: Check for pain in npm output
              const pain = NervousSystem.analyzeLog(data)
              if (pain) {
                NervousSystem.dispatchPain(pain)
              }
            }
          })
          
          process.output.pipeTo(outputStream)
          const exitCode = await process.exit
          
          terminal.setRunning(false)
          terminal.setExitCode(exitCode)
          
          if (exitCode !== 0) {
            throw new Error(`npm install failed with exit code ${exitCode}`)
          }
          
          output = `SUCCESS: Installed ${packageName}`
          break
        }

        // ================================================
        // OPS & SAFETY
        // ================================================
        
        case 'runTests': {
          terminal.addLog(`> npm test`, 'command')
          terminal.setRunning(true)
          
          const process = await container.spawn('npm', ['test', '--', '--passWithNoTests'])
          
          let testOutput = ''
          const outputStream = new WritableStream({
            write(data) {
              testOutput += data
              terminal.addLog(data, 'output')
              
              // NERVOUS SYSTEM: Check for test failures
              const pain = NervousSystem.analyzeLog(data)
              if (pain) {
                NervousSystem.dispatchPain(pain)
              }
            }
          })
          
          process.output.pipeTo(outputStream)
          const exitCode = await process.exit
          
          terminal.setRunning(false)
          terminal.setExitCode(exitCode)
          
          if (exitCode !== 0) {
            output = `TESTS_FAILED:\n${testOutput}`
          } else {
            output = `TESTS_PASSED:\n${testOutput}`
          }
          break
        }

        case 'runE2eCycle': {
          // For now, mock the E2E test cycle
          // In production, this would run Playwright
          terminal.addLog(`🧪 Running E2E test cycle...`, 'info')
          await new Promise(resolve => setTimeout(resolve, 500)) // Simulate
          terminal.addLog(`✅ E2E tests passed (mocked)`, 'success')
          output = `SUCCESS: E2E tests passed (Mocked for Prototype)`
          break
        }

        case 'verifyDependencyGraph': {
          try {
            const pkgJson = await container.fs.readFile('package.json', 'utf-8')
            const pkg = JSON.parse(pkgJson)
            const deps = Object.keys(pkg.dependencies || {}).length
            const devDeps = Object.keys(pkg.devDependencies || {}).length
            terminal.addLog(`📦 Verified: ${deps} deps, ${devDeps} devDeps`, 'success')
            output = `DEPENDENCIES_VERIFIED: ${deps} dependencies, ${devDeps} devDependencies`
          } catch {
            output = 'ERROR: No package.json found or invalid JSON'
          }
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
      terminal.addLog(`❌ Error in ${toolName}: ${errorMessage}`, 'error')
      
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
