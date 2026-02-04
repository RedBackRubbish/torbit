import type { ToolName } from './definitions'

/**
 * Tool Executor
 * 
 * Executes tool calls from agents and returns results.
 * In a real implementation, these would interact with the actual file system,
 * terminal, deployment services, etc.
 */

export interface ToolResult {
  success: boolean
  output: string
  data?: unknown
  error?: string
  duration?: number
}

export interface ToolExecutionContext {
  projectId: string
  userId: string
  workingDirectory: string
  files: Map<string, string> // In-memory file system for sandboxed execution
}

// Tool execution handlers
const toolHandlers: Record<ToolName, (args: Record<string, unknown>, ctx: ToolExecutionContext) => Promise<ToolResult>> = {
  
  // ============================================
  // FILE OPERATIONS
  // ============================================
  
  createFile: async (args, ctx) => {
    const { path, content, description } = args as { path: string; content: string; description?: string }
    const start = Date.now()
    
    // Store in virtual file system
    ctx.files.set(path, content)
    
    return {
      success: true,
      output: `Created file: ${path}${description ? ` - ${description}` : ''}`,
      data: { path, size: content.length },
      duration: Date.now() - start,
    }
  },
  
  editFile: async (args, ctx) => {
    const { path, oldContent, newContent, description } = args as { 
      path: string; oldContent: string; newContent: string; description?: string 
    }
    const start = Date.now()
    
    const existingContent = ctx.files.get(path)
    if (!existingContent) {
      return { success: false, output: '', error: `File not found: ${path}` }
    }
    
    if (!existingContent.includes(oldContent)) {
      return { success: false, output: '', error: `Could not find content to replace in ${path}` }
    }
    
    const updatedContent = existingContent.replace(oldContent, newContent)
    ctx.files.set(path, updatedContent)
    
    return {
      success: true,
      output: `Edited file: ${path}${description ? ` - ${description}` : ''}`,
      data: { path, linesChanged: newContent.split('\n').length - oldContent.split('\n').length },
      duration: Date.now() - start,
    }
  },
  
  readFile: async (args, ctx) => {
    const { path } = args as { path: string }
    const start = Date.now()
    
    const content = ctx.files.get(path)
    if (!content) {
      return { success: false, output: '', error: `File not found: ${path}` }
    }
    
    return {
      success: true,
      output: content,
      data: { path, size: content.length, lines: content.split('\n').length },
      duration: Date.now() - start,
    }
  },
  
  deleteFile: async (args, ctx) => {
    const { path, reason } = args as { path: string; reason?: string }
    const start = Date.now()
    
    if (!ctx.files.has(path)) {
      return { success: false, output: '', error: `File not found: ${path}` }
    }
    
    ctx.files.delete(path)
    
    return {
      success: true,
      output: `Deleted file: ${path}${reason ? ` - ${reason}` : ''}`,
      duration: Date.now() - start,
    }
  },
  
  listFiles: async (args, ctx) => {
    const { path, recursive } = args as { path: string; recursive: boolean }
    const start = Date.now()
    
    const allPaths = Array.from(ctx.files.keys())
    const filteredPaths = path === '.' 
      ? allPaths 
      : allPaths.filter(p => p.startsWith(path))
    
    if (!recursive) {
      // Only show direct children
      const directChildren = new Set<string>()
      filteredPaths.forEach(p => {
        const relative = path === '.' ? p : p.slice(path.length + 1)
        const firstPart = relative.split('/')[0]
        directChildren.add(firstPart)
      })
      
      return {
        success: true,
        output: Array.from(directChildren).join('\n'),
        data: { files: Array.from(directChildren), count: directChildren.size },
        duration: Date.now() - start,
      }
    }
    
    return {
      success: true,
      output: filteredPaths.join('\n'),
      data: { files: filteredPaths, count: filteredPaths.length },
      duration: Date.now() - start,
    }
  },
  
  // ============================================
  // TERMINAL OPERATIONS
  // ============================================
  
  runCommand: async (args, _ctx) => {
    const { command, description } = args as { command: string; description?: string }
    const start = Date.now()
    
    // In sandbox mode, we simulate command execution
    // In real implementation, this would use a secure container/sandbox
    
    return {
      success: true,
      output: `$ ${command}\n[Command executed successfully]${description ? `\n${description}` : ''}`,
      data: { command, exitCode: 0 },
      duration: Date.now() - start,
    }
  },
  
  runTests: async (args, _ctx) => {
    const { testPath, watch } = args as { testPath?: string; watch: boolean }
    const start = Date.now()
    
    const cmd = testPath 
      ? `vitest run ${testPath}${watch ? ' --watch' : ''}`
      : `vitest run${watch ? ' --watch' : ''}`
    
    return {
      success: true,
      output: `$ ${cmd}\n\n✓ All tests passed`,
      data: { command: cmd, passed: true },
      duration: Date.now() - start,
    }
  },
  
  installPackage: async (args, _ctx) => {
    const { packageName, isDev } = args as { packageName: string; isDev: boolean }
    const start = Date.now()
    
    const cmd = `npm install ${isDev ? '-D ' : ''}${packageName}`
    
    return {
      success: true,
      output: `$ ${cmd}\n+ ${packageName}\nPackage installed successfully`,
      data: { package: packageName, isDev },
      duration: Date.now() - start,
    }
  },
  
  // ============================================
  // SEARCH & ANALYSIS
  // ============================================
  
  searchCode: async (args, ctx) => {
    const { query, filePattern } = args as { query: string; filePattern?: string }
    const start = Date.now()
    
    const results: { file: string; line: number; content: string }[] = []
    const regex = new RegExp(query, 'gi')
    
    ctx.files.forEach((content, path) => {
      if (filePattern && !path.match(filePattern.replace('*', '.*'))) return
      
      content.split('\n').forEach((line, index) => {
        if (regex.test(line)) {
          results.push({ file: path, line: index + 1, content: line.trim() })
        }
      })
    })
    
    const output = results.map(r => `${r.file}:${r.line}: ${r.content}`).join('\n')
    
    return {
      success: true,
      output: output || 'No matches found',
      data: { results, count: results.length },
      duration: Date.now() - start,
    }
  },
  
  getFileTree: async (args, ctx) => {
    const { maxDepth, includeHidden } = args as { maxDepth: number; includeHidden: boolean }
    const start = Date.now()
    
    const allPaths = Array.from(ctx.files.keys())
      .filter(p => includeHidden || !p.split('/').some(part => part.startsWith('.')))
      .filter(p => p.split('/').length <= maxDepth)
      .sort()
    
    // Build tree structure
    const tree = buildFileTree(allPaths)
    
    return {
      success: true,
      output: tree,
      data: { fileCount: allPaths.length },
      duration: Date.now() - start,
    }
  },
  
  analyzeDependencies: async (args, ctx) => {
    const { checkUpdates, checkVulnerabilities } = args as { checkUpdates: boolean; checkVulnerabilities: boolean }
    const start = Date.now()
    
    const packageJson = ctx.files.get('package.json')
    if (!packageJson) {
      return { success: false, output: '', error: 'package.json not found' }
    }
    
    const pkg = JSON.parse(packageJson)
    const deps = Object.keys(pkg.dependencies || {})
    const devDeps = Object.keys(pkg.devDependencies || {})
    
    let output = `Dependencies: ${deps.length}\nDev Dependencies: ${devDeps.length}`
    
    if (checkUpdates) output += '\n\n✓ All packages are up to date'
    if (checkVulnerabilities) output += '\n\n✓ No vulnerabilities found'
    
    return {
      success: true,
      output,
      data: { dependencies: deps, devDependencies: devDeps },
      duration: Date.now() - start,
    }
  },
  
  // ============================================
  // WEB / RESEARCH
  // ============================================
  
  fetchDocumentation: async (args, _ctx) => {
    const { url, selector } = args as { url: string; selector?: string }
    const start = Date.now()
    
    // In real implementation, this would fetch and parse the URL
    return {
      success: true,
      output: `Fetched documentation from ${url}${selector ? ` (selector: ${selector})` : ''}`,
      data: { url, cached: false },
      duration: Date.now() - start,
    }
  },
  
  searchWeb: async (args, _ctx) => {
    const { query, site } = args as { query: string; site?: string }
    const start = Date.now()
    
    const searchQuery = site ? `${query} site:${site}` : query
    
    return {
      success: true,
      output: `Searched: "${searchQuery}"\n\n[Search results would appear here]`,
      data: { query: searchQuery },
      duration: Date.now() - start,
    }
  },
  
  // ============================================
  // DEPLOYMENT
  // ============================================
  
  deployPreview: async (args, _ctx) => {
    const { environment, branch } = args as { environment: string; branch?: string }
    const start = Date.now()
    
    const deploymentId = `dep_${Math.random().toString(36).slice(2, 10)}`
    
    return {
      success: true,
      output: `Deploying to ${environment}${branch ? ` from branch ${branch}` : ''}...\n\nDeployment ID: ${deploymentId}\nStatus: Building...`,
      data: { deploymentId, environment, branch },
      duration: Date.now() - start,
    }
  },
  
  checkDeployStatus: async (args, _ctx) => {
    const { deploymentId } = args as { deploymentId: string }
    const start = Date.now()
    
    return {
      success: true,
      output: `Deployment ${deploymentId}: ✓ Ready\nURL: https://${deploymentId}.torbit.dev`,
      data: { deploymentId, status: 'ready', url: `https://${deploymentId}.torbit.dev` },
      duration: Date.now() - start,
    }
  },
  
  // ============================================
  // REASONING
  // ============================================
  
  think: async (args, _ctx) => {
    const { thought } = args as { thought: string }
    return {
      success: true,
      output: thought,
      duration: 0,
    }
  },
  
  planSteps: async (args, _ctx) => {
    const { goal, steps } = args as { goal: string; steps: Array<{ step: number; action: string; tool?: string }> }
    
    const stepsOutput = steps
      .map(s => `${s.step}. ${s.action}${s.tool ? ` [${s.tool}]` : ''}`)
      .join('\n')
    
    return {
      success: true,
      output: `Goal: ${goal}\n\nPlan:\n${stepsOutput}`,
      data: { goal, steps },
      duration: 0,
    }
  },
  
  // ============================================
  // DELEGATION
  // ============================================
  
  delegateToAgent: async (args, _ctx) => {
    const { agentId, task, context } = args as { agentId: string; task: string; context?: string }
    
    return {
      success: true,
      output: `Delegating to ${agentId} agent: ${task}${context ? `\nContext: ${context}` : ''}`,
      data: { agentId, task },
      duration: 0,
    }
  },
}

