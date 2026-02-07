import { z } from 'zod'

/**
 * TORBIT Agent Tools
 * 
 * Tool definitions for all agents. These tools are streamed to the UI
 * so users can see exactly what the agent is doing in real-time.
 */

// ============================================
// TOOL SCHEMAS (Zod definitions)
// ============================================

// File Operations
export const createFileSchema = z.object({
  path: z.string().describe('The file path relative to project root (e.g., "src/components/Button.tsx")'),
  content: z.string().describe('The complete file content to write'),
  description: z.string().optional().describe('Brief description of what this file does'),
})

export const editFileSchema = z.object({
  path: z.string().describe('The file path to edit'),
  oldContent: z.string().describe('The exact content to find and replace'),
  newContent: z.string().describe('The new content to replace with'),
  description: z.string().optional().describe('Brief description of the change'),
})

export const readFileSchema = z.object({
  path: z.string().describe('The file path to read'),
})

export const deleteFileSchema = z.object({
  path: z.string().describe('The file path to delete'),
  reason: z.string().optional().describe('Why this file is being deleted'),
})

export const listFilesSchema = z.object({
  path: z.string().default('.').describe('Directory path to list (default: project root)'),
  recursive: z.boolean().default(false).describe('Whether to list recursively'),
})

// Terminal Operations
export const runCommandSchema = z.object({
  command: z.string().describe('The command to execute'),
  description: z.string().optional().describe('What this command does'),
})

export const runTestsSchema = z.object({
  testPath: z.string().optional().describe('Specific test file or pattern to run'),
  watch: z.boolean().default(false).describe('Run in watch mode'),
})

export const installPackageSchema = z.object({
  packageName: z.string().describe('Package name (e.g., "lodash" or "lodash@4.17.21")'),
  isDev: z.boolean().default(false).describe('Install as devDependency'),
})

// Search & Analysis
export const searchCodeSchema = z.object({
  query: z.string().describe('Search query (supports regex)'),
  filePattern: z.string().optional().describe('Glob pattern to filter files (e.g., "*.tsx")'),
})

export const getFileTreeSchema = z.object({
  maxDepth: z.number().default(5).describe('Maximum directory depth'),
  includeHidden: z.boolean().default(false).describe('Include hidden files/folders'),
})

export const analyzeDependenciesSchema = z.object({
  checkUpdates: z.boolean().default(false).describe('Check for available updates'),
  checkVulnerabilities: z.boolean().default(false).describe('Check for security vulnerabilities'),
})

// Web / Research
export const fetchDocumentationSchema = z.object({
  url: z.string().url().describe('The documentation URL to fetch'),
  selector: z.string().optional().describe('CSS selector to extract specific content'),
})

export const searchWebSchema = z.object({
  query: z.string().describe('Search query'),
  site: z.string().optional().describe('Limit to specific site (e.g., "stackoverflow.com")'),
})

// Deployment
export const deployPreviewSchema = z.object({
  environment: z.enum(['preview', 'staging', 'production']).default('preview'),
  branch: z.string().optional().describe('Git branch to deploy'),
})

export const checkDeployStatusSchema = z.object({
  deploymentId: z.string().describe('The deployment ID to check'),
})

// ============================================
// CLOSER TOOLS - Ship to Production
// ============================================

// DEPLOY TO PRODUCTION (Actually ship to Vercel/Netlify)
export const deployToProductionSchema = z.object({
  provider: z.enum(['vercel', 'netlify', 'railway']).default('vercel').describe('Deployment platform'),
  projectName: z.string().describe('Name for the deployed project'),
  environmentVariables: z.record(z.string(), z.string()).optional().describe('Environment variables to set'),
  framework: z.enum(['sveltekit', 'nextjs', 'vite', 'remix', 'astro', 'auto']).default('sveltekit').describe('Framework preset'),
  buildCommand: z.string().optional().describe('Custom build command'),
  outputDirectory: z.string().optional().describe('Build output directory'),
  region: z.string().optional().describe('Preferred deployment region'),
})

// SYNC TO GITHUB (Push code and open PR)
export const syncToGithubSchema = z.object({
  operation: z.enum(['init', 'push', 'pull-request', 'status']).describe('Git operation to perform'),
  repoName: z.string().optional().describe('Repository name (for init)'),
  private: z.boolean().default(true).describe('Create private repository'),
  commitMessage: z.string().optional().describe('Commit message for push'),
  branch: z.string().default('main').describe('Branch to push to'),
  prTitle: z.string().optional().describe('Pull request title (for pull-request)'),
  prDescription: z.string().optional().describe('Pull request description'),
  baseBranch: z.string().default('main').describe('Base branch for PR'),
})

// GENERATE DESIGN SYSTEM (Dynamic theming from prompt)
export const generateDesignSystemSchema = z.object({
  style: z.enum(['corporate', 'playful', 'brutalist', 'minimal', 'luxury', 'tech', 'organic', 'custom']).describe('Design aesthetic'),
  primaryColor: z.string().optional().describe('Primary brand color (hex, e.g., "#3B82F6")'),
  mode: z.enum(['light', 'dark', 'both']).default('both').describe('Color mode support'),
  customPrompt: z.string().optional().describe('Additional style description (e.g., "Pink cupcake bakery, warm and inviting")'),
  outputFormat: z.enum(['css-variables', 'tailwind', 'design-tokens-json']).default('css-variables'),
  applyImmediately: z.boolean().default(true).describe('Apply to globals.css immediately'),
})

// Reasoning
export const thinkSchema = z.object({
  thought: z.string().describe('Your current thought or reasoning step'),
})

