'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ExecutionRecord } from '@/lib/execution-ledger/ledger'
import { recordExecution } from '@/lib/execution-ledger/ledger'

/**
 * Hook for managing execution state from backend
 * 
 * Principles:
 * - UI state is derived from execution state
 * - No transforms in render
 * - All side effects properly cleaned up
 */

export interface ExecutionState {
  status: 'idle' | 'running' | 'success' | 'error' | 'cancelled'
  runId: string | null
  result: Record<string, unknown> | null
  error: Error | null
  startTime: number | null
  endTime: number | null
  metrics: {
    cost: number // in cents
    duration: number // in ms
    tokensUsed: number
    toolCalls: number
  } | null
}

export interface UseExecutionStateOptions {
  projectId: string | null
  userId: string | null
  agentId: string | null
  onExecutionStart?: (runId: string) => void
  onExecutionComplete?: (record: ExecutionRecord) => void
  onExecutionError?: (error: Error) => void
}

/**
 * Manages execution lifecycle with automatic recording to ledger
 */
export function useExecutionState(options: UseExecutionStateOptions) {
  const [state, setState] = useState<ExecutionState>({
    status: 'idle',
    runId: null,
    result: null,
    error: null,
    startTime: null,
    endTime: null,
    metrics: null,
  })

  const mountedRef = useRef(true)
  const abortRef = useRef(false)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

  // Safely update state
  const setSafeState = useCallback((updates: Partial<ExecutionState>) => {
    if (mountedRef.current && !abortRef.current) {
      setState((prev) => ({ ...prev, ...updates }))
    }
  }, [])

  // Start execution
  const startExecution = useCallback(
    (intent: string, input: Record<string, unknown>, agentId: string = options.agentId || 'default') => {
      const runId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

      setSafeState({
        status: 'running',
        runId,
        result: null,
        error: null,
        startTime: Date.now(),
        endTime: null,
        metrics: null,
      })

      options.onExecutionStart?.(runId)

      return runId
    },
    [setSafeState, options]
  )

  // Complete execution successfully
  const completeExecution = useCallback(
    async (runId: string, result: Record<string, unknown>, metrics: ExecutionState['metrics']) => {
      const endTime = Date.now()
      const startTime = state.startTime || Date.now()
      const duration = endTime - startTime
      const resolvedMetrics = {
        cost: metrics?.cost ?? 0,
        duration,
        tokensUsed: metrics?.tokensUsed ?? 0,
        toolCalls: metrics?.toolCalls ?? 0,
      }

      if (mountedRef.current && !abortRef.current) {
        setState((prev) => ({
          ...prev,
          status: 'success',
          result,
          endTime,
          metrics: resolvedMetrics,
        }))

        // Record to ledger
        try {
          if (options.projectId && options.userId && options.agentId) {
            const record = await recordExecution({
              run_id: runId,
              project_id: options.projectId,
              user_id: options.userId,
              agent_id: options.agentId,
              intent: 'Execution from ' + options.agentId,
              input: {},
              output: result,
              cost: {
                total: resolvedMetrics.cost,
                breakdown: {
                  tokens: resolvedMetrics.tokensUsed,
                  toolCalls: resolvedMetrics.toolCalls,
                },
              },
              execution_trace: {
                steps: [],
                duration_ms: duration,
              },
              status: 'completed',
            })

            options.onExecutionComplete?.(record)
          }
        } catch (err) {
          console.error('Failed to record execution:', err)
        }
      }
    },
    [state.startTime, options]
  )

  // Mark execution as errored
  const failExecution = useCallback(
    async (runId: string, error: Error) => {
      const endTime = Date.now()

      if (mountedRef.current && !abortRef.current) {
        setState((prev) => ({
          ...prev,
          status: 'error',
          error,
          endTime,
        }))

        // Record failed execution to ledger
        try {
          if (options.projectId && options.userId && options.agentId) {
            await recordExecution({
              run_id: runId,
              project_id: options.projectId,
              user_id: options.userId,
              agent_id: options.agentId,
              intent: 'Execution from ' + options.agentId,
              input: {},
              cost: {
                total: 0,
                breakdown: {},
              },
              execution_trace: {
                steps: [],
                duration_ms: endTime - (state.startTime || endTime),
              },
              status: 'failed',
              error_message: error.message,
            })
          }
        } catch (err) {
          console.error('Failed to record execution error:', err)
        }

        options.onExecutionError?.(error)
      }
    },
    [state.startTime, options]
  )

  // Cancel execution
  const cancelExecution = useCallback(() => {
    if (mountedRef.current) {
      abortRef.current = true
      setState((prev) => ({
        ...prev,
        status: 'cancelled',
      }))
    }
  }, [])

  // Reset state
  const reset = useCallback(() => {
    abortRef.current = false
    setSafeState({
      status: 'idle',
      runId: null,
      result: null,
      error: null,
      startTime: null,
      endTime: null,
      metrics: null,
    })
  }, [setSafeState])

  return {
    // State
    ...state,

    // Actions
    startExecution,
    completeExecution,
    failExecution,
    cancelExecution,
    reset,

    // Queries
    isRunning: () => state.status === 'running',
    isComplete: () => state.status === 'success',
    hasFailed: () => state.status === 'error',
    isCancelled: () => state.status === 'cancelled',
    getDuration: () =>
      state.startTime && state.endTime ? state.endTime - state.startTime : null,
  }
}

