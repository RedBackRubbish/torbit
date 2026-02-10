'use client'

import { useCallback, useEffect, useState } from 'react'
import { getSupabase } from '@/lib/supabase/client'
import type { BackgroundRun } from '@/lib/supabase/types'
import type { BackgroundRunOperation } from '@/lib/background-runs/state-machine'
import { readApiErrorMessage } from '@/lib/api/error-envelope'
import { trackMetricEvent } from '@/lib/metrics/telemetry'

export type BackgroundRunStatus = BackgroundRun['status']

interface CreateRunInput {
  runType: string
  input?: Record<string, unknown>
  metadata?: Record<string, unknown>
  idempotencyKey?: string
  maxAttempts?: number
  retryable?: boolean
}

interface UpdateRunInput {
  operation?: BackgroundRunOperation
  status?: BackgroundRunStatus
  progress?: number
  output?: Record<string, unknown> | null
  errorMessage?: string | null
  retryAfterSeconds?: number
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const BACKGROUND_RUNS_FEATURE_ENABLED = process.env.NODE_ENV === 'test'
  ? true
  : process.env.NEXT_PUBLIC_ENABLE_BACKGROUND_RUNS !== 'false'
let backgroundRunsSupportedCache: boolean | null = null

function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value)
}

function isBackgroundRunsUnavailableError(errorValue: unknown): boolean {
  const normalized = readApiErrorMessage(errorValue, '').toLowerCase()
  return (
    normalized.includes('background_runs') ||
    normalized.includes('schema cache') ||
    normalized.includes('pgrst205') ||
    normalized.includes('42p01')
  )
}