export const planStepsSchema = z.object({
  goal: z.string().describe('The goal to accomplish'),
  steps: z.array(z.object({
    step: z.number(),
    action: z.string(),
    tool: z.string().optional(),
  })).describe('Ordered list of steps'),
})

// Agent Delegation
export const delegateToAgentSchema = z.object({
  agentId: z.enum(['frontend', 'backend', 'database', 'devops', 'qa']),
  task: z.string().describe('The task to delegate'),
  context: z.string().optional().describe('Additional context for the agent'),
})

// Task Management
export const manageTaskSchema = z.object({
  operation: z.enum(['add', 'update', 'complete', 'delete', 'list']).describe('Task operation to perform'),
  taskId: z.string().optional().describe('Task ID (for update/complete/delete)'),
  title: z.string().optional().describe('Task title (for add)'),
  description: z.string().optional().describe('Task description (for add/update)'),
  status: z.enum(['not-started', 'in-progress', 'completed', 'blocked']).optional().describe('Task status'),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional().describe('Task priority'),
})

// ============================================
// GOD-TIER TOOLS - Vision, Safety, Database
// ============================================

// VISION TOOLS (Eyes - See the actual UI)
export const captureScreenshotSchema = z.object({
  selector: z.string().optional().describe('CSS selector to capture specific element (default: full page)'),
  viewport: z.object({
    width: z.number().default(1280),
    height: z.number().default(720),
  }).optional().describe('Viewport size for screenshot'),
  description: z.string().optional().describe('What you expect to see'),
})

export const analyzeVisualSchema = z.object({
  screenshotId: z.string().describe('ID of screenshot to analyze'),
  prompt: z.string().describe('What to look for (e.g., "Is the button centered?", "Check color contrast")'),
})

export const getBrowserLogsSchema = z.object({
  level: z.enum(['error', 'warn', 'info', 'all']).default('error').describe('Log level to retrieve'),
  limit: z.number().default(50).describe('Maximum number of log entries'),
})

// DATABASE TOOLS (Prevent hallucinated columns)
export const inspectSchemaSchema = z.object({
  table: z.string().optional().describe('Specific table to inspect (default: all tables)'),
  includeIndexes: z.boolean().default(false).describe('Include index information'),
  includeRelations: z.boolean().default(true).describe('Include foreign key relationships'),
})

export const runSqlQuerySchema = z.object({
  query: z.string().describe('READ-ONLY SQL query (SELECT only, no mutations)'),
  limit: z.number().default(10).describe('Maximum rows to return'),
})

// SAFETY TOOLS (Time Travel - Undo mistakes)
export const createCheckpointSchema = z.object({
  name: z.string().describe('Descriptive name for checkpoint (e.g., "before-refactor")'),
  reason: z.string().optional().describe('Why this checkpoint is being created'),
})

export const rollbackToCheckpointSchema = z.object({
  checkpointId: z.string().describe('ID of checkpoint to rollback to'),
  confirm: z.boolean().describe('Must be true to confirm rollback'),
})

export const listCheckpointsSchema = z.object({
  limit: z.number().default(10).describe('Number of checkpoints to list'),
})

// BETTER EDITING (Surgical precision with unified diff)
export const applyPatchSchema = z.object({
  path: z.string().describe('The file path to patch'),
  patch: z.string().describe('Unified diff format patch (like git diff output)'),
  description: z.string().optional().describe('What this patch does'),
})

// ============================================
// PHASE 2: MOAT TOOLS - Connectivity, Consistency, Secrets, Reliability
// ============================================

// MCP CONNECTIVITY (Skeleton Key - Infinite extensibility)
export const connectMcpServerSchema = z.object({
  serverUrl: z.string().url().describe('URL of the MCP server to connect to'),
  serverName: z.string().describe('Human-readable name for this server (e.g., "Stripe MCP", "Supabase MCP")'),
  authToken: z.string().optional().describe('Authentication token if required'),
})

export const listMcpToolsSchema = z.object({
  serverName: z.string().describe('Name of connected MCP server'),
})

export const invokeMcpToolSchema = z.object({
  serverName: z.string().describe('Name of the MCP server'),
  toolName: z.string().describe('Name of the tool to invoke'),
  arguments: z.record(z.string(), z.unknown()).describe('Arguments to pass to the MCP tool'),
})

// DESIGN CONSISTENCY (Vibe Guard - Prevent drift)
export const consultDesignTokensSchema = z.object({
  category: z.enum(['colors', 'typography', 'spacing', 'borders', 'shadows', 'animations', 'all']).default('all'),
  query: z.string().optional().describe('Search for specific token (e.g., "primary", "heading")'),
})

export const validateStyleSchema = z.object({
  proposedStyles: z.string().describe('The CSS/Tailwind classes being proposed'),
  component: z.string().describe('Component name for context'),
})

// SECRET MANAGEMENT (Secret Keeper - Secure environment)
export const listSecretsSchema = z.object({
  showValues: z.boolean().default(false).describe('Show masked values (never shows full secrets)'),
})

export const getSecretSchema = z.object({
  key: z.string().describe('The secret key to retrieve (e.g., "STRIPE_SECRET_KEY")'),
})

export const requireSecretSchema = z.object({
  key: z.string().describe('The secret key that is required'),
  description: z.string().describe('Human-readable description of what this secret is for'),
  example: z.string().optional().describe('Example format (e.g., "sk_live_...")'),
})

// PACKAGE VALIDATION (Dependency Sherlock - Prevent module not found)
export const verifyPackageSchema = z.object({
  packageName: z.string().describe('Package name to verify'),
  version: z.string().optional().describe('Specific version to check'),
})

