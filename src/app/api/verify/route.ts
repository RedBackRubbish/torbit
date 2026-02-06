import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'

export const maxDuration = 60

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
  try {
    const { originalPrompt, filesCreated, componentNames, pageNames, fileCount } = await req.json()
    
    if (!originalPrompt) {
      return Response.json({ error: 'Missing original prompt' }, { status: 400 })
    }

    // Build context for the supervisor
    const buildSummary = `
## User Request:
"${originalPrompt}"

## Build Output:
- ${fileCount} files created
- Pages: ${pageNames?.length > 0 ? pageNames.join(', ') : 'Home'}
- Components: ${componentNames?.length > 0 ? componentNames.join(', ') : 'Core UI'}
- Files: ${filesCreated?.slice(0, 10).join(', ') || 'various'}
${filesCreated?.length > 10 ? `... and ${filesCreated.length - 10} more` : ''}
`

    const { object } = await generateObject({
      model: anthropic('claude-sonnet-4-5-20250929'),
      schema: SupervisorResponseSchema,
      system: SUPERVISOR_PROMPT,
      prompt: `Review this build:\n${buildSummary}`,
    })

    // Return structured JSON directly
    return Response.json({
      status: object.status,
      summary: object.summary,
      fixes: object.fixes.map((fix, i) => ({
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
