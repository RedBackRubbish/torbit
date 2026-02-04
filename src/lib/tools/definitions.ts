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
} as const

// ============================================
// AGENT TOOL ACCESS
// ============================================

// Agent-specific tool access
export const AGENT_TOOLS = {
  architect: {
    // Reasoning
    think: TOOL_DEFINITIONS.think,
    planSteps: TOOL_DEFINITIONS.planSteps,
    delegateToAgent: TOOL_DEFINITIONS.delegateToAgent,
    // File reading
    getFileTree: TOOL_DEFINITIONS.getFileTree,
    readFile: TOOL_DEFINITIONS.readFile,
    searchCode: TOOL_DEFINITIONS.searchCode,
    analyzeDependencies: TOOL_DEFINITIONS.analyzeDependencies,
    fetchDocumentation: TOOL_DEFINITIONS.fetchDocumentation,
    // Database inspection
    inspectSchema: TOOL_DEFINITIONS.inspectSchema,
    // Safety (Time Travel)
    createCheckpoint: TOOL_DEFINITIONS.createCheckpoint,
    rollbackToCheckpoint: TOOL_DEFINITIONS.rollbackToCheckpoint,
    listCheckpoints: TOOL_DEFINITIONS.listCheckpoints,
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
    analyzeDependencies: TOOL_DEFINITIONS.analyzeDependencies,
    // Safety (Full Time Travel access)
    createCheckpoint: TOOL_DEFINITIONS.createCheckpoint,
    rollbackToCheckpoint: TOOL_DEFINITIONS.rollbackToCheckpoint,
    listCheckpoints: TOOL_DEFINITIONS.listCheckpoints,
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
  },
} as const

export type ToolName = keyof typeof TOOL_DEFINITIONS
export type AgentId = keyof typeof AGENT_TOOLS
