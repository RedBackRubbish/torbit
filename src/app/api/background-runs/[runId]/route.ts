import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { computeBackgroundRunTransition } from '@/lib/background-runs/state-machine'

export const runtime = 'nodejs'

const BackgroundRunStatusSchema = z.enum(['queued', 'running', 'succeeded', 'failed', 'cancelled'])
const BackgroundRunOperationSchema = z.enum([
  'start',
  'progress',
  'complete',
  'fail',
  'request-cancel',
  'cancel',
  'retry',
  'heartbeat',
])

const UpdateBackgroundRunSchema = z.object({
  operation: BackgroundRunOperationSchema.optional(),
  status: BackgroundRunStatusSchema.optional(),
  progress: z.number().int().min(0).max(100).optional(),
  output: z.record(z.string(), z.unknown()).nullable().optional(),
  errorMessage: z.string().nullable().optional(),
  retryAfterSeconds: z.number().int().min(1).max(3600).optional(),
})
  .refine((payload) => (
    payload.operation !== undefined
    || payload.status !== undefined
    || payload.progress !== undefined
    || payload.output !== undefined
    || payload.errorMessage !== undefined
    || payload.retryAfterSeconds !== undefined
  ), {
    message: 'At least one update field is required.',
  })

interface RouteParams {
  params: Promise<{ runId: string }>
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { runId } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('background_runs')
    .select('*')
    .eq('id', runId)
    .eq('user_id', user.id)
    .single()

  if (error) {
    return NextResponse.json({ error: 'Run not found.' }, { status: 404 })
  }

  return NextResponse.json({ success: true, run: data })
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { runId } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const parsed = UpdateBackgroundRunSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const payload = parsed.data
    const { data: existingRun, error: existingRunError } = await supabase
      .from('background_runs')
      .select('*')
      .eq('id', runId)
      .eq('user_id', user.id)
      .single()

    if (existingRunError || !existingRun) {
      return NextResponse.json({ error: 'Run not found.' }, { status: 404 })
    }

    const transition = computeBackgroundRunTransition({
      status: existingRun.status,
      progress: existingRun.progress ?? 0,
      attempt_count: existingRun.attempt_count ?? 0,
      max_attempts: existingRun.max_attempts ?? 3,
      retryable: existingRun.retryable !== false,
      cancel_requested: Boolean(existingRun.cancel_requested),
      started_at: existingRun.started_at ?? null,
      finished_at: existingRun.finished_at ?? null,
    }, payload, new Date())

    if (!transition.ok) {
      const status = transition.code === 'invalid_payload' ? 400 : 409
      return NextResponse.json(
        { error: transition.message, code: transition.code },
        { status }
      )
    }

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      ...transition.mutation,
    }

    if (payload.output !== undefined) {
      updatePayload.output = payload.output
    }

    if (payload.errorMessage !== undefined) {
      updatePayload.error_message = payload.errorMessage
    }

    const { data, error } = await supabase
      .from('background_runs')
      .update(updatePayload)
      .eq('id', runId)
      .select('*')
      .single()

    if (error) {
      console.error('[background-runs] Update failed:', error.message)
      return NextResponse.json({ error: 'Failed to update background run.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, run: data })
  } catch (error) {
    console.error('[background-runs] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Failed to update background run.' },
      { status: 500 }
    )
  }
}
