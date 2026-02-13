import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useExecutionState, useAsync, useAsyncCallbacks } from '../useExecutionState'

// Mock the executionLedger
vi.mock('../../lib/execution-ledger/ledger', () => ({
  recordExecution: vi.fn().mockResolvedValue({
    id: '1',
    run_id: 'run-123',
    status: 'success',
  }),
  getExecutionByRunId: vi.fn().mockResolvedValue({
    id: '1',
    run_id: 'run-123',
    status: 'success',
  }),
}))

describe('useExecutionState', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('initializes with correct default state', () => {
    const { result } = renderHook(() =>
      useExecutionState({
        projectId: 'proj-1',
        userId: 'user-1',
        agentId: 'agent-1',
      })
    )

    expect(result.current.status).toBe('idle')
    expect(result.current.runId).toBeNull()
    expect(result.current.result).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('generates unique runId on startExecution', async () => {
    const { result: result1 } = renderHook(() =>
      useExecutionState({
        projectId: 'proj-1',
        userId: 'user-1',
        agentId: 'agent-1',
      })
    )
    const { result: result2 } = renderHook(() =>
      useExecutionState({
        projectId: 'proj-1',
        userId: 'user-1',
        agentId: 'agent-1',
      })
    )

    let runId1: string | null = null
    let runId2: string | null = null

    await act(async () => {
      runId1 = result1.current.startExecution(
        'Test execution 1',
        { test: true },
        'agent-1'
      )
    })

    await act(async () => {
      runId2 = result2.current.startExecution(
        'Test execution 2',
        { test: true },
        'agent-1'
      )
    })

    expect(runId1).toBeDefined()
    expect(runId2).toBeDefined()
    expect(runId1).not.toBe(runId2)
  })

  it('transitions from idle to running on startExecution', async () => {
    const { result } = renderHook(() =>
      useExecutionState({
        projectId: 'proj-1',
        userId: 'user-1',
        agentId: 'agent-1',
      })
    )

    expect(result.current.status).toBe('idle')

    await act(async () => {
      result.current.startExecution('Test', { test: true }, 'agent-1')
    })

    expect(result.current.status).toBe('running')
  })

  it('transitions to success on completeExecution', async () => {
    const { result } = renderHook(() =>
      useExecutionState({
        projectId: 'proj-1',
        userId: 'user-1',
        agentId: 'agent-1',
      })
    )

    let runId: string | null = null

    await act(async () => {
      runId = result.current.startExecution('Test', { test: true }, 'agent-1')
    })

    expect(result.current.status).toBe('running')

    await act(async () => {
      result.current.completeExecution(runId!, { output: 'Success' }, {
        cost: 100,
        duration: 1000,
        tokensUsed: 500,
        toolCalls: 2,
      })
    })

    expect(result.current.status).toBe('success')
    expect(result.current.result).toEqual({ output: 'Success' })
  })

  it('transitions to error on failExecution', async () => {
    const { result } = renderHook(() =>
      useExecutionState({
        projectId: 'proj-1',
        userId: 'user-1',
        agentId: 'agent-1',
      })
    )

    let runId: string | null = null

    await act(async () => {
      runId = result.current.startExecution('Test', { test: true }, 'agent-1')
    })

    const error = new Error('Test error')

    await act(async () => {
      result.current.failExecution(runId!, error)
    })

    expect(result.current.status).toBe('error')
    expect(result.current.error).toEqual(error)
  })

  it('transitions to cancelled on cancelExecution', async () => {
    const { result } = renderHook(() =>
      useExecutionState({
        projectId: 'proj-1',
        userId: 'user-1',
        agentId: 'agent-1',
      })
    )

    await act(async () => {
      result.current.startExecution('Test', { test: true }, 'agent-1')
    })

    expect(result.current.status).toBe('running')

    act(() => {
      result.current.cancelExecution()
    })

    expect(result.current.status).toBe('cancelled')
  })

  it('resets state back to idle', async () => {
    const { result } = renderHook(() =>
      useExecutionState({
        projectId: 'proj-1',
        userId: 'user-1',
        agentId: 'agent-1',
      })
    )

    let runId: string | null = null

    await act(async () => {
      runId = result.current.startExecution('Test', { test: true }, 'agent-1')
    })

    await act(async () => {
      result.current.completeExecution(runId!, { output: 'Success' }, {
        cost: 100,
        duration: 1000,
        tokensUsed: 500,
        toolCalls: 2,
      })
    })

    expect(result.current.status).toBe('success')

    act(() => {
      result.current.reset()
    })

    expect(result.current.status).toBe('idle')
    expect(result.current.runId).toBeNull()
    expect(result.current.result).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('tracks metrics from completeExecution', async () => {
    const { result } = renderHook(() =>
      useExecutionState({
        projectId: 'proj-1',
        userId: 'user-1',
        agentId: 'agent-1',
      })
    )

    let runId: string | null = null

    await act(async () => {
      runId = result.current.startExecution('Test', { test: true }, 'agent-1')
    })

    const metrics = {
      cost: 250,
      duration: 5000,
      tokensUsed: 2000,
      toolCalls: 5,
    }

    await act(async () => {
      result.current.completeExecution(runId!, { output: 'Success' }, metrics)
    })

    expect(result.current.metrics).toBeDefined()
    expect(result.current.metrics?.cost).toBe(250)
    expect(result.current.metrics?.tokensUsed).toBe(2000)
    expect(result.current.metrics?.toolCalls).toBe(5)
  })

  it('checks if execution is running', async () => {
    const { result } = renderHook(() =>
      useExecutionState({
        projectId: 'proj-1',
        userId: 'user-1',
        agentId: 'agent-1',
      })
    )

    expect(result.current.isRunning()).toBe(false)

    await act(async () => {
      result.current.startExecution('Test', { test: true }, 'agent-1')
    })

    expect(result.current.isRunning()).toBe(true)

    let runId: string | null = null

    await act(async () => {
      runId = result.current.startExecution('Test 2', { test: true }, 'agent-1')
    })

    await act(async () => {
      result.current.completeExecution(runId!, { output: 'Success' }, {
        cost: 100,
        duration: 1000,
        tokensUsed: 500,
        toolCalls: 2,
      })
    })

    expect(result.current.isRunning()).toBe(false)
  })

  it('calls onExecutionStart callback', async () => {
    const onExecutionStart = vi.fn()
    const { result } = renderHook(() =>
      useExecutionState({
        projectId: 'proj-1',
        userId: 'user-1',
        agentId: 'agent-1',
        onExecutionStart,
      })
    )

    let runId: string | null = null

    await act(async () => {
      runId = result.current.startExecution('Test', { test: true }, 'agent-1')
    })

    expect(onExecutionStart).toHaveBeenCalledWith(runId)
  })

  it('calls onExecutionComplete callback', async () => {
    const onExecutionComplete = vi.fn()
    const { result } = renderHook(() =>
      useExecutionState({
        projectId: 'proj-1',
        userId: 'user-1',
        agentId: 'agent-1',
        onExecutionComplete,
      })
    )

    let runId: string | null = null

    await act(async () => {
      runId = result.current.startExecution('Test', { test: true }, 'agent-1')
    })

    const metrics = {
      cost: 100,
      duration: 1000,
      tokensUsed: 500,
      toolCalls: 2,
    }

    await act(async () => {
      result.current.completeExecution(runId!, { output: 'Success' }, metrics)
    })

    expect(onExecutionComplete).toHaveBeenCalled()
  })
})

describe('useAsync', () => {
  it('executes function automatically when dependencies change', async () => {
    const fn = vi.fn().mockResolvedValue('result')
    const { result, rerender } = renderHook(
      (deps) => useAsync(fn, deps),
      {
        initialProps: ['dep1'],
      }
    )

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
    })

    expect(fn).toHaveBeenCalledTimes(1)

    rerender(['dep2'])

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
    })

    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('can be executed manually', async () => {
    const fn = vi.fn().mockResolvedValue('result')
    const { result } = renderHook(() =>
      useAsync(fn, [], { manual: true })
    )

    await act(async () => {
      result.current.execute()
      await new Promise((resolve) => setTimeout(resolve, 10))
    })

    expect(fn).toHaveBeenCalledTimes(1)
    expect(result.current.data).toBe('result')
    expect(result.current.status).toBe('success')
  })

  it('handles async errors', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('Async error'))
    const onError = vi.fn()

    const { result } = renderHook(() =>
      useAsync(fn, [], { onError, manual: true })
    )

    await act(async () => {
      await result.current.execute()
    })

    expect(result.current.status).toBe('error')
    expect(onError).toHaveBeenCalled()
  })
})