export const checkPeerDependenciesSchema = z.object({
  packageName: z.string().describe('Package to check peer dependencies for'),
})

// SELF-REPAIR (Error Recovery Loop)
export const parseErrorSchema = z.object({
  errorOutput: z.string().describe('The error output from terminal or browser'),
  source: z.enum(['terminal', 'browser', 'build', 'runtime']).describe('Where the error came from'),
})

export const suggestFixSchema = z.object({
  errorId: z.string().describe('ID of the parsed error'),
  autoApply: z.boolean().default(false).describe('Automatically apply the suggested fix'),
})

// CONTEXT CACHING (Prompt Caching for "infinite memory")
export const cacheContextSchema = z.object({
  key: z.string().describe('Cache key (e.g., "design-system", "schema", "package-json")'),
  content: z.string().describe('Content to cache'),
  ttl: z.number().default(3600).describe('Time-to-live in seconds'),
})

export const getCachedContextSchema = z.object({
  key: z.string().describe('Cache key to retrieve'),
})

// ============================================
// PHASE 3: GOD-MODE TOOLS (Production Reality)
// ============================================

// VISUAL REGRESSION (Reality Check - catch the "uncanny valley")
export const verifyVisualMatchSchema = z.object({
  url: z.string().default('http://localhost:5173').describe('URL to capture'),
  selector: z.string().optional().describe('CSS selector to focus on (e.g., ".hero-section")'),
  compareWith: z.enum(['design-tokens', 'previous-snapshot', 'figma-export']).default('design-tokens'),
  strict: z.boolean().default(false).describe('Fail on any deviation'),
})

// DOCS HUNTER (RAG on Demand - real-time library learning)
export const scrapeAndIndexDocsSchema = z.object({
  url: z.string().describe('Documentation URL to scrape and index'),
  selector: z.string().optional().describe('CSS selector to extract content (default: main content)'),
  maxDepth: z.number().default(2).describe('How many links deep to follow'),
  indexName: z.string().describe('Name for the index (e.g., "shadcn-sidebar", "next16-app-router")'),
})

export const queryIndexedDocsSchema = z.object({
  indexName: z.string().describe('Name of the indexed docs'),
  query: z.string().describe('Natural language query'),
  topK: z.number().default(5).describe('Number of results to return'),
})

// SECURE ENVIRONMENT (Runtime-only injection - bypasses file system)
export const injectSecureEnvSchema = z.object({
  key: z.string().describe('Environment variable name (e.g., "SUPABASE_KEY")'),
  value: z.string().describe('The secret value (NEVER logged or stored in files)'),
  scope: z.enum(['runtime', 'build', 'both']).default('runtime'),
})

export const listEnvVarsSchema = z.object({
  showValues: z.boolean().default(false).describe('Show masked values'),
})

// LOCALHOST TUNNEL (Instant sharing - "Check out what I built")
export const openTunnelUrlSchema = z.object({
  port: z.number().default(3000).describe('Local port to expose'),
  subdomain: z.string().optional().describe('Preferred subdomain (e.g., "my-app" → my-app.torbit.dev)'),
  expiry: z.number().default(3600).describe('Tunnel lifetime in seconds'),
})

export const closeTunnelSchema = z.object({
  tunnelId: z.string().describe('ID of the tunnel to close'),
})

// HUMAN HANDSHAKE (Permission Gate - high agency requires high trust)
export const requestUserDecisionSchema = z.object({
  action: z.string().describe('What the agent wants to do'),
  reason: z.string().describe('Why this action is necessary'),
  severity: z.enum(['info', 'warning', 'danger']).default('warning'),
  options: z.array(z.object({
    label: z.string(),
    value: z.string(),
    isDefault: z.boolean().optional(),
  })).describe('Choices for the user'),
  timeout: z.number().default(60).describe('Seconds to wait for response'),
})

// ============================================
// FINAL 5: LAST MILE TOOLS (Senior Engineer Replacement)
// ============================================

// SELF-HEALING TESTER (Playwright Agent Trio: Planner → Generator → Healer)
export const runE2eCycleSchema = z.object({
  feature: z.string().describe('Feature to test (e.g., "login flow", "checkout process")'),
  testPath: z.string().optional().describe('Path for test file (default: tests/e2e/{feature}.spec.ts)'),
  healOnFailure: z.boolean().default(true).describe('Attempt to fix the test or code if it fails'),
  maxHealAttempts: z.number().default(3).describe('Maximum heal attempts before giving up'),
  takeScreenshots: z.boolean().default(true).describe('Capture screenshots on each step'),
})

export const generateTestSchema = z.object({
  feature: z.string().describe('Feature to generate test for'),
  testType: z.enum(['e2e', 'unit', 'integration']).default('e2e'),
  framework: z.enum(['playwright', 'vitest', 'jest']).default('playwright'),
})

// TICKET MASTER (Project Management Sync via MCP)
export const syncExternalTicketSchema = z.object({
  action: z.enum(['read', 'update', 'create', 'list']),
  ticketId: z.string().optional().describe('Ticket ID (e.g., "TOR-102", "PROJ-45")'),
  status: z.string().optional().describe('New status (e.g., "in-progress", "done", "blocked")'),
  comment: z.string().optional().describe('Comment to add to ticket'),
  assignee: z.string().optional().describe('Assign ticket to user'),
  title: z.string().optional().describe('Ticket title (for create)'),
  description: z.string().optional().describe('Ticket description (for create)'),
  labels: z.array(z.string()).optional().describe('Labels/tags for the ticket'),
})