// Helper function to build file tree visualization
function buildFileTree(paths: string[]): string {
  const lines: string[] = []
  const processed = new Set<string>()
  
  paths.forEach(path => {
    const parts = path.split('/')
    let indent = ''
    
    parts.forEach((part, i) => {
      const currentPath = parts.slice(0, i + 1).join('/')
      if (!processed.has(currentPath)) {
        processed.add(currentPath)
        const isLast = i === parts.length - 1
        const prefix = isLast ? '├── ' : '├── '
        lines.push(`${indent}${prefix}${part}`)
      }
      indent += '│   '
    })
  })
  
  return lines.join('\n')
}

/**
 * Execute a tool with the given arguments
 */
export async function executeTool(
  toolName: ToolName,
  args: Record<string, unknown>,
  context: ToolExecutionContext
): Promise<ToolResult> {
  const handler = toolHandlers[toolName]
  
  if (!handler) {
    return {
      success: false,
      output: '',
      error: `Unknown tool: ${toolName}`,
    }
  }
  
  try {
    return await handler(args, context)
  } catch (error) {
    return {
      success: false,
      output: '',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Create a new execution context
 */
export function createExecutionContext(
  projectId: string,
  userId: string,
  initialFiles?: Record<string, string>
): ToolExecutionContext {
  const files = new Map<string, string>()
  
  if (initialFiles) {
    Object.entries(initialFiles).forEach(([path, content]) => {
      files.set(path, content)
    })
  }
  
  return {
    projectId,
    userId,
    workingDirectory: '/',
    files,
  }
}
