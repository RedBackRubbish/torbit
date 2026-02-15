import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import { withAuth } from '@/lib/middleware/auth'
import { strictRateLimiter, getClientIP, rateLimitResponse } from '@/lib/rate-limit'

export const maxDuration = 60

// Request validation schema
const VerifyRequestSchema = z.object({
  originalPrompt: z.string().min(1, 'Original prompt is required'),
  filesCreated: z.array(z.string()).optional(),
  componentNames: z.array(z.string()).optional(),
  pageNames: z.array(z.string()).optional(),
  fileCount: z.number().optional(),
})

// Structured response schema
const SupervisorResponseSchema = z.object({
  status: z.enum(['APPROVED', 'NEEDS_FIXES']),
  summary: z.string().describe('One sentence summary of the review'),
  fixes: z.array(z.object({
    feature: z.string().describe('Name of the missing feature'),
    description: z.string().describe('What needs to be added/fixed'),
    severity: z.enum(['critical', 'recommended']),
  })).describe('List of fixes needed. Empty if APPROVED.'),
  suggestions: z.array(z.object({
    idea: z.string().describe('Name of the enhancement idea'),
    description: z.string().describe('What it would add to the experience'),
    effort: z.enum(['quick', 'moderate', 'significant']).describe('Implementation effort'),
  })).describe('Optional improvements to make the build even better. Include 1-3 even for APPROVED builds.'),
})

type SupervisorResponseObject = z.infer<typeof SupervisorResponseSchema>

const SUPERVISOR_PROMPT = `You are TORBIT's SUPERVISOR — a senior engineer who reviews builds for completeness.

Your job: Check if the build includes everything the user explicitly asked for, AND suggest improvements.

## RULES
1. APPROVED = All explicitly requested features are present
2. NEEDS_FIXES = User asked for something specific that's missing
3. Only flag things the user EXPLICITLY requested as fixes (not nice-to-haves)
4. Be specific about what's missing so the builder can fix it
5. "critical" = core feature user requested, "recommended" = enhancement they mentioned

## SUGGESTIONS (REQUIRED even for APPROVED builds)
Always include 1-3 suggestions that would make the build even better:
- "quick" = 5-10 min to add (hover effects, loading states, keyboard shortcuts)
- "moderate" = 30 min to add (animations, local storage, responsive tweaks)
- "significant" = 1+ hour (backend integration, auth, complex features)

Think like a product designer reviewing a v1 build. What polish would delight users?

## EXAMPLES

User asked: "Build a todo app with categories and dark mode"
Built: Todo app with categories, no dark mode
→ NEEDS_FIXES: [{ feature: "Dark mode", description: "Add dark/light theme toggle", severity: "critical" }]
→ suggestions: [{ idea: "Keyboard shortcuts", description: "⌘+N to add, ⌘+D to complete", effort: "quick" }]

User asked: "Build a landing page"  
Built: Landing page with hero, features, footer
→ APPROVED (user didn't request specific features beyond "landing page")
→ suggestions: [
  { idea: "Scroll animations", description: "Fade in sections on scroll for polish", effort: "quick" },
  { idea: "Mobile menu", description: "Hamburger menu for mobile nav", effort: "moderate" }
]

Be strict about explicit requests. Be lenient about implied features. Always suggest improvements.`

const DEFAULT_SUPERVISOR_MODEL = process.env.TORBIT_SUPERVISOR_MODEL
  || process.env.TORBIT_SUPERVISOR_CODEX_MODEL
  || 'gpt-5.2'
const DEFAULT_ANTHROPIC_REVIEW_MODEL = process.env.TORBIT_ANTHROPIC_OPUS_MODEL || 'claude-opus-4-1-20250805'

function getSupervisorReviewModel() {
  const configured = DEFAULT_SUPERVISOR_MODEL.trim()

  if (configured.startsWith('claude-')) {
    return anthropic(configured)
  }

  if (process.env.OPENAI_API_KEY) {
    return openai(configured)
  }

  return anthropic(DEFAULT_ANTHROPIC_REVIEW_MODEL)
}

