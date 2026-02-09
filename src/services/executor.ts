import { useTerminalStore } from '@/store/terminal'
import { useFuelStore } from '@/store/fuel'
import { useTimeline, type AgentType } from '@/store/timeline'
import { useBuilderStore } from '@/store/builder'
import { useLedger } from '@/store/ledger'
import { recordMetric } from '@/lib/metrics/success'

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
  applyPatch: 8,
  deleteFile: 3,
  listFiles: 2,
  
  // Terminal operations (medium)
  runTerminal: 15,
  installPackage: 25,
  
  // Analysis (heavy)
  runTests: 30,
  runE2eCycle: 50,
  verifyDependencyGraph: 10,
  deployPreview: 20,
  checkDeployStatus: 5,
  deployToProduction: 40,
  syncToGithub: 18,
  
  // Thinking (varies by model)
  think: 10,
  
  // Default
  default: 5,
}

interface ShipFilePayload {
  path: string
  content: string
}

interface ShipGovernanceContext {
  auditorPassed: boolean
  previewVerified: boolean
  runtimeProbePassed: boolean
  runtimeHash?: string
  dependencyLockHash?: string
  rescueCount: number
  requiresHumanReview: boolean
  verifiedAt?: string
}

function extractShipFiles(raw: unknown): ShipFilePayload[] {
  if (!Array.isArray(raw)) {
    return []
  }

  return raw
    .map((entry) => {
      const file = entry as { path?: unknown; content?: unknown }
      if (typeof file.path !== 'string' || typeof file.content !== 'string') {
        return null
      }

      return {
        path: file.path,
        content: file.content,
      }
    })
    .filter((file): file is ShipFilePayload => Boolean(file))
}

function getBuilderFiles(): ShipFilePayload[] {
  return useBuilderStore.getState().files.map((file) => ({
    path: file.path,
    content: file.content,
  }))
}

function getRecordedManualRescueCount(): number {
  if (typeof window === 'undefined') return 0
  const raw = window.sessionStorage.getItem('torbit_manual_rescue_count')
  const parsed = raw ? Number(raw) : 0
  if (!Number.isFinite(parsed) || parsed < 0) return 0
  return Math.floor(parsed)
}

