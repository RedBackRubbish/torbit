import { streamText, stepCountIs } from 'ai'
import { AGENT_TOOLS, AgentId } from '@/lib/tools/definitions'
import { createAgentTools, createContextFromRequest } from '@/lib/tools/ai-sdk-tools'
import { 
  getModelForTask, 
  analyzeTaskComplexity, 
  calculateCost, 
  AGENT_MODEL_MAP,
  MODEL_CONFIGS,
} from '@/lib/agents/models'
import { chatRateLimiter, getClientIP, rateLimitResponse } from '@/lib/rate-limit'

// Import rich agent prompts
import { ARCHITECT_SYSTEM_PROMPT } from '@/lib/agents/prompts/architect'
import { FRONTEND_SYSTEM_PROMPT } from '@/lib/agents/prompts/frontend'
import { DEVOPS_SYSTEM_PROMPT } from '@/lib/agents/prompts/devops'
import { QA_SYSTEM_PROMPT } from '@/lib/agents/prompts/qa'
import { AUDITOR_SYSTEM_PROMPT } from '@/lib/agents/prompts/auditor'
import { PLANNER_SYSTEM_PROMPT } from '@/lib/agents/prompts/planner'
import { GOD_PROMPT } from '@/lib/agents/prompts/god-prompt'
import { getMobileSystemPrompt } from '@/lib/mobile/prompts'
import type { MobileCapabilities, MobileProjectConfig } from '@/lib/mobile/types'
import { DEFAULT_MOBILE_CONFIG } from '@/lib/mobile/types'

// Allow streaming responses up to 120 seconds for tool-heavy tasks
export const maxDuration = 120

// Combine God Prompt with agent-specific prompts
const createAgentPrompt = (agentPrompt: string) => `${GOD_PROMPT}\n\n---\n\n## AGENT-SPECIFIC INSTRUCTIONS\n\n${agentPrompt}`

// Rich agent system prompts - the sophisticated ones with tool awareness
const AGENT_PROMPTS: Record<string, string> = {
  architect: createAgentPrompt(ARCHITECT_SYSTEM_PROMPT),
  frontend: createAgentPrompt(FRONTEND_SYSTEM_PROMPT),
  backend: createAgentPrompt(`You are THE BACKEND AGENT for TORBIT.
Your role is to implement API routes, server actions, and server-side logic.

## TOOLS AT YOUR DISPOSAL
You have access to verified tools - USE THEM. Don't just describe what you would do.

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

Always show your work through tool calls.`),

  database: createAgentPrompt(`You are THE DATABASE AGENT for TORBIT.
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

Never hallucinate columns - use inspectSchema first.`),

  devops: createAgentPrompt(DEVOPS_SYSTEM_PROMPT),
  qa: createAgentPrompt(QA_SYSTEM_PROMPT),
  planner: createAgentPrompt(PLANNER_SYSTEM_PROMPT),
  auditor: createAgentPrompt(AUDITOR_SYSTEM_PROMPT),
}

// ============================================
// ERROR HANDLING
// ============================================

interface TorbitError {
  type: 'auth' | 'rate_limit' | 'context_length' | 'timeout' | 'tool_error' | 'unknown'
  message: string
  retryable: boolean
  retryAfterMs?: number
}

function classifyError(error: unknown): TorbitError {
  if (!(error instanceof Error)) {
    return { type: 'unknown', message: 'Unknown error occurred', retryable: false }
  }
  
  const msg = error.message.toLowerCase()
  
  // Credit balance / billing errors
  if (msg.includes('credit balance') || msg.includes('billing') || msg.includes('purchase credits')) {
    return {
      type: 'auth',
      message: 'API credits exhausted. The system is falling back to Gemini.',
      retryable: false,
    }
  }
  
  if (msg.includes('api key') || msg.includes('authentication') || msg.includes('unauthorized')) {
    return {
      type: 'auth',
      message: 'API key not configured. Please add ANTHROPIC_API_KEY or GOOGLE_API_KEY to environment variables.',
      retryable: false,
    }
  }
  
  if (msg.includes('rate limit') || msg.includes('429') || msg.includes('too many requests')) {
    return {
      type: 'rate_limit',
      message: 'Rate limited. Retrying in a moment...',
      retryable: true,
      retryAfterMs: 5000,
    }
  }
  
  if (msg.includes('context length') || msg.includes('too long') || msg.includes('maximum')) {
    return {
      type: 'context_length',
      message: 'Message too long. Try breaking your request into smaller parts.',
      retryable: false,
    }
  }
  
  if (msg.includes('timeout') || msg.includes('timed out')) {
    return {
      type: 'timeout',
      message: 'Request timed out. Please try again.',
      retryable: true,
      retryAfterMs: 1000,
    }
  }
  
  return {
    type: 'unknown',
    message: error.message,
    retryable: false,
  }
}

// Response with tool call metadata for UI streaming
interface StreamChunk {
  type: 'text' | 'tool-call' | 'tool-result' | 'error' | 'usage' | 'retry'
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
    provider: string
  }
  error?: {
    type: string
    message: string
    retryable: boolean
  }
  retry?: {
    attempt: number
    maxAttempts: number
    retryAfterMs: number
  }
}

