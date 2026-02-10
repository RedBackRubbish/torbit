import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  createBackgroundRunsAdminClient,
  dispatchQueuedBackgroundRuns,
  recoverStaleRunningRuns,
  type DispatchOutcome,
} from '@/lib/background-runs/dispatcher'
import { authorizeWorkerRequest } from '@/lib/background-runs/worker'
import { makeApiErrorEnvelope } from '@/lib/api/error-envelope'

export const runtime = 'nodejs'
export const maxDuration = 300

const WorkerDispatchSchema = z.object({
  runId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  batchSize: z.coerce.number().int().min(1).max(10).default(5),
  maxBatches: z.coerce.number().int().min(1).max(20).default(6),
  staleAfterSeconds: z.coerce.number().int().min(60).max(86400).default(600),
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

async function parseWorkerRequest(request: NextRequest) {
  if (request.method === 'GET') {
    const { searchParams } = new URL(request.url)
    return WorkerDispatchSchema.safeParse({
      runId: searchParams.get('runId') || undefined,
      projectId: searchParams.get('projectId') || undefined,
      limit: searchParams.get('limit') || undefined,
      batchSize: searchParams.get('batchSize') || undefined,
      maxBatches: searchParams.get('maxBatches') || undefined,
      staleAfterSeconds: searchParams.get('staleAfterSeconds') || undefined,
    })
  }

  const body = await request.json().catch(() => ({}))
  return WorkerDispatchSchema.safeParse(body)
}

async function handleWorkerDispatch(request: NextRequest) {
  const workerAuthorization = authorizeWorkerRequest(request.headers)
  if (!workerAuthorization.ok) {
    return NextResponse.json(
      makeApiErrorEnvelope({
        code: 'UNAUTHORIZED_WORKER',
        message: workerAuthorization.error,
      }),
      { status: 401 }
    )
  }

  const parsed = await parseWorkerRequest(request)
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

  try {
    const supabase = createBackgroundRunsAdminClient()
    const { runId, projectId, limit, batchSize, maxBatches, staleAfterSeconds } = parsed.data
    const telemetrySessionId = `worker:${Date.now()}`

    const outcomes: DispatchOutcome[] = []
    const watchdog = await recoverStaleRunningRuns(supabase, {
      runId,
      projectId,
      staleAfterSeconds,
      limit: Math.min(limit, 20),
      telemetrySessionId,
    })

    let processed = 0
    let batches = 0
    let nextRunId: string | undefined = runId

    while (processed < limit && batches < maxBatches) {
      const remaining = limit - processed
      const currentBatchLimit = Math.min(batchSize, remaining)
      const result = await dispatchQueuedBackgroundRuns(supabase, {
        runId: nextRunId,
        projectId,
        limit: currentBatchLimit,
        telemetrySessionId,
      })

      batches += 1
      processed += result.processed
      outcomes.push(...result.outcomes)

      // runId targets a single run and should only be processed once.
      nextRunId = undefined

      if (result.processed < currentBatchLimit) {
        break
      }
    }

    return NextResponse.json({
      success: true,
      processed,
      batches,
      auth: workerAuthorization.method,
      watchdog: {
        timeoutSeconds: staleAfterSeconds,
        scanned: watchdog.scanned,
        stale: watchdog.stale,
        recovered: watchdog.recovered,
        retried: watchdog.retried,
        failed: watchdog.failed,
      },
      outcomes,
      checkedAt: new Date().toISOString(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to dispatch worker runs.'
    if (isBackgroundRunsUnavailableMessage(message)) {
      return NextResponse.json({
        success: true,
        degraded: true,
        processed: 0,
        batches: 0,
        outcomes: [],
        warning: 'Background runs queue is unavailable; worker skipped dispatch.',
      })
    }

    return NextResponse.json(
      makeApiErrorEnvelope({
        code: 'BACKGROUND_RUNS_WORKER_FAILED',
        message,
        retryable: true,
      }),
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  return handleWorkerDispatch(request)
}

export async function POST(request: NextRequest) {
  return handleWorkerDispatch(request)
}