export const listTicketsSchema = z.object({
  status: z.enum(['backlog', 'todo', 'in-progress', 'review', 'done', 'all']).default('in-progress'),
  assignee: z.string().optional().describe('Filter by assignee'),
  limit: z.number().default(10),
})

// DEPENDENCY TIME-MACHINE (Simulate before install)
export const verifyDependencyGraphSchema = z.object({
  packages: z.array(z.string()).describe('Packages to verify (e.g., ["react@19", "framer-motion@12"])'),
  checkPeers: z.boolean().default(true).describe('Verify peer dependency compatibility'),
  simulateInstall: z.boolean().default(true).describe('Dry-run npm install to detect conflicts'),
  suggestFixes: z.boolean().default(true).describe('Suggest version adjustments for conflicts'),
})

export const resolveConflictSchema = z.object({
  packageName: z.string().describe('Package with conflict'),
  strategy: z.enum(['downgrade', 'upgrade', 'override', 'skip']),
  targetVersion: z.string().optional().describe('Specific version to use'),
})

// ============================================
// TOOL DEFINITIONS (for AI SDK v6)
// ============================================

export const TOOL_DEFINITIONS = {
  createFile: {
    description: 'Create a new file with the specified content. Use this to generate new source files, configs, or assets.',
    inputSchema: createFileSchema,
  },
  editFile: {
    description: 'Edit an existing file by replacing specific content. Use for modifications to existing files.',
    inputSchema: editFileSchema,
  },
  readFile: {
    description: 'Read the contents of a file. Use to understand existing code before making changes.',
    inputSchema: readFileSchema,
  },
  deleteFile: {
    description: 'Delete a file from the project.',
    inputSchema: deleteFileSchema,
  },
  listFiles: {
    description: 'List all files in a directory.',
    inputSchema: listFilesSchema,
  },
  runCommand: {
    description: 'Execute a shell command in the project directory. Use for builds, installs, or other CLI operations.',
    inputSchema: runCommandSchema,
  },
  runTests: {
    description: 'Run the test suite or specific test files.',
    inputSchema: runTestsSchema,
  },
  installPackage: {
    description: 'Install an npm package as a dependency.',
    inputSchema: installPackageSchema,
  },
  searchCode: {
    description: 'Search for code patterns across the project. Use to find usages, definitions, or patterns.',
    inputSchema: searchCodeSchema,
  },
  getFileTree: {
    description: 'Get the complete project file structure as a tree.',
    inputSchema: getFileTreeSchema,
  },
  analyzeDependencies: {
    description: 'Analyze package.json dependencies for versions, vulnerabilities, or updates.',
    inputSchema: analyzeDependenciesSchema,
  },
  fetchDocumentation: {
    description: 'Fetch documentation from a URL. Use to look up API references or library docs.',
    inputSchema: fetchDocumentationSchema,
  },
  searchWeb: {
    description: 'Search the web for solutions, examples, or documentation.',
    inputSchema: searchWebSchema,
  },
  deployPreview: {
    description: 'Deploy the current project to a preview environment.',
    inputSchema: deployPreviewSchema,
  },
  checkDeployStatus: {
    description: 'Check the status of a deployment.',
    inputSchema: checkDeployStatusSchema,
  },
  deployToProduction: {
    description: 'Deploy to production on Vercel, Netlify, or Railway. Returns the live URL (https://project.vercel.app). The "Deploy" button comes to life.',
    inputSchema: deployToProductionSchema,
  },
  syncToGithub: {
    description: 'Push code to GitHub and optionally open a Pull Request. Initializes repo, commits, and creates PR for review. Users can see the diffs.',
    inputSchema: syncToGithubSchema,
  },
  generateDesignSystem: {
    description: 'Generate a complete design system (colors, typography, spacing) based on a style prompt. Transforms "corporate" or "pink cupcake bakery" into CSS variables.',
    inputSchema: generateDesignSystemSchema,
  },
  think: {
    description: 'Use this to think through a problem step by step. Your reasoning will be visible to the user.',
    inputSchema: thinkSchema,
  },
  planSteps: {
    description: 'Create a plan of steps to accomplish a task. Shows the user your approach.',
    inputSchema: planStepsSchema,
  },
  delegateToAgent: {
    description: 'Delegate a subtask to another specialized agent.',
    inputSchema: delegateToAgentSchema,
  },
  manageTask: {
    description: 'Manage tasks in the TORBIT task panel. Add tasks to track work, mark as complete, update status. Users can see your task progress visually.',
    inputSchema: manageTaskSchema,
  },
  
  // ============================================
  // GOD-TIER TOOLS
  // ============================================
  
  // VISION TOOLS (Eyes)
  captureScreenshot: {
    description: 'Capture a screenshot of the current preview. Use to SEE the actual rendered UI and verify visual correctness.',
    inputSchema: captureScreenshotSchema,
  },
  analyzeVisual: {
    description: 'Analyze a screenshot using vision AI. Check for alignment, contrast, spacing, or any visual issues.',
    inputSchema: analyzeVisualSchema,
  },
  getBrowserLogs: {
    description: 'Get browser console logs from the preview. Catches React errors, hydration mismatches, and client-side crashes that terminal misses.',
    inputSchema: getBrowserLogsSchema,
  },
  
  // DATABASE TOOLS (Prevent hallucinations)
  inspectSchema: {
    description: 'Inspect the database schema. See actual tables, columns, types, and relationships. Prevents writing code for columns that do not exist.',
    inputSchema: inspectSchemaSchema,
  },
  runSqlQuery: {
    description: 'Run a READ-ONLY SQL query to inspect data. Helps understand current state before making changes.',
    inputSchema: runSqlQuerySchema,
  },
  
  // SAFETY TOOLS (Time Travel)
  createCheckpoint: {
    description: 'Create a checkpoint before risky operations. Like git commit but for agent safety. Call this BEFORE major refactors or deletions.',
    inputSchema: createCheckpointSchema,
  },
  rollbackToCheckpoint: {
    description: 'Rollback to a previous checkpoint. Use when an edit breaks the build or causes errors. Enables try/catch at the agent level.',
    inputSchema: rollbackToCheckpointSchema,
  },
  listCheckpoints: {
    description: 'List available checkpoints for rollback.',
    inputSchema: listCheckpointsSchema,
  },
  
  // BETTER EDITING (Surgical precision)
  applyPatch: {
    description: 'Apply a unified diff patch to a file. More surgical than editFile - only changes specific lines. Preferred for editing large files.',
    inputSchema: applyPatchSchema,
  },
  
  // ============================================
  // PHASE 2: MOAT TOOLS
  // ============================================
  
  // MCP CONNECTIVITY (Skeleton Key)
  connectMcpServer: {
    description: 'Connect to an external MCP server to dynamically load tools. Enables infinite extensibility (Stripe, Supabase, GitHub, etc.).',
    inputSchema: connectMcpServerSchema,
  },
  listMcpTools: {
    description: 'List available tools from a connected MCP server.',
    inputSchema: listMcpToolsSchema,
  },
  invokeMcpTool: {
    description: 'Invoke a tool from a connected MCP server.',
    inputSchema: invokeMcpToolSchema,
  },
  
  // DESIGN CONSISTENCY (Vibe Guard)
  consultDesignTokens: {
    description: 'Consult the design system tokens. ALWAYS check this before using colors, fonts, or spacing. Prevents "vibe drift" where standard Bootstrap styles creep in.',
    inputSchema: consultDesignTokensSchema,
  },
  validateStyle: {
    description: 'Validate proposed CSS/Tailwind classes against the design system. Rejects off-brand styles and suggests correct alternatives.',
    inputSchema: validateStyleSchema,
  },
  
  // SECRET MANAGEMENT (Secret Keeper)
  listSecrets: {
    description: 'List available secrets (keys only, values masked). Use to see what API keys are configured.',
    inputSchema: listSecretsSchema,
  },
  getSecret: {
    description: 'Get a secret value for use in code. NEVER write secrets to files - inject at runtime only.',
    inputSchema: getSecretSchema,
  },
  requireSecret: {
    description: 'Declare that a secret is required. Prompts user to provide it via secure UI if not configured.',
    inputSchema: requireSecretSchema,
  },
  
  // PACKAGE VALIDATION (Dependency Sherlock)
  verifyPackage: {
    description: 'Verify a package exists on NPM before installing. Checks for deprecated warnings, latest version, and basic metadata.',
    inputSchema: verifyPackageSchema,
  },
  checkPeerDependencies: {
    description: 'Check peer dependency requirements for a package. Prevents peer dependency conflicts that cause build failures.',
    inputSchema: checkPeerDependenciesSchema,
  },
  
  // SELF-REPAIR (Error Recovery Loop)
  parseError: {
    description: 'Parse an error message to understand the root cause. Extracts file, line number, error type, and suggested fixes.',
    inputSchema: parseErrorSchema,
  },
  suggestFix: {
    description: 'Get suggested fixes for a parsed error. Can auto-apply if confident.',
    inputSchema: suggestFixSchema,
  },
  
  // CONTEXT CACHING (Infinite Memory)
  cacheContext: {
    description: 'Cache important context for prompt caching. Design tokens, schema, and package.json should be cached for 90% latency reduction.',
    inputSchema: cacheContextSchema,
  },
  getCachedContext: {
    description: 'Retrieve cached context. Faster than re-reading files.',
    inputSchema: getCachedContextSchema,
  },
  
  // ============================================
  // PHASE 3: GOD-MODE TOOLS (Production Reality)
  // ============================================
  
  // VISUAL REGRESSION (Reality Check)
  verifyVisualMatch: {
    description: 'Take a screenshot and compare against design tokens. Catches the "uncanny valley" of UI - pixel-perfect enforcement of Matrix vibe.',
    inputSchema: verifyVisualMatchSchema,
  },
  
  // DOCS HUNTER (RAG on Demand)
  scrapeAndIndexDocs: {
    description: 'Scrape and index documentation in real-time. Use when referencing a library released after training cutoff. NEVER hallucinate APIs - fetch the truth.',
    inputSchema: scrapeAndIndexDocsSchema,
  },
  queryIndexedDocs: {
    description: 'Query previously indexed documentation. Returns relevant snippets for accurate code generation.',
    inputSchema: queryIndexedDocsSchema,
  },
  
  // SECURE ENVIRONMENT (Runtime Injection)
  injectSecureEnv: {
    description: 'Inject a secret into the runtime environment ONLY. Bypasses file system - secrets NEVER appear in code window or git.',
    inputSchema: injectSecureEnvSchema,
  },
  listEnvVars: {
    description: 'List environment variables (values masked). Shows what\'s available at runtime.',
    inputSchema: listEnvVarsSchema,
  },
  
  // LOCALHOST TUNNEL (Instant Sharing)
  openTunnelUrl: {
    description: 'Create a public URL for localhost. Enables instant "Check out what I built" sharing. Returns a torbit.dev subdomain.',
    inputSchema: openTunnelUrlSchema,
  },
  closeTunnel: {
    description: 'Close an open tunnel.',
    inputSchema: closeTunnelSchema,
  },
  
  // HUMAN HANDSHAKE (Permission Gate)
  requestUserDecision: {
    description: 'REQUIRED before ANY destructive action. Pauses execution and asks user for confirmation. Use for database drops, file deletions, or irreversible operations.',
    inputSchema: requestUserDecisionSchema,
  },
  
  // ============================================
  // FINAL 5: LAST MILE TOOLS (Senior Engineer Replacement)
  // ============================================
  
  // SELF-HEALING TESTER (Playwright Agent Pattern)
  runE2eCycle: {
    description: 'Run a complete E2E test cycle: Plan → Generate → Execute → Heal. Writes Playwright tests, runs them, and auto-fixes failures. Says "I built it, tested it, and verified it passes."',
    inputSchema: runE2eCycleSchema,
  },
  generateTest: {
    description: 'Generate a test file for a feature. Supports Playwright (e2e), Vitest (unit), or Jest (integration).',
    inputSchema: generateTestSchema,
  },
  
  // TICKET MASTER (Project Management Sync)
  syncExternalTicket: {
    description: 'Sync with external project management (Linear, Jira, GitHub Issues) via MCP. Read tickets, update status, add comments. Creates a paper trail for the work.',
    inputSchema: syncExternalTicketSchema,
  },
  listTickets: {
    description: 'List tickets from connected project management tool. Filter by status or assignee.',
    inputSchema: listTicketsSchema,
  },
  
  // DEPENDENCY TIME-MACHINE (Conflict Prevention)
  verifyDependencyGraph: {
    description: 'Simulate npm install BEFORE running it. Detects version conflicts, peer dependency issues, and suggests fixes. Prevents "White Screen of Death" from package mismatches.',
    inputSchema: verifyDependencyGraphSchema,
  },
  resolveConflict: {
    description: 'Resolve a detected dependency conflict using a specified strategy (downgrade, upgrade, override, skip).',
    inputSchema: resolveConflictSchema,
  },
} as const

