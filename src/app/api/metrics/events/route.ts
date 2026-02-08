import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import type { Json } from '@/lib/supabase/types'

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

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 })
  }

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
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, count: rows.length })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to ingest metrics events.' },
      { status: 500 }
    )
  }
}
