import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

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
})

const SUPERVISOR_PROMPT = `You are TORBIT's SUPERVISOR — a senior engineer who reviews builds for completeness.

Your job: Check if the build includes everything the user explicitly asked for.

## RULES
1. APPROVED = All explicitly requested features are present
2. NEEDS_FIXES = User asked for something specific that's missing
3. Only flag things the user EXPLICITLY requested (not nice-to-haves)
4. Be specific about what's missing so the builder can fix it
5. "critical" = core feature user requested, "recommended" = enhancement they mentioned

## EXAMPLES

User asked: "Build a todo app with categories and dark mode"
Built: Todo app with categories, no dark mode
→ NEEDS_FIXES: [{ feature: "Dark mode", description: "Add dark/light theme toggle", severity: "critical" }]

User asked: "Build a landing page"  
Built: Landing page with hero, features, footer
→ APPROVED (user didn't request specific features beyond "landing page")

Be strict about explicit requests. Be lenient about implied features.`

export async function POST(req: Request) {
  // ========================================================================
  // AUTHENTICATION - Verify user is logged in
  // ========================================================================
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return Response.json(
      { error: 'Unauthorized. Please log in.' },
      { status: 401 }
    )
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

    const { object } = await generateObject({
      model: anthropic('claude-opus-4-6-20260206'),
      schema: SupervisorResponseSchema,
      system: SUPERVISOR_PROMPT,
      prompt: `Review this build:\n${buildSummary}`,
    })

    // Return structured JSON directly
    return Response.json({
      status: object.status,
      summary: object.summary,
      fixes: object.fixes.map((fix: { feature: string; description: string; severity: 'critical' | 'recommended' }, i: number) => ({
        id: `fix-${i + 1}`,
        feature: fix.feature,
        description: fix.description,
        severity: fix.severity,
        status: 'pending' as const,
      })),
    })
  } catch (error) {
    console.error('Supervisor verification error:', error)
    return Response.json(
      { error: 'Verification failed' },
      { status: 500 }
    )
  }
}
