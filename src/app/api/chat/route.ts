import { anthropic } from '@ai-sdk/anthropic'
import { google } from '@ai-sdk/google'
import { streamText, LanguageModel } from 'ai'
import { AGENT_TOOLS, AgentId } from '@/lib/tools/definitions'
import { executeTool, createExecutionContext, ToolResult } from '@/lib/tools/executor'

// Allow streaming responses up to 120 seconds for tool-heavy tasks
export const maxDuration = 120

// Model configuration - map agents to optimal models
type ModelProvider = 'claude-opus' | 'claude-sonnet' | 'gemini-pro' | 'gemini-flash' | 'kimi'

interface ModelConfig {
  provider: ModelProvider
  model: LanguageModel
  description: string
  costTier: 'premium' | 'standard' | 'economy'
}

// Model instances
const MODELS: Record<ModelProvider, () => LanguageModel> = {
  'claude-opus': () => anthropic('claude-opus-4-20250514'),
  'claude-sonnet': () => anthropic('claude-sonnet-4-20250514'),
  'gemini-pro': () => google('gemini-2.5-pro-preview-06-05'),
  'gemini-flash': () => google('gemini-2.5-flash-preview-05-20'),
  // Kimi uses OpenAI-compatible API
  'kimi': () => anthropic('claude-sonnet-4-20250514'), // Fallback until Kimi SDK integrated
}

// Agent to model mapping - optimized for cost/performance
const AGENT_MODEL_MAP: Record<string, ModelProvider> = {
  architect: 'claude-opus',      // Best reasoning for system design
  frontend: 'claude-sonnet',     // Great for React/Next.js UI code
  backend: 'gemini-pro',         // Strong API design, cost-effective
  database: 'gemini-pro',        // Analytical schema design
  devops: 'gemini-flash',        // Config files are templated, speed matters
  qa: 'gemini-flash',            // Test generation is formulaic, high volume
}

// Agent system prompts - now with tool awareness
const AGENT_PROMPTS = {
  architect: `You are the Architect Agent for TORBIT, a professional AI coding platform.
Your role is to analyze user requirements and create a comprehensive project blueprint.

You have access to tools - USE THEM! Don't just describe what you would do, actually do it.

When given a project request:
1. Use the 'think' tool to reason through the problem
2. Use 'planSteps' to create a visible implementation plan
3. Use 'getFileTree' to understand existing project structure
4. Use 'delegateToAgent' to assign tasks to specialist agents
5. Use 'readFile' to examine existing code when needed

Always use tools to show your work. Users can see your tool calls in real-time.`,

  frontend: `You are the Frontend Agent for TORBIT.
Your role is to implement UI/UX components.

You have access to tools - USE THEM to create and modify files!

When given a task:
1. Use 'think' to plan your approach
2. Use 'readFile' to understand existing code
3. Use 'createFile' to generate new components
4. Use 'editFile' to modify existing files
5. Use 'installPackage' if new dependencies are needed
6. Use 'runCommand' to verify your changes

Generate clean React/Next.js code with TypeScript and Tailwind CSS.`,

  backend: `You are the Backend Agent for TORBIT.
Your role is to implement API routes and server-side logic.

You have access to tools - USE THEM!

When given a task:
1. Use 'think' to design your API
2. Use 'createFile' to generate route handlers
3. Use 'editFile' to modify existing APIs
4. Use 'runTests' to verify your implementation
5. Use 'searchCode' to find related code

Generate clean Next.js App Router API routes with proper error handling.`,

  database: `You are the Database Agent for TORBIT.
Your role is to design and implement data architecture.

You have access to tools - USE THEM!

When given a task:
1. Use 'think' to design your schema
2. Use 'createFile' to generate Prisma schemas
3. Use 'editFile' to modify existing schemas
4. Use 'runCommand' to run migrations

Generate efficient, well-indexed database schemas.`,

  devops: `You are the DevOps Agent for TORBIT.
Your role is to handle infrastructure and deployment.

You have access to tools - USE THEM!

When given a task:
1. Use 'think' to plan your configuration
2. Use 'createFile' for config files
3. Use 'installPackage' for dependencies
4. Use 'deployPreview' to create deployments
5. Use 'checkDeployStatus' to monitor progress

Generate production-ready configurations.`,

  qa: `You are the QA Agent for TORBIT.
Your role is to ensure code quality through testing.

You have access to tools - USE THEM!

When given a task:
1. Use 'think' to plan your test strategy
2. Use 'readFile' to understand code to test
3. Use 'createFile' to generate test files
4. Use 'runTests' to execute tests
5. Use 'searchCode' to find untested code

Generate comprehensive test suites with Vitest.`,
}

// Task complexity analyzer - route to appropriate model
function analyzeTaskComplexity(messages: Array<{ role: string; content: string }>): 'high' | 'medium' | 'low' {
  const lastMessage = messages[messages.length - 1]?.content || ''
  const wordCount = lastMessage.split(/\s+/).length
  
  // High complexity indicators
  const highComplexityKeywords = ['refactor', 'architecture', 'design system', 'complex', 'optimize', 'performance']
  const hasHighComplexity = highComplexityKeywords.some(kw => lastMessage.toLowerCase().includes(kw))
  
  if (hasHighComplexity || wordCount > 200) return 'high'
  if (wordCount > 50) return 'medium'
  return 'low'
}

// Get optimal model for agent and task
function getModelForTask(agentId: string, complexity: 'high' | 'medium' | 'low'): LanguageModel {
  // Override for high complexity tasks - use premium model
  if (complexity === 'high' && agentId !== 'architect') {
    return MODELS['claude-sonnet']()
  }
  
  const modelProvider = AGENT_MODEL_MAP[agentId] || 'claude-sonnet'
  return MODELS[modelProvider]()
}

export async function POST(req: Request) {
  const { messages, agentId = 'architect', projectId = 'default', userId = 'anonymous' } = await req.json()

  const systemPrompt = AGENT_PROMPTS[agentId as keyof typeof AGENT_PROMPTS] || AGENT_PROMPTS.architect
  const complexity = analyzeTaskComplexity(messages)
  const model = getModelForTask(agentId, complexity)
  
  // Get tools for this agent
  const agentTools = AGENT_TOOLS[agentId as AgentId] || AGENT_TOOLS.architect
  
  // Create execution context for tools
  const executionContext = createExecutionContext(projectId, userId)

  console.log(`[TORBIT] Agent: ${agentId} | Complexity: ${complexity} | Tools: ${Object.keys(agentTools).length}`)

  const result = streamText({
    model,
    system: systemPrompt,
    messages,
    tools: agentTools,
  })

  // Return with tool call streaming enabled
  return result.toTextStreamResponse()
}
