import type { SupabaseClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/types'
import {
  createBackgroundRunsAdminClient,
  dispatchQueuedBackgroundRuns,
} from '@/lib/background-runs/dispatcher'
import { authorizeWorkerRequest } from '@/lib/background-runs/worker'
import { makeApiErrorEnvelope } from '@/lib/api/error-envelope'

export const runtime = 'nodejs'
export const maxDuration = 300

const DispatchRequestSchema = z.object({
  runId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(10).default(1),
})

function isBackgroundRunsUnavailableMessage(message: string): boolean {
  const normalized = message.toLowerCase()
  return (
    normalized.includes('background_runs') ||
    normalized.includes('schema cache') ||
    normalized.includes('42p01') ||
    normalized.includes('pgrst205')
  )
}

export async function POST(request: NextRequest) {
  const workerAuthorization = authorizeWorkerRequest(request.headers)

  let supabase: SupabaseClient<Database>
  let userId: string | undefined

  if (workerAuthorization.ok) {
    try {
      supabase = createBackgroundRunsAdminClient()
    } catch (error) {
      return NextResponse.json(
        makeApiErrorEnvelope({
          code: 'WORKER_CONFIG_INVALID',
          message: error instanceof Error ? error.message : 'Worker configuration is invalid.',
        }),
        { status: 500 }
      )
    }
  } else {
    const serverClient = await createClient()
    const { data: { user }, error: authError } = await serverClient.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        makeApiErrorEnvelope({
          code: 'UNAUTHORIZED',
          message: 'Unauthorized. Please log in.',
        }),
        { status: 401 }
      )
    }

    userId = user.id
    supabase = serverClient as unknown as SupabaseClient<Database>
  }

  try {
    const body = await request.json().catch(() => ({}))
    const parsed = DispatchRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        makeApiErrorEnvelope({
          code: 'INVALID_REQUEST',
          message: 'Invalid request',
          details: {
            fields: parsed.error.flatten().fieldErrors,
          },
        }),
        { status: 400 }
      )
    }

    const telemetrySessionId = workerAuthorization.ok
      ? `worker-dispatch:${Date.now()}`
      : `user-dispatch:${Date.now()}`

    const result = await dispatchQueuedBackgroundRuns(supabase, {
      runId: parsed.data.runId,
      projectId: parsed.data.projectId,
      userId,
      limit: parsed.data.limit,
      telemetrySessionId,
    })

    return NextResponse.json({
      success: true,
      processed: result.processed,
      outcomes: result.outcomes,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to dispatch background runs.'
    if (isBackgroundRunsUnavailableMessage(message)) {
      return NextResponse.json({
        success: true,
        degraded: true,
        processed: 0,
        outcomes: [],
        warning: 'Background runs queue is unavailable; worker dispatch skipped.',
      })
    }

    return NextResponse.json(
      makeApiErrorEnvelope({
        code: 'BACKGROUND_RUNS_DISPATCH_FAILED',
        message,
        retryable: true,
      }),
      { status: 500 }
    )
  }
}