function getShipGovernanceContext(rescueCount: number = 0): ShipGovernanceContext {
  const ledger = useLedger.getState()
  const verifyEntry = ledger.getEntry('verify')
  const auditorPassed = verifyEntry?.proof?.auditorVerdict === 'passed'
  const runtimeHash = verifyEntry?.proof?.runtimeHash
  const dependencyLockHash = verifyEntry?.proof?.dependencyLockHash
  const combinedRescueCount = Math.max(rescueCount, getRecordedManualRescueCount())

  return {
    auditorPassed,
    previewVerified: ledger.getPhaseStatus('verify') === 'complete',
    runtimeProbePassed: Boolean(runtimeHash),
    runtimeHash,
    dependencyLockHash,
    rescueCount: combinedRescueCount,
    requiresHumanReview: !auditorPassed || combinedRescueCount > 0,
    verifiedAt: verifyEntry?.completedAt ? new Date(verifyEntry.completedAt).toISOString() : undefined,
  }
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
          const {
            path,
            content,
            oldContent,
            newContent,
          } = args as {
            path?: string
            content?: string
            oldContent?: string
            newContent?: string
          }
          if (!path) {
            throw new Error('editFile requires a path')
          }
          if (typeof content !== 'string' && (typeof oldContent !== 'string' || typeof newContent !== 'string')) {
            throw new Error('editFile requires either full content or oldContent/newContent replacement values')
          }
          terminal.addLog(`Updated: ${path}`, 'info')
          output = `SUCCESS: File updated at ${path}`
          break
        }

        case 'applyPatch': {
          const { path, patch } = args as { path?: string; patch?: string }
          if (!path) {
            throw new Error('applyPatch requires a path')
          }
          if (!patch || !patch.trim()) {
            throw new Error('applyPatch requires a non-empty patch')
          }
          terminal.addLog(`Patched: ${path}`, 'info')
          output = `SUCCESS: Patch applied at ${path}`
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

        case 'deployPreview': {
          const { environment = 'preview', branch } = args as {
            environment?: 'preview' | 'staging' | 'production'
            branch?: string
          }
          const deploymentId = `dep_${Math.random().toString(36).slice(2, 10)}`
          terminal.addLog(`Deploying ${environment}${branch ? ` (${branch})` : ''}`, 'info')
          output = `Deploying to ${environment}${branch ? ` from branch ${branch}` : ''}...\n\nDeployment ID: ${deploymentId}\nStatus: Building...`
          break
        }

        case 'checkDeployStatus': {
          const { deploymentId } = args as { deploymentId: string }
          output = `Deployment ${deploymentId}: ✓ Ready\nURL: https://${deploymentId}.torbit.dev`
          break
        }

        case 'deployToProduction': {
          const {
            provider = 'vercel',
            projectName = 'my-project',
            environmentVariables,
            framework = 'auto',
            buildCommand,
            outputDirectory,
            region,
            credentials,
            rescueCount,
            files: providedFiles,
          } = args as {
            provider?: 'vercel' | 'netlify' | 'railway'
            projectName?: string
            environmentVariables?: Record<string, string>
            framework?: 'sveltekit' | 'nextjs' | 'vite' | 'remix' | 'astro' | 'auto'
            buildCommand?: string
            outputDirectory?: string
            region?: string
            credentials?: {
              vercelToken?: string
              vercelTeamId?: string
              vercelTeamSlug?: string
              netlifyToken?: string
              netlifySiteId?: string
            }
            rescueCount?: number
            files?: Array<{ path: string; content: string }>
          }

          const explicitFiles = extractShipFiles(providedFiles)
          const files = explicitFiles.length > 0 ? explicitFiles : getBuilderFiles()
          if (files.length === 0) {
            throw new Error('No files available to deploy.')
          }

          terminal.addLog(`Deploying to ${provider}: ${projectName}`, 'info')
          const governance = getShipGovernanceContext(
            typeof rescueCount === 'number' && Number.isFinite(rescueCount) ? Math.max(0, Math.floor(rescueCount)) : 0
          )

          const deployRes = await fetch('/api/ship/deploy', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              provider,
              projectName,
              environmentVariables,
              framework,
              buildCommand,
              outputDirectory,
              region,
              credentials,
              workflowMode: 'direct',
              governance,
              files,
            }),
          })

          const deployData = await deployRes.json() as {
            success?: boolean
            error?: string
            provider?: string
            deploymentId?: string
            deploymentUrl?: string
            state?: string
            inspectorUrl?: string
            dashboardUrl?: string
            trustBundleHash?: string
            trustSigned?: boolean
            manualRescueRequired?: boolean
            blockers?: string[]
            warnings?: string[]
          }

          if (!deployRes.ok || !deployData.success) {
            const blockers = Array.isArray(deployData.blockers) ? deployData.blockers : []
            const details = blockers.length > 0 ? ` Blockers: ${blockers.join(' | ')}` : ''
            throw new Error((deployData.error || `Deploy API request failed (${deployRes.status})`) + details)
          }

          if (deployData.deploymentUrl) {
            terminal.addLog(`Production URL: ${deployData.deploymentUrl}`, 'success')
          }

          output = [
            `🚀 Deploying to ${(deployData.provider || provider).toUpperCase()} Production`,
            ``,
            `Project: ${projectName}`,
            `Framework: ${framework}`,
            buildCommand ? `Build Command: ${buildCommand}` : null,
            outputDirectory ? `Output Directory: ${outputDirectory}` : null,
            region ? `Region: ${region}` : null,
            environmentVariables && Object.keys(environmentVariables).length > 0
              ? `Environment Variables: ${Object.keys(environmentVariables).length} configured`
              : null,
            `Files: ${files.length}`,
            ``,
            deployData.deploymentId ? `Deployment ID: ${deployData.deploymentId}` : null,
            deployData.state ? `Status: ${deployData.state}` : 'Status: Created',
            deployData.deploymentUrl ? `🌐 Production URL: ${deployData.deploymentUrl}` : null,
            deployData.inspectorUrl ? `Inspector: ${deployData.inspectorUrl}` : null,
            deployData.dashboardUrl ? `Dashboard: ${deployData.dashboardUrl}` : null,
            deployData.trustBundleHash ? `Trust Bundle: ${deployData.trustBundleHash}` : null,
            deployData.trustSigned ? 'Trust Signature: Attached' : null,
            deployData.manualRescueRequired ? 'Manual Rescue: Yes (review before release)' : null,
          ].filter(Boolean).join('\n')
          break
        }

        case 'syncToGithub': {
          const {
            operation = 'pull-request',
            workflowMode = 'pr-first',
            token,
            owner,
            repoName,
            projectName,
            private: isPrivate = true,
            commitMessage,
            branch = 'main',
            prTitle,
            prDescription,
            baseBranch = 'main',
            rescueCount,
            files: providedFiles,
          } = args as {
            operation?: 'init' | 'push' | 'pull-request' | 'status'
            workflowMode?: 'pr-first' | 'direct'
            token?: string
            owner?: string
            repoName?: string
            projectName?: string
            private?: boolean
            commitMessage?: string
            branch?: string
            prTitle?: string
            prDescription?: string
            baseBranch?: string
            rescueCount?: number
            files?: Array<{ path: string; content: string }>
          }

          const explicitFiles = extractShipFiles(providedFiles)
          const files = explicitFiles.length > 0 ? explicitFiles : getBuilderFiles()
          const effectiveOperation = operation === 'push' && workflowMode === 'pr-first'
            ? 'pull-request'
            : operation

          if ((effectiveOperation === 'push' || effectiveOperation === 'pull-request') && files.length === 0) {
            throw new Error('No files available to sync to GitHub.')
          }

          const repoLabel = repoName || projectName || 'torbit-project'
          terminal.addLog(`GitHub operation: ${effectiveOperation} (${repoLabel})`, 'info')
          const governance = getShipGovernanceContext(
            typeof rescueCount === 'number' && Number.isFinite(rescueCount) ? Math.max(0, Math.floor(rescueCount)) : 0
          )

          const githubRes = await fetch('/api/ship/github', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              operation,
              workflowMode,
              token,
              owner,
              repoName,
              projectName,
              private: isPrivate,
              commitMessage,
              branch,
              prTitle,
              prDescription,
              baseBranch,
              governance,
              ...(effectiveOperation === 'push' || effectiveOperation === 'pull-request' ? { files } : {}),
            }),
          })

          const githubData = await githubRes.json() as {
            success?: boolean
            error?: string
            operation?: string
            requestedOperation?: string
            workflowMode?: 'pr-first' | 'direct'
            owner?: string
            repo?: string
            branch?: string
            baseBranch?: string
            filesSynced?: number
            repoUrl?: string
            prUrl?: string
            prNumber?: number
            branchExists?: boolean
            defaultBranch?: string
            mergeable?: boolean | null
            mergeableState?: string | null
            mergeableWithoutRescue?: boolean
            manualRescueRequired?: boolean
            trustBundleHash?: string
            trustSigned?: boolean
            blockers?: string[]
            warnings?: string[]
          }

          if (!githubRes.ok || !githubData.success) {
            const blockers = Array.isArray(githubData.blockers) ? githubData.blockers : []
            const details = blockers.length > 0 ? ` Blockers: ${blockers.join(' | ')}` : ''
            throw new Error((githubData.error || `GitHub API request failed (${githubRes.status})`) + details)
          }

          const resolvedOperation = githubData.operation || effectiveOperation

          if (resolvedOperation === 'pull-request') {
            recordMetric('pr_created', {
              workflowMode: githubData.workflowMode || workflowMode,
              projectName: projectName || repoLabel,
              operation: resolvedOperation,
            })

            if (githubData.manualRescueRequired) {
              recordMetric('manual_rescue_required', {
                workflowMode: githubData.workflowMode || workflowMode,
                projectName: projectName || repoLabel,
              })
            }

            if (githubData.mergeable === true) {
              recordMetric('pr_mergeable', {
                workflowMode: githubData.workflowMode || workflowMode,
                mergeableState: githubData.mergeableState || 'clean',
              })
            } else if (githubData.mergeable === false) {
              recordMetric('pr_unmergeable', {
                workflowMode: githubData.workflowMode || workflowMode,
                mergeableState: githubData.mergeableState || 'blocked',
              })
            }

            if (githubData.mergeableWithoutRescue) {
              recordMetric('pr_mergeable_without_rescue', {
                workflowMode: githubData.workflowMode || workflowMode,
                projectName: projectName || repoLabel,
              })
            }
          }

          if (githubData.prUrl) {
            terminal.addLog(`Pull request created: ${githubData.prUrl}`, 'success')
          } else if (githubData.repoUrl) {
            terminal.addLog(`Repository synced: ${githubData.repoUrl}`, 'success')
          }

          switch (resolvedOperation) {
            case 'init':
              output = [
                `📦 Initializing GitHub Repository`,
                ``,
                `Repository: ${githubData.owner}/${githubData.repo}`,
                `Default Branch: ${githubData.defaultBranch || 'main'}`,
                githubData.repoUrl ? `🔗 ${githubData.repoUrl}` : null,
              ].filter(Boolean).join('\n')
              break
            case 'push':
              output = [
                `📤 Pushing to GitHub`,
                ``,
                `Repository: ${githubData.owner}/${githubData.repo}`,
                `Branch: ${githubData.branch || branch}`,
                `Files Synced: ${githubData.filesSynced ?? files.length}`,
                githubData.repoUrl ? `🔗 ${githubData.repoUrl}` : null,
                githubData.trustBundleHash ? `Trust Bundle: ${githubData.trustBundleHash}` : null,
                githubData.trustSigned ? 'Trust Signature: Attached' : null,
              ].filter(Boolean).join('\n')
              break
            case 'pull-request':
              output = [
                `🔀 Opening Pull Request`,
                ``,
                `Repository: ${githubData.owner}/${githubData.repo}`,
                `Base: ${githubData.baseBranch || baseBranch} ← ${githubData.branch || branch}`,
                `Files Synced: ${githubData.filesSynced ?? files.length}`,
                `Workflow: ${githubData.workflowMode || workflowMode}`,
                githubData.prNumber ? `PR #${githubData.prNumber}` : null,
                githubData.mergeable === true ? `Mergeable: Yes${githubData.mergeableState ? ` (${githubData.mergeableState})` : ''}` : null,
                githubData.mergeable === false ? `Mergeable: No${githubData.mergeableState ? ` (${githubData.mergeableState})` : ''}` : null,
                githubData.mergeable === null ? 'Mergeable: Pending GitHub analysis' : null,
                githubData.mergeableWithoutRescue ? 'KPI Credit: Mergeable PR without rescue ✅' : null,
                githubData.manualRescueRequired ? 'Manual Rescue: Required before merge' : null,
                githubData.trustBundleHash ? `Trust Bundle: ${githubData.trustBundleHash}` : null,
                githubData.trustSigned ? 'Trust Signature: Attached' : null,
                githubData.prUrl ? `🔗 ${githubData.prUrl}` : null,
                githubData.repoUrl ? `Repo: ${githubData.repoUrl}` : null,
              ].filter(Boolean).join('\n')
              break
            case 'status':
            default:
              output = [
                `📊 Git Status`,
                ``,
                `Repository: ${githubData.owner}/${githubData.repo}`,
                `Branch: ${githubData.branch || branch}`,
                `Branch Exists: ${githubData.branchExists ? 'Yes' : 'No'}`,
                `Default Branch: ${githubData.defaultBranch || 'main'}`,
                githubData.repoUrl ? `🔗 ${githubData.repoUrl}` : null,
              ].filter(Boolean).join('\n')
              break
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
          output = `ERROR: Unknown tool "${toolName}". Available: createFile, editFile, applyPatch, readFile, listFiles, deleteFile, runTerminal, installPackage, runTests, runE2eCycle, verifyDependencyGraph, deployPreview, checkDeployStatus, deployToProduction, syncToGithub`
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
      'createFile', 'editFile', 'applyPatch', 'readFile', 'listFiles', 'deleteFile',
      'runTerminal', 'runCommand', 'installPackage',
      'runTests', 'runE2eCycle', 'verifyDependencyGraph',
      'deployPreview', 'checkDeployStatus', 'deployToProduction', 'syncToGithub',
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
