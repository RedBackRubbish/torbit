import type { Meta } from '@storybook/react'
import { useStreamingExecution, deriveUIState } from '@/hooks/useStreamingExecution'
import { useExecutionState } from '@/hooks/useExecutionState'
import { useState, useCallback, useMemo } from 'react'

/**
 * Demo component showing useStreamingExecution hook usage
 */
function StreamingExecutionDemo() {
  const streaming = useStreamingExecution({
    onChunk: (chunk) => console.log('Chunk:', chunk),
    onComplete: () => console.log('Stream complete'),
    onError: (error) => console.error('Stream error:', error),
  })

  const uiState = useMemo(
    () =>
      deriveUIState({
        isStreaming: streaming.isStreaming,
        error: streaming.error,
        data: streaming.data,
        progress: streaming.progress,
      }),
    [streaming.isStreaming, streaming.error, streaming.data, streaming.progress]
  )

  const handleStart = useCallback(async () => {
    // Simulate streaming
    await streaming.startStream('run-demo-1', async (signal) => {
      // Create a mock stream
      return new ReadableStream({
        start(controller) {
          let count = 0
          const interval = setInterval(() => {
            if (count >= 5 || signal.aborted) {
              clearInterval(interval)
              controller.close()
              return
            }
            controller.enqueue(
              new TextEncoder().encode(
                JSON.stringify({ id: count++, data: 'chunk' }) + '\n'
              )
            )
          }, 500)
        },
      })
    })
  }, [streaming])

  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded border">
      <h3 className="font-semibold">useStreamingExecution Demo</h3>

      <div className="space-y-2 text-sm">
        <p>
          Status: <span className="font-mono">{uiState.isLoading ? 'Loading' : 'Ready'}</span>
        </p>
        <p>
          Items: <span className="font-mono">{uiState.resultCount}</span>
        </p>
        <p>
          Progress: <span className="font-mono">{uiState.progressPercent}%</span>
        </p>
      </div>

      {uiState.shouldShowProgress && (
        <div className="w-full h-2 bg-gray-200 rounded overflow-hidden">
          <div
            className="h-full bg-blue-500"
            style={{ width: `${uiState.progressPercent}%` }}
          />
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleStart}
          disabled={uiState.isLoading}
          className="px-3 py-1 bg-blue-600 text-white rounded disabled:bg-gray-400"
        >
          Start Stream
        </button>

        {uiState.canCancel && (
          <button
            onClick={() => streaming.cancelStream()}
            className="px-3 py-1 bg-red-600 text-white rounded"
          >
            Cancel
          </button>
        )}

        {uiState.canRetry && (
          <button
            onClick={() => streaming.reset()}
            className="px-3 py-1 bg-gray-600 text-white rounded"
          >
            Reset
          </button>
        )}
      </div>

      {uiState.shouldShowError && (
        <div className="p-2 bg-red-50 text-red-700 rounded text-sm">{uiState.errorMessage}</div>
      )}
    </div>
  )
}

/**
 * Demo component showing useExecutionState hook usage
 */
function ExecutionStateDemo() {
  const execution = useExecutionState({
    projectId: 'demo-project',
    userId: 'demo-user',
    agentId: 'demo-agent',
    onExecutionStart: (runId) => console.log('Execution started:', runId),
    onExecutionComplete: (record) => console.log('Execution recorded:', record),
  })

  const handleStart = useCallback(async () => {
    const runId = execution.startExecution('Demo task', { demo: true })
    console.log('Started with runId:', runId)

    // Simulate completion after delay
    setTimeout(() => {
      execution.completeExecution(runId, { result: 'success' }, {
        cost: 100,
        duration: 2000,
        tokensUsed: 500,
        toolCalls: 3,
      })
    }, 2000)
  }, [execution])

  const handleFail = useCallback(async () => {
    const runId = execution.startExecution('Demo task', { demo: true })

    setTimeout(() => {
      execution.failExecution(runId, new Error('Task failed'))
    }, 1000)
  }, [execution])

  return (
    <div className="space-y-4 p-4 bg-blue-50 rounded border">
      <h3 className="font-semibold">useExecutionState Demo</h3>

      <div className="space-y-2 text-sm">
        <p>
          Status: <span className="font-mono font-bold">{execution.status}</span>
        </p>
        <p>
          Run ID: <span className="font-mono text-xs">{execution.runId || 'None'}</span>
        </p>
        {execution.metrics && (
          <>
            <p>
              Cost: <span className="font-mono">${(execution.metrics.cost / 100).toFixed(2)}</span>
            </p>
            <p>
              Duration: <span className="font-mono">{execution.metrics.duration}ms</span>
            </p>
            <p>
              Tokens: <span className="font-mono">{execution.metrics.tokensUsed}</span>
            </p>
          </>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleStart}
          disabled={execution.isRunning()}
          className="px-3 py-1 bg-green-600 text-white rounded disabled:bg-gray-400"
        >
          Start Success
        </button>

        <button
          onClick={handleFail}
          disabled={execution.isRunning()}
          className="px-3 py-1 bg-orange-600 text-white rounded disabled:bg-gray-400"
        >
          Start Failure
        </button>

        {!execution.isRunning() && (
          <button
            onClick={() => execution.reset()}
            className="px-3 py-1 bg-gray-600 text-white rounded"
          >
            Reset
          </button>
        )}
      </div>

      {execution.error && (
        <div className="p-2 bg-red-50 text-red-700 rounded text-sm">{execution.error.message}</div>
      )}
    </div>
  )
}

/**
 * Hook composition demo
 */
function HookCompositionDemo() {
  return (
    <div className="space-y-6 p-4">
      <h2 className="text-xl font-semibold">Frontend Hooks Demo</h2>

      <StreamingExecutionDemo />

      <ExecutionStateDemo />

      <div className="p-4 bg-yellow-50 border rounded text-sm">
        <p className="font-semibold mb-2">Key Patterns:</p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li>Pure UI state derivation with useMemo</li>
          <li>Run ID-based streaming cancellation</li>
          <li>Automatic ExecutionLedger recording</li>
          <li>Mount safety with setSafeState pattern</li>
          <li>Proper AbortController cleanup</li>
        </ul>
      </div>
    </div>
  )
}

const meta: Meta = {
  title: 'Hooks/Frontend Patterns Demo',
  component: HookCompositionDemo,
  parameters: {
    layout: 'padded',
    backgrounds: {
      default: 'light',
    },
  },
}

export default meta

export const Demo = {
  render: () => <HookCompositionDemo />,
}

export const StreamingOnly = {
  render: () => <StreamingExecutionDemo />,
}

export const ExecutionStateOnly = {
  render: () => <ExecutionStateDemo />,
}
