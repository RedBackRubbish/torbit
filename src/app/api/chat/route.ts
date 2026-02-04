import { anthropic } from '@ai-sdk/anthropic'
import { google } from '@ai-sdk/google'
import { streamText, LanguageModel, stepCountIs } from 'ai'
import { AGENT_TOOLS, AgentId } from '@/lib/tools/definitions'
import { executeTool, createExecutionContext } from '@/lib/tools/executor'

// Import rich agent prompts
import { ARCHITECT_SYSTEM_PROMPT } from '@/lib/agents/prompts/architect'
import { FRONTEND_SYSTEM_PROMPT } from '@/lib/agents/prompts/frontend'
import { DEVOPS_SYSTEM_PROMPT } from '@/lib/agents/prompts/devops'
import { QA_SYSTEM_PROMPT } from '@/lib/agents/prompts/qa'
import { AUDITOR_SYSTEM_PROMPT } from '@/lib/agents/prompts/auditor'
import { PLANNER_SYSTEM_PROMPT } from '@/lib/agents/prompts/planner'

// Allow streaming responses up to 120 seconds for tool-heavy tasks
export const maxDuration = 120

// Model configuration - map agents to optimal models
type ModelProvider = 'claude-opus' | 'claude-sonnet' | 'gemini-pro' | 'gemini-flash'

// Model instances - consistent with orchestrator
const MODELS: Record<ModelProvider, () => LanguageModel> = {
  'claude-opus': () => anthropic('claude-sonnet-4-20250514'), // Sonnet as Opus proxy until Opus available
  'claude-sonnet': () => anthropic('claude-sonnet-4-20250514'),
  'gemini-pro': () => google('gemini-2.5-pro-preview-06-05'),
  'gemini-flash': () => google('gemini-2.0-flash'),
}

// Agent to model mapping - optimized for cost/performance
const AGENT_MODEL_MAP: Record<string, ModelProvider> = {
  architect: 'claude-opus',      // Best reasoning for system design
  frontend: 'claude-sonnet',     // Great for React/Next.js UI code
  backend: 'claude-sonnet',      // Strong API design
  database: 'gemini-pro',        // Analytical schema design
  devops: 'gemini-flash',        // Config files are templated, speed matters
  qa: 'gemini-flash',            // Test generation is formulaic, high volume
  planner: 'claude-sonnet',      // Ticket management needs reasoning
  auditor: 'claude-opus',        // Hostile QA needs best model
}

// Rich agent system prompts - the sophisticated ones with tool awareness
const AGENT_PROMPTS: Record<string, string> = {
  architect: ARCHITECT_SYSTEM_PROMPT,
  frontend: FRONTEND_SYSTEM_PROMPT,
  backend: `You are THE BACKEND AGENT for TORBIT.
Your role is to implement API routes, server actions, and server-side logic.

## TOOLS AT YOUR DISPOSAL
You have access to powerful tools - USE THEM! Don't just describe what you would do.

When given a task:
1. Use 'think' to design your API structure
2. Use 'readFile' to understand existing code patterns
3. Use 'createFile' to generate new API routes
4. Use 'editFile' to modify existing endpoints
5. Use 'runTests' to verify your implementation
6. Use 'searchCode' to find related code

## CODE STANDARDS
- Next.js App Router API routes (route.ts files)
- TypeScript with strict types
- Zod for request/response validation
- Proper error handling with status codes
- Edge runtime where possible for performance

Always show your work through tool calls.`,

  database: `You are THE DATABASE AGENT for TORBIT.
Your role is to design schemas, write migrations, and optimize queries.

## TOOLS AT YOUR DISPOSAL
When given a task:
1. Use 'think' to design your schema
2. Use 'inspectSchema' to understand existing database structure
3. Use 'createFile' to generate Prisma schemas
4. Use 'editFile' to modify existing schemas
5. Use 'runSqlQuery' to test queries (READ ONLY)
6. Use 'runCommand' to run migrations

## STANDARDS
- Prisma ORM with PostgreSQL
- Proper indexing for query performance
- Normalized schemas with clear relationships
- Migration files for all changes

Never hallucinate columns - use inspectSchema first.`,

  devops: DEVOPS_SYSTEM_PROMPT,
  qa: QA_SYSTEM_PROMPT,
  planner: PLANNER_SYSTEM_PROMPT,
  auditor: AUDITOR_SYSTEM_PROMPT,
}

// Task complexity analyzer - route to appropriate model
function analyzeTaskComplexity(messages: Array<{ role: string; content: string }>): 'high' | 'medium' | 'low' {
  const lastMessage = messages[messages.length - 1]?.content || ''
  const wordCount = lastMessage.split(/\s+/).length
  
  // High complexity indicators
  const highComplexityKeywords = ['refactor', 'architecture', 'design system', 'complex', 'optimize', 'performance', 'audit', 'review']
  const hasHighComplexity = highComplexityKeywords.some(kw => lastMessage.toLowerCase().includes(kw))
  
  if (hasHighComplexity || wordCount > 200) return 'high'
  if (wordCount > 50) return 'medium'
  return 'low'
}

