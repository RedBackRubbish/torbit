import { z } from 'zod'
import fs from 'node:fs'
import path from 'node:path'
import { AGENT_TOOLS, type AgentId } from '@/lib/tools/definitions'
import { createOrchestrator } from '@/lib/agents/orchestrator'
import { chatRateLimiter, getClientIP, rateLimitResponse } from '@/lib/rate-limit'
import { getAuthenticatedUser } from '@/lib/supabase/auth'
import {
  emitSnapshotCreated,
  enforceEnvironmentFreeze,
  generateSnapshot,
  getProjectKnowledge,
  hasSnapshot,
  saveSnapshot,
} from '@/lib/knowledge/memory'

// Request validation schema
const ChatRequestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string(),
  })).min(1),
  agentId: z.string().optional(),
  projectId: z.string().optional(),
  userId: z.string().optional(), // Will be overwritten by auth
  projectType: z.enum(['web', 'mobile']).optional(),
  capabilities: z.record(z.string(), z.unknown()).nullable().optional(),
  persistedInvariants: z.string().nullable().optional(),
})

const VALID_AGENT_IDS = Object.keys(AGENT_TOOLS) as AgentId[]

function isValidAgentId(value: string): value is AgentId {
  return VALID_AGENT_IDS.includes(value as AgentId)
}

// Import rich agent prompts
import { ARCHITECT_SYSTEM_PROMPT } from '@/lib/agents/prompts/architect'
import { FRONTEND_SYSTEM_PROMPT } from '@/lib/agents/prompts/frontend'
import { DEVOPS_SYSTEM_PROMPT } from '@/lib/agents/prompts/devops'
import { QA_SYSTEM_PROMPT } from '@/lib/agents/prompts/qa'
import { AUDITOR_SYSTEM_PROMPT } from '@/lib/agents/prompts/auditor'
import { PLANNER_SYSTEM_PROMPT } from '@/lib/agents/prompts/planner'
import { STRATEGIST_SYSTEM_PROMPT } from '@/lib/agents/prompts/strategist'
import { GOD_PROMPT } from '@/lib/agents/prompts/god-prompt'
import { getMobileSystemPrompt } from '@/lib/mobile/prompts'
import { getDesignGuidance, getDaisyUIGuidance } from '@/lib/design/system'
import type { MobileCapabilities, MobileProjectConfig } from '@/lib/mobile/types'
import { DEFAULT_MOBILE_CONFIG } from '@/lib/mobile/types'

// Allow streaming responses up to 120 seconds for tool-heavy tasks
export const runtime = 'nodejs'
export const maxDuration = 120

// Maximum output tokens per request to prevent unbounded cost
const MAX_OUTPUT_TOKENS = 16384

// Combine God Prompt with agent-specific prompts
const createAgentPrompt = (agentPrompt: string) => `${GOD_PROMPT}\n\n---\n\n## AGENT-SPECIFIC INSTRUCTIONS\n\n${agentPrompt}`

