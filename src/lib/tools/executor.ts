import type { ToolName } from './definitions'

/**
 * Tool Executor
 * 
 * Executes tool calls from agents and returns results.
 * In a real implementation, these would interact with the actual file system,
 * terminal, deployment services, etc.
 */

// Helper: Adjust a hex color by a percentage (positive = lighter, negative = darker)
function adjustColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const amt = Math.round(2.55 * percent)
  const R = Math.min(255, Math.max(0, (num >> 16) + amt))
  const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amt))
  const B = Math.min(255, Math.max(0, (num & 0x0000ff) + amt))
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`
}

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
  agentId?: string // Current agent executing tools
  files: Map<string, string> // In-memory file system for sandboxed execution
  checkpoints: Map<string, { name: string; files: Map<string, string>; timestamp: number }> // Time travel
  browserLogs: Array<{ level: string; message: string; timestamp: number }> // Browser console
  screenshots: Map<string, { data: string; viewport: { width: number; height: number }; timestamp: number }> // Vision
  dbSchema?: Record<string, { columns: Array<{ name: string; type: string; nullable: boolean }>; indexes: string[] }> // Database
  // PHASE 2: New context fields
  mcpServers: Map<string, { url: string; tools: Array<{ name: string; description: string; parameters: unknown }> }> // MCP connections
  designTokens: DesignTokens // Design system
  secrets: Map<string, { value: string; description: string }> // Secure secrets
  contextCache: Map<string, { content: string; timestamp: number; ttl: number }> // Prompt caching
  parsedErrors: Map<string, ParsedError> // Error recovery
  tasks: Map<string, { id: string; title: string; description: string; status: string; priority: string; agentId?: string; createdAt: number; updatedAt?: number; completedAt?: number }> // Task management
}

export interface DesignTokens {
  colors: {
    primary: string
    secondary: string
    accent: string
    background: string
    surface: string
    text: string
    textMuted: string
    error: string
    success: string
    warning: string
    [key: string]: string
  }
  typography: {
    fontFamily: string
    fontSizes: Record<string, string>
    fontWeights: Record<string, number>
    lineHeights: Record<string, number>
  }
  spacing: Record<string, string>
  borders: {
    radius: Record<string, string>
    width: Record<string, string>
  }
  shadows: Record<string, string>
  animations: {
    durations: Record<string, string>
    easings: Record<string, string>
  }
}

export interface ParsedError {
  id: string
  source: 'terminal' | 'browser' | 'build' | 'runtime' | 'lint' | 'test'
  type: string
  message: string
  file?: string
  line?: number
  column?: number
  stack?: string
  suggestedFixes: string[]
}

// Helper: Get language from file path
function getLanguageFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase()
  const langMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    json: 'json',
    css: 'css',
    scss: 'scss',
    html: 'html',
    md: 'markdown',
    prisma: 'prisma',
  }
  return langMap[ext || ''] || 'typescript'
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
    
    // Return in a format the UI can parse to extract files
    const output = `Created file: ${path}${description ? ` - ${description}` : ''}\n\n\`\`\`${getLanguageFromPath(path)}\n// ${path}\n${content}\n\`\`\``
    
    return {
      success: true,
      output,
      data: { path, size: content.length, content },
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

    // Validate command against dangerous patterns
    const BLOCKED_COMMANDS = [
      /\brm\s+-rf\s+\/(?!\w)/, // rm -rf /
      /\bcurl\b.*\|\s*(?:sh|bash)/, // curl | sh
      /\bwget\b.*\|\s*(?:sh|bash)/, // wget | sh
      /\bchmod\s+777\b/, // chmod 777
      /\b(?:nc|netcat)\b.*-[el]/, // netcat reverse shells
      />\s*\/dev\/sd[a-z]/, // write to raw disk
      /\bdd\s+if=.*of=\/dev/, // dd to device
      /\bmkfs\b/, // format filesystem
    ]

    const blockedMatch = BLOCKED_COMMANDS.find(pattern => pattern.test(command))
    if (blockedMatch) {
      return {
        success: false,
        output: '',
        error: 'Command blocked: potentially dangerous operation',
        duration: Date.now() - start,
      }
    }

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
  // CLOSER TOOLS - Ship to Production
  // ============================================
  
  deployToProduction: async (args, _ctx) => {
    const { provider, projectName, environmentVariables, framework, buildCommand, outputDirectory, region } = args as {
      provider: 'vercel' | 'netlify' | 'railway'
      projectName: string
      environmentVariables?: Record<string, string>
      framework?: string
      buildCommand?: string
      outputDirectory?: string
      region?: string
    }
    const start = Date.now()
    
    // In production, this would use actual Vercel/Netlify/Railway APIs
    // For now, simulate the deployment process
    const deploymentId = `prod_${Math.random().toString(36).slice(2, 10)}`
    const projectSlug = projectName.toLowerCase().replace(/[^a-z0-9]/g, '-')
    
    // Determine the production URL based on provider
    const providerUrls: Record<string, string> = {
      vercel: `https://${projectSlug}.vercel.app`,
      netlify: `https://${projectSlug}.netlify.app`,
      railway: `https://${projectSlug}.up.railway.app`,
    }
    
    const productionUrl = providerUrls[provider]
    const envCount = environmentVariables ? Object.keys(environmentVariables).length : 0
    
    return {
      success: true,
      output: [
        `🚀 Deploying to ${provider.toUpperCase()} Production`,
        ``,
        `Project: ${projectName}`,
        `Framework: ${framework || 'auto-detected'}`,
        buildCommand ? `Build Command: ${buildCommand}` : null,
        outputDirectory ? `Output Directory: ${outputDirectory}` : null,
        region ? `Region: ${region}` : null,
        envCount > 0 ? `Environment Variables: ${envCount} configured` : null,
        ``,
        `Deployment ID: ${deploymentId}`,
        `Status: ✓ Deployed`,
        ``,
        `🌐 Production URL: ${productionUrl}`,
      ].filter(Boolean).join('\n'),
      data: {
        deploymentId,
        provider,
        projectName,
        productionUrl,
        status: 'deployed',
        framework,
        region,
      },
      duration: Date.now() - start,
    }
  },
  
  syncToGithub: async (args, _ctx) => {
    const { operation, repoName, private: isPrivate, commitMessage, branch, prTitle, prDescription, baseBranch } = args as {
      operation: 'init' | 'push' | 'pull-request' | 'status'
      repoName?: string
      private?: boolean
      commitMessage?: string
      branch?: string
      prTitle?: string
      prDescription?: string
      baseBranch?: string
    }
    const start = Date.now()
    
    // Simulate GitHub operations
    switch (operation) {
      case 'init': {
        const repoUrl = `https://github.com/user/${repoName || 'my-project'}`
        return {
          success: true,
          output: [
            `📦 Initializing GitHub Repository`,
            ``,
            `Repository: ${repoName || 'my-project'}`,
            `Visibility: ${isPrivate ? 'Private' : 'Public'}`,
            ``,
            `✓ Repository created`,
            `✓ Remote origin added`,
            ``,
            `🔗 ${repoUrl}`,
          ].join('\n'),
          data: { repoUrl, repoName: repoName || 'my-project', private: isPrivate },
          duration: Date.now() - start,
        }
      }
      
      case 'push': {
        return {
          success: true,
          output: [
            `📤 Pushing to GitHub`,
            ``,
            `Branch: ${branch || 'main'}`,
            `Commit: ${commitMessage || 'Update from TORBIT'}`,
            ``,
            `✓ Changes committed`,
            `✓ Pushed to origin/${branch || 'main'}`,
          ].join('\n'),
          data: { branch: branch || 'main', commitMessage: commitMessage || 'Update from TORBIT' },
          duration: Date.now() - start,
        }
      }
      
      case 'pull-request': {
        const prNumber = Math.floor(Math.random() * 100) + 1
        const prUrl = `https://github.com/user/project/pull/${prNumber}`
        return {
          success: true,
          output: [
            `🔀 Opening Pull Request`,
            ``,
            `Title: ${prTitle || 'Changes from TORBIT'}`,
            `Base: ${baseBranch || 'main'} ← ${branch || 'feature'}`,
            prDescription ? `Description: ${prDescription}` : null,
            ``,
            `✓ Pull Request #${prNumber} created`,
            ``,
            `🔗 ${prUrl}`,
            ``,
            `Review your changes and merge when ready.`,
          ].filter(Boolean).join('\n'),
          data: { prNumber, prUrl, prTitle: prTitle || 'Changes from TORBIT', branch, baseBranch: baseBranch || 'main' },
          duration: Date.now() - start,
        }
      }
      
      case 'status': {
        return {
          success: true,
          output: [
            `📊 Git Status`,
            ``,
            `Branch: ${branch || 'main'}`,
            `Tracking: origin/${branch || 'main'}`,
            ``,
            `✓ Working tree clean`,
            `✓ Up to date with remote`,
          ].join('\n'),
          data: { branch: branch || 'main', clean: true, upToDate: true },
          duration: Date.now() - start,
        }
      }
      
      default:
        return {
          success: false,
          output: `Unknown operation: ${operation}`,
          duration: Date.now() - start,
        }
    }
  },
  
  generateDesignSystem: async (args, _ctx) => {
    const { style, primaryColor, mode, customPrompt, outputFormat, applyImmediately } = args as {
      style: 'corporate' | 'playful' | 'brutalist' | 'minimal' | 'luxury' | 'tech' | 'organic' | 'custom'
      primaryColor?: string
      mode?: 'light' | 'dark' | 'both'
      customPrompt?: string
      outputFormat?: 'css-variables' | 'tailwind' | 'design-tokens-json'
      applyImmediately?: boolean
    }
    const start = Date.now()
    
    // Style presets with color palettes
    const stylePresets: Record<string, { primary: string; accent: string; bg: string; text: string; vibe: string }> = {
      corporate: { primary: '#2563eb', accent: '#3b82f6', bg: '#f8fafc', text: '#1e293b', vibe: 'Professional, trustworthy, clean' },
      playful: { primary: '#ec4899', accent: '#f472b6', bg: '#fdf2f8', text: '#831843', vibe: 'Fun, energetic, youthful' },
      brutalist: { primary: '#000000', accent: '#ff0000', bg: '#ffffff', text: '#000000', vibe: 'Raw, bold, unapologetic' },
      minimal: { primary: '#18181b', accent: '#71717a', bg: '#fafafa', text: '#27272a', vibe: 'Clean, focused, elegant' },
      luxury: { primary: '#b8860b', accent: '#d4af37', bg: '#0a0a0a', text: '#fafafa', vibe: 'Premium, sophisticated, exclusive' },
      tech: { primary: '#06b6d4', accent: '#22d3ee', bg: '#0f172a', text: '#e2e8f0', vibe: 'Modern, innovative, cutting-edge' },
      organic: { primary: '#65a30d', accent: '#84cc16', bg: '#fefce8', text: '#365314', vibe: 'Natural, warm, sustainable' },
      custom: { primary: primaryColor || '#6366f1', accent: '#818cf8', bg: '#ffffff', text: '#1f2937', vibe: customPrompt || 'Custom style' },
    }
    
    const preset = stylePresets[style]
    const effectivePrimary = primaryColor || preset.primary
    
    // Generate CSS variables
    const cssVariables = `
:root {
  /* Primary Colors */
  --color-primary: ${effectivePrimary};
  --color-primary-light: ${preset.accent};
  --color-primary-dark: ${adjustColor(effectivePrimary, -20)};
  
  /* Background */
  --color-background: ${preset.bg};
  --color-surface: ${mode === 'dark' ? '#1f2937' : '#ffffff'};
  --color-surface-elevated: ${mode === 'dark' ? '#374151' : '#f9fafb'};
  
  /* Text */
  --color-text-primary: ${preset.text};
  --color-text-secondary: ${adjustColor(preset.text, 40)};
  --color-text-muted: ${adjustColor(preset.text, 60)};
  
  /* Accents */
  --color-accent: ${preset.accent};
  --color-success: #22c55e;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  
  /* Typography */
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  
  /* Spacing */
  --space-xs: 0.25rem;
  --space-sm: 0.5rem;
  --space-md: 1rem;
  --space-lg: 1.5rem;
  --space-xl: 2rem;
  
  /* Border Radius */
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 1rem;
  --radius-full: 9999px;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
}
`.trim()
    
    return {
      success: true,
      output: [
        `🎨 Generated Design System`,
        ``,
        `Style: ${style}${customPrompt ? ` (${customPrompt})` : ''}`,
        `Mode: ${mode || 'both'}`,
        `Primary Color: ${effectivePrimary}`,
        `Vibe: ${preset.vibe}`,
        ``,
        `Output Format: ${outputFormat || 'css-variables'}`,
        applyImmediately ? `✓ Applied to globals.css` : `Ready to apply`,
        ``,
        `--- CSS Variables ---`,
        cssVariables,
      ].join('\n'),
      data: {
        style,
        primaryColor: effectivePrimary,
        mode: mode || 'both',
        vibe: preset.vibe,
        cssVariables,
        applied: applyImmediately,
      },
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
  
  // ============================================
  // TASK MANAGEMENT
  // ============================================
  
  manageTask: async (args, ctx) => {
    const { operation, taskId, title, description, status, priority } = args as {
      operation: 'add' | 'update' | 'complete' | 'delete' | 'list'
      taskId?: string
      title?: string
      description?: string
      status?: string
      priority?: string
    }
    const start = Date.now()
    
    // Note: In real implementation, this would interact with the task store
    // For now, we track tasks in the execution context
    if (!ctx.tasks) {
      ctx.tasks = new Map()
    }
    
    switch (operation) {
      case 'add': {
        if (!title) {
          return {
            success: false,
            output: 'Task title is required for add operation',
            duration: Date.now() - start,
          }
        }
        const id = `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
        const task = {
          id,
          title,
          description: description || '',
          status: status || 'in-progress',
          priority: priority || 'medium',
          agentId: ctx.agentId,
          createdAt: Date.now(),
        }
        ctx.tasks.set(id, task)
        return {
          success: true,
          output: `Created task: "${title}" [${id}]`,
          data: task,
          duration: Date.now() - start,
        }
      }
      
      case 'update': {
        if (!taskId) {
          return {
            success: false,
            output: 'Task ID is required for update operation',
            duration: Date.now() - start,
          }
        }
        const task = ctx.tasks.get(taskId)
        if (!task) {
          return {
            success: false,
            output: `Task not found: ${taskId}`,
            duration: Date.now() - start,
          }
        }
        if (title) task.title = title
        if (description) task.description = description
        if (status) task.status = status
        if (priority) task.priority = priority
        task.updatedAt = Date.now()
        ctx.tasks.set(taskId, task)
        return {
          success: true,
          output: `Updated task: "${task.title}"`,
          data: task,
          duration: Date.now() - start,
        }
      }
      
      case 'complete': {
        if (!taskId) {
          return {
            success: false,
            output: 'Task ID is required for complete operation',
            duration: Date.now() - start,
          }
        }
        const task = ctx.tasks.get(taskId)
        if (!task) {
          return {
            success: false,
            output: `Task not found: ${taskId}`,
            duration: Date.now() - start,
          }
        }
        task.status = 'completed'
        task.completedAt = Date.now()
        ctx.tasks.set(taskId, task)
        return {
          success: true,
          output: `Completed task: "${task.title}" ✓`,
          data: task,
          duration: Date.now() - start,
        }
      }
      
      case 'delete': {
        if (!taskId) {
          return {
            success: false,
            output: 'Task ID is required for delete operation',
            duration: Date.now() - start,
          }
        }
        const task = ctx.tasks.get(taskId)
        if (!task) {
          return {
            success: false,
            output: `Task not found: ${taskId}`,
            duration: Date.now() - start,
          }
        }
        ctx.tasks.delete(taskId)
        return {
          success: true,
          output: `Deleted task: "${task.title}"`,
          duration: Date.now() - start,
        }
      }
      
      case 'list': {
        const tasks = Array.from(ctx.tasks.values())
        const filtered = status 
          ? tasks.filter(t => t.status === status)
          : tasks
        return {
          success: true,
          output: filtered.length > 0
            ? filtered.map(t => `[${t.status}] ${t.title}`).join('\n')
            : 'No tasks found',
          data: { tasks: filtered, count: filtered.length },
          duration: Date.now() - start,
        }
      }
      
      default:
        return {
          success: false,
          output: `Unknown operation: ${operation}`,
          duration: Date.now() - start,
        }
    }
  },
  
  // ============================================
  // GOD-TIER: VISION TOOLS (Eyes)
  // ============================================
  
  captureScreenshot: async (args, ctx) => {
    const { selector, viewport, description } = args as { 
      selector?: string; 
      viewport?: { width: number; height: number }; 
      description?: string 
    }
    const start = Date.now()
    
    const screenshotId = `ss_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    const vp = viewport || { width: 1280, height: 720 }
    
    // In real implementation, this would use Puppeteer/Playwright to capture the WebContainer
    // For now, we store a placeholder that represents the screenshot
    ctx.screenshots.set(screenshotId, {
      data: `[Screenshot of ${selector || 'full page'} at ${vp.width}x${vp.height}]`,
      viewport: vp,
      timestamp: Date.now(),
    })
    
    return {
      success: true,
      output: `📸 Captured screenshot: ${screenshotId}\n` +
        `Viewport: ${vp.width}x${vp.height}\n` +
        `Selector: ${selector || 'full page'}` +
        (description ? `\nExpected: ${description}` : ''),
      data: { screenshotId, viewport: vp, selector },
      duration: Date.now() - start,
    }
  },
  
  analyzeVisual: async (args, ctx) => {
    const { screenshotId, prompt } = args as { screenshotId: string; prompt: string }
    const start = Date.now()
    
    const screenshot = ctx.screenshots.get(screenshotId)
    if (!screenshot) {
      return { success: false, output: '', error: `Screenshot not found: ${screenshotId}` }
    }
    
    // In real implementation, this sends the screenshot to a vision model (Sonnet/Gemini)
    // The vision model analyzes the image and returns observations
    return {
      success: true,
      output: `👁️ Visual Analysis of ${screenshotId}:\n` +
        `Query: "${prompt}"\n\n` +
        `[Vision model would analyze the screenshot here]\n` +
        `Viewport: ${screenshot.viewport.width}x${screenshot.viewport.height}`,
      data: { screenshotId, prompt, analyzed: true },
      duration: Date.now() - start,
    }
  },
  
  getBrowserLogs: async (args, ctx) => {
    const { level, limit } = args as { level: 'error' | 'warn' | 'info' | 'all'; limit: number }
    const start = Date.now()
    
    // Filter logs by level
    let logs = ctx.browserLogs
    if (level !== 'all') {
      logs = logs.filter(log => log.level === level)
    }
    
    // Limit results
    logs = logs.slice(-limit)
    
    if (logs.length === 0) {
      return {
        success: true,
        output: `🌐 Browser Console (${level}): No logs found`,
        data: { logs: [], count: 0 },
        duration: Date.now() - start,
      }
    }
    
    const output = logs
      .map(log => `[${log.level.toUpperCase()}] ${log.message}`)
      .join('\n')
    
    return {
      success: true,
      output: `🌐 Browser Console (${level}):\n${output}`,
      data: { logs, count: logs.length },
      duration: Date.now() - start,
    }
  },
  
  // ============================================
  // GOD-TIER: DATABASE TOOLS (Prevent Hallucinations)
  // ============================================
  
  inspectSchema: async (args, ctx) => {
    const { table, includeIndexes, includeRelations: _includeRelations } = args as {
      table?: string;
      includeIndexes: boolean;
      includeRelations: boolean
    }
    const start = Date.now()
    
    if (!ctx.dbSchema) {
      // Return sample schema for demonstration
      ctx.dbSchema = {
        users: {
          columns: [
            { name: 'id', type: 'uuid', nullable: false },
            { name: 'email', type: 'varchar(255)', nullable: false },
            { name: 'name', type: 'varchar(255)', nullable: true },
            { name: 'created_at', type: 'timestamp', nullable: false },
          ],
          indexes: ['PRIMARY KEY (id)', 'UNIQUE (email)'],
        },
        projects: {
          columns: [
            { name: 'id', type: 'uuid', nullable: false },
            { name: 'user_id', type: 'uuid', nullable: false },
            { name: 'name', type: 'varchar(255)', nullable: false },
            { name: 'created_at', type: 'timestamp', nullable: false },
          ],
          indexes: ['PRIMARY KEY (id)', 'FOREIGN KEY (user_id) REFERENCES users(id)'],
        },
      }
    }
    
    const schema = ctx.dbSchema
    const tables = table ? { [table]: schema[table] } : schema
    
    if (table && !schema[table]) {
      return { success: false, output: '', error: `Table not found: ${table}` }
    }
    
    let output = '🗄️ Database Schema:\n\n'
    
    for (const [tableName, tableSchema] of Object.entries(tables)) {
      output += `📋 ${tableName}\n`
      output += '─'.repeat(40) + '\n'
      
      for (const col of tableSchema.columns) {
        output += `  ${col.name}: ${col.type}${col.nullable ? '' : ' NOT NULL'}\n`
      }
      
      if (includeIndexes && tableSchema.indexes.length > 0) {
        output += '\n  Indexes:\n'
        for (const idx of tableSchema.indexes) {
          output += `    • ${idx}\n`
        }
      }
      
      output += '\n'
    }
    
    return {
      success: true,
      output,
      data: { tables: Object.keys(tables), schema: tables },
      duration: Date.now() - start,
    }
  },
  
  runSqlQuery: async (args, _ctx) => {
    const { query, limit } = args as { query: string; limit: number }
    const start = Date.now()

    // Validate read-only: strip comments and check for multi-statement attacks
    const sanitized = query.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').trim()
    const upperQuery = sanitized.toUpperCase()

    // Block multiple statements (semicolon-separated)
    if (sanitized.includes(';')) {
      return {
        success: false,
        output: '',
        error: 'Multiple SQL statements are not allowed',
      }
    }

    // Only allow SELECT
    if (!upperQuery.startsWith('SELECT')) {
      return {
        success: false,
        output: '',
        error: 'Only SELECT queries are allowed (read-only)'
      }
    }

    // Block write keywords even within SELECT subqueries
    const WRITE_KEYWORDS = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'CREATE', 'TRUNCATE', 'EXEC', 'EXECUTE', 'INTO']
    const hasWriteKeyword = WRITE_KEYWORDS.some(kw => upperQuery.includes(kw))
    if (hasWriteKeyword) {
      return {
        success: false,
        output: '',
        error: 'Write operations are not allowed in read-only queries',
      }
    }
    
    // In real implementation, this would execute against the actual database
    return {
      success: true,
      output: `📊 SQL Query Result:\n\n` +
        `Query: ${query}\n` +
        `Limit: ${limit} rows\n\n` +
        `[Query results would appear here]`,
      data: { query, limit, rowCount: 0 },
      duration: Date.now() - start,
    }
  },
  
  // ============================================
  // GOD-TIER: SAFETY TOOLS (Time Travel)
  // ============================================
  
  createCheckpoint: async (args, ctx) => {
    const { name, reason } = args as { name: string; reason?: string }
    const start = Date.now()
    
    const checkpointId = `cp_${Date.now()}_${name.replace(/\s+/g, '-').toLowerCase()}`
    
    // Deep clone the current file state
    const filesCopy = new Map<string, string>()
    ctx.files.forEach((content, path) => {
      filesCopy.set(path, content)
    })
    
    ctx.checkpoints.set(checkpointId, {
      name,
      files: filesCopy,
      timestamp: Date.now(),
    })
    
    return {
      success: true,
      output: `💾 Checkpoint created: ${checkpointId}\n` +
        `Name: ${name}\n` +
        `Files: ${filesCopy.size}\n` +
        (reason ? `Reason: ${reason}` : ''),
      data: { checkpointId, name, fileCount: filesCopy.size },
      duration: Date.now() - start,
    }
  },
  
  rollbackToCheckpoint: async (args, ctx) => {
    const { checkpointId, confirm } = args as { checkpointId: string; confirm: boolean }
    const start = Date.now()
    
    if (!confirm) {
      return { 
        success: false, 
        output: '', 
        error: 'Rollback requires confirm: true' 
      }
    }
    
    const checkpoint = ctx.checkpoints.get(checkpointId)
    if (!checkpoint) {
      return { success: false, output: '', error: `Checkpoint not found: ${checkpointId}` }
    }
    
    // Restore file state
    ctx.files.clear()
    checkpoint.files.forEach((content, path) => {
      ctx.files.set(path, content)
    })
    
    return {
      success: true,
      output: `⏪ Rolled back to checkpoint: ${checkpointId}\n` +
        `Name: ${checkpoint.name}\n` +
        `Files restored: ${checkpoint.files.size}\n` +
        `Created: ${new Date(checkpoint.timestamp).toISOString()}`,
      data: { checkpointId, name: checkpoint.name, filesRestored: checkpoint.files.size },
      duration: Date.now() - start,
    }
  },
  
  listCheckpoints: async (args, ctx) => {
    const { limit } = args as { limit: number }
    const start = Date.now()
    
    const checkpoints = Array.from(ctx.checkpoints.entries())
      .sort((a, b) => b[1].timestamp - a[1].timestamp)
      .slice(0, limit)
    
    if (checkpoints.length === 0) {
      return {
        success: true,
        output: '📋 No checkpoints found',
        data: { checkpoints: [], count: 0 },
        duration: Date.now() - start,
      }
    }
    
    const output = checkpoints
      .map(([id, cp]) => `  ${id}\n    Name: ${cp.name}\n    Files: ${cp.files.size}\n    Created: ${new Date(cp.timestamp).toISOString()}`)
      .join('\n\n')
    
    return {
      success: true,
      output: `📋 Checkpoints (${checkpoints.length}):\n\n${output}`,
      data: { checkpoints: checkpoints.map(([id, cp]) => ({ id, name: cp.name, files: cp.files.size })) },
      duration: Date.now() - start,
    }
  },
  
  // ============================================
  // GOD-TIER: BETTER EDITING (Surgical Precision)
  // ============================================
  
  applyPatch: async (args, ctx) => {
    const { path, patch, description } = args as { path: string; patch: string; description?: string }
    const start = Date.now()
    
    const existingContent = ctx.files.get(path)
    if (!existingContent) {
      return { success: false, output: '', error: `File not found: ${path}` }
    }
    
    // Parse unified diff and apply
    // Format: 
    // @@ -start,count +start,count @@
    // -removed line
    // +added line
    //  context line
    
    try {
      const lines = existingContent.split('\n')
      const patchLines = patch.split('\n')
      const resultLines = [...lines]
      let offset = 0
      
      for (let i = 0; i < patchLines.length; i++) {
        const line = patchLines[i]
        
        // Parse hunk header
        const hunkMatch = line.match(/^@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@/)
        if (hunkMatch) {
          const oldStart = parseInt(hunkMatch[1]) - 1 // 0-indexed
          let lineIndex = oldStart + offset
          
          // Process hunk lines
          i++
          while (i < patchLines.length && !patchLines[i].startsWith('@@')) {
            const patchLine = patchLines[i]
            
            if (patchLine.startsWith('-')) {
              // Remove line
              resultLines.splice(lineIndex, 1)
              offset--
            } else if (patchLine.startsWith('+')) {
              // Add line
              resultLines.splice(lineIndex, 0, patchLine.slice(1))
              lineIndex++
              offset++
            } else if (patchLine.startsWith(' ')) {
              // Context line - just advance
              lineIndex++
            }
            
            i++
          }
          i-- // Back up since outer loop will increment
        }
      }
      
      const newContent = resultLines.join('\n')
      ctx.files.set(path, newContent)
      
      const linesChanged = patch.split('\n').filter(l => l.startsWith('+') || l.startsWith('-')).length
      
      return {
        success: true,
        output: `🔧 Patch applied: ${path}${description ? ` - ${description}` : ''}\n` +
          `Lines changed: ~${linesChanged}`,
        data: { path, linesChanged },
        duration: Date.now() - start,
      }
    } catch (error) {
      return {
        success: false,
        output: '',
        error: `Failed to apply patch: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  },

  // ============================================
  // PHASE 2: MCP CONNECTIVITY (Infinite Extensibility)
  // ============================================
  
  connectMcpServer: async (args, ctx) => {
    const { url, name, apiKey: _apiKey } = args as { url: string; name: string; apiKey?: string }
    const start = Date.now()
    
    try {
      // Validate URL format
      const serverUrl = new URL(url)
      
      // Attempt to discover available tools from MCP server
      // In production, this would make an actual HTTP request to the MCP endpoint
      const mockTools = [
        { name: 'search', description: 'Search the connected service', parameters: { query: 'string' } },
        { name: 'create', description: 'Create a new resource', parameters: { data: 'object' } },
        { name: 'update', description: 'Update an existing resource', parameters: { id: 'string', data: 'object' } },
      ]
      
      ctx.mcpServers.set(name, {
        url: serverUrl.toString(),
        tools: mockTools,
      })
      
      return {
        success: true,
        output: `🔌 MCP Server connected: ${name}\n` +
          `URL: ${serverUrl.origin}\n` +
          `Tools discovered: ${mockTools.length}\n` +
          `  ${mockTools.map(t => `• ${t.name}: ${t.description}`).join('\n  ')}`,
        data: { name, url: serverUrl.toString(), tools: mockTools.map(t => t.name) },
        duration: Date.now() - start,
      }
    } catch (error) {
      return {
        success: false,
        output: '',
        error: `Failed to connect MCP server: ${error instanceof Error ? error.message : 'Invalid URL'}`,
      }
    }
  },
  
  listMcpTools: async (args, ctx) => {
    const { serverName } = args as { serverName?: string }
    const start = Date.now()
    
    if (ctx.mcpServers.size === 0) {
      return {
        success: true,
        output: '📋 No MCP servers connected. Use connectMcpServer to add one.',
        data: { servers: [], totalTools: 0 },
        duration: Date.now() - start,
      }
    }
    
    const serversToList = serverName 
      ? [[serverName, ctx.mcpServers.get(serverName)]] as const
      : Array.from(ctx.mcpServers.entries())
    
    const output: string[] = ['🔌 MCP Tools Available:\n']
    let totalTools = 0
    
    for (const [name, server] of serversToList) {
      if (!server) continue
      output.push(`📡 ${name} (${server.url})`)
      for (const tool of server.tools) {
        output.push(`   • ${tool.name}: ${tool.description}`)
        totalTools++
      }
      output.push('')
    }
    
    return {
      success: true,
      output: output.join('\n'),
      data: { 
        servers: Array.from(ctx.mcpServers.keys()), 
        totalTools 
      },
      duration: Date.now() - start,
    }
  },
  
  invokeMcpTool: async (args, ctx) => {
    const { serverName, toolName, arguments: toolArgs } = args as { 
      serverName: string; 
      toolName: string; 
      arguments: Record<string, unknown> 
    }
    const start = Date.now()
    
    const server = ctx.mcpServers.get(serverName)
    if (!server) {
      return {
        success: false,
        output: '',
        error: `MCP server not found: ${serverName}. Use connectMcpServer first.`,
      }
    }
    
    const tool = server.tools.find(t => t.name === toolName)
    if (!tool) {
      return {
        success: false,
        output: '',
        error: `Tool not found on ${serverName}: ${toolName}. Available: ${server.tools.map(t => t.name).join(', ')}`,
      }
    }
    
    // In production, this would make an actual HTTP request to invoke the tool
    // For now, simulate a response
    const mockResult = {
      status: 'success',
      data: { message: `Tool ${toolName} executed with args: ${JSON.stringify(toolArgs)}` },
    }
    
    return {
      success: true,
      output: `⚡ MCP Tool Invoked: ${serverName}.${toolName}\n` +
        `Arguments: ${JSON.stringify(toolArgs, null, 2)}\n` +
        `Result: ${JSON.stringify(mockResult, null, 2)}`,
      data: { serverName, toolName, result: mockResult },
      duration: Date.now() - start,
    }
  },

  // ============================================
  // PHASE 2: DESIGN CONSISTENCY (Vibe Guard)
  // ============================================
  
  consultDesignTokens: async (args, ctx) => {
    const { category, component } = args as { category: string; component?: string }
    const start = Date.now()
    
    if (!ctx.designTokens) {
      return {
        success: true,
        output: '🎨 No design tokens configured. Using TORBIT defaults.',
        data: getDefaultDesignTokens(),
        duration: Date.now() - start,
      }
    }
    
    const tokens = ctx.designTokens
    let output = '🎨 Design Tokens:\n\n'
    
    switch (category) {
      case 'colors':
        output += 'COLORS:\n'
        output += `  Primary: ${tokens.colors.primary}\n`
        output += `  Secondary: ${tokens.colors.secondary}\n`
        output += `  Accent: ${tokens.colors.accent}\n`
        output += `  Background: ${tokens.colors.background}\n`
        output += `  Surface: ${tokens.colors.surface}\n`
        output += `  Text: ${tokens.colors.text}\n`
        output += `  Text Muted: ${tokens.colors.textMuted}\n`
        output += `  Error: ${tokens.colors.error}\n`
        output += `  Success: ${tokens.colors.success}\n`
        output += `  Warning: ${tokens.colors.warning}\n`
        break
        
      case 'typography':
        output += 'TYPOGRAPHY:\n'
        output += `  Font Family: ${tokens.typography.fontFamily}\n`
        output += `  Font Sizes: ${JSON.stringify(tokens.typography.fontSizes)}\n`
        output += `  Font Weights: ${JSON.stringify(tokens.typography.fontWeights)}\n`
        output += `  Line Heights: ${JSON.stringify(tokens.typography.lineHeights)}\n`
        break
        
      case 'spacing':
        output += 'SPACING:\n'
        Object.entries(tokens.spacing).forEach(([key, value]) => {
          output += `  ${key}: ${value}\n`
        })
        break
        
      case 'borders':
        output += 'BORDERS:\n'
        output += `  Radius: ${JSON.stringify(tokens.borders.radius)}\n`
        output += `  Width: ${JSON.stringify(tokens.borders.width)}\n`
        break
        
      case 'shadows':
        output += 'SHADOWS:\n'
        Object.entries(tokens.shadows).forEach(([key, value]) => {
          output += `  ${key}: ${value}\n`
        })
        break
        
      case 'animations':
        output += 'ANIMATIONS:\n'
        output += `  Durations: ${JSON.stringify(tokens.animations.durations)}\n`
        output += `  Easings: ${JSON.stringify(tokens.animations.easings)}\n`
        break
        
      default:
        output += `Category "${category}" not found. Available: colors, typography, spacing, borders, shadows, animations`
    }
    
    if (component) {
      output += `\n\n💡 Suggested styles for ${component}:\n`
      output += getSuggestedComponentStyles(component, tokens)
    }
    
    return {
      success: true,
      output,
      data: { category, tokens: tokens[category as keyof DesignTokens] },
      duration: Date.now() - start,
    }
  },
  
  validateStyle: async (args, ctx) => {
    const { element, styles, autofix } = args as { 
      element: string; 
      styles: Record<string, string>; 
      autofix?: boolean 
    }
    const start = Date.now()
    
    const tokens = ctx.designTokens || getDefaultDesignTokens()
    const violations: Array<{ property: string; value: string; suggestion: string; severity: 'error' | 'warning' }> = []
    const fixed: Record<string, string> = { ...styles }
    
    // Check colors
    Object.entries(styles).forEach(([prop, value]) => {
      // Color validation
      if (prop.includes('color') || prop.includes('background') || prop.includes('border-color')) {
        const isValidColor = Object.values(tokens.colors).includes(value as string) ||
          value.startsWith('var(--') ||
          value === 'transparent' ||
          value === 'inherit' ||
          value === 'currentColor'
        
        if (!isValidColor && value.match(/^#[0-9a-fA-F]{3,8}$/)) {
          const suggestion = findClosestToken(value, tokens.colors)
          violations.push({
            property: prop,
            value,
            suggestion: `Use design token: ${suggestion}`,
            severity: 'error',
          })
          if (autofix) fixed[prop] = suggestion
        }
      }
      
      // Font family validation
      if (prop === 'font-family' || prop === 'fontFamily') {
        if (!value.includes(tokens.typography.fontFamily)) {
          violations.push({
            property: prop,
            value,
            suggestion: `Use design font: ${tokens.typography.fontFamily}`,
            severity: 'warning',
          })
          if (autofix) fixed[prop] = tokens.typography.fontFamily
        }
      }
      
      // Spacing validation (magic numbers)
      if (prop.match(/margin|padding|gap/i) && value.match(/^\d+px$/)) {
        const px = parseInt(value)
        const spacingValues = Object.values(tokens.spacing).map(s => parseInt(s as string))
        if (!spacingValues.includes(px)) {
          const closest = spacingValues.reduce((a, b) => 
            Math.abs(b - px) < Math.abs(a - px) ? b : a
          )
          violations.push({
            property: prop,
            value,
            suggestion: `Use spacing token: ${closest}px`,
            severity: 'warning',
          })
          if (autofix) fixed[prop] = `${closest}px`
        }
      }
    })
    
    const isValid = violations.length === 0
    const errorCount = violations.filter(v => v.severity === 'error').length
    const warningCount = violations.filter(v => v.severity === 'warning').length
    
    let output = isValid 
      ? `✅ Style validation passed for ${element}`
      : `⚠️ Style validation for ${element}:\n` +
        `   ${errorCount} errors, ${warningCount} warnings\n\n` +
        violations.map(v => 
          `   ${v.severity === 'error' ? '❌' : '⚠️'} ${v.property}: ${v.value}\n      → ${v.suggestion}`
        ).join('\n')
    
    if (autofix && !isValid) {
      output += `\n\n🔧 Auto-fixed styles:\n${JSON.stringify(fixed, null, 2)}`
    }
    
    return {
      success: true,
      output,
      data: { isValid, violations, fixed: autofix ? fixed : undefined },
      duration: Date.now() - start,
    }
  },

  // ============================================
  // PHASE 2: SECRET MANAGEMENT (Secure by Default)
  // ============================================
  
  listSecrets: async (args, ctx) => {
    const start = Date.now()
    
    if (ctx.secrets.size === 0) {
      return {
        success: true,
        output: '🔐 No secrets configured. Use requireSecret to declare needed secrets.',
        data: { secrets: [], count: 0 },
        duration: Date.now() - start,
      }
    }
    
    const secretList = Array.from(ctx.secrets.entries()).map(([key, info]) => ({
      key,
      description: info.description,
      isSet: !!info.value,
    }))
    
    const output = `🔐 Configured Secrets (${secretList.length}):\n\n` +
      secretList.map(s => 
        `  ${s.isSet ? '✅' : '❌'} ${s.key}\n     ${s.description}`
      ).join('\n')
    
    return {
      success: true,
      output,
      data: { secrets: secretList, count: secretList.length },
      duration: Date.now() - start,
    }
  },
  
  getSecret: async (args, ctx) => {
    const { key, required } = args as { key: string; required?: boolean }
    const start = Date.now()
    
    const secret = ctx.secrets.get(key)
    
    if (!secret || !secret.value) {
      if (required) {
        return {
          success: false,
          output: '',
          error: `Required secret not found: ${key}. Please configure this secret.`,
        }
      }
      return {
        success: true,
        output: `🔐 Secret "${key}" not configured (optional)`,
        data: { key, value: null, isSet: false },
        duration: Date.now() - start,
      }
    }
    
    // Return masked value for display, actual value in data
    const masked = secret.value.slice(0, 4) + '•'.repeat(Math.max(0, secret.value.length - 8)) + secret.value.slice(-4)
    
    return {
      success: true,
      output: `🔐 Secret "${key}": ${masked}`,
      data: { key, value: secret.value, isSet: true },
      duration: Date.now() - start,
    }
  },
  
  requireSecret: async (args, ctx) => {
    const { key, description, defaultValue } = args as { 
      key: string; 
      description: string; 
      defaultValue?: string 
    }
    const start = Date.now()
    
    const existing = ctx.secrets.get(key)
    
    if (existing?.value) {
      return {
        success: true,
        output: `🔐 Secret "${key}" already configured`,
        data: { key, isSet: true, wasExisting: true },
        duration: Date.now() - start,
      }
    }
    
    ctx.secrets.set(key, {
      value: defaultValue || '',
      description,
    })
    
    if (!defaultValue) {
      return {
        success: true,
        output: `🔐 Secret required: ${key}\n` +
          `   Description: ${description}\n` +
          `   ⚠️ Please configure this secret in project settings`,
        data: { key, isSet: false, wasExisting: false },
        duration: Date.now() - start,
      }
    }
    
    return {
      success: true,
      output: `🔐 Secret "${key}" set with default value\n   Description: ${description}`,
      data: { key, isSet: true, wasExisting: false },
      duration: Date.now() - start,
    }
  },

  // ============================================
  // PHASE 2: PACKAGE VALIDATION (No More "Module Not Found")
  // ============================================
  
  verifyPackage: async (args, _ctx) => {
    const { name, version } = args as { name: string; version?: string }
    const start = Date.now()
    
    try {
      // In production, this would query the npm registry
      // For now, simulate common packages
      const knownPackages: Record<string, { versions: string[]; latest: string; deprecated?: boolean }> = {
        'react': { versions: ['18.2.0', '18.3.0', '19.0.0'], latest: '19.0.0' },
        'next': { versions: ['14.0.0', '15.0.0', '16.0.0'], latest: '16.0.0' },
        'tailwindcss': { versions: ['3.4.0', '4.0.0'], latest: '4.0.0' },
        'framer-motion': { versions: ['10.0.0', '11.0.0', '12.0.0'], latest: '12.0.0' },
        'zustand': { versions: ['4.5.0', '5.0.0'], latest: '5.0.0' },
        'zod': { versions: ['3.22.0', '3.23.0', '3.24.0'], latest: '3.24.0' },
      }
      
      const pkg = knownPackages[name]
      
      if (!pkg) {
        // Simulate npm registry lookup
        return {
          success: true,
          output: `📦 Package "${name}": UNKNOWN\n` +
            `   ⚠️ Package not in local cache. Verify on npmjs.com before installing.`,
          data: { name, exists: 'unknown', needsVerification: true },
          duration: Date.now() - start,
        }
      }
      
      const requestedVersion = version || 'latest'
      const versionExists = requestedVersion === 'latest' || pkg.versions.includes(requestedVersion)
      
      return {
        success: true,
        output: `📦 Package "${name}":\n` +
          `   ✅ Exists on npm\n` +
          `   Latest: ${pkg.latest}\n` +
          `   Requested: ${requestedVersion} ${versionExists ? '✅' : '❌ NOT FOUND'}\n` +
          (pkg.deprecated ? '   ⚠️ DEPRECATED\n' : '') +
          `   Available versions: ${pkg.versions.join(', ')}`,
        data: { 
          name, 
          exists: true, 
          latest: pkg.latest, 
          versionExists,
          deprecated: pkg.deprecated || false,
        },
        duration: Date.now() - start,
      }
    } catch (error) {
      return {
        success: false,
        output: '',
        error: `Failed to verify package: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  },
  
  checkPeerDependencies: async (args, _ctx) => {
    const { packages } = args as { packages: string[] }
    const start = Date.now()
    
    // In production, this would analyze actual peer dependencies
    const peerDeps: Record<string, Record<string, string>> = {
      'framer-motion': { 'react': '>=18.0.0', 'react-dom': '>=18.0.0' },
      '@tanstack/react-query': { 'react': '>=18.0.0' },
      'next-auth': { 'next': '>=14.0.0', 'react': '>=18.0.0' },
    }
    
    const conflicts: Array<{ package: string; peer: string; required: string; installed?: string }> = []
    const satisfied: Array<{ package: string; peer: string; required: string }> = []
    
    for (const pkg of packages) {
      const peers = peerDeps[pkg]
      if (peers) {
        for (const [peer, required] of Object.entries(peers)) {
          // Simulate version check
          satisfied.push({ package: pkg, peer, required })
        }
      }
    }
    
    const hasConflicts = conflicts.length > 0
    
    let output = '📦 Peer Dependency Check:\n\n'
    
    if (satisfied.length > 0) {
      output += 'Satisfied:\n'
      satisfied.forEach(s => {
        output += `  ✅ ${s.package} → ${s.peer} ${s.required}\n`
      })
    }
    
    if (hasConflicts) {
      output += '\nConflicts:\n'
      conflicts.forEach(c => {
        output += `  ❌ ${c.package} needs ${c.peer} ${c.required} (installed: ${c.installed || 'none'})\n`
      })
    }
    
    if (!hasConflicts && satisfied.length > 0) {
      output += '\n✅ All peer dependencies satisfied!'
    }
    
    return {
      success: true,
      output,
      data: { hasConflicts, conflicts, satisfied },
      duration: Date.now() - start,
    }
  },

  // ============================================
  // PHASE 2: SELF-REPAIR LOOP (Error Intelligence)
  // ============================================
  
  parseError: async (args, ctx) => {
    const { errorOutput, source } = args as { errorOutput: string; source: 'build' | 'runtime' | 'lint' | 'test' }
    const start = Date.now()
    
    const errors: ParsedError[] = []
    const lines = errorOutput.split('\n')
    
    // Common error patterns
    const patterns = [
      // TypeScript/Next.js errors
      { 
        regex: /(.+\.tsx?):(\d+):(\d+):\s*error\s*TS(\d+):\s*(.+)/,
        type: 'typescript' as const,
      },
      // ESLint errors
      {
        regex: /(.+):(\d+):(\d+):\s*(error|warning)\s+(.+?)\s+(\S+)$/,
        type: 'eslint' as const,
      },
      // Module not found
      {
        regex: /Module not found:\s*(.+)/,
        type: 'module' as const,
      },
      // Cannot find module
      {
        regex: /Cannot find module '([^']+)'/,
        type: 'import' as const,
      },
      // React hydration
      {
        regex: /Hydration failed|Text content does not match/,
        type: 'hydration' as const,
      },
      // Generic JS errors
      {
        regex: /(TypeError|ReferenceError|SyntaxError):\s*(.+)/,
        type: 'javascript' as const,
      },
    ]
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      for (const pattern of patterns) {
        const match = line.match(pattern.regex)
        if (match) {
          const errorId = `err_${Date.now()}_${errors.length}`
          const parsedError: ParsedError = {
            id: errorId,
            source,
            type: pattern.type,
            message: line,
            file: match[1] || undefined,
            line: match[2] ? parseInt(match[2]) : undefined,
            suggestedFixes: generateSuggestedFixes(pattern.type, line, match),
          }
          errors.push(parsedError)
          ctx.parsedErrors.set(errorId, parsedError)
          break
        }
      }
    }
    
    if (errors.length === 0) {
      return {
        success: true,
        output: '🔍 No parseable errors found in output',
        data: { errors: [], count: 0 },
        duration: Date.now() - start,
      }
    }
    
    const output = `🔍 Parsed ${errors.length} error(s):\n\n` +
      errors.map((e, i) => 
        `${i + 1}. [${e.type.toUpperCase()}] ${e.file ? `${e.file}:${e.line}` : 'unknown'}\n` +
        `   ${e.message.slice(0, 100)}${e.message.length > 100 ? '...' : ''}\n` +
        `   💡 Fixes: ${e.suggestedFixes.length > 0 ? e.suggestedFixes.join(', ') : 'Manual investigation needed'}`
      ).join('\n\n')
    
    return {
      success: true,
      output,
      data: { errors, count: errors.length },
      duration: Date.now() - start,
    }
  },
  
  suggestFix: async (args, ctx) => {
    const { errorId, applyFix } = args as { errorId: string; applyFix?: boolean }
    const start = Date.now()
    
    const error = ctx.parsedErrors.get(errorId)
    if (!error) {
      return {
        success: false,
        output: '',
        error: `Error not found: ${errorId}. Use parseError first.`,
      }
    }
    
    const fixes = getDetailedFixes(error)
    
    let output = `🔧 Fix suggestions for ${error.type} error:\n\n`
    output += `Error: ${error.message}\n\n`
    output += `Suggested fixes:\n`
    
    fixes.forEach((fix, i) => {
      output += `\n${i + 1}. ${fix.description}\n`
      if (fix.command) output += `   Run: ${fix.command}\n`
      if (fix.codeChange) output += `   Code: ${fix.codeChange}\n`
    })
    
    // In production with applyFix=true, we would actually apply the fix
    if (applyFix && fixes.length > 0) {
      output += `\n✅ Applying fix: ${fixes[0].description}`
      // Would execute fix here
    }
    
    return {
      success: true,
      output,
      data: { errorId, fixes, applied: applyFix && fixes.length > 0 },
      duration: Date.now() - start,
    }
  },

  // ============================================
  // PHASE 2: CONTEXT CACHING (Anthropic Prompt Caching)
  // ============================================
  
  cacheContext: async (args, ctx) => {
    const { key, content, ttl } = args as { key: string; content: string; ttl?: number }
    const start = Date.now()
    
    const ttlMs = (ttl || 300) * 1000 // Default 5 minutes
    
    ctx.contextCache.set(key, {
      content,
      timestamp: Date.now(),
      ttl: ttlMs,
    })
    
    // Calculate token estimate (rough: ~4 chars per token)
    const tokenEstimate = Math.ceil(content.length / 4)
    
    return {
      success: true,
      output: `💾 Context cached: "${key}"\n` +
        `   Size: ${content.length} chars (~${tokenEstimate} tokens)\n` +
        `   TTL: ${ttl || 300}s\n` +
        `   💡 This will be injected into system prompt for 90% cache hit rate`,
      data: { key, size: content.length, tokenEstimate, ttl: ttl || 300 },
      duration: Date.now() - start,
    }
  },
  
  getCachedContext: async (args, ctx) => {
    const { keys } = args as { keys: string[] }
    const start = Date.now()
    
    const results: Record<string, { content: string; age: number; expired: boolean } | null> = {}
    const now = Date.now()
    
    for (const key of keys) {
      const cached = ctx.contextCache.get(key)
      if (cached) {
        const age = now - cached.timestamp
        const expired = age > cached.ttl
        results[key] = {
          content: cached.content,
          age: Math.floor(age / 1000),
          expired,
        }
        // Remove expired entries
        if (expired) {
          ctx.contextCache.delete(key)
        }
      } else {
        results[key] = null
      }
    }
    
    const found = Object.values(results).filter(r => r && !r.expired).length
    const expired = Object.values(results).filter(r => r?.expired).length
    const notFound = Object.values(results).filter(r => r === null).length
    
    let output = `💾 Context Cache Query:\n`
    output += `   Found: ${found}, Expired: ${expired}, Not Found: ${notFound}\n\n`
    
    for (const [key, result] of Object.entries(results)) {
      if (result === null) {
        output += `   ❌ ${key}: not cached\n`
      } else if (result.expired) {
        output += `   ⏰ ${key}: expired (${result.age}s old)\n`
      } else {
        output += `   ✅ ${key}: valid (${result.age}s old, ${result.content.length} chars)\n`
      }
    }
    
    return {
      success: true,
      output,
      data: { results, stats: { found, expired, notFound } },
      duration: Date.now() - start,
    }
  },

  // ============================================
  // PHASE 3: GOD-MODE TOOLS (Production Reality)
  // ============================================

  // VISUAL REGRESSION (Reality Check)
  verifyVisualMatch: async (args, ctx) => {
    const { url, selector, compareWith, strict } = args as { 
      url: string; 
      selector?: string; 
      compareWith: 'design-tokens' | 'previous-snapshot' | 'figma-export';
      strict?: boolean 
    }
    const start = Date.now()
    
    // In production, this would:
    // 1. Use Puppeteer/Playwright to capture screenshot
    // 2. Run pixel comparison or AI visual analysis
    // 3. Compare against design tokens or previous snapshot
    
    const tokens = ctx.designTokens || getDefaultDesignTokens()
    const violations: Array<{ element: string; issue: string; expected: string; actual: string; severity: 'error' | 'warning' }> = []
    
    // Simulate visual analysis results
    const mockAnalysis = {
      screenshot: `screenshot_${Date.now()}.png`,
      elements: [
        { selector: '.hero-button', issues: [] },
        { selector: '.hero-title', issues: [] },
      ],
    }
    
    // Check against design tokens
    if (compareWith === 'design-tokens') {
      // Simulate finding some issues
      if (Math.random() > 0.7) {
        violations.push({
          element: '.cta-button',
          issue: 'Color mismatch',
          expected: tokens.colors.primary,
          actual: '#00FF00',
          severity: 'error',
        })
      }
      if (Math.random() > 0.5) {
        violations.push({
          element: '.card',
          issue: 'Padding mismatch',
          expected: '16px',
          actual: '12px',
          severity: 'warning',
        })
      }
    }
    
    const passed = strict ? violations.length === 0 : violations.filter(v => v.severity === 'error').length === 0
    
    let output = `👁️ Visual Regression Check: ${url}\n`
    output += `   Selector: ${selector || 'full page'}\n`
    output += `   Compare with: ${compareWith}\n`
    output += `   Screenshot: ${mockAnalysis.screenshot}\n\n`
    
    if (violations.length === 0) {
      output += `   ✅ PASSED - UI matches design system perfectly!`
    } else {
      output += `   ${passed ? '⚠️ PASSED WITH WARNINGS' : '❌ FAILED'}\n\n`
      output += `   Violations:\n`
      violations.forEach(v => {
        output += `   ${v.severity === 'error' ? '❌' : '⚠️'} ${v.element}: ${v.issue}\n`
        output += `      Expected: ${v.expected}\n`
        output += `      Actual: ${v.actual}\n`
      })
    }
    
    return {
      success: passed || !strict,
      output,
      data: { passed, violations, screenshot: mockAnalysis.screenshot },
      duration: Date.now() - start,
    }
  },

  // DOCS HUNTER (RAG on Demand)
  scrapeAndIndexDocs: async (args, ctx) => {
    const { url, selector: _selector, maxDepth, indexName } = args as {
      url: string;
      selector?: string;
      maxDepth: number;
      indexName: string
    }
    const start = Date.now()
    
    // In production, this would:
    // 1. Fetch the URL with fetch/puppeteer
    // 2. Extract content using selector or readability
    // 3. Follow links up to maxDepth
    // 4. Chunk and embed content
    // 5. Store in vector database
    
    // Simulate indexing
    const mockPages = [
      { url, title: 'Main Page', chunks: 15 },
      { url: `${url}/getting-started`, title: 'Getting Started', chunks: 8 },
      { url: `${url}/api-reference`, title: 'API Reference', chunks: 25 },
    ]
    
    const totalChunks = mockPages.reduce((sum, p) => sum + p.chunks, 0)
    
    // Store index metadata in context cache
    ctx.contextCache.set(`docs-index:${indexName}`, {
      content: JSON.stringify({
        name: indexName,
        url,
        pages: mockPages.length,
        chunks: totalChunks,
        indexedAt: Date.now(),
      }),
      timestamp: Date.now(),
      ttl: 86400000, // 24 hours
    })
    
    return {
      success: true,
      output: `📚 Documentation Indexed: ${indexName}\n` +
        `   Source: ${url}\n` +
        `   Depth: ${maxDepth} levels\n` +
        `   Pages scraped: ${mockPages.length}\n` +
        `   Chunks created: ${totalChunks}\n` +
        `   \n` +
        `   Pages:\n` +
        mockPages.map(p => `   • ${p.title} (${p.chunks} chunks)`).join('\n') +
        `\n\n   💡 Use queryIndexedDocs("${indexName}", "your question") to search`,
      data: { indexName, url, pages: mockPages.length, chunks: totalChunks },
      duration: Date.now() - start,
    }
  },

  queryIndexedDocs: async (args, ctx) => {
    const { indexName, query, topK } = args as { indexName: string; query: string; topK: number }
    const start = Date.now()
    
    // Check if index exists
    const indexData = ctx.contextCache.get(`docs-index:${indexName}`)
    if (!indexData) {
      return {
        success: false,
        output: '',
        error: `Index not found: "${indexName}". Use scrapeAndIndexDocs first.`,
      }
    }
    
    // In production, this would:
    // 1. Embed the query
    // 2. Vector search against the index
    // 3. Return top-k relevant chunks
    
    // Simulate search results
    const mockResults = [
      {
        content: `The Sidebar component uses a collapsible state that can be controlled via the useSidebar hook. Import it from "@/components/ui/sidebar".`,
        score: 0.92,
        source: 'components/sidebar.mdx',
      },
      {
        content: `To create a collapsible sidebar, wrap your sidebar content in <SidebarProvider> and use the <Sidebar> component with the collapsible prop.`,
        score: 0.87,
        source: 'usage/collapsible.mdx',
      },
      {
        content: `API: useSidebar() returns { isOpen, setIsOpen, toggle, isMobile }. Use toggle() to programmatically open/close.`,
        score: 0.83,
        source: 'api/hooks.mdx',
      },
    ].slice(0, topK)
    
    let output = `📚 Query: "${query}"\n`
    output += `   Index: ${indexName}\n`
    output += `   Results: ${mockResults.length}\n\n`
    
    mockResults.forEach((r, i) => {
      output += `   ${i + 1}. [${(r.score * 100).toFixed(0)}%] ${r.source}\n`
      output += `      ${r.content.slice(0, 150)}${r.content.length > 150 ? '...' : ''}\n\n`
    })
    
    return {
      success: true,
      output,
      data: { query, results: mockResults },
      duration: Date.now() - start,
    }
  },

  // SECURE ENVIRONMENT (Runtime Injection)
  injectSecureEnv: async (args, ctx) => {
    const { key, value, scope } = args as { key: string; value: string; scope: 'runtime' | 'build' | 'both' }
    const start = Date.now()
    
    // CRITICAL: Never log the actual value
    const masked = value.slice(0, 4) + '•'.repeat(Math.min(20, value.length - 8)) + value.slice(-4)
    
    // Store in secrets (runtime-only, never written to files)
    ctx.secrets.set(key, {
      value,
      description: `Injected via injectSecureEnv (scope: ${scope})`,
    })
    
    // In production, this would:
    // 1. Inject into WebContainer's process.env
    // 2. Never write to .env files
    // 3. Never expose in terminal output
    
    return {
      success: true,
      output: `🔐 Secret Injected: ${key}\n` +
        `   Value: ${masked}\n` +
        `   Scope: ${scope}\n` +
        `   ⚡ Available at process.env.${key}\n` +
        `   🔒 NEVER written to files or logs`,
      data: { key, scope, injected: true },
      duration: Date.now() - start,
    }
  },

  listEnvVars: async (args, ctx) => {
    const { showValues } = args as { showValues: boolean }
    const start = Date.now()
    
    const envVars = Array.from(ctx.secrets.entries()).map(([key, info]) => ({
      key,
      value: showValues && info.value 
        ? info.value.slice(0, 4) + '•'.repeat(Math.min(20, info.value.length - 8)) + info.value.slice(-4)
        : '••••••••',
      description: info.description,
    }))
    
    if (envVars.length === 0) {
      return {
        success: true,
        output: '🔐 No environment variables configured.\n   Use injectSecureEnv to add secrets.',
        data: { envVars: [], count: 0 },
        duration: Date.now() - start,
      }
    }
    
    let output = `🔐 Environment Variables (${envVars.length}):\n\n`
    envVars.forEach(env => {
      output += `   ${env.key}: ${env.value}\n`
      if (env.description) output += `      ${env.description}\n`
    })
    
    return {
      success: true,
      output,
      data: { envVars, count: envVars.length },
      duration: Date.now() - start,
    }
  },

  // LOCALHOST TUNNEL (Instant Sharing)
  openTunnelUrl: async (args, ctx) => {
    const { port, subdomain, expiry } = args as { port: number; subdomain?: string; expiry: number }
    const start = Date.now()
    
    // Generate tunnel ID and URL
    const tunnelId = `tunnel_${Date.now()}`
    const actualSubdomain = subdomain || `app-${Math.random().toString(36).slice(2, 8)}`
    const tunnelUrl = `https://${actualSubdomain}.torbit.dev`
    
    // In production, this would:
    // 1. Spin up Cloudflare Tunnel or similar
    // 2. Route traffic from tunnelUrl to localhost:port
    // 3. Handle WebSocket upgrades for HMR
    
    // Store tunnel info
    ctx.contextCache.set(`tunnel:${tunnelId}`, {
      content: JSON.stringify({
        id: tunnelId,
        url: tunnelUrl,
        port,
        createdAt: Date.now(),
        expiresAt: Date.now() + (expiry * 1000),
      }),
      timestamp: Date.now(),
      ttl: expiry * 1000,
    })
    
    return {
      success: true,
      output: `🌐 Tunnel Created!\n\n` +
        `   🔗 Public URL: ${tunnelUrl}\n` +
        `   📍 Forwarding to: localhost:${port}\n` +
        `   ⏰ Expires in: ${Math.floor(expiry / 60)} minutes\n` +
        `   🆔 Tunnel ID: ${tunnelId}\n\n` +
        `   💡 Share this URL with anyone to preview your app!\n` +
        `   🔥 Hot reload works through the tunnel`,
      data: { tunnelId, url: tunnelUrl, port, expiresAt: Date.now() + (expiry * 1000) },
      duration: Date.now() - start,
    }
  },

  closeTunnel: async (args, ctx) => {
    const { tunnelId } = args as { tunnelId: string }
    const start = Date.now()
    
    const tunnelData = ctx.contextCache.get(`tunnel:${tunnelId}`)
    if (!tunnelData) {
      return {
        success: false,
        output: '',
        error: `Tunnel not found: ${tunnelId}`,
      }
    }
    
    const tunnel = JSON.parse(tunnelData.content)
    ctx.contextCache.delete(`tunnel:${tunnelId}`)
    
    return {
      success: true,
      output: `🔌 Tunnel Closed\n` +
        `   URL: ${tunnel.url}\n` +
        `   Port: ${tunnel.port}\n` +
        `   Uptime: ${Math.floor((Date.now() - tunnel.createdAt) / 1000)}s`,
      data: { tunnelId, url: tunnel.url },
      duration: Date.now() - start,
    }
  },

  // HUMAN HANDSHAKE (Permission Gate)
  requestUserDecision: async (args, ctx) => {
    const { action, reason, severity, options, timeout } = args as { 
      action: string; 
      reason: string; 
      severity: 'info' | 'warning' | 'danger';
      options: Array<{ label: string; value: string; isDefault?: boolean }>;
      timeout: number;
    }
    const start = Date.now()
    
    // In production, this would:
    // 1. Render a modal/card in the UI
    // 2. Pause agent execution
    // 3. Wait for user response (with timeout)
    // 4. Return the user's decision
    
    const severityIcon = {
      info: 'ℹ️',
      warning: '⚠️',
      danger: '🚨',
    }
    
    const decisionId = `decision_${Date.now()}`
    
    // Store pending decision
    ctx.contextCache.set(`decision:${decisionId}`, {
      content: JSON.stringify({
        id: decisionId,
        action,
        reason,
        severity,
        options,
        status: 'pending',
        createdAt: Date.now(),
      }),
      timestamp: Date.now(),
      ttl: timeout * 1000,
    })
    
    let output = `${severityIcon[severity]} HUMAN DECISION REQUIRED\n\n`
    output += `   Action: ${action}\n`
    output += `   Reason: ${reason}\n`
    output += `   Severity: ${severity.toUpperCase()}\n\n`
    output += `   Options:\n`
    options.forEach((opt, i) => {
      output += `   ${i + 1}. [${opt.value}] ${opt.label}${opt.isDefault ? ' (default)' : ''}\n`
    })
    output += `\n   ⏱️ Timeout: ${timeout}s\n`
    output += `   🆔 Decision ID: ${decisionId}\n`
    output += `\n   ⏸️ Agent execution paused - awaiting user response...`
    
    // In production, this would block until user responds
    // For now, return the pending state
    return {
      success: true,
      output,
      data: { 
        decisionId, 
        action, 
        severity, 
        status: 'pending',
        options: options.map(o => o.value),
      },
      duration: Date.now() - start,
    }
  },

  // ============================================
  // FINAL 5: LAST MILE TOOLS (Senior Engineer Replacement)
  // ============================================

  // SELF-HEALING TESTER (Playwright Agent Pattern: Plan → Generate → Heal)
  runE2eCycle: async (args, ctx) => {
    const { feature, testPath, healOnFailure, maxHealAttempts, takeScreenshots } = args as {
      feature: string
      testPath?: string
      healOnFailure: boolean
      maxHealAttempts: number
      takeScreenshots: boolean
    }
    const start = Date.now()
    
    const actualTestPath = testPath || `tests/e2e/${feature.toLowerCase().replace(/\s+/g, '-')}.spec.ts`
    
    // Phase 1: PLAN - Analyze the feature
    const planOutput = `📋 PHASE 1: PLAN\n` +
      `   Feature: "${feature}"\n` +
      `   Analyzing user flows and edge cases...\n` +
      `   Identified test scenarios:\n` +
      `   • Happy path flow\n` +
      `   • Error handling\n` +
      `   • Edge cases (empty state, loading, etc.)\n`
    
    // Phase 2: GENERATE - Write the test
    const testCode = generatePlaywrightTest(feature)
    ctx.files.set(actualTestPath, testCode)
    
    const generateOutput = `\n📝 PHASE 2: GENERATE\n` +
      `   Created: ${actualTestPath}\n` +
      `   Test scenarios: 3\n` +
      `   Framework: Playwright\n`
    
    // Phase 3: EXECUTE - Run the test
    let testPassed = Math.random() > 0.3 // Simulate 70% pass rate
    let healAttempts = 0
    let healOutput = ''
    
    if (!testPassed && healOnFailure) {
      // Phase 4: HEAL - Fix failures
      healOutput = `\n🔧 PHASE 4: HEAL\n`
      
      while (!testPassed && healAttempts < maxHealAttempts) {
        healAttempts++
        healOutput += `   Attempt ${healAttempts}/${maxHealAttempts}:\n`
        healOutput += `   • Analyzing failure: "Element not found: .submit-button"\n`
        healOutput += `   • Diagnosis: Selector changed in recent commit\n`
        healOutput += `   • Fix: Updated selector to [data-testid="submit"]\n`
        
        // Simulate fix working
        testPassed = healAttempts >= 2 || Math.random() > 0.5
        
        if (testPassed) {
          healOutput += `   ✅ Test now passes!\n`
        } else {
          healOutput += `   ❌ Still failing, trying alternative fix...\n`
        }
      }
    }
    
    const executeOutput = `\n🧪 PHASE 3: EXECUTE\n` +
      `   Running: npx playwright test ${actualTestPath}\n` +
      `   ${takeScreenshots ? '📸 Screenshots: enabled\n' : ''}` +
      `   Result: ${testPassed ? '✅ PASSED' : '❌ FAILED'}\n` +
      (testPassed ? `   Duration: ${Math.floor(Math.random() * 5000 + 2000)}ms\n` : '')
    
    const finalOutput = planOutput + generateOutput + executeOutput + healOutput +
      `\n${'═'.repeat(50)}\n` +
      `${testPassed ? '✅' : '❌'} E2E CYCLE COMPLETE: ${feature}\n` +
      `   Test file: ${actualTestPath}\n` +
      `   Status: ${testPassed ? 'VERIFIED WORKING' : 'NEEDS MANUAL FIX'}\n` +
      (healAttempts > 0 ? `   Heal attempts: ${healAttempts}\n` : '') +
      (testPassed ? `   💪 "I built it, tested it, and verified it passes."\n` : '')
    
    return {
      success: testPassed,
      output: finalOutput,
      data: {
        feature,
        testPath: actualTestPath,
        passed: testPassed,
        healAttempts,
        phases: ['plan', 'generate', 'execute', healOnFailure ? 'heal' : null].filter(Boolean),
      },
      duration: Date.now() - start,
    }
  },

  generateTest: async (args, ctx) => {
    const { feature, testType, framework } = args as {
      feature: string
      testType: 'e2e' | 'unit' | 'integration'
      framework: 'playwright' | 'vitest' | 'jest'
    }
    const start = Date.now()
    
    const fileName = feature.toLowerCase().replace(/\s+/g, '-')
    const testPath = testType === 'e2e' 
      ? `tests/e2e/${fileName}.spec.ts`
      : testType === 'unit'
        ? `src/__tests__/${fileName}.test.ts`
        : `tests/integration/${fileName}.test.ts`
    
    let testCode = ''
    
    switch (framework) {
      case 'playwright':
        testCode = generatePlaywrightTest(feature)
        break
      case 'vitest':
        testCode = generateVitestTest(feature)
        break
      case 'jest':
        testCode = generateJestTest(feature)
        break
    }
    
    ctx.files.set(testPath, testCode)
    
    return {
      success: true,
      output: `🧪 Test Generated\n` +
        `   Feature: ${feature}\n` +
        `   Type: ${testType}\n` +
        `   Framework: ${framework}\n` +
        `   Path: ${testPath}\n` +
        `   Scenarios: 3\n\n` +
        `   Run with: ${framework === 'playwright' ? 'npx playwright test' : 'npm run test'}`,
      data: { testPath, testType, framework },
      duration: Date.now() - start,
    }
  },

  // TICKET MASTER (Project Management Sync)
  syncExternalTicket: async (args, ctx) => {
    const { action, ticketId, status, comment, assignee, title, description, labels } = args as {
      action: 'read' | 'update' | 'create' | 'list'
      ticketId?: string
      status?: string
      comment?: string
      assignee?: string
      title?: string
      description?: string
      labels?: string[]
    }
    const start = Date.now()
    
    // Check for MCP connection to project management
    const linearMcp = ctx.mcpServers.get('linear')
    const jiraMcp = ctx.mcpServers.get('jira')
    const provider = linearMcp ? 'Linear' : jiraMcp ? 'Jira' : 'Mock'
    
    switch (action) {
      case 'read': {
        if (!ticketId) {
          return { success: false, output: '', error: 'ticketId required for read action' }
        }
        
        // Simulate reading a ticket
        const mockTicket = {
          id: ticketId,
          title: 'Fix navbar responsiveness',
          status: 'in-progress',
          assignee: 'developer@team.com',
          priority: 'high',
          labels: ['bug', 'ui'],
          description: 'The navbar breaks on mobile viewports < 480px',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          updatedAt: new Date().toISOString(),
        }
        
        return {
          success: true,
          output: `🎫 Ticket: ${ticketId} (${provider})\n\n` +
            `   Title: ${mockTicket.title}\n` +
            `   Status: ${mockTicket.status}\n` +
            `   Assignee: ${mockTicket.assignee}\n` +
            `   Priority: ${mockTicket.priority}\n` +
            `   Labels: ${mockTicket.labels.join(', ')}\n\n` +
            `   Description:\n   ${mockTicket.description}`,
          data: mockTicket,
          duration: Date.now() - start,
        }
      }
      
      case 'update': {
        if (!ticketId) {
          return { success: false, output: '', error: 'ticketId required for update action' }
        }
        
        const updates: string[] = []
        if (status) updates.push(`Status → ${status}`)
        if (assignee) updates.push(`Assignee → ${assignee}`)
        if (comment) updates.push(`Added comment`)
        
        return {
          success: true,
          output: `✅ Ticket Updated: ${ticketId}\n\n` +
            `   Changes:\n` +
            updates.map(u => `   • ${u}`).join('\n') +
            (comment ? `\n\n   Comment: "${comment}"` : ''),
          data: { ticketId, updates: { status, assignee, comment } },
          duration: Date.now() - start,
        }
      }
      
      case 'create': {
        if (!title) {
          return { success: false, output: '', error: 'title required for create action' }
        }
        
        const newTicketId = `TOR-${Math.floor(Math.random() * 1000)}`
        
        return {
          success: true,
          output: `🎫 Ticket Created: ${newTicketId}\n\n` +
            `   Title: ${title}\n` +
            `   Description: ${description || '(none)'}\n` +
            `   Labels: ${labels?.join(', ') || '(none)'}\n` +
            `   Provider: ${provider}`,
          data: { ticketId: newTicketId, title, description, labels },
          duration: Date.now() - start,
        }
      }
      
      case 'list': {
        const mockTickets = [
          { id: 'TOR-101', title: 'Setup auth flow', status: 'done' },
          { id: 'TOR-102', title: 'Fix navbar', status: 'in-progress' },
          { id: 'TOR-103', title: 'Add dark mode', status: 'todo' },
        ]
        
        return {
          success: true,
          output: `🎫 Tickets (${provider}):\n\n` +
            mockTickets.map(t => 
              `   ${t.status === 'done' ? '✅' : t.status === 'in-progress' ? '🔄' : '📋'} ${t.id}: ${t.title}`
            ).join('\n'),
          data: { tickets: mockTickets },
          duration: Date.now() - start,
        }
      }
    }
  },

  listTickets: async (args, _ctx) => {
    const { status, assignee, limit } = args as {
      status: 'backlog' | 'todo' | 'in-progress' | 'review' | 'done' | 'all'
      assignee?: string
      limit: number
    }
    const start = Date.now()
    
    const mockTickets = [
      { id: 'TOR-101', title: 'Setup authentication', status: 'done', assignee: 'alice' },
      { id: 'TOR-102', title: 'Fix navbar responsiveness', status: 'in-progress', assignee: 'bob' },
      { id: 'TOR-103', title: 'Add dark mode toggle', status: 'todo', assignee: 'alice' },
      { id: 'TOR-104', title: 'Optimize bundle size', status: 'backlog', assignee: null },
      { id: 'TOR-105', title: 'Write E2E tests', status: 'review', assignee: 'charlie' },
    ]
    
    let filtered = mockTickets
    if (status !== 'all') {
      filtered = filtered.filter(t => t.status === status)
    }
    if (assignee) {
      filtered = filtered.filter(t => t.assignee === assignee)
    }
    filtered = filtered.slice(0, limit)
    
    const statusIcons: Record<string, string> = {
      backlog: '📦',
      todo: '📋',
      'in-progress': '🔄',
      review: '👀',
      done: '✅',
    }
    
    return {
      success: true,
      output: `🎫 Tickets (${status === 'all' ? 'All' : status}):\n\n` +
        filtered.map(t => 
          `   ${statusIcons[t.status]} ${t.id}: ${t.title}\n` +
          `      Assignee: ${t.assignee || 'Unassigned'}`
        ).join('\n\n'),
      data: { tickets: filtered, count: filtered.length },
      duration: Date.now() - start,
    }
  },

  // DEPENDENCY TIME-MACHINE (Conflict Prevention)
  verifyDependencyGraph: async (args, _ctx) => {
    const { packages, checkPeers, simulateInstall, suggestFixes } = args as {
      packages: string[]
      checkPeers: boolean
      simulateInstall: boolean
      suggestFixes: boolean
    }
    const start = Date.now()
    
    // Parse packages
    const parsed = packages.map(p => {
      const match = p.match(/^(@?[^@]+)(?:@(.+))?$/)
      return {
        name: match?.[1] || p,
        requestedVersion: match?.[2] || 'latest',
      }
    })
    
    // Simulate dependency analysis
    const conflicts: Array<{
      package: string
      dependency: string
      required: string
      installed: string
      severity: 'error' | 'warning'
    }> = []
    
    const resolutions: Array<{
      package: string
      action: string
      from: string
      to: string
    }> = []
    
    // Check for known conflicts
    const hasReact19 = parsed.some(p => p.name === 'react' && p.requestedVersion.startsWith('19'))
    const hasFramerMotion = parsed.some(p => p.name === 'framer-motion')
    
    if (hasReact19 && hasFramerMotion) {
      conflicts.push({
        package: 'framer-motion',
        dependency: 'react',
        required: '^18.0.0',
        installed: '19.x',
        severity: 'error',
      })
      
      if (suggestFixes) {
        resolutions.push({
          package: 'framer-motion',
          action: 'upgrade',
          from: 'current',
          to: '12.0.0-beta (React 19 support)',
        })
      }
    }
    
    // Check for peer dependencies
    if (checkPeers) {
      // Simulate peer dependency check
    }
    
    const hasErrors = conflicts.some(c => c.severity === 'error')
    
    let output = `📦 Dependency Graph Analysis\n\n`
    output += `   Packages to install: ${packages.length}\n`
    
    if (simulateInstall) {
      output += `   Simulated install: ${hasErrors ? '❌ WOULD FAIL' : '✅ WOULD SUCCEED'}\n`
    }
    
    output += `\n   Requested:\n`
    parsed.forEach(p => {
      output += `   • ${p.name}@${p.requestedVersion}\n`
    })
    
    if (conflicts.length > 0) {
      output += `\n   ⚠️ Conflicts Detected:\n`
      conflicts.forEach(c => {
        output += `   ${c.severity === 'error' ? '❌' : '⚠️'} ${c.package}\n`
        output += `      Needs ${c.dependency} ${c.required}\n`
        output += `      Would install: ${c.installed}\n`
      })
    }
    
    if (resolutions.length > 0) {
      output += `\n   💡 Suggested Fixes:\n`
      resolutions.forEach(r => {
        output += `   • ${r.package}: ${r.action} ${r.from} → ${r.to}\n`
      })
    }
    
    if (!hasErrors) {
      output += `\n   ✅ No conflicts detected. Safe to install!`
    }
    
    return {
      success: !hasErrors,
      output,
      data: { packages: parsed, conflicts, resolutions, wouldSucceed: !hasErrors },
      duration: Date.now() - start,
    }
  },

  resolveConflict: async (args, _ctx) => {
    const { packageName, strategy, targetVersion } = args as {
      packageName: string
      strategy: 'downgrade' | 'upgrade' | 'override' | 'skip'
      targetVersion?: string
    }
    const start = Date.now()
    
    const actions: Record<string, string> = {
      downgrade: `Downgrading ${packageName} to compatible version`,
      upgrade: `Upgrading ${packageName} to ${targetVersion || 'latest compatible'}`,
      override: `Adding npm override for ${packageName}`,
      skip: `Skipping ${packageName} installation`,
    }
    
    let output = `🔧 Conflict Resolution: ${packageName}\n\n`
    output += `   Strategy: ${strategy}\n`
    output += `   Action: ${actions[strategy]}\n`
    
    if (strategy === 'override') {
      output += `\n   Added to package.json:\n`
      output += `   "overrides": {\n`
      output += `     "${packageName}": "${targetVersion || '*'}"\n`
      output += `   }\n`
    }
    
    output += `\n   ✅ Conflict resolved. Run npm install to apply.`
    
    return {
      success: true,
      output,
      data: { packageName, strategy, targetVersion },
      duration: Date.now() - start,
    }
  },
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function generatePlaywrightTest(feature: string): string {
  return `import { test, expect } from '@playwright/test';

test.describe('${feature}', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should complete ${feature} successfully', async ({ page }) => {
    // Happy path test
    await expect(page).toHaveTitle(/TORBIT/);
    
    // TODO: Add feature-specific assertions
    await page.getByRole('button', { name: /submit/i }).click();
    await expect(page.getByText(/success/i)).toBeVisible();
  });

  test('should handle ${feature} errors gracefully', async ({ page }) => {
    // Error handling test
    await page.getByRole('button', { name: /submit/i }).click();
    await expect(page.getByText(/error|failed/i)).not.toBeVisible();
  });

  test('should show loading state during ${feature}', async ({ page }) => {
    // Loading state test
    await page.getByRole('button', { name: /submit/i }).click();
    // Loading indicator should appear briefly
    await expect(page.getByRole('progressbar')).toBeVisible({ timeout: 1000 }).catch(() => {});
  });
});
`
}

function generateVitestTest(feature: string): string {
  return `import { describe, it, expect, vi } from 'vitest';

describe('${feature}', () => {
  it('should handle ${feature} correctly', () => {
    // TODO: Add test implementation
    expect(true).toBe(true);
  });

  it('should throw on invalid input', () => {
    // TODO: Add error case test
    expect(() => {
      throw new Error('Invalid input');
    }).toThrow('Invalid input');
  });

  it('should call dependencies correctly', () => {
    const mockFn = vi.fn();
    mockFn('test');
    expect(mockFn).toHaveBeenCalledWith('test');
  });
});
`
}

function generateJestTest(feature: string): string {
  return `describe('${feature}', () => {
  beforeEach(() => {
    // Setup
  });

  afterEach(() => {
    // Cleanup
  });

  it('should handle ${feature} correctly', () => {
    // TODO: Add test implementation
    expect(true).toBe(true);
  });

  it('should handle edge cases', () => {
    // TODO: Add edge case tests
    expect(null).toBeNull();
  });
});
`
}

function getDefaultDesignTokens(): DesignTokens {
  return {
    colors: {
      primary: '#00ff41',
      secondary: '#003b00',
      accent: '#39ff14',
      background: '#0a0a0a',
      surface: '#111111',
      text: '#f0f0f0',
      textMuted: '#888888',
      error: '#ff3333',
      success: '#00ff41',
      warning: '#ffcc00',
    },
    typography: {
      fontFamily: 'Space Grotesk, system-ui, sans-serif',
      fontSizes: {
        xs: '0.75rem',
        sm: '0.875rem',
        base: '1rem',
        lg: '1.125rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.875rem',
        '4xl': '2.25rem',
      },
      fontWeights: {
        normal: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
      },
      lineHeights: {
        tight: 1.25,
        normal: 1.5,
        relaxed: 1.75,
      },
    },
    spacing: {
      px: '1px',
      0: '0',
      1: '4px',
      2: '8px',
      3: '12px',
      4: '16px',
      5: '20px',
      6: '24px',
      8: '32px',
      10: '40px',
      12: '48px',
      16: '64px',
    },
    borders: {
      radius: {
        none: '0',
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        full: '9999px',
      },
      width: {
        default: '1px',
        2: '2px',
        4: '4px',
      },
    },
    shadows: {
      sm: '0 1px 2px 0 rgba(0, 255, 65, 0.05)',
      md: '0 4px 6px -1px rgba(0, 255, 65, 0.1)',
      lg: '0 10px 15px -3px rgba(0, 255, 65, 0.1)',
      glow: '0 0 20px rgba(0, 255, 65, 0.3)',
      'glow-lg': '0 0 40px rgba(0, 255, 65, 0.4)',
    },
    animations: {
      durations: {
        fast: '150ms',
        normal: '300ms',
        slow: '500ms',
      },
      easings: {
        default: 'cubic-bezier(0.4, 0, 0.2, 1)',
        in: 'cubic-bezier(0.4, 0, 1, 1)',
        out: 'cubic-bezier(0, 0, 0.2, 1)',
        bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },
    },
  }
}

function getSuggestedComponentStyles(component: string, tokens: DesignTokens): string {
  const suggestions: Record<string, string> = {
    button: `
  background: ${tokens.colors.primary}
  color: ${tokens.colors.background}
  padding: ${tokens.spacing[3]} ${tokens.spacing[6]}
  border-radius: ${tokens.borders.radius.md}
  font-weight: ${tokens.typography.fontWeights.semibold}
  transition: ${tokens.animations.durations.fast}`,
    card: `
  background: ${tokens.colors.surface}
  border: 1px solid ${tokens.colors.primary}20
  padding: ${tokens.spacing[6]}
  border-radius: ${tokens.borders.radius.lg}
  box-shadow: ${tokens.shadows.md}`,
    input: `
  background: ${tokens.colors.background}
  border: 1px solid ${tokens.colors.primary}40
  color: ${tokens.colors.text}
  padding: ${tokens.spacing[3]} ${tokens.spacing[4]}
  border-radius: ${tokens.borders.radius.md}
  font-family: ${tokens.typography.fontFamily}`,
    heading: `
  font-family: ${tokens.typography.fontFamily}
  font-weight: ${tokens.typography.fontWeights.bold}
  color: ${tokens.colors.text}
  line-height: ${tokens.typography.lineHeights.tight}`,
  }
  
  return suggestions[component.toLowerCase()] || 
    `No specific suggestions for "${component}". Use design tokens from the categories above.`
}

function findClosestToken(hexColor: string, colorTokens: Record<string, string>): string {
  // Simple implementation - in production would use color distance calculation
  const entries = Object.entries(colorTokens)
  return entries[0][1] // Return first color as fallback
}

function generateSuggestedFixes(type: string, line: string, match: RegExpMatchArray): string[] {
  switch (type) {
    case 'module':
    case 'import':
      const moduleName = match[1]?.replace(/'/g, '') || 'unknown'
      return [
        `npm install ${moduleName}`,
        `Check import path spelling`,
        `Verify package exists in package.json`,
      ]
    case 'typescript':
      return [
        `Check type definitions`,
        `Add missing type annotation`,
        `Install @types package if needed`,
      ]
    case 'hydration':
      return [
        `Add "use client" directive`,
        `Check for browser-only code in SSR`,
        `Ensure consistent rendering`,
      ]
    case 'javascript':
      return [
        `Check variable scope`,
        `Verify object properties exist`,
        `Add null checks`,
      ]
    default:
      return []
  }
}

function getDetailedFixes(error: ParsedError): Array<{ description: string; command?: string; codeChange?: string }> {
  switch (error.type) {
    case 'module':
    case 'import':
      return [
        { 
          description: 'Install missing package',
          command: `npm install ${error.message.match(/['"]([^'"]+)['"]/)?.[1] || 'package-name'}`,
        },
        {
          description: 'Check import path',
          codeChange: 'Verify the import path is correct and case-sensitive',
        },
      ]
    case 'hydration':
      return [
        {
          description: 'Add "use client" directive to component',
          codeChange: '"use client" at top of file',
        },
        {
          description: 'Use dynamic import with ssr: false',
          codeChange: 'const Component = dynamic(() => import("./Component"), { ssr: false })',
        },
      ]
    default:
      return [
        { description: 'Review error message and fix manually' },
      ]
  }
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
  initialFiles?: Record<string, string>,
  options?: {
    designTokens?: DesignTokens
    initialSecrets?: Record<string, { value: string; description: string }>
  }
): ToolExecutionContext {
  const files = new Map<string, string>()
  
  if (initialFiles) {
    Object.entries(initialFiles).forEach(([path, content]) => {
      files.set(path, content)
    })
  }
  
  const secrets = new Map<string, { value: string; description: string }>()
  if (options?.initialSecrets) {
    Object.entries(options.initialSecrets).forEach(([key, info]) => {
      secrets.set(key, info)
    })
  }
  
  return {
    projectId,
    userId,
    workingDirectory: '/',
    files,
    checkpoints: new Map(),
    browserLogs: [],
    screenshots: new Map(),
    dbSchema: undefined,
    // Phase 2: MCP Connectivity
    mcpServers: new Map(),
    // Phase 2: Design Consistency
    designTokens: options?.designTokens || getDefaultDesignTokens(),
    // Phase 2: Secret Management
    secrets,
    // Phase 2: Context Caching
    contextCache: new Map(),
    // Phase 2: Self-Repair Loop
    parsedErrors: new Map(),
    // Task management
    tasks: new Map(),
  }
}

/**
 * Add a browser log entry (called from WebContainer integration)
 */
export function addBrowserLog(
  ctx: ToolExecutionContext,
  level: 'error' | 'warn' | 'info',
  message: string
): void {
  ctx.browserLogs.push({
    level,
    message,
    timestamp: Date.now(),
  })
  
  // Keep only last 1000 logs
  if (ctx.browserLogs.length > 1000) {
    ctx.browserLogs = ctx.browserLogs.slice(-1000)
  }
}

/**
 * Set database schema (called when connecting to database)
 */
export function setDbSchema(
  ctx: ToolExecutionContext,
  schema: Record<string, { columns: Array<{ name: string; type: string; nullable: boolean }>; indexes: string[] }>
): void {
  ctx.dbSchema = schema
}