// Get optimal model for agent and task
function getModelForTask(agentId: string, complexity: 'high' | 'medium' | 'low'): LanguageModel {
  // Override for high complexity tasks - use premium model
  if (complexity === 'high' && agentId !== 'architect' && agentId !== 'auditor') {
    return MODELS['claude-sonnet']()
  }
  
  const modelProvider = AGENT_MODEL_MAP[agentId] || 'claude-sonnet'
  return MODELS[modelProvider]()
}

// Response with tool call metadata for UI streaming
interface StreamChunk {
  type: 'text' | 'tool-call' | 'tool-result' | 'error' | 'usage'
  content?: string
  toolCall?: {
    id: string
    name: string
    args: Record<string, unknown>
  }
  toolResult?: {
    id: string
    success: boolean
    output: string
    duration: number
  }
  usage?: {
    inputTokens: number
    outputTokens: number
    estimatedCost: number
  }
  error?: string
}

export async function POST(req: Request) {
  try {
    const { messages, agentId = 'architect', projectId = 'default', userId = 'anonymous' } = await req.json()

    const systemPrompt = AGENT_PROMPTS[agentId] || AGENT_PROMPTS.architect
    const complexity = analyzeTaskComplexity(messages)
    const model = getModelForTask(agentId, complexity)
    
    // Get tools for this agent
    const agentTools = AGENT_TOOLS[agentId as AgentId] || AGENT_TOOLS.architect
    
    // Create execution context for tools - persists across this request
    const executionContext = createExecutionContext(projectId, userId)

    console.log(`[TORBIT] Agent: ${agentId} | Complexity: ${complexity} | Tools: ${Object.keys(agentTools).length}`)

    // Create a TransformStream for custom streaming with tool execution
    const encoder = new TextEncoder()
    
    const stream = new ReadableStream({
      async start(controller) {
        const sendChunk = (chunk: StreamChunk) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`))
        }

        try {
          const result = await streamText({
            model,
            system: systemPrompt,
            messages,
            tools: agentTools,
            stopWhen: stepCountIs(15), // Prevent infinite loops
            onStepFinish: async (step) => {
              // Execute and stream tool calls
              if (step.toolCalls) {
                for (const tc of step.toolCalls) {
                  // Send tool call start to UI
                  sendChunk({
                    type: 'tool-call',
                    toolCall: {
                      id: tc.toolCallId,
                      name: tc.toolName,
                      args: (tc as { input?: Record<string, unknown> }).input ?? {},
                    },
                  })

                  // Execute the tool
                  const toolStart = Date.now()
                  const toolInput = (tc as { input?: Record<string, unknown> }).input ?? {}
                  const toolResult = await executeTool(
                    tc.toolName as keyof typeof agentTools,
                    toolInput,
                    executionContext
                  )

                  // Send tool result to UI
                  sendChunk({
                    type: 'tool-result',
                    toolResult: {
                      id: tc.toolCallId,
                      success: toolResult.success,
                      output: toolResult.output,
                      duration: Date.now() - toolStart,
                    },
                  })
                }
              }
            },
          })

          // Stream the text response
          let totalText = ''
          for await (const chunk of result.textStream) {
            totalText += chunk
            sendChunk({ type: 'text', content: chunk })
          }

          // Send usage metrics at the end
          const usage = await result.usage
          if (usage) {
            // AI SDK v6 uses totalTokens, promptTokens may not exist
            const inputTokens = (usage as { promptTokens?: number }).promptTokens || 0
            const outputTokens = (usage as { completionTokens?: number }).completionTokens || 0
            
            // Estimate cost (rough pricing)
            const inputCost = (inputTokens / 1000) * 0.003 // ~$3/M input
            const outputCost = (outputTokens / 1000) * 0.015 // ~$15/M output
            
            sendChunk({
              type: 'usage',
              usage: {
                inputTokens,
                outputTokens,
                estimatedCost: inputCost + outputCost,
              },
            })
          }

          controller.close()
        } catch (error) {
          console.error('[TORBIT] Stream error:', error)
          
          // Classify the error
          let errorMessage = 'Unknown error occurred'
          if (error instanceof Error) {
            if (error.message.includes('API key') || error.message.includes('authentication')) {
              errorMessage = 'API key not configured. Please add your ANTHROPIC_API_KEY or GOOGLE_API_KEY to environment variables.'
            } else if (error.message.includes('rate limit') || error.message.includes('429')) {
              errorMessage = 'Rate limited. Please wait a moment and try again.'
            } else if (error.message.includes('context length') || error.message.includes('too long')) {
              errorMessage = 'Message too long. Try breaking your request into smaller parts.'
            } else {
              errorMessage = error.message
            }
          }
          
          sendChunk({ type: 'error', error: errorMessage })
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('[TORBIT] Request error:', error)
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to process request' 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
