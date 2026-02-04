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
} as const

// ============================================
// AGENT TOOL ACCESS
// ============================================

// Agent-specific tool access
export const AGENT_TOOLS = {
  architect: {
    think: TOOL_DEFINITIONS.think,
    planSteps: TOOL_DEFINITIONS.planSteps,
    getFileTree: TOOL_DEFINITIONS.getFileTree,
    readFile: TOOL_DEFINITIONS.readFile,
    searchCode: TOOL_DEFINITIONS.searchCode,
    analyzeDependencies: TOOL_DEFINITIONS.analyzeDependencies,
    delegateToAgent: TOOL_DEFINITIONS.delegateToAgent,
    fetchDocumentation: TOOL_DEFINITIONS.fetchDocumentation,
  },
  frontend: {
    think: TOOL_DEFINITIONS.think,
    createFile: TOOL_DEFINITIONS.createFile,
    editFile: TOOL_DEFINITIONS.editFile,
    readFile: TOOL_DEFINITIONS.readFile,
    listFiles: TOOL_DEFINITIONS.listFiles,
    searchCode: TOOL_DEFINITIONS.searchCode,
    runCommand: TOOL_DEFINITIONS.runCommand,
    installPackage: TOOL_DEFINITIONS.installPackage,
    fetchDocumentation: TOOL_DEFINITIONS.fetchDocumentation,
  },
  backend: {
    think: TOOL_DEFINITIONS.think,
    createFile: TOOL_DEFINITIONS.createFile,
    editFile: TOOL_DEFINITIONS.editFile,
    readFile: TOOL_DEFINITIONS.readFile,
    listFiles: TOOL_DEFINITIONS.listFiles,
    searchCode: TOOL_DEFINITIONS.searchCode,
    runCommand: TOOL_DEFINITIONS.runCommand,
    runTests: TOOL_DEFINITIONS.runTests,
    installPackage: TOOL_DEFINITIONS.installPackage,
    fetchDocumentation: TOOL_DEFINITIONS.fetchDocumentation,
  },
  database: {
    think: TOOL_DEFINITIONS.think,
    createFile: TOOL_DEFINITIONS.createFile,
    editFile: TOOL_DEFINITIONS.editFile,
    readFile: TOOL_DEFINITIONS.readFile,
    runCommand: TOOL_DEFINITIONS.runCommand,
    searchCode: TOOL_DEFINITIONS.searchCode,
    fetchDocumentation: TOOL_DEFINITIONS.fetchDocumentation,
  },
  devops: {
    think: TOOL_DEFINITIONS.think,
    createFile: TOOL_DEFINITIONS.createFile,
    editFile: TOOL_DEFINITIONS.editFile,
    readFile: TOOL_DEFINITIONS.readFile,
    listFiles: TOOL_DEFINITIONS.listFiles,
    runCommand: TOOL_DEFINITIONS.runCommand,
    installPackage: TOOL_DEFINITIONS.installPackage,
    deployPreview: TOOL_DEFINITIONS.deployPreview,
    checkDeployStatus: TOOL_DEFINITIONS.checkDeployStatus,
    analyzeDependencies: TOOL_DEFINITIONS.analyzeDependencies,
  },
  qa: {
    think: TOOL_DEFINITIONS.think,
    createFile: TOOL_DEFINITIONS.createFile,
    editFile: TOOL_DEFINITIONS.editFile,
    readFile: TOOL_DEFINITIONS.readFile,
    runTests: TOOL_DEFINITIONS.runTests,
    searchCode: TOOL_DEFINITIONS.searchCode,
    runCommand: TOOL_DEFINITIONS.runCommand,
  },
} as const

export type ToolName = keyof typeof TOOL_DEFINITIONS
export type AgentId = keyof typeof AGENT_TOOLS