// Rich agent system prompts - the sophisticated ones with tool awareness
const AGENT_PROMPTS: Record<string, string> = {
  architect: createAgentPrompt(ARCHITECT_SYSTEM_PROMPT),
  frontend: createAgentPrompt(FRONTEND_SYSTEM_PROMPT),
  backend: createAgentPrompt(`You are THE BACKEND AGENT for TORBIT.
Your role is to implement server routes, form actions, and server-side logic.

## TOOLS AT YOUR DISPOSAL
You have access to verified tools - USE THEM. Don't just describe what you would do.

When given a task:
1. Use 'think' to design your API structure
2. Use 'readFile' to understand existing code patterns
3. Use 'createFile' to generate new server routes
4. Use 'editFile' to modify existing endpoints
5. Use 'runTests' to verify your implementation
6. Use 'searchCode' to find related code

## CODE STANDARDS
- Next.js App Router route handlers (app/api/**/route.ts) and server actions where needed
- TypeScript with strict types
- Zod for request/response validation
- Proper error handling with explicit status codes and structured JSON responses
- Use server components/actions for secure data access patterns

Always show your work through tool calls.`),

  database: createAgentPrompt(`You are THE DATABASE AGENT for TORBIT.
Your role is to design schemas, write migrations, and optimize queries.

## TOOLS AT YOUR DISPOSAL
When given a task:
1. Use 'think' to design your schema
2. Use 'inspectSchema' to understand existing database structure
3. Use 'createFile' to generate schema definitions
4. Use 'editFile' to modify existing schemas
5. Use 'runSqlQuery' to test queries (READ ONLY)
6. Use 'runCommand' to run migrations

## STANDARDS
- Drizzle ORM or Prisma with PostgreSQL (or direct SQL)
- Proper indexing for query performance
- Normalized schemas with clear relationships
- Migration files for all changes

Never hallucinate columns - use inspectSchema first.`),

  devops: createAgentPrompt(DEVOPS_SYSTEM_PROMPT),
  qa: createAgentPrompt(QA_SYSTEM_PROMPT),
  planner: createAgentPrompt(PLANNER_SYSTEM_PROMPT),
  strategist: createAgentPrompt(STRATEGIST_SYSTEM_PROMPT),
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

  if (msg.includes('no_file_mutations')) {
    return {
      type: 'tool_error',
      message: 'No files were generated on first pass. Retrying with strict execution mode...',
      retryable: true,
      retryAfterMs: 250,
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
  type: 'text' | 'tool-call' | 'tool-result' | 'error' | 'usage' | 'retry' | 'proof'
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
  proof?: Array<{ label: string; status: 'verified' | 'warning' | 'failed' }>
}

// Maximum retry attempts for retryable errors
const MAX_RETRIES = 3

function requestLikelyNeedsFileOutput(content: string): boolean {
  const text = content.toLowerCase()
  return /build|create|generate|make|implement|develop|app|website|landing|dashboard|todo|page|screen|ui/.test(text)
}

function detectRuntimeEnvironment(): 'local' | 'staging' | 'production' {
  const env = (process.env.VERCEL_ENV || process.env.NODE_ENV || 'development').toLowerCase()
  if (env === 'production') return 'production'
  if (env === 'preview' || env === 'staging') return 'staging'
  return 'local'
}

function detectFrameworkVersions(): Record<string, string> {
  const fallback = { nextjs: '16', react: '19', typescript: '5' }
  try {
    const packageJsonPath = path.join(process.cwd(), 'package.json')
    if (!fs.existsSync(packageJsonPath)) return fallback

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as {
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
    }

    const dependencies = {
      ...(packageJson.dependencies || {}),
      ...(packageJson.devDependencies || {}),
    }

    const cleanVersion = (value: string | undefined, defaultValue: string): string => {
      if (!value) return defaultValue
      return value.replace(/^[^\d]*/, '') || defaultValue
    }

    return {
      nextjs: cleanVersion(dependencies.next, fallback.nextjs),
      react: cleanVersion(dependencies.react, fallback.react),
      typescript: cleanVersion(dependencies.typescript, fallback.typescript),
    }
  } catch {
    return fallback
  }
}

export async function POST(req: Request) {
  // ========================================================================
  // RATE LIMITING - Protect against abuse
  // ========================================================================
  const clientIP = getClientIP(req)
  const rateLimitResult = await chatRateLimiter.check(clientIP)

  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult)
  }

  // ========================================================================
  // AUTHENTICATION - Verify user is logged in
  // ========================================================================
  const user = await getAuthenticatedUser(req)
  if (!user) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized. Please log in to use the chat.' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  }

  try {
    // ========================================================================
    // REQUEST VALIDATION - Validate and parse request body
    // ========================================================================
    const body = await req.json()
    const parseResult = ChatRequestSchema.safeParse(body)

    if (!parseResult.success) {
      return new Response(
        JSON.stringify({
          error: 'Invalid request',
          details: parseResult.error.flatten().fieldErrors,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const {
      messages: rawMessages,
      agentId: requestedAgentId,
      projectId: incomingProjectId,
      projectType = 'web',
      capabilities = null,
      persistedInvariants = null,
    } = parseResult.data

    // Use authenticated user ID, not the one from request
    const userId = user.id
    const projectId = incomingProjectId?.trim() || `user-${userId}`

    // Filter out empty messages to prevent API errors
    const messages = rawMessages.filter((m) =>
      m.content && typeof m.content === 'string' && m.content.trim().length > 0
    )

    // Ensure we have at least one message
    if (messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No valid messages provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const normalizedAgentId = requestedAgentId ?? 'architect'
    if (!isValidAgentId(normalizedAgentId)) {
      return new Response(
        JSON.stringify({ error: `Unknown agent: ${normalizedAgentId}` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const agentId: AgentId = normalizedAgentId

    // Select prompt based on project type
    let systemPrompt: string
    if (projectType === 'mobile') {
      // Use mobile-specific prompt with capabilities
      const mobileConfig: MobileProjectConfig = {
        ...DEFAULT_MOBILE_CONFIG,
        capabilities: (capabilities as unknown as MobileCapabilities) || DEFAULT_MOBILE_CONFIG.capabilities,
      }
      systemPrompt = getMobileSystemPrompt(mobileConfig)
    } else {
      // Get base agent prompt
      const basePrompt = AGENT_PROMPTS[agentId] || AGENT_PROMPTS.architect

      // Inject design guidance based on user's message
      const userMessage = messages[messages.length - 1]?.content || ''
      const daisyGuidance = getDaisyUIGuidance(userMessage)
      const designGuidance = getDesignGuidance(userMessage)

      // Combine base prompt with DaisyUI theme guidance + design system
      systemPrompt = `${basePrompt}\n\n${daisyGuidance}\n\n${designGuidance}`
    }
    
    // Inject persisted invariants from previous builds
    if (persistedInvariants) {
      systemPrompt = `${systemPrompt}\n\n${persistedInvariants}`
    }

    // Bootstrap durable project memory (snapshot created once, then reused).
    const environment = detectRuntimeEnvironment()
    if (!hasSnapshot(projectId)) {
      const snapshot = generateSnapshot(projectId, detectFrameworkVersions(), environment)
      saveSnapshot(projectId, snapshot)
      emitSnapshotCreated(snapshot)
    } else {
      enforceEnvironmentFreeze(projectId, environment)
    }

    const snapshot = getProjectKnowledge(projectId).snapshot
    const assumptionPreview = snapshot.assumptions
      .slice(0, 8)
      .map((assumption) => `- ${assumption.assumption}`)
      .join('\n')

    systemPrompt = `${systemPrompt}

## PROJECT MEMORY SNAPSHOT
- Snapshot hash: ${snapshot.snapshotHash || 'none'}
- Freeze mode: ${snapshot.freezeMode}
- Confidence: ${Math.round(snapshot.confidence * 100)}%
- Frameworks: ${Object.entries(snapshot.frameworks).map(([name, version]) => `${name}@${version}`).join(', ') || 'none'}
${assumptionPreview ? `- Assumptions:\n${assumptionPreview}` : '- Assumptions: none'}`

    // Wrap user messages with XML delimiters to defend against prompt injection
    const lastUserContent = messages[messages.length - 1]?.content || ''
    if (messages.length > 0 && messages[messages.length - 1]?.role === 'user') {
      messages[messages.length - 1] = {
        ...messages[messages.length - 1],
        content: `<user_request>\n${lastUserContent}\n</user_request>`,
      }
    }
    // Create a TransformStream for custom streaming with tool execution
    const encoder = new TextEncoder()
    
    const stream = new ReadableStream({
      async start(controller) {
        let isClosed = false
        
        const sendChunk = (chunk: StreamChunk) => {
          if (isClosed) return // Guard against writing to closed controller
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`))
          } catch {
            // Controller may be closed, ignore
            isClosed = true
          }
        }
        
        const safeClose = () => {
          if (!isClosed) {
            isClosed = true
            try {
              controller.close()
            } catch {
              // Already closed
            }
          }
        }

        // Retry wrapper for transient errors
        const executeWithRetry = async (attempt = 1): Promise<void> => {
          const sentToolCalls = new Set<string>()

          try {
            const strictExecutionMode = attempt > 1
            const attemptSystemPrompt = strictExecutionMode
              ? `${systemPrompt}

## STRICT EXECUTION MODE
- Produce concrete file changes in this response.
- Use createFile/editFile/applyPatch tools now.
- Do not stop at planning/thinking only.`
              : systemPrompt

            const orchestrator = createOrchestrator({
              projectId,
              userId,
              enableKimiRouter: true,
              fastRouting: true,
            })

            if (attempt === 1) {
              const replayedCheckpointId = orchestrator.getContext().lastReplayedCheckpointId
              const replayedScopes = orchestrator.getContext().lastReplayedCheckpointScopes
              if (replayedCheckpointId) {
                const scopeSuffix = replayedScopes && replayedScopes.length > 0
                  ? ` (${replayedScopes.join(', ')})`
                  : ''
                sendChunk({
                  type: 'proof',
                  proof: [{ label: `Resumed from checkpoint ${replayedCheckpointId}${scopeSuffix}`, status: 'verified' }],
                })
              }
            }

            const result = await orchestrator.executeAgent(
              agentId,
              messages[messages.length - 1]?.content || '',
              {
                maxSteps: 15,
                maxTokens: MAX_OUTPUT_TOKENS,
                systemPrompt: attemptSystemPrompt,
                messages,
                onTextDelta: (delta) => {
                  sendChunk({ type: 'text', content: delta })
                },
                onToolCall: (toolCall) => {
                  if (sentToolCalls.has(toolCall.id)) return
                  sentToolCalls.add(toolCall.id)
                  sendChunk({ type: 'tool-call', toolCall })
                },
                onToolResult: (toolResult) => {
                  const resultText = typeof toolResult.result === 'string'
                    ? toolResult.result
                    : JSON.stringify(toolResult.result)

                  sendChunk({
                    type: 'tool-result',
                    toolResult: {
                      id: toolResult.id,
                      success: !resultText.startsWith('Error:'),
                      output: resultText,
                      duration: toolResult.duration,
                    },
                  })
                },
              }
            )

            if (!result.success) {
              throw new Error(result.output || 'Agent execution failed')
            }

            const mutationToolCount = result.toolCalls.filter((toolCall) => (
              toolCall.name === 'createFile' ||
              toolCall.name === 'editFile' ||
              toolCall.name === 'applyPatch'
            )).length

            if (
              mutationToolCount === 0 &&
              agentId === 'architect' &&
              requestLikelyNeedsFileOutput(lastUserContent)
            ) {
              throw new Error('NO_FILE_MUTATIONS')
            }

            safeClose()
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
            safeClose()
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
