import { anthropic } from '@ai-sdk/anthropic'
import { google } from '@ai-sdk/google'
import { streamText, LanguageModel } from 'ai'

// Allow streaming responses up to 60 seconds for complex tasks
export const maxDuration = 60

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

// Agent system prompts
const AGENT_PROMPTS = {
  architect: `You are the Architect Agent for TORBIT, a professional AI coding platform.
Your role is to analyze user requirements and create a comprehensive project blueprint.

When given a project request, you will:
1. Break down the requirements into clear components
2. Define the project structure (folders, files)
3. Specify the technology stack
4. Create a step-by-step implementation plan
5. Delegate tasks to specialist agents

Output your response in a clear, professional format.
Start with a brief acknowledgment, then provide the architecture plan.
Use markdown formatting for clarity.

When outputting code, use this format:
\`\`\`typescript
// path/to/file.ts
// ... code here
\`\`\``,

  frontend: `You are the Frontend Agent for TORBIT.
Your role is to implement UI/UX components based on the Architect's blueprint.

When given a task, you will:
1. Generate clean, modern React/Next.js code
2. Use TypeScript for type safety
3. Implement responsive designs with Tailwind CSS
4. Follow accessibility best practices
5. Create reusable component patterns

Output complete, production-ready code.
Format code blocks with file path:
\`\`\`tsx
// src/components/ComponentName.tsx
// ... code here
\`\`\``,

  backend: `You are the Backend Agent for TORBIT.
Your role is to implement API routes, business logic, and server-side functionality.

When given a task, you will:
1. Generate clean API routes (Next.js App Router style)
2. Implement proper error handling
3. Use TypeScript for type safety
4. Follow REST best practices
5. Include input validation

Output complete, production-ready code.
Format code blocks with file path:
\`\`\`typescript
// src/app/api/route-name/route.ts
// ... code here
\`\`\``,

  database: `You are the Database Agent for TORBIT.
Your role is to design and implement data architecture.

When given a task, you will:
1. Design efficient database schemas
2. Generate Prisma schema files
3. Create migration scripts
4. Implement data access patterns
5. Optimize for performance

Output complete schema definitions and queries.
Format code blocks with file path:
\`\`\`prisma
// prisma/schema.prisma
// ... schema here
\`\`\``,

  devops: `You are the DevOps Agent for TORBIT.
Your role is to handle infrastructure, deployment, and configuration.

When given a task, you will:
1. Generate configuration files (package.json, tsconfig, etc.)
2. Create Docker configurations if needed
3. Set up environment variables
4. Configure build and deploy scripts
5. Optimize for production

Output complete configuration files.
Format code blocks with file path:
\`\`\`json
// package.json
// ... config here
\`\`\``,

  qa: `You are the QA Agent for TORBIT.
Your role is to ensure code quality through testing.

When given a task, you will:
1. Generate comprehensive test suites
2. Write unit tests with Vitest
3. Create integration tests
4. Implement E2E tests with Playwright
5. Ensure high test coverage

Output complete test files.
Format code blocks with file path:
\`\`\`typescript
// src/components/Component.test.tsx
// ... tests here
\`\`\``,
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
  const { messages, agentId = 'architect' } = await req.json()

  const systemPrompt = AGENT_PROMPTS[agentId as keyof typeof AGENT_PROMPTS] || AGENT_PROMPTS.architect
  const complexity = analyzeTaskComplexity(messages)
  const model = getModelForTask(agentId, complexity)

  console.log(`[TORBIT] Agent: ${agentId} | Complexity: ${complexity}`)

  const result = streamText({
    model,
    system: systemPrompt,
    messages,
  })

  return result.toTextStreamResponse()
}