// Maximum retry attempts for retryable errors
const MAX_RETRIES = 3

export async function POST(req: Request) {
  // ========================================================================
  // RATE LIMITING - Protect against abuse
  // ========================================================================
  const clientIP = getClientIP(req)
  const rateLimitResult = chatRateLimiter.check(clientIP)
  
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult)
  }

  try {
    const { 
      messages: rawMessages, 
      agentId = 'architect', 
      projectId = 'default', 
      userId = 'anonymous',
      projectType = 'web',
      capabilities = null,
    } = await req.json()

    // Filter out empty messages to prevent API errors
    const messages = rawMessages.filter((m: { content?: string }) => 
      m.content && typeof m.content === 'string' && m.content.trim().length > 0
    )

    // Ensure we have at least one message
    if (messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No valid messages provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Select prompt based on project type
    let systemPrompt: string
    if (projectType === 'mobile') {
      // Use mobile-specific prompt with capabilities
      const mobileConfig: MobileProjectConfig = {
        ...DEFAULT_MOBILE_CONFIG,
        capabilities: capabilities as MobileCapabilities || DEFAULT_MOBILE_CONFIG.capabilities,
      }
      systemPrompt = getMobileSystemPrompt(mobileConfig)
    } else {
      systemPrompt = AGENT_PROMPTS[agentId] || AGENT_PROMPTS.architect
    }
    const complexity = analyzeTaskComplexity(messages)
    const model = getModelForTask(agentId as AgentId, complexity)
    const modelProvider = AGENT_MODEL_MAP[agentId as AgentId] || 'claude-sonnet'
    
    // Create execution context for tools - persists across this request
    const executionContext = createContextFromRequest(projectId, userId)
    
    // Create AI SDK tools with execute functions for multi-step calling
    const agentTools = createAgentTools(agentId as AgentId, executionContext)

    // Create a TransformStream for custom streaming with tool execution
    const encoder = new TextEncoder()
    
    const stream = new ReadableStream({
      async start(controller) {
        const sendChunk = (chunk: StreamChunk) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`))
        }

        // Retry wrapper for transient errors
        const executeWithRetry = async (attempt = 1): Promise<void> => {
          try {
            const result = await streamText({
              model,
              system: systemPrompt,
              messages,
              tools: agentTools,
              stopWhen: stepCountIs(10), // Limited steps - AI should batch file creation in text
              onStepFinish: async (step) => {
                // Stream tool calls to UI for visibility
                if (step.toolCalls) {
                  for (const tc of step.toolCalls) {
                    // Send tool call to UI
                    sendChunk({
                      type: 'tool-call',
                      toolCall: {
                        id: tc.toolCallId,
                        name: tc.toolName,
                        args: (tc as { input?: Record<string, unknown> }).input ?? {},
                      },
                    })
                  }
                }
                
                // Stream tool results to UI
                if (step.toolResults) {
                  for (const tr of step.toolResults) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const toolResult = (tr as any).result ?? (tr as any).output ?? ''
                    const resultStr = typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult)
                    sendChunk({
                      type: 'tool-result',
                      toolResult: {
                        id: tr.toolCallId,
                        success: !resultStr.startsWith('Error:'),
                        output: resultStr,
                        duration: 0, // AI SDK handles timing internally
                      },
                    })
                  }
                }
              },
            })

            // Stream the text response
            for await (const chunk of result.textStream) {
              sendChunk({ type: 'text', content: chunk })
            }

            // Send usage metrics at the end
            const usage = await result.usage
            if (usage) {
              const inputTokens = (usage as { promptTokens?: number }).promptTokens || 0
              const outputTokens = (usage as { completionTokens?: number }).completionTokens || 0
              const estimatedCost = calculateCost(modelProvider, inputTokens, outputTokens)
              
              sendChunk({
                type: 'usage',
                usage: {
                  inputTokens,
                  outputTokens,
                  estimatedCost,
                  provider: modelProvider,
                },
              })
            }

            controller.close()
          } catch (error) {
            const classified = classifyError(error)
            console.error(`[TORBIT] Stream error (attempt ${attempt}):`, classified)
            
            // Retry if retryable and within limits
            if (classified.retryable && attempt < MAX_RETRIES) {
              sendChunk({
                type: 'retry',
                retry: {
                  attempt,
                  maxAttempts: MAX_RETRIES,
                  retryAfterMs: classified.retryAfterMs || 1000,
                },
              })
              
              await new Promise(resolve => setTimeout(resolve, classified.retryAfterMs || 1000))
              return executeWithRetry(attempt + 1)
            }
            
            // Non-retryable or max retries exceeded
            sendChunk({ 
              type: 'error', 
              error: {
                type: classified.type,
                message: classified.message,
                retryable: classified.retryable,
              }
            })
            controller.close()
          }
        }

        await executeWithRetry()
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