/**
 * Custom hook for async operations with proper cleanup
 */
export function useAsync<T>(
  asyncFn: () => Promise<T>,
  dependencies: unknown[] = [],
  options: {
    onSuccess?: (data: T) => void
    onError?: (error: Error) => void
    manual?: boolean
  } = {}
) {
  const [state, setState] = useState<{
    status: 'idle' | 'pending' | 'success' | 'error'
    data: T | null
    error: Error | null
  }>({
    status: 'idle',
    data: null,
    error: null,
  })

  const mountedRef = useRef(true)
  const lastDependenciesRef = useRef<unknown[]>(dependencies)
  const [dependencyVersion, setDependencyVersion] = useState(0)

  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

  const { onSuccess, onError, manual = false } = options

  const execute = useCallback(async () => {
    if (!mountedRef.current) return

    setState({ status: 'pending', data: null, error: null })

    try {
      const result = await asyncFn()

      if (mountedRef.current) {
        setState({ status: 'success', data: result, error: null })
        onSuccess?.(result)
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))

      if (mountedRef.current) {
        setState({ status: 'error', data: null, error: err })
        onError?.(err)
      }
    }
  }, [asyncFn, onSuccess, onError])

  useEffect(() => {
    const previous = lastDependenciesRef.current
    const changed =
      previous.length !== dependencies.length ||
      dependencies.some((value, index) => !Object.is(value, previous[index]))

    if (!changed) return

    lastDependenciesRef.current = dependencies
    setDependencyVersion((current) => current + 1)
  }, [dependencies])

  // Auto-execute on dependency change unless manual
  useEffect(() => {
    if (!manual) {
      void execute()
    }
  }, [manual, execute, dependencyVersion])

  return {
    ...state,
    execute,
    isLoading: state.status === 'pending',
  }
}

/**
 * Hook to manage multiple async operations with cleanup
 */
export function useAsyncCallbacks() {
  const mountedRef = useRef(true)
  const activeRequestsRef = useRef(new Set<AbortController>())

  useEffect(() => {
    const activeRequests = activeRequestsRef.current
    return () => {
      mountedRef.current = false
      // Cancel all active requests
      for (const controller of activeRequests) {
        controller.abort()
      }
      activeRequests.clear()
    }
  }, [])

  const execute = useCallback(
    async <T,>(
      asyncFn: (signal: AbortSignal) => Promise<T>,
      options: { onSuccess?: (data: T) => void; onError?: (error: Error) => void } = {}
    ) => {
      const controller = new AbortController()
      activeRequestsRef.current.add(controller)

      try {
        const result = await asyncFn(controller.signal)

        if (mountedRef.current && !controller.signal.aborted) {
          options.onSuccess?.(result)
          return result
        }
      } catch (error) {
        // Don't treat abort as error
        if (!(error instanceof Error && error.name === 'AbortError') && mountedRef.current) {
          const err = error instanceof Error ? error : new Error(String(error))
          options.onError?.(err)
        }
      } finally {
        activeRequestsRef.current.delete(controller)
      }
    },
    []
  )

  const cancelAll = useCallback(() => {
    for (const controller of activeRequestsRef.current) {
      controller.abort()
    }
    activeRequestsRef.current.clear()
  }, [])

  return { execute, cancelAll }
}
