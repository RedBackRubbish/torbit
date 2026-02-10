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
  projectId: z.string().max(200).optional(),
  userId: z.string().optional(), // Will be overwritten by auth
  projectType: z.enum(['web', 'mobile']).optional(),
  capabilities: z.record(z.string(), z.unknown()).nullable().optional(),
  persistedInvariants: z.string().nullable().optional(),
  fileManifest: z.object({
    files: z.array(z.object({
      path: z.string().max(500),
      bytes: z.number().int().nonnegative(),
    })).max(300),
    totalFiles: z.number().int().nonnegative(),
    truncated: z.boolean().optional(),
  }).optional(),
})

const VALID_AGENT_IDS = Object.keys(AGENT_TOOLS) as AgentId[]

function isValidAgentId(value: string): value is AgentId {
  return VALID_AGENT_IDS.includes(value as AgentId)
}

// Import rich agent prompts
import { ARCHITECT_SYSTEM_PROMPT } from '@/lib/agents/prompts/architect'
import { FRONTEND_SYSTEM_PROMPT } from '@/lib/agents/prompts/frontend'
import { BACKEND_SYSTEM_PROMPT } from '@/lib/agents/prompts/backend'
import { DEVOPS_SYSTEM_PROMPT } from '@/lib/agents/prompts/devops'
import { QA_SYSTEM_PROMPT } from '@/lib/agents/prompts/qa'
import { AUDITOR_SYSTEM_PROMPT } from '@/lib/agents/prompts/auditor'
import { PLANNER_SYSTEM_PROMPT } from '@/lib/agents/prompts/planner'
import { STRATEGIST_SYSTEM_PROMPT } from '@/lib/agents/prompts/strategist'
import { GOD_PROMPT } from '@/lib/agents/prompts/god-prompt'
import { getVerticalPlaybookGuidance } from '@/lib/agents/playbooks'
import { getMobileSystemPrompt } from '@/lib/mobile/prompts'
import { getDesignGuidance, getDaisyUIGuidance } from '@/lib/design/system'
import type { MobileCapabilities, MobileProjectConfig } from '@/lib/mobile/types'
import { DEFAULT_MOBILE_CONFIG } from '@/lib/mobile/types'
import { resolveScopedProjectId } from '@/lib/projects/project-id'
import { runVibeAudit } from '@/lib/vibe-audit'

// Allow streaming responses up to 120 seconds for tool-heavy tasks
export const runtime = 'nodejs'
export const maxDuration = 120

// Maximum output tokens per request to prevent unbounded cost
const MAX_OUTPUT_TOKENS = 16384
const WORLD_CLASS_ORCHESTRATION_ENABLED = process.env.TORBIT_WORLD_CLASS_ORCHESTRATION !== 'false'
const VIBE_AUDIT_ENABLED = process.env.TORBIT_VIBE_AUDIT !== 'false'

type InteractionMode = 'build' | 'conversation'

// Combine God Prompt with agent-specific prompts
const createAgentPrompt = (agentPrompt: string) => `${GOD_PROMPT}\n\n---\n\n## AGENT-SPECIFIC INSTRUCTIONS\n\n${agentPrompt}`