describe('useAsyncCallbacks', () => {
  it('executes async operation', async () => {
    const fn = vi.fn()
      .mockImplementation((signal) =>
        new Promise((resolve) => {
          setTimeout(() => resolve('result1'), 100)
        })
      )

    const { result } = renderHook(() => useAsyncCallbacks())

    let result1: string | void | undefined = undefined

    await act(async () => {
      result1 = await result.current.execute(fn)
    })

    expect(result1).toBe('result1')
  })

  it('cancels all active operations on cancel', async () => {
    const fn = vi.fn()
    const abortSpy = vi.fn()

    fn.mockImplementation(
      (signal) =>
        new Promise((resolve) => {
          signal.addEventListener('abort', abortSpy)
          setTimeout(() => resolve('result'), 1000)
        })
    )

    const { result } = renderHook(() => useAsyncCallbacks())

    await act(async () => {
      result.current.execute(fn)
    })

    act(() => {
      result.current.cancelAll()
    })

    expect(abortSpy).toHaveBeenCalled()
  })

  it('cleans up on unmount', async () => {
    const fn = vi.fn()
    const abortSpy = vi.fn()

    fn.mockImplementation(
      (signal) =>
        new Promise((resolve) => {
          signal.addEventListener('abort', abortSpy)
          setTimeout(() => resolve('result'), 1000)
        })
    )

    const { result, unmount } = renderHook(() => useAsyncCallbacks())

    await act(async () => {
      result.current.execute(fn)
    })

    unmount()

    expect(abortSpy).toHaveBeenCalled()
  })
})
