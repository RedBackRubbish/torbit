import {
  createClient as createSupabaseAdminClient,
  type SupabaseClient,
} from '@supabase/supabase-js'
import type { Database, Json } from '@/lib/supabase/types'
import { MobileShipRequestSchema } from '@/lib/mobile/pipeline'
import { executeMobileShip, MobileShipExecutionError } from '@/lib/mobile/ship-executor'
import { computeBackgroundRunTransition } from './state-machine'

export type BackgroundRunsClient = SupabaseClient<Database>
type BackgroundRunRow = Database['public']['Tables']['background_runs']['Row']

export interface DispatchQueuedBackgroundRunsInput {
  runId?: string
  projectId?: string
  userId?: string
  limit?: number
  telemetrySessionId?: string
}

export interface DispatchOutcome {
  runId: string
  status: BackgroundRunRow['status']
  retried: boolean
  attemptCount: number
  progress: number
  output: BackgroundRunRow['output']
  nextRetryAt: string | null
  startedAt: string | null
  finishedAt: string | null
  error?: string
}

export interface DispatchResult {
  processed: number
  outcomes: DispatchOutcome[]
}

export interface RecoverStaleRunningRunsInput {
  runId?: string
  projectId?: string
  userId?: string
  staleAfterSeconds?: number
  limit?: number
  telemetrySessionId?: string
}

export interface RecoverStaleRunningRunsResult {
  scanned: number
  stale: number
  recovered: number
  retried: number
  failed: number
  outcomes: DispatchOutcome[]
}

const DEFAULT_STALE_RUNNING_TIMEOUT_SECONDS = 10 * 60
const DEFAULT_DISPATCH_TELEMETRY_SESSION = 'background-runs-dispatch'
const DEFAULT_WATCHDOG_TELEMETRY_SESSION = 'background-runs-watchdog'

export class PermanentRunError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PermanentRunError'
  }
}

export class BackgroundRunDispatchConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BackgroundRunDispatchConfigError'
  }
}

export function createBackgroundRunsAdminClient(): BackgroundRunsClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new BackgroundRunDispatchConfigError(
      'Admin dispatch requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
    )
  }

  return createSupabaseAdminClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export function computeRetryDelaySeconds(attemptCount: number): number {
  const base = 30
  const exponent = Math.max(0, attemptCount - 1)
  const delay = base * (2 ** exponent)
  return Math.min(delay, 900)
}

function toRunRecord(row: BackgroundRunRow) {
  return {
    status: row.status,
    progress: row.progress,
    attempt_count: row.attempt_count,
    max_attempts: row.max_attempts,
    retryable: row.retryable,
    cancel_requested: row.cancel_requested,
    started_at: row.started_at,
    finished_at: row.finished_at,
  }
}

async function applyTransition(
  supabase: BackgroundRunsClient,
  run: BackgroundRunRow,
  input: Parameters<typeof computeBackgroundRunTransition>[1]
): Promise<BackgroundRunRow> {
  const transition = computeBackgroundRunTransition(toRunRecord(run), input, new Date())

  if (!transition.ok) {
    throw new PermanentRunError(`Transition failed: ${transition.message}`)
  }

  const { data, error } = await supabase
    .from('background_runs')
    .update({
      ...transition.mutation,
      output: transition.mutation.output as Json | null | undefined,
      updated_at: new Date().toISOString(),
    })
    .eq('id', run.id)
    .select('*')
    .single()

  if (error || !data) {
    throw new Error(error?.message || 'Failed to apply run transition.')
  }

  return data
}

async function executeRunType(run: BackgroundRunRow): Promise<Record<string, unknown>> {
  if (run.run_type !== 'mobile-release') {
    throw new PermanentRunError(`Unsupported run_type: ${run.run_type}`)
  }

  const parsed = MobileShipRequestSchema.safeParse(run.input)
  if (!parsed.success) {
    throw new PermanentRunError('Invalid mobile release payload in run input.')
  }

  const result = await executeMobileShip(parsed.data)
  return {
    action: result.action,
    message: result.message,
    links: result.links,
    output: result.output,
    submitProfile: result.submitProfile,
    queued: result.queued,
    androidTrack: result.androidTrack,
  }
}