// ============================================
// AGENT TOOL ACCESS
// ============================================

// Agent-specific tool access
export const AGENT_TOOLS = {
  architect: {
    // Core reasoning
    think: TOOL_DEFINITIONS.think,
    // File operations - architect needs these to create files
    createFile: TOOL_DEFINITIONS.createFile,
    editFile: TOOL_DEFINITIONS.editFile,
    readFile: TOOL_DEFINITIONS.readFile,
    listFiles: TOOL_DEFINITIONS.listFiles,
    searchCode: TOOL_DEFINITIONS.searchCode,
    getFileTree: TOOL_DEFINITIONS.getFileTree,
    // Terminal for running commands
    runCommand: TOOL_DEFINITIONS.runCommand,
    installPackage: TOOL_DEFINITIONS.installPackage,
  },
  frontend: {
    // Reasoning
    think: TOOL_DEFINITIONS.think,
    // File operations
    createFile: TOOL_DEFINITIONS.createFile,
    editFile: TOOL_DEFINITIONS.editFile,
    applyPatch: TOOL_DEFINITIONS.applyPatch,
    readFile: TOOL_DEFINITIONS.readFile,
    listFiles: TOOL_DEFINITIONS.listFiles,
    searchCode: TOOL_DEFINITIONS.searchCode,
    // Terminal
    runCommand: TOOL_DEFINITIONS.runCommand,
    installPackage: TOOL_DEFINITIONS.installPackage,
    // Research
    fetchDocumentation: TOOL_DEFINITIONS.fetchDocumentation,
    // VISION (Eyes) - See the actual UI
    captureScreenshot: TOOL_DEFINITIONS.captureScreenshot,
    analyzeVisual: TOOL_DEFINITIONS.analyzeVisual,
    getBrowserLogs: TOOL_DEFINITIONS.getBrowserLogs,
    // Safety
    createCheckpoint: TOOL_DEFINITIONS.createCheckpoint,
    // PHASE 2: Design Consistency (Vibe Guard)
    consultDesignTokens: TOOL_DEFINITIONS.consultDesignTokens,
    validateStyle: TOOL_DEFINITIONS.validateStyle,
    // PHASE 2: Self-Repair
    parseError: TOOL_DEFINITIONS.parseError,
    suggestFix: TOOL_DEFINITIONS.suggestFix,
    // PHASE 2: Context
    getCachedContext: TOOL_DEFINITIONS.getCachedContext,
  },
  backend: {
    // Reasoning
    think: TOOL_DEFINITIONS.think,
    // File operations
    createFile: TOOL_DEFINITIONS.createFile,
    editFile: TOOL_DEFINITIONS.editFile,
    applyPatch: TOOL_DEFINITIONS.applyPatch,
    readFile: TOOL_DEFINITIONS.readFile,
    listFiles: TOOL_DEFINITIONS.listFiles,
    searchCode: TOOL_DEFINITIONS.searchCode,
    // Terminal
    runCommand: TOOL_DEFINITIONS.runCommand,
    runTests: TOOL_DEFINITIONS.runTests,
    installPackage: TOOL_DEFINITIONS.installPackage,
    // Research
    fetchDocumentation: TOOL_DEFINITIONS.fetchDocumentation,
    // Database
    inspectSchema: TOOL_DEFINITIONS.inspectSchema,
    runSqlQuery: TOOL_DEFINITIONS.runSqlQuery,
    // Safety
    createCheckpoint: TOOL_DEFINITIONS.createCheckpoint,
    // PHASE 2: Self-Repair
    parseError: TOOL_DEFINITIONS.parseError,
    suggestFix: TOOL_DEFINITIONS.suggestFix,
    // PHASE 2: Secrets
    getSecret: TOOL_DEFINITIONS.getSecret,
    requireSecret: TOOL_DEFINITIONS.requireSecret,
    // PHASE 2: Context
    getCachedContext: TOOL_DEFINITIONS.getCachedContext,
  },
  database: {
    // Reasoning
    think: TOOL_DEFINITIONS.think,
    // File operations
    createFile: TOOL_DEFINITIONS.createFile,
    editFile: TOOL_DEFINITIONS.editFile,
    applyPatch: TOOL_DEFINITIONS.applyPatch,
    readFile: TOOL_DEFINITIONS.readFile,
    // Terminal
    runCommand: TOOL_DEFINITIONS.runCommand,
    // Research
    searchCode: TOOL_DEFINITIONS.searchCode,
    fetchDocumentation: TOOL_DEFINITIONS.fetchDocumentation,
    // Database (Full access)
    inspectSchema: TOOL_DEFINITIONS.inspectSchema,
    runSqlQuery: TOOL_DEFINITIONS.runSqlQuery,
    // Safety
    createCheckpoint: TOOL_DEFINITIONS.createCheckpoint,
    // PHASE 2: Context Caching
    cacheContext: TOOL_DEFINITIONS.cacheContext,
    getCachedContext: TOOL_DEFINITIONS.getCachedContext,
  },
  devops: {
    // Reasoning
    think: TOOL_DEFINITIONS.think,
    // File operations
    createFile: TOOL_DEFINITIONS.createFile,
    editFile: TOOL_DEFINITIONS.editFile,
    applyPatch: TOOL_DEFINITIONS.applyPatch,
    readFile: TOOL_DEFINITIONS.readFile,
    listFiles: TOOL_DEFINITIONS.listFiles,
    // Terminal
    runCommand: TOOL_DEFINITIONS.runCommand,
    installPackage: TOOL_DEFINITIONS.installPackage,
    // Deployment
    deployPreview: TOOL_DEFINITIONS.deployPreview,
    checkDeployStatus: TOOL_DEFINITIONS.checkDeployStatus,
    deployToProduction: TOOL_DEFINITIONS.deployToProduction, // CLOSER: Actually ship to Vercel/Netlify
    syncToGithub: TOOL_DEFINITIONS.syncToGithub, // CLOSER: Push and open PRs
    analyzeDependencies: TOOL_DEFINITIONS.analyzeDependencies,
    // Safety (Full Time Travel access)
    createCheckpoint: TOOL_DEFINITIONS.createCheckpoint,
    rollbackToCheckpoint: TOOL_DEFINITIONS.rollbackToCheckpoint,
    listCheckpoints: TOOL_DEFINITIONS.listCheckpoints,
    // PHASE 2: Secret Management (Secret Keeper)
    listSecrets: TOOL_DEFINITIONS.listSecrets,
    getSecret: TOOL_DEFINITIONS.getSecret,
    requireSecret: TOOL_DEFINITIONS.requireSecret,
    // PHASE 2: Package Validation
    verifyPackage: TOOL_DEFINITIONS.verifyPackage,
    checkPeerDependencies: TOOL_DEFINITIONS.checkPeerDependencies,
    // PHASE 2: MCP (for infra integrations)
    connectMcpServer: TOOL_DEFINITIONS.connectMcpServer,
    invokeMcpTool: TOOL_DEFINITIONS.invokeMcpTool,
    // PHASE 3: Secure Environment (Runtime Injection)
    injectSecureEnv: TOOL_DEFINITIONS.injectSecureEnv,
    listEnvVars: TOOL_DEFINITIONS.listEnvVars,
    // PHASE 3: Localhost Tunnel (Instant Sharing)
    openTunnelUrl: TOOL_DEFINITIONS.openTunnelUrl,
    closeTunnel: TOOL_DEFINITIONS.closeTunnel,
  },
  qa: {
    // Reasoning
    think: TOOL_DEFINITIONS.think,
    // File operations
    createFile: TOOL_DEFINITIONS.createFile,
    editFile: TOOL_DEFINITIONS.editFile,
    applyPatch: TOOL_DEFINITIONS.applyPatch,
    readFile: TOOL_DEFINITIONS.readFile,
    // Terminal
    runTests: TOOL_DEFINITIONS.runTests,
    runCommand: TOOL_DEFINITIONS.runCommand,
    searchCode: TOOL_DEFINITIONS.searchCode,
    // VISION (Eyes) - Verify UI matches specs
    captureScreenshot: TOOL_DEFINITIONS.captureScreenshot,
    analyzeVisual: TOOL_DEFINITIONS.analyzeVisual,
    getBrowserLogs: TOOL_DEFINITIONS.getBrowserLogs,
    // Database (Read-only for verification)
    runSqlQuery: TOOL_DEFINITIONS.runSqlQuery,
    // PHASE 2: Design Validation
    consultDesignTokens: TOOL_DEFINITIONS.consultDesignTokens,
    validateStyle: TOOL_DEFINITIONS.validateStyle,
    // PHASE 2: Self-Repair
    parseError: TOOL_DEFINITIONS.parseError,
    suggestFix: TOOL_DEFINITIONS.suggestFix,
    // PHASE 3: Visual Regression (Reality Check)
    verifyVisualMatch: TOOL_DEFINITIONS.verifyVisualMatch,
    // FINAL 5: Self-Healing Tester
    runE2eCycle: TOOL_DEFINITIONS.runE2eCycle,
    generateTest: TOOL_DEFINITIONS.generateTest,
  },
  planner: {
    // Reasoning (Full control)
    think: TOOL_DEFINITIONS.think,
    planSteps: TOOL_DEFINITIONS.planSteps,
    delegateToAgent: TOOL_DEFINITIONS.delegateToAgent,
    manageTask: TOOL_DEFINITIONS.manageTask, // Task management is planner's specialty
    generateDesignSystem: TOOL_DEFINITIONS.generateDesignSystem, // CLOSER: Dynamic theming from prompt
    // File reading
    getFileTree: TOOL_DEFINITIONS.getFileTree,
    readFile: TOOL_DEFINITIONS.readFile,
    searchCode: TOOL_DEFINITIONS.searchCode,
    // Safety
    createCheckpoint: TOOL_DEFINITIONS.createCheckpoint,
    rollbackToCheckpoint: TOOL_DEFINITIONS.rollbackToCheckpoint,
    listCheckpoints: TOOL_DEFINITIONS.listCheckpoints,
    // PHASE 2: MCP (for connecting external services)
    connectMcpServer: TOOL_DEFINITIONS.connectMcpServer,
    listMcpTools: TOOL_DEFINITIONS.listMcpTools,
    invokeMcpTool: TOOL_DEFINITIONS.invokeMcpTool,
    // PHASE 3: Human Handshake (Permission Gate)
    requestUserDecision: TOOL_DEFINITIONS.requestUserDecision,
    // FINAL 5: Ticket Master
    syncExternalTicket: TOOL_DEFINITIONS.syncExternalTicket,
    listTickets: TOOL_DEFINITIONS.listTickets,
  },
  // ============================================
  // STRATEGIST (GPT-5.2) - Plan Validator
  // ============================================
  // GOVERNANCE: Strategist REVIEWS plans, never creates them.
  // This is NOT a first-mover. It validates, vetoes, or amends.
  // NO execution tools. Read-only + verdict tools only.
  strategist: {
    // Reasoning (review & validate)
    think: TOOL_DEFINITIONS.think,
    // Read-only access to understand context
    readFile: TOOL_DEFINITIONS.readFile,
    getFileTree: TOOL_DEFINITIONS.getFileTree,
    searchCode: TOOL_DEFINITIONS.searchCode,
    listFiles: TOOL_DEFINITIONS.listFiles,
    // Can inspect but not execute
    inspectSchema: TOOL_DEFINITIONS.inspectSchema,
    // Can query docs for validation
    queryIndexedDocs: TOOL_DEFINITIONS.queryIndexedDocs,
    // Can check dependencies for feasibility
    verifyDependencyGraph: TOOL_DEFINITIONS.verifyDependencyGraph,
    checkPeerDependencies: TOOL_DEFINITIONS.checkPeerDependencies,
    // NO createFile, NO editFile, NO runCommand
    // Strategist produces VERDICTS, not code
  },
  // ============================================
  // AUDITOR (Claude Opus 4.5) - Quality Gate
  // ============================================
  // GOVERNANCE: Auditor JUDGES. Auditor does NOT fix freely.
  // ❌ No endless iteration
  // ❌ No refactoring large surfaces
  // ✅ Produces verdicts + bounded recommendations
  // Read-only + vision tools. NO execution.
  auditor: {
    // Reasoning (judgment only)
    think: TOOL_DEFINITIONS.think,
    // File reading (READ-ONLY - auditor cannot write)
    readFile: TOOL_DEFINITIONS.readFile,
    listFiles: TOOL_DEFINITIONS.listFiles,
    searchCode: TOOL_DEFINITIONS.searchCode,
    getFileTree: TOOL_DEFINITIONS.getFileTree,
    // VISION (Eyes) - See and judge the UI
    captureScreenshot: TOOL_DEFINITIONS.captureScreenshot,
    analyzeVisual: TOOL_DEFINITIONS.analyzeVisual,
    getBrowserLogs: TOOL_DEFINITIONS.getBrowserLogs,
    // Design Validation (check, don't fix)
    consultDesignTokens: TOOL_DEFINITIONS.consultDesignTokens,
    validateStyle: TOOL_DEFINITIONS.validateStyle,
    // Visual Regression (verdict only)
    verifyVisualMatch: TOOL_DEFINITIONS.verifyVisualMatch,
    // Database inspection (read-only)
    inspectSchema: TOOL_DEFINITIONS.inspectSchema,
    runSqlQuery: TOOL_DEFINITIONS.runSqlQuery,
    // NO createFile, NO editFile, NO applyPatch
    // NO runCommand, NO runTests (that's QA's job)
    // NO runE2eCycle (removed - auditor judges, QA heals)
    // Auditor produces VERDICTS + RECOMMENDATIONS, not fixes
  },
} as const

// Add scrapeAndIndexDocs to architect agent
Object.assign(AGENT_TOOLS.architect, {
  // PHASE 3: Docs Hunter (RAG on Demand)
  scrapeAndIndexDocs: TOOL_DEFINITIONS.scrapeAndIndexDocs,
  queryIndexedDocs: TOOL_DEFINITIONS.queryIndexedDocs,
  // FINAL 5: Dependency Time-Machine
  verifyDependencyGraph: TOOL_DEFINITIONS.verifyDependencyGraph,
  resolveConflict: TOOL_DEFINITIONS.resolveConflict,
})

export type ToolName = keyof typeof TOOL_DEFINITIONS
export type AgentId = keyof typeof AGENT_TOOLS
