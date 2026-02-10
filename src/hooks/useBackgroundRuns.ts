'use client'

import { useCallback, useEffect, useState } from 'react'
import { getSupabase } from '@/lib/supabase/client'
import type { BackgroundRun } from '@/lib/supabase/types'
import type { BackgroundRunOperation } from '@/lib/background-runs/state-machine'

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

function isBackgroundRunsUnavailableError(errorMessage: string | undefined): boolean {
  const normalized = (errorMessage || '').toLowerCase()
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

    try {
      const response = await fetch(`/api/background-runs?projectId=${encodeURIComponent(projectId)}&limit=100`)
      const payload = await response.json() as {
        success?: boolean
        runs?: BackgroundRun[]
        error?: string
        degraded?: boolean
      }

      if (payload.degraded || isBackgroundRunsUnavailableError(payload.error)) {
        disableBackgroundRunsSupport()
        return false
      }

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || 'Failed to fetch background runs.')
      }

      setRuns(payload.runs || [])
      return true
    } catch (err) {
      if (isBackgroundRunsUnavailableError(err instanceof Error ? err.message : '')) {
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

    const payload = await response.json() as {
      success?: boolean
      run?: BackgroundRun
      error?: string
      degraded?: boolean
    }
    if (payload.degraded || isBackgroundRunsUnavailableError(payload.error)) {
      disableBackgroundRunsSupport()
      throw new Error('Background runs are currently unavailable.')
    }
    if (!response.ok || !payload.success || !payload.run) {
      throw new Error(payload.error || 'Failed to create background run.')
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

    const payload = await response.json() as {
      success?: boolean
      run?: BackgroundRun
      error?: string
      degraded?: boolean
    }
    if (payload.degraded || isBackgroundRunsUnavailableError(payload.error)) {
      disableBackgroundRunsSupport()
      throw new Error('Background runs are currently unavailable.')
    }
    if (!response.ok || !payload.success || !payload.run) {
      throw new Error(payload.error || 'Failed to update background run.')
    }

    setRuns((current) => current.map((run) => run.id === payload.run!.id ? payload.run! : run))
    return payload.run
  }, [backgroundRunsSupported, disableBackgroundRunsSupport])

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
      error?: string
      degraded?: boolean
    }

    if (payload.degraded || isBackgroundRunsUnavailableError(payload.error)) {
      disableBackgroundRunsSupport()
      return { processed: 0, outcomes: [] }
    }

    if (!response.ok || !payload.success) {
      throw new Error(payload.error || 'Failed to dispatch background runs.')
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
