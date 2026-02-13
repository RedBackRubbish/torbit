import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import {
  useStreamingExecution,
  deriveUIState,
} from '../useStreamingExecution'

describe('useStreamingExecution', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it('initializes with correct default state', () => {
    const { result } = renderHook(() => useStreamingExecution())

    expect(result.current.isStreaming).toBe(false)
    expect(result.current.currentRunId).toBe(null)
    expect(result.current.data).toEqual([])
    expect(result.current.error).toBeNull()
    expect(result.current.progress).toBe(0)
  })

  it('starts streaming with a run ID', async () => {
    const { result } = renderHook(() => useStreamingExecution())
    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('{"id": 1}\n'))
        controller.close()
      },
    })

    await act(async () => {
      await result.current.startStream('run-123', async () => mockStream)
    })

    expect(result.current.currentRunId).toBe('run-123')
    expect(result.current.data).toHaveLength(1)
    expect(result.current.data[0]).toEqual({ id: 1 })
  })

  it('prevents stale updates on unmounted component', async () => {
    const { result, unmount } = renderHook(() => useStreamingExecution())
    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('{"id": 1}\n'))
        controller.close()
      },
    })

    act(() => {
      unmount()
    })

    // Should not throw or update state when unmounted
    expect(() => {
      result.current.startStream('run-123', async () => mockStream)
    }).not.toThrow()
  })

  it('cancels stream by run ID', async () => {
    const { result } = renderHook(() => useStreamingExecution())
    const mockStream = new ReadableStream({
      start(controller) {
        // Never closes, so stream continues
      },
    })

    await act(async () => {
      result.current.startStream('run-123', async () => mockStream)
    })

    expect(result.current.isStreaming).toBe(true)
    expect(result.current.canCancel()).toBe(true)

    act(() => {
      result.current.cancelStream()
    })

    expect(result.current.isStreaming).toBe(false)
    expect(result.current.canCancel()).toBe(false)
  })

  it('calls onChunk callback for each chunk', async () => {
    const onChunk = vi.fn()
    const { result } = renderHook(() => useStreamingExecution({ onChunk }))
    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('{"id": 1}\n'))
        controller.enqueue(new TextEncoder().encode('{"id": 2}\n'))
        controller.close()
      },
    })

    await act(async () => {
      await result.current.startStream('run-123', async () => mockStream)
    })

    expect(onChunk).toHaveBeenCalledTimes(2)
    expect(onChunk).toHaveBeenCalledWith({ id: 1 })
    expect(onChunk).toHaveBeenCalledWith({ id: 2 })
  })

  it('calls onComplete when stream finishes', async () => {
    const onComplete = vi.fn()
    const { result } = renderHook(() => useStreamingExecution({ onComplete }))
    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('{"id": 1}\n'))
        controller.close()
      },
    })

    await act(async () => {
      await result.current.startStream('run-123', async () => mockStream)
    })

    expect(onComplete).toHaveBeenCalled()
    expect(result.current.isStreaming).toBe(false)
  })

  it('handles stream errors', async () => {
    const onError = vi.fn()
    const { result } = renderHook(() => useStreamingExecution({ onError }))

    const mockFetch = async () => {
      throw new Error('Stream failed')
    }

    await act(async () => {
      await result.current.startStream('run-123', mockFetch)
    })

    expect(result.current.hasError()).toBe(true)
    expect(result.current.error?.message).toBe('Stream failed')
    expect(onError).toHaveBeenCalledWith(result.current.error)
  })

  it('resets state', () => {
    const { result } = renderHook(() => useStreamingExecution())

    act(() => {
      result.current.reset()
    })

    expect(result.current.isStreaming).toBe(false)
    expect(result.current.currentRunId).toBeNull()
    expect(result.current.data).toEqual([])
    expect(result.current.error).toBeNull()
    expect(result.current.progress).toBe(0)
  })

  it('provides methods to check stream state', () => {
    const { result } = renderHook(() => useStreamingExecution())

    expect(result.current.hasError()).toBe(false)
    expect(result.current.canCancel()).toBe(false)

    // After starting stream
    act(() => {
      const mockStream = new ReadableStream({
        start(controller) {
          // Never completes
        },
      })
      result.current.startStream('run-123', async () => mockStream)
    })

    expect(result.current.canCancel()).toBe(true)
  })
})

describe('deriveUIState', () => {
  it('derives initial state', () => {
    const uiState = deriveUIState({
      isStreaming: false,
      error: null,
      data: [],
      progress: 0,
    })

    expect(uiState.isInitial).toBe(true)
    expect(uiState.isLoading).toBe(false)
    expect(uiState.isComplete).toBe(false)
    expect(uiState.isFailed).toBe(false)
    expect(uiState.canCancel).toBe(false)
    expect(uiState.canRetry).toBe(false)
  })

  it('derives loading state', () => {
    const uiState = deriveUIState({
      isStreaming: true,
      error: null,
      data: [],
      progress: 50,
    })

    expect(uiState.isLoading).toBe(true)
    expect(uiState.shouldShowProgress).toBe(true)
    expect(uiState.shouldShowSpinner).toBe(true)
    expect(uiState.progressPercent).toBe(50)
    expect(uiState.canCancel).toBe(true)
  })

  it('derives complete state', () => {
    const uiState = deriveUIState({
      isStreaming: false,
      error: null,
      data: [{ id: 1 }, { id: 2 }],
      progress: 100,
    })

    expect(uiState.isComplete).toBe(true)
    expect(uiState.resultCount).toBe(2)
    expect(uiState.shouldShowError).toBe(false)
  })

  it('derives failed state', () => {
    const error = new Error('Test error')
    const uiState = deriveUIState({
      isStreaming: false,
      error,
      data: [],
      progress: 0,
    })

    expect(uiState.isFailed).toBe(true)
    expect(uiState.shouldShowError).toBe(true)
    expect(uiState.errorMessage).toBe('Test error')
    expect(uiState.canRetry).toBe(true)
  })

  it('shows progress when streaming', () => {
    const uiState = deriveUIState({
      isStreaming: true,
      error: null,
      data: [],
      progress: 100,
    })

    expect(uiState.shouldShowProgress).toBe(true)
    expect(uiState.shouldShowSpinner).toBe(false)
  })
})