async function processRun(
  supabase: BackgroundRunsClient,
  run: BackgroundRunRow,
  options: {
    telemetrySessionId: string
  }
): Promise<DispatchOutcome> {
  let currentRun = run

  try {
    currentRun = await applyTransition(supabase, currentRun, { operation: 'start', progress: 10 })
    await recordBackgroundRunTelemetryEvent(supabase, currentRun, {
      sessionId: options.telemetrySessionId,
      eventName: 'background_run.started',
    })

    const output = await executeRunType(currentRun)
    currentRun = await applyTransition(supabase, currentRun, {
      operation: 'complete',
      output,
    })
    await recordBackgroundRunTelemetryEvent(supabase, currentRun, {
      sessionId: options.telemetrySessionId,
      eventName: 'background_run.succeeded',
    })

    return {
      runId: currentRun.id,
      status: currentRun.status,
      retried: false,
      attemptCount: currentRun.attempt_count,
      progress: currentRun.progress,
      output: currentRun.output,
      nextRetryAt: currentRun.next_retry_at,
      startedAt: currentRun.started_at,
      finishedAt: currentRun.finished_at,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Background run execution failed.'
    const isPermanent = error instanceof PermanentRunError
      || (error instanceof MobileShipExecutionError && error.status >= 400 && error.status < 500)

    const failedRun = await applyTransition(supabase, currentRun, {
      operation: 'fail',
      errorMessage: message,
      output: {
        error: message,
      },
    })
    await recordBackgroundRunTelemetryEvent(supabase, failedRun, {
      sessionId: options.telemetrySessionId,
      eventName: 'background_run.failed',
      metadata: {
        permanent: isPermanent,
        errorMessage: message,
      },
    })

    const canRetry = !isPermanent
      && failedRun.retryable
      && failedRun.attempt_count < failedRun.max_attempts

    if (canRetry) {
      const retryAfterSeconds = computeRetryDelaySeconds(failedRun.attempt_count)
      const queuedRun = await applyTransition(supabase, failedRun, {
        operation: 'retry',
        retryAfterSeconds,
      })
      await recordBackgroundRunTelemetryEvent(supabase, queuedRun, {
        sessionId: options.telemetrySessionId,
        eventName: 'background_run.retry_scheduled',
        metadata: {
          retryAfterSeconds,
          previousError: message,
        },
      })

      return {
        runId: queuedRun.id,
        status: queuedRun.status,
        retried: true,
        attemptCount: queuedRun.attempt_count,
        progress: queuedRun.progress,
        output: queuedRun.output,
        nextRetryAt: queuedRun.next_retry_at,
        startedAt: queuedRun.started_at,
        finishedAt: queuedRun.finished_at,
        error: message,
      }
    }

    return {
      runId: failedRun.id,
      status: failedRun.status,
      retried: false,
      attemptCount: failedRun.attempt_count,
      progress: failedRun.progress,
      output: failedRun.output,
      nextRetryAt: failedRun.next_retry_at,
      startedAt: failedRun.started_at,
      finishedAt: failedRun.finished_at,
      error: message,
    }
  }
}

function normalizeLimit(limit?: number): number {
  if (typeof limit !== 'number' || Number.isNaN(limit)) {
    return 1
  }

  return Math.min(Math.max(Math.floor(limit), 1), 20)
}

function normalizeStaleTimeoutSeconds(staleAfterSeconds?: number): number {
  if (typeof staleAfterSeconds !== 'number' || Number.isNaN(staleAfterSeconds)) {
    return DEFAULT_STALE_RUNNING_TIMEOUT_SECONDS
  }

  return Math.min(Math.max(Math.floor(staleAfterSeconds), 60), 24 * 60 * 60)
}

function parseIsoTimestamp(value: string | null | undefined): number | null {
  if (!value) return null
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? timestamp : null
}

async function recordBackgroundRunTelemetryEvent(
  supabase: BackgroundRunsClient,
  run: BackgroundRunRow,
  input: {
    sessionId: string
    eventName: string
    metadata?: Record<string, unknown>
    occurredAt?: string
  }
): Promise<void> {
  try {
    await supabase
      .from('product_events')
      .insert({
        user_id: run.user_id,
        project_id: run.project_id,
        event_name: input.eventName,
        session_id: input.sessionId,
        event_data: {
          runId: run.id,
          runType: run.run_type,
          status: run.status,
          attemptCount: run.attempt_count,
          maxAttempts: run.max_attempts,
          retryable: run.retryable,
          progress: run.progress,
          ...(input.metadata || {}),
        } as Json,
        occurred_at: input.occurredAt || new Date().toISOString(),
      })
  } catch {
    // Telemetry must not block run state transitions.
  }
}

export function isBackgroundRunHeartbeatStale(
  run: Pick<BackgroundRunRow, 'last_heartbeat_at' | 'started_at' | 'created_at'>,
  options: { now?: Date; staleAfterSeconds?: number } = {}
): boolean {
  const now = options.now ?? new Date()
  const staleAfterSeconds = normalizeStaleTimeoutSeconds(options.staleAfterSeconds)

  const lastSignalTimestamp = parseIsoTimestamp(run.last_heartbeat_at)
    ?? parseIsoTimestamp(run.started_at)
    ?? parseIsoTimestamp(run.created_at)

  if (lastSignalTimestamp === null) {
    return false
  }

  return now.getTime() - lastSignalTimestamp >= staleAfterSeconds * 1000
}

export async function recoverStaleRunningRuns(
  supabase: BackgroundRunsClient,
  input: RecoverStaleRunningRunsInput = {}
): Promise<RecoverStaleRunningRunsResult> {
  const staleAfterSeconds = normalizeStaleTimeoutSeconds(input.staleAfterSeconds)
  const limit = normalizeLimit(input.limit)
  const telemetrySessionId = input.telemetrySessionId || DEFAULT_WATCHDOG_TELEMETRY_SESSION

  let query = supabase
    .from('background_runs')
    .select('*')
    .eq('status', 'running')
    .order('started_at', { ascending: true })
    .limit(Math.min(limit * 5, 100))

  if (input.runId) {
    query = query.eq('id', input.runId)
  }

  if (input.projectId) {
    query = query.eq('project_id', input.projectId)
  }

  if (input.userId) {
    query = query.eq('user_id', input.userId)
  }

  const { data: runningRuns, error: runningRunsError } = await query
  if (runningRunsError) {
    throw new Error(runningRunsError.message)
  }

  const staleRuns = (runningRuns || [])
    .filter((run) => isBackgroundRunHeartbeatStale(run, { staleAfterSeconds }))
    .slice(0, limit)

  if (staleRuns.length === 0) {
    return {
      scanned: (runningRuns || []).length,
      stale: 0,
      recovered: 0,
      retried: 0,
      failed: 0,
      outcomes: [],
    }
  }

  const outcomes: DispatchOutcome[] = []
  let retried = 0
  let failed = 0
  const watchdogMessage = 'Run heartbeat timed out and was recovered by watchdog.'

  for (const run of staleRuns) {
    try {
      const failedRun = await applyTransition(supabase, run, {
        operation: 'fail',
        errorMessage: watchdogMessage,
        output: {
          error: watchdogMessage,
          watchdog: true,
        },
      })
      await recordBackgroundRunTelemetryEvent(supabase, failedRun, {
        sessionId: telemetrySessionId,
        eventName: 'background_run.watchdog_marked_failed',
        metadata: {
          staleAfterSeconds,
        },
      })

      const canRetry = failedRun.retryable && failedRun.attempt_count < failedRun.max_attempts

      if (canRetry) {
        const retryAfterSeconds = computeRetryDelaySeconds(failedRun.attempt_count)
        const queuedRun = await applyTransition(supabase, failedRun, {
          operation: 'retry',
          retryAfterSeconds,
        })
        await recordBackgroundRunTelemetryEvent(supabase, queuedRun, {
          sessionId: telemetrySessionId,
          eventName: 'background_run.watchdog_retried',
          metadata: {
            staleAfterSeconds,
            retryAfterSeconds,
          },
        })

        outcomes.push({
          runId: queuedRun.id,
          status: queuedRun.status,
          retried: true,
          attemptCount: queuedRun.attempt_count,
          progress: queuedRun.progress,
          output: queuedRun.output,
          nextRetryAt: queuedRun.next_retry_at,
          startedAt: queuedRun.started_at,
          finishedAt: queuedRun.finished_at,
          error: watchdogMessage,
        })
        retried += 1
      } else {
        await recordBackgroundRunTelemetryEvent(supabase, failedRun, {
          sessionId: telemetrySessionId,
          eventName: 'background_run.watchdog_terminal_failure',
          metadata: {
            staleAfterSeconds,
          },
        })

        outcomes.push({
          runId: failedRun.id,
          status: failedRun.status,
          retried: false,
          attemptCount: failedRun.attempt_count,
          progress: failedRun.progress,
          output: failedRun.output,
          nextRetryAt: failedRun.next_retry_at,
          startedAt: failedRun.started_at,
          finishedAt: failedRun.finished_at,
          error: watchdogMessage,
        })
        failed += 1
      }
    } catch {
      // Run likely moved to another state concurrently; skip and continue recovery.
    }
  }

  return {
    scanned: (runningRuns || []).length,
    stale: staleRuns.length,
    recovered: outcomes.length,
    retried,
    failed,
    outcomes,
  }
}

export async function dispatchQueuedBackgroundRuns(
  supabase: BackgroundRunsClient,
  input: DispatchQueuedBackgroundRunsInput = {}
): Promise<DispatchResult> {
  const limit = normalizeLimit(input.limit)
  const telemetrySessionId = input.telemetrySessionId || DEFAULT_DISPATCH_TELEMETRY_SESSION

  let query = supabase
    .from('background_runs')
    .select('*')
    .eq('status', 'queued')
    .order('created_at', { ascending: true })
    .limit(Math.min(limit * 5, 50))

  if (input.runId) {
    query = query.eq('id', input.runId)
  }

  if (input.projectId) {
    query = query.eq('project_id', input.projectId)
  }

  if (input.userId) {
    query = query.eq('user_id', input.userId)
  }

  const { data: queuedRuns, error: queueError } = await query

  if (queueError) {
    throw new Error(queueError.message)
  }

  const now = Date.now()
  const dueRuns = (queuedRuns || [])
    .filter((run) => run.next_retry_at === null || Date.parse(run.next_retry_at) <= now)
    .slice(0, limit)

  if (dueRuns.length === 0) {
    return {
      processed: 0,
      outcomes: [],
    }
  }

  const outcomes: DispatchOutcome[] = []
  for (const run of dueRuns) {
    const outcome = await processRun(supabase, run, { telemetrySessionId })
    outcomes.push(outcome)
  }

  return {
    processed: outcomes.length,
    outcomes,
  }
}
