import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import type { Json } from '@/lib/supabase/types'
import { withAuth } from '@/lib/middleware/auth'

export const runtime = 'nodejs'

const MetricEventSchema = z.object({
  name: z.string().min(1).max(120),
  timestamp: z.number().int().positive().optional(),
  sessionId: z.string().min(1).max(128),
  projectId: z.string().uuid().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

const MetricsBatchSchema = z.object({
  events: z.array(MetricEventSchema).min(1).max(50),
})

function isMissingProductEventsTableError(error: {
  code?: string
  message?: string
  details?: string
  hint?: string
} | null): boolean {
  if (!error) return false
  if (error.code === '42P01' || error.code === 'PGRST205') return true

  const text = `${error.message ?? ''} ${error.details ?? ''} ${error.hint ?? ''}`.toLowerCase()
  return (
    text.includes('product_events') &&
    (text.includes('does not exist') || text.includes('schema cache') || text.includes('not found'))
  )
}

export const POST = withAuth(async (request, { user }) => {
  const supabase = await createClient()

  try {
    const body = await request.json()
    const parsed = MetricsBatchSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const rows = parsed.data.events.map((event) => ({
      user_id: user.id,
      project_id: event.projectId || null,
      event_name: event.name,
      session_id: event.sessionId,
      event_data: (event.metadata || {}) as Json,
      occurred_at: new Date(event.timestamp || Date.now()).toISOString(),
    }))

    const { error } = await supabase
      .from('product_events')
      .insert(rows)

    if (error) {
      if (isMissingProductEventsTableError(error)) {
        return NextResponse.json({
          success: true,
          count: 0,
          disabled: true,
          reason: 'product_events table missing',
        })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, count: rows.length })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to ingest metrics events.' },
      { status: 500 }
    )
  }
})