function buildSupervisorResponse(object: SupervisorResponseObject) {
  return {
    status: object.status,
    summary: object.summary,
    fixes: object.fixes.map((fix, i) => ({
      id: `fix-${i + 1}`,
      feature: fix.feature,
      description: fix.description,
      severity: fix.severity,
      status: 'pending' as const,
    })),
    suggestions: object.suggestions.map((suggestion, i) => ({
      id: `suggestion-${i + 1}`,
      idea: suggestion.idea,
      description: suggestion.description,
      effort: suggestion.effort,
    })),
  }
}

export const POST = withAuth(async (req, { user }) => {
  const clientIP = getClientIP(req)
  const rateLimitResult = await strictRateLimiter.check(`${user.id}:${clientIP}:verify`)
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult)
  }

  try {
    // ========================================================================
    // REQUEST VALIDATION - Validate and parse request body
    // ========================================================================
    const body = await req.json()
    const parseResult = VerifyRequestSchema.safeParse(body)

    if (!parseResult.success) {
      return Response.json(
        { error: 'Invalid request', details: parseResult.error.issues },
        { status: 400 }
      )
    }

    const { originalPrompt, filesCreated, componentNames, pageNames, fileCount } = parseResult.data

    // Build context for the supervisor
    const safePageNames = pageNames ?? []
    const safeComponentNames = componentNames ?? []
    const safeFilesCreated = filesCreated ?? []

    const buildSummary = `
## User Request:
"${originalPrompt}"

## Build Output:
- ${fileCount ?? 0} files created
- Pages: ${safePageNames.length > 0 ? safePageNames.join(', ') : 'Home'}
- Components: ${safeComponentNames.length > 0 ? safeComponentNames.join(', ') : 'Core UI'}
- Files: ${safeFilesCreated.slice(0, 10).join(', ') || 'various'}
${safeFilesCreated.length > 10 ? `... and ${safeFilesCreated.length - 10} more` : ''}
`

    const wantsStream = (
      new URL(req.url).searchParams.get('stream') === '1' ||
      req.headers.get('accept')?.includes('text/event-stream') === true
    )

    if (wantsStream) {
      const encoder = new TextEncoder()
      const stream = new ReadableStream({
        async start(controller) {
          let isClosed = false
          const sendChunk = (chunk: unknown) => {
            if (isClosed) return
            try {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`))
            } catch {
              isClosed = true
            }
          }
          const safeClose = () => {
            if (isClosed) return
            isClosed = true
            try {
              controller.close()
            } catch {
              // No-op
            }
          }

          const progressMessages = [
            'Supervisor connected. Reviewing feature coverage.',
            'Supervisor checking runtime safety and user experience protections.',
            'Supervisor validating quality bar and release readiness.',
          ]
          let progressIndex = 0
          sendChunk({ type: 'supervisor-progress', content: progressMessages[progressIndex] })

          const ticker = setInterval(() => {
            progressIndex = (progressIndex + 1) % progressMessages.length
            sendChunk({ type: 'supervisor-progress', content: progressMessages[progressIndex] })
          }, 1200)

          try {
            const { object } = await generateObject({
              model: getSupervisorReviewModel(),
              schema: SupervisorResponseSchema,
              system: SUPERVISOR_PROMPT,
              prompt: `Review this build:\n${buildSummary}`,
            })

            clearInterval(ticker)
            const responsePayload = buildSupervisorResponse(object)

            sendChunk({
              type: 'supervisor-progress',
              content: responsePayload.status === 'APPROVED'
                ? 'Supervisor verdict: pass. Build meets requested scope.'
                : 'Supervisor verdict: fixes required before release.',
            })

            if (responsePayload.suggestions.length > 0) {
              sendChunk({
                type: 'supervisor-progress',
                content: `Supervisor recommendations prepared (${responsePayload.suggestions.length}).`,
              })
            }

            sendChunk({ type: 'supervisor-result', result: responsePayload })
            safeClose()
          } catch (error) {
            clearInterval(ticker)
            sendChunk({
              type: 'error',
              error: error instanceof Error ? error.message : 'Verification failed',
            })
            safeClose()
          }
        },
      })

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      })
    }

    const { object } = await generateObject({
      model: getSupervisorReviewModel(),
      schema: SupervisorResponseSchema,
      system: SUPERVISOR_PROMPT,
      prompt: `Review this build:\n${buildSummary}`,
    })

    return Response.json(buildSupervisorResponse(object))
  } catch (error) {
    console.error('Supervisor verification error:', error)
    return Response.json(
      { error: 'Verification failed' },
      { status: 500 }
    )
  }
})
