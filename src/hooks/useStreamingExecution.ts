'use client'

import { useEffect, useRef, useCallback, useState } from 'react'

/**
 * Streaming execution hook with run ID-based cancellation
 * 
 * Features:
 * - Pure function render helpers
 * - Run ID-based abort control
 * - Automatic cleanup on unmount
 * - Prevents stale updates
 */

export interface StreamingState {
  isStreaming: boolean
  currentRunId: string | null
  data: Record<string, unknown>[]
  error: Error | null
  progress: number // 0-100
  isMounted: boolean
}

interface StreamingConfig {
  onChunk?: (chunk: Record<string, unknown>) => void
  onError?: (error: Error) => void
  onComplete?: () => void
  timeout?: number
}

export function useStreamingExecution(config: StreamingConfig = {}) {
  const [state, setState] = useState<StreamingState>({
    isStreaming: false,
    currentRunId: null,
    data: [],
    error: null,
    progress: 0,
    isMounted: true,
  })

  const abortControllerRef = useRef<AbortController | null>(null)
  const mountedRef = useRef(true)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastRunIdRef = useRef<string | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false
      // Cancel any ongoing streams
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      // Clear timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  // Safely update state only if component is mounted
  const setSafeState = useCallback((updates: Partial<StreamingState>) => {
    if (mountedRef.current) {
      setState((prev) => ({ ...prev, ...updates }))
    }
  }, [])

  // Start streaming with a specific run ID
  const startStream = useCallback(
    async (
      runId: string,
      fetch: (signal: AbortSignal) => Promise<ReadableStream<Uint8Array>>
    ) => {
      // Cancel previous run if different
      if (lastRunIdRef.current && lastRunIdRef.current !== runId) {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort()
        }
      }

      lastRunIdRef.current = runId
      abortControllerRef.current = new AbortController()

      setSafeState({
        isStreaming: true,
        currentRunId: runId,
        data: [],
        error: null,
        progress: 0,
      })

      // Set timeout if configured
      if (config.timeout) {
        timeoutRef.current = setTimeout(() => {
          if (abortControllerRef.current) {
            abortControllerRef.current.abort()
          }
        }, config.timeout)
      }

      try {
        const stream = await fetch(abortControllerRef.current.signal)
        const reader = stream.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let chunkCount = 0

        while (true) {
          const { done, value } = await reader.read()

          if (done) {
            break
          }

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')

          // Process complete lines
          for (let i = 0; i < lines.length - 1; i++) {
            const line = lines[i].trim()
            if (!line) continue

            try {
              const chunk = JSON.parse(line)
              chunkCount++

              if (mountedRef.current) {
                setValue((prev) => [...prev, chunk])
                config.onChunk?.(chunk)
              }
            } catch {
              // Skip invalid JSON lines
            }
          }

          // Keep incomplete line in buffer
          buffer = lines[lines.length - 1]

          // Update progress (estimate based on chunks)
          const estimatedProgress = Math.min(90, chunkCount * 10)
          setSafeState({ progress: estimatedProgress })
        }

        // Process remaining buffer
        if (buffer.trim()) {
          try {
            const chunk = JSON.parse(buffer)
            if (mountedRef.current) {
              setValue((prev) => [...prev, chunk])
              config.onChunk?.(chunk)
            }
          } catch {
            // Ignore
          }
        }

        setSafeState({
          isStreaming: false,
          progress: 100,
        })
        config.onComplete?.()
      } catch (error) {
        // Don't treat abort as error
        if (error instanceof Error && error.name === 'AbortError') {
          setSafeState({ isStreaming: false })
          return
        }

        const err = error instanceof Error ? error : new Error('Stream failed')
        setSafeState({
          isStreaming: false,
          error: err,
        })
        config.onError?.(err)
      } finally {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
          timeoutRef.current = null
        }
      }
    },
    [setSafeState, config]
  )

  // Cancel current run
  const cancelStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setSafeState({
      isStreaming: false,
      currentRunId: null,
    })
  }, [setSafeState])

  // Helper to update data safely
  const setValue = useCallback((update: (prev: Record<string, unknown>[]) => Record<string, unknown>[]) => {
    if (mountedRef.current) {
      setState((prev) => ({
        ...prev,
        data: update(prev.data),
      }))
    }
  }, [])

  return {
    // State
    isStreaming: state.isStreaming,
    currentRunId: state.currentRunId,
    data: state.data,
    error: state.error,
    progress: state.progress,
    isMounted: state.isMounted,

    // Actions
    startStream,
    cancelStream,
    reset: () =>
      setSafeState({
        isStreaming: false,
        currentRunId: null,
        data: [],
        error: null,
        progress: 0,
      }),

    // Helpers
    canCancel: () => state.isStreaming && state.currentRunId !== null,
    hasError: () => state.error !== null,
    isComplete: () => !state.isStreaming && state.data.length > 0,
  }
}

/**
 * Pure function to derive UI state from backend execution state
 * No side effects, pure computation
 */
export function deriveUIState(executionState: {
  isStreaming: boolean
  error: Error | null
  data: Record<string, unknown>[]
  progress: number
}) {
  return {
    // Loading states
    isLoading: executionState.isStreaming,
    isInitial: executionState.data.length === 0 && !executionState.isStreaming && !executionState.error,
    isComplete: !executionState.isStreaming && executionState.data.length > 0,
    isFailed: !executionState.isStreaming && executionState.error !== null,

    // Visual indicators
    shouldShowProgress: executionState.isStreaming,
    shouldShowError: executionState.error !== null && !executionState.isStreaming,
    shouldShowSpinner: executionState.isStreaming && executionState.progress < 100,
    progressPercent: executionState.progress,

    // Content
    errorMessage: executionState.error?.message ?? 'An error occurred',
    resultCount: executionState.data.length,

    // Flags
    canRetry: executionState.error !== null,
    canCancel: executionState.isStreaming,
  }
}