// Rich agent system prompts - imported from dedicated prompt files
const AGENT_PROMPTS: Record<string, string> = {
  architect: createAgentPrompt(ARCHITECT_SYSTEM_PROMPT),
  frontend: createAgentPrompt(FRONTEND_SYSTEM_PROMPT),
  backend: createAgentPrompt(BACKEND_SYSTEM_PROMPT),
  database: createAgentPrompt(BACKEND_SYSTEM_PROMPT), // Database merged into backend agent
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
      message: 'API credits exhausted for the current provider. Add credits or configure a backup provider key.',
      retryable: false,
    }
  }

  if (msg.includes('no ai provider configured')) {
    return {
      type: 'auth',
      message: 'No AI provider key detected. Add OPENAI_API_KEY, ANTHROPIC_API_KEY, or GOOGLE_GENERATIVE_AI_API_KEY.',
      retryable: false,
    }
  }
  
  if (msg.includes('api key') || msg.includes('authentication') || msg.includes('unauthorized')) {
    return {
      type: 'auth',
      message: 'API key not configured. Add OPENAI_API_KEY, ANTHROPIC_API_KEY, or GOOGLE_GENERATIVE_AI_API_KEY.',
      retryable: false,
    }
  }

  if (msg.includes('model_not_found') || msg.includes('does not exist or you do not have access')) {
    return {
      type: 'auth',
      message: 'Configured model is unavailable for your key. Update model env vars or switch provider keys.',
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
    message: 'An unexpected error occurred. Please try again.',
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

function detectInteractionMode(content: string): InteractionMode {
  const text = content.toLowerCase().trim()
  if (!text) return 'build'

  const buildSignals = [
    /build|create|generate|implement|develop|ship|deploy|refactor|fix|debug|patch|add|remove|edit|update|rewrite/,
    /make\s+(a|an|the)/,
    /(website|landing page|dashboard|app|api|component|screen|feature)/,
  ]
  const conversationalSignals = [
    /^do you think\b/,
    /^what do you think\b/,
    /^is (this|that|it) (a )?good idea\b/,
    /^should (we|i)\b/,
    /^can you explain\b/,
    /\bpros and cons\b/,
    /\bwhich is better\b/,
  ]

  const hasBuildSignal = buildSignals.some((pattern) => pattern.test(text))
  const hasConversationalSignal = conversationalSignals.some((pattern) => pattern.test(text))
  const isQuestion = text.includes('?')

  if (hasConversationalSignal && !hasBuildSignal) return 'conversation'
  if (isQuestion && !hasBuildSignal) return 'conversation'
  return 'build'
}

function getToolPathArg(args: Record<string, unknown>): string | null {
  const value = args.path
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function buildToolOnlyFallback(toolCalls: Array<{ name: string; args: Record<string, unknown> }>): string {
  if (toolCalls.length === 0) {
    return 'Request completed, but no response text was returned. Please retry if you need a detailed explanation.'
  }

  const mutationCalls = toolCalls.filter((toolCall) => (
    toolCall.name === 'createFile' ||
    toolCall.name === 'editFile' ||
    toolCall.name === 'applyPatch' ||
    toolCall.name === 'deleteFile'
  ))

  if (mutationCalls.length === 0) {
    return `Completed ${toolCalls.length} tool step${toolCalls.length === 1 ? '' : 's'}. Review the action log for details.`
  }

  const touchedFiles = Array.from(new Set(
    mutationCalls
      .map((toolCall) => getToolPathArg(toolCall.args))
      .filter((filePath): filePath is string => Boolean(filePath))
  ))

  if (touchedFiles.length === 0) {
    return `Applied ${mutationCalls.length} file change${mutationCalls.length === 1 ? '' : 's'}.`
  }

  const preview = touchedFiles.slice(0, 3).join(', ')
  const suffix = touchedFiles.length > 3 ? ` and ${touchedFiles.length - 3} more` : ''
  return `Applied ${mutationCalls.length} file change${mutationCalls.length === 1 ? '' : 's'}: ${preview}${suffix}.`
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
      fileManifest,
    } = parseResult.data

    // Use authenticated user ID, not the one from request
    const userId = user.id
    const projectId = resolveScopedProjectId(userId, incomingProjectId)

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
      const verticalGuidance = getVerticalPlaybookGuidance(userMessage)

      // Combine base prompt with DaisyUI theme guidance + design system
      systemPrompt = `${basePrompt}\n\n${daisyGuidance}\n\n${designGuidance}${verticalGuidance ? `\n\n${verticalGuidance}` : ''}`
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

    if (fileManifest && fileManifest.files.length > 0) {
      const fileList = fileManifest.files
        .slice(0, 120)
        .map((file) => `- ${file.path} (${file.bytes}b)`)
        .join('\n')

      systemPrompt = `${systemPrompt}

## CURRENT WORKSPACE SNAPSHOT
- Total files in current workspace: ${fileManifest.totalFiles}
- Snapshot truncated: ${fileManifest.truncated ? 'yes' : 'no'}
- File list (path + size):
${fileList}`
    }

    // Wrap user messages with XML delimiters to defend against prompt injection.
    // Sanitize the content by escaping XML-like closing tags that could break out
    // of the delimiter structure.
    const lastUserContent = messages[messages.length - 1]?.content || ''
    const interactionMode = detectInteractionMode(lastUserContent)
    if (messages.length > 0 && messages[messages.length - 1]?.role === 'user') {
      const sanitized = lastUserContent
        .replace(/<\/user_request>/gi, '&lt;/user_request&gt;')
        .replace(/<user_request>/gi, '&lt;user_request&gt;')
      messages[messages.length - 1] = {
        ...messages[messages.length - 1],
        content: `<user_request>\n${sanitized}\n</user_request>`,
      }
    }
    // Create a TransformStream for custom streaming with tool execution
    const encoder = new TextEncoder()
    
    const stream = new ReadableStream({
      async start(controller) {
        let isClosed = false
        let vibeAuditPrompt: string | null = null
        let vibeAuditComplete = false
        
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
            if (interactionMode === 'build' && VIBE_AUDIT_ENABLED && !vibeAuditComplete) {
              vibeAuditComplete = true
              try {
                const vibeAudit = await runVibeAudit(process.cwd())
                if (vibeAudit.proof.length > 0) {
                  sendChunk({
                    type: 'proof',
                    proof: vibeAudit.proof,
                  })
                }
                vibeAuditPrompt = vibeAudit.guardrailPrompt || null
              } catch (vibeError) {
                console.warn('[TORBIT] Vibe audit failed, continuing without guardrails:', vibeError)
              }
            }

            const strictExecutionMode = attempt > 1 && interactionMode === 'build'
            const baseAttemptSystemPrompt = strictExecutionMode
              ? `${systemPrompt}

## STRICT EXECUTION MODE
- Produce concrete file changes in this response.
- Use createFile/editFile/applyPatch tools now.
- Do not stop at planning/thinking only.`
              : systemPrompt

            const modePrompt = interactionMode === 'conversation'
              ? `${baseAttemptSystemPrompt}

## CONVERSATION MODE
- The user asked a conversational/advisory question.
- Respond directly and naturally.
- Do not propose a multi-step build plan unless the user asks for implementation.
- Do not run file mutation tools unless the user explicitly asks you to change code.`
              : baseAttemptSystemPrompt

            const attemptSystemPrompt = vibeAuditPrompt && interactionMode === 'build'
              ? `${modePrompt}

${vibeAuditPrompt}`
              : modePrompt

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

            const executionOptions = {
              maxSteps: interactionMode === 'conversation' ? 6 : 15,
              maxTokens: MAX_OUTPUT_TOKENS,
              systemPrompt: attemptSystemPrompt,
              messages,
              onTextDelta: (delta: string) => {
                sendChunk({ type: 'text', content: delta })
              },
              onToolCall: (toolCall: { id: string; name: string; args: Record<string, unknown> }) => {
                if (sentToolCalls.has(toolCall.id)) return
                sentToolCalls.add(toolCall.id)
                sendChunk({ type: 'tool-call', toolCall })
              },
              onToolResult: (toolResult: { id: string; name: string; result: unknown; duration: number }) => {
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

            const result = WORLD_CLASS_ORCHESTRATION_ENABLED && interactionMode === 'build'
              ? await orchestrator.executeWorldClassFlow(
                agentId,
                messages[messages.length - 1]?.content || '',
                executionOptions
              )
              : await orchestrator.executeAgent(
                agentId,
                messages[messages.length - 1]?.content || '',
                executionOptions
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

            if (!result.output || result.output.trim().length === 0) {
              sendChunk({
                type: 'text',
                content: buildToolOnlyFallback(
                  result.toolCalls.map((toolCall) => ({
                    name: toolCall.name,
                    args: toolCall.args,
                  }))
                ),
              })
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
      JSON.stringify({ error: 'Failed to process request' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