export function useBackgroundRuns(projectId: string | null) {
  const [runs, setRuns] = useState<BackgroundRun[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [backgroundRunsSupported, setBackgroundRunsSupported] = useState(
    BACKGROUND_RUNS_FEATURE_ENABLED && backgroundRunsSupportedCache !== false
  )

  const disableBackgroundRunsSupport = useCallback(() => {
    backgroundRunsSupportedCache = false
    setBackgroundRunsSupported(false)
    setRuns([])
    setError(null)
  }, [])

  const fetchRuns = useCallback(async () => {
    if (!BACKGROUND_RUNS_FEATURE_ENABLED) {
      setRuns([])
      setError(null)
      return false
    }

    if (!projectId || !backgroundRunsSupported) {
      setRuns([])
      return false
    }

    if (!isUuid(projectId)) {
      setRuns([])
      setError(null)
      return false
    }

    setLoading(true)
    setError(null)
    trackMetricEvent({
      name: 'api.background_runs.request',
      projectId,
      metadata: { operation: 'list' },
    })

    try {
      const response = await fetch(`/api/background-runs?projectId=${encodeURIComponent(projectId)}&limit=100`)
      const payload = await response.json() as {
        success?: boolean
        runs?: BackgroundRun[]
        error?: unknown
        degraded?: boolean
      }

      if (payload.degraded || isBackgroundRunsUnavailableError(payload.error)) {
        trackMetricEvent({
          name: 'api.background_runs.error_500',
          projectId,
          metadata: { operation: 'list', degraded: true },
        })
        disableBackgroundRunsSupport()
        return false
      }

      if (!response.ok || !payload.success) {
        if (response.status === 404) {
          trackMetricEvent({
            name: 'api.background_runs.error_404',
            projectId,
            metadata: { operation: 'list' },
          })
        } else if (response.status >= 500) {
          trackMetricEvent({
            name: 'api.background_runs.error_500',
            projectId,
            metadata: { operation: 'list', status: response.status },
          })
        }
        throw new Error(readApiErrorMessage(payload.error, 'Failed to fetch background runs.'))
      }

      setRuns(payload.runs || [])
      return true
    } catch (err) {
      if (isBackgroundRunsUnavailableError(err instanceof Error ? err.message : err)) {
        trackMetricEvent({
          name: 'api.background_runs.error_500',
          projectId,
          metadata: { operation: 'list', degraded: true },
        })
        disableBackgroundRunsSupport()
        return false
      }
      setError(err instanceof Error ? err : new Error('Failed to fetch background runs.'))
      return false
    } finally {
      setLoading(false)
    }
  }, [backgroundRunsSupported, disableBackgroundRunsSupport, projectId])

  useEffect(() => {
    if (!projectId || !backgroundRunsSupported) {
      setRuns([])
      return
    }

    if (!isUuid(projectId)) {
      setRuns([])
      setError(null)
      return
    }

    let active = true
    let cleanup: (() => void) | null = null

    const bootstrap = async () => {
      const canSubscribe = await fetchRuns()
      if (!active || !canSubscribe) return

      const supabase = getSupabase()
      if (!supabase) return

      const channel = supabase
        .channel(`background-runs:${projectId}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'background_runs',
          filter: `project_id=eq.${projectId}`,
        }, (payload) => {
          const eventType = payload.eventType
          const nextRun = payload.new as BackgroundRun
          const oldRun = payload.old as BackgroundRun

          setRuns((current) => {
            if (eventType === 'INSERT') {
              if (current.some((run) => run.id === nextRun.id)) {
                return current
              }
              return [nextRun, ...current]
            }

            if (eventType === 'UPDATE') {
              return current.map((run) => run.id === nextRun.id ? nextRun : run)
            }

            if (eventType === 'DELETE') {
              return current.filter((run) => run.id !== oldRun.id)
            }

            return current
          })
        })
        .subscribe()

      cleanup = () => {
        supabase.removeChannel(channel)
      }
    }

    void bootstrap()

    return () => {
      active = false
      cleanup?.()
    }
  }, [backgroundRunsSupported, fetchRuns, projectId])

  const createRun = useCallback(async (input: CreateRunInput): Promise<BackgroundRun> => {
    if (!backgroundRunsSupported) {
      throw new Error('Background runs are unavailable in this workspace.')
    }

    if (!projectId) {
      throw new Error('Project ID is required to create background runs.')
    }

    const response = await fetch('/api/background-runs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectId,
        runType: input.runType,
        input: input.input || {},
        metadata: input.metadata || {},
        idempotencyKey: input.idempotencyKey,
        maxAttempts: input.maxAttempts,
        retryable: input.retryable,
      }),
    })
    trackMetricEvent({
      name: 'api.background_runs.request',
      projectId,
      metadata: { operation: 'create' },
    })

    const payload = await response.json() as {
      success?: boolean
      run?: BackgroundRun
      error?: unknown
      degraded?: boolean
    }
    if (payload.degraded || isBackgroundRunsUnavailableError(payload.error)) {
      trackMetricEvent({
        name: 'api.background_runs.error_500',
        projectId,
        metadata: { operation: 'create', degraded: true },
      })
      disableBackgroundRunsSupport()
      throw new Error('Background runs are currently unavailable.')
    }
    if (!response.ok || !payload.success || !payload.run) {
      if (response.status === 404) {
        trackMetricEvent({
          name: 'api.background_runs.error_404',
          projectId,
          metadata: { operation: 'create' },
        })
      } else if (response.status >= 500) {
        trackMetricEvent({
          name: 'api.background_runs.error_500',
          projectId,
          metadata: { operation: 'create', status: response.status },
        })
      }
      throw new Error(readApiErrorMessage(payload.error, 'Failed to create background run.'))
    }

    setRuns((current) => {
      const existingIndex = current.findIndex((run) => run.id === payload.run!.id)
      if (existingIndex >= 0) {
        const next = [...current]
        next[existingIndex] = payload.run!
        return next
      }
      return [payload.run!, ...current]
    })
    return payload.run
  }, [backgroundRunsSupported, disableBackgroundRunsSupport, projectId])

  const updateRun = useCallback(async (runId: string, input: UpdateRunInput): Promise<BackgroundRun> => {
    if (!backgroundRunsSupported) {
      throw new Error('Background runs are unavailable in this workspace.')
    }

    const response = await fetch(`/api/background-runs/${encodeURIComponent(runId)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    })
    trackMetricEvent({
      name: 'api.background_runs.request',
      projectId: projectId || undefined,
      metadata: { operation: 'update' },
    })

    const payload = await response.json() as {
      success?: boolean
      run?: BackgroundRun
      error?: unknown
      degraded?: boolean
    }
    if (payload.degraded || isBackgroundRunsUnavailableError(payload.error)) {
      trackMetricEvent({
        name: 'api.background_runs.error_500',
        projectId: projectId || undefined,
        metadata: { operation: 'update', degraded: true },
      })
      disableBackgroundRunsSupport()
      throw new Error('Background runs are currently unavailable.')
    }
    if (!response.ok || !payload.success || !payload.run) {
      if (response.status === 404) {
        trackMetricEvent({
          name: 'api.background_runs.error_404',
          projectId: projectId || undefined,
          metadata: { operation: 'update' },
        })
      } else if (response.status >= 500) {
        trackMetricEvent({
          name: 'api.background_runs.error_500',
          projectId: projectId || undefined,
          metadata: { operation: 'update', status: response.status },
        })
      }
      throw new Error(readApiErrorMessage(payload.error, 'Failed to update background run.'))
    }

    setRuns((current) => current.map((run) => run.id === payload.run!.id ? payload.run! : run))
    return payload.run
  }, [backgroundRunsSupported, disableBackgroundRunsSupport, projectId])

  const dispatchRun = useCallback(async (input?: { runId?: string; limit?: number }): Promise<{
    processed: number
    outcomes: Array<{
      runId: string
      status: BackgroundRunStatus
      retried: boolean
      attemptCount: number
      progress: number
      output: Record<string, unknown> | null
      nextRetryAt: string | null
      startedAt: string | null
      finishedAt: string | null
      error?: string
    }>
  }> => {
    if (!backgroundRunsSupported) {
      return { processed: 0, outcomes: [] }
    }

    const response = await fetch('/api/background-runs/dispatch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        runId: input?.runId,
        projectId: projectId || undefined,
        limit: input?.limit || 1,
      }),
    })
    trackMetricEvent({
      name: 'api.background_runs.request',
      projectId: projectId || undefined,
      metadata: { operation: 'dispatch' },
    })

    const payload = await response.json() as {
      success?: boolean
      processed?: number
      outcomes?: Array<{
        runId: string
        status: BackgroundRunStatus
        retried: boolean
        attemptCount: number
        progress: number
        output: Record<string, unknown> | null
        nextRetryAt: string | null
        startedAt: string | null
        finishedAt: string | null
        error?: string
      }>
      error?: unknown
      degraded?: boolean
    }

    if (payload.degraded || isBackgroundRunsUnavailableError(payload.error)) {
      trackMetricEvent({
        name: 'api.background_runs.error_500',
        projectId: projectId || undefined,
        metadata: { operation: 'dispatch', degraded: true },
      })
      disableBackgroundRunsSupport()
      return { processed: 0, outcomes: [] }
    }

    if (!response.ok || !payload.success) {
      if (response.status === 404) {
        trackMetricEvent({
          name: 'api.background_runs.error_404',
          projectId: projectId || undefined,
          metadata: { operation: 'dispatch' },
        })
      } else if (response.status >= 500) {
        trackMetricEvent({
          name: 'api.background_runs.error_500',
          projectId: projectId || undefined,
          metadata: { operation: 'dispatch', status: response.status },
        })
      }
      throw new Error(readApiErrorMessage(payload.error, 'Failed to dispatch background runs.'))
    }

    return {
      processed: payload.processed || 0,
      outcomes: payload.outcomes || [],
    }
  }, [backgroundRunsSupported, disableBackgroundRunsSupport, projectId])

  return {
    runs,
    loading,
    error,
    fetchRuns,
    createRun,
    updateRun,
    dispatchRun,
  }
}
