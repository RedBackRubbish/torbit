import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { buildMetricsSummary } from '@/lib/metrics/summary'

export const runtime = 'nodejs'

const QuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(90).default(30),
  projectId: z.string().uuid().optional(),
})

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 })
  }

  const url = new URL(request.url)
  const parsed = QuerySchema.safeParse({
    days: url.searchParams.get('days') || undefined,
    projectId: url.searchParams.get('projectId') || undefined,
  })

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid query', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const { days, projectId } = parsed.data
  const windowStart = new Date(Date.now() - (days * 24 * 60 * 60 * 1000)).toISOString()

  let query = supabase
    .from('product_events')
    .select('event_name, event_data, occurred_at')
    .gte('occurred_at', windowStart)
    .order('occurred_at', { ascending: true })

  if (projectId) {
    query = query.eq('project_id', projectId)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const summary = buildMetricsSummary(data || [])
  return NextResponse.json({
    success: true,
    window: {
      days,
      start: windowStart,
      end: new Date().toISOString(),
    },
    summary,
  })
}
