# Frontend Architecture Refactoring Guide

## Overview

This document describes the refactored frontend component architecture with focus on pure functions, proper async handling, streaming cancellation, and strict error boundaries.

## Core Principles

### 1. Pure Functions on Render
All UI state derivation happens via pure functions, never in render. This ensures:
- Predictable behavior
- Easy to test
- No side effects during render
- Better performance with memoization

### 2. Separated State vs Side-Effect Logic
State management is separated from side effects:
- **State management**: `useExecutionState`, `useStreamingExecution` hooks
- **Side effects**: `useCallback`, `useEffect` for API calls
- **UI derivation**: Pure functions like `deriveUIState()`

### 3. Streaming Cancel Logic Using Run IDs
Streaming operations use unique run IDs with AbortController:
- Each stream gets a unique run ID
- Previous streams are automatically cancelled when new ones start
- AbortSignal propagates through fetch API
- Prevents data race conditions

### 4. Prevention of Stale Updates on Unmount
All state updates are guarded by mount checks:
- `mountedRef.current` check before `setState`
- `setSafeState` wrapper function
- Proper cleanup of AbortControllers
- No memory leaks from unmounted components

### 5. Strict Error Boundaries
Error boundaries with recovery mechanisms:
- Error counting to prevent infinite loops
- Auto-reset after 3 consecutive errors
- `resetKeys` pattern for manual recovery
- Proper error logging and callbacks

## API Reference

### useStreamingExecution

Manages streaming execution with run ID-based cancellation.

```typescript
const streaming = useStreamingExecution({
  onChunk?: (chunk: any) => void     // Called for each chunk
  onError?: (error: Error) => void   // Called on error
  onComplete?: () => void             // Called when finished
  timeout?: number                    // Optional timeout in ms
})

// Start streaming with unique run ID
await streaming.startStream(
  'run-123-abc',
  async (signal) => {
    const response = await fetch('/api/stream', { signal })
    return response.body
  }
)

// Cancel current stream
streaming.cancelStream()

// Check if can cancel
if (streaming.canCancel()) {
  streaming.cancelStream()
}

// State
streaming.isStreaming    // boolean
streaming.currentRunId   // string | null
streaming.data           // Record<string, unknown>[]
streaming.error          // Error | null
streaming.progress       // 0-100
```

#### deriveUIState Pure Function

```typescript
const uiState = deriveUIState({
  isStreaming: boolean
  error: Error | null
  data: any[]
  progress: number
})

// Result
{
  isInitial: boolean
  isLoading: boolean
  isComplete: boolean
  isFailed: boolean
  shouldShowProgress: boolean
  shouldShowSpinner: boolean
  shouldShowError: boolean
  progressPercent: number
  resultCount: number
  errorMessage: string | null
  canRetry: boolean
  canCancel: boolean
}
```

### useExecutionState

Manages execution lifecycle with automatic ExecutionLedger recording.

```typescript
const execution = useExecutionState({
  projectId: string
  userId: string
  agentId: string
  onExecutionStart?: (runId: string) => void
  onExecutionComplete?: (record: ExecutionRecord) => void
  onExecutionError?: (error: Error) => void
})

// Start execution
const runId = execution.startExecution(
  'Deploy service',
  { service: 'api', region: 'us-west-2' },
  'deployment-agent'
)

// Complete successfully
await execution.completeExecution(runId, 
  { deployment_id: '123', url: 'https://...' },
  {
    cost: 250,
    duration: 5000,
    tokensUsed: 2000,
    toolCalls: 5
  }
)

// Record failure
await execution.failExecution(runId, new Error('Deployment failed'))

// Cancel execution
execution.cancelExecution()

// Reset state
execution.reset()

// Queries
execution.isRunning()    // boolean
execution.isComplete()   // boolean
execution.hasFailed()    // boolean
execution.isCancelled()  // boolean
execution.getDuration()  // number | null

// State
execution.status     // 'idle' | 'running' | 'success' | 'error' | 'cancelled'
execution.runId      // string | null
execution.result     // Record<string, unknown> | null
execution.error      // Error | null
execution.metrics    // { cost, duration, tokensUsed, toolCalls } | null
```

### useAsync

Hook for single async operations with proper cleanup.

```typescript
const async = useAsync(
  asyncFn: () => Promise<T>,
  dependencies: unknown[],
  options?: {
    onSuccess?: (data: T) => void
    onError?: (error: Error) => void
    manual?: boolean  // Don't auto-execute
  }
)

// Auto-execute on dependency change
const { data, execute, isLoading, status, error } = useAsync(
  () => fetch('/api/data').then(r => r.json()),
  [projectId]
)

// Manual execution
const { data, execute } = useAsync(
  () => fetch('/api/data').then(r => r.json()),
  [],
  { manual: true }
)

await execute() // Call when needed
```

### useAsyncCallbacks

Hook for managing multiple async operations with cancellation.

```typescript
const { execute, cancelAll } = useAsyncCallbacks()

// Execute async function with abort signal
const result = await execute(
  async (signal) => {
    const response = await fetch('/api/data', { signal })
    return response.json()
  },
  {
    onSuccess: (data) => console.log(data),
    onError: (error) => console.error(error)
  }
)

// Cancel all active operations
cancelAll()
```

### ErrorBoundary

Strict error boundary with recovery mechanisms.

```typescript
<ErrorBoundary
  fallback={<div>Error occurred</div>}
  fallback={(error, reset) => (
    <div>
      <div>{error?.message}</div>
      <button onClick={reset}>Retry</button>
    </div>
  )}
  resetKeys={[chatId, userId]}  // Reset when deps change
  level="error"                   // 'error' or 'warning'
  onError={(error, componentStack) => {
    console.error('Caught error:', error)
  }}
>
  <YourComponent />
</ErrorBoundary>
```

## Example: ExecutionPanel Component

See [ExecutionPanel.tsx](src/components/builder/ExecutionPanel.tsx) for a complete example demonstrating:
- Pure function UI state derivation with `useMemo`
- Streaming execution with run ID cancellation
- Automatic ExecutionLedger recording
- Full error boundary integration
- Proper async cleanup
- State reset and retry logic

### Key Patterns:

```typescript
// 1. Pure state derivation - no side effects
const executionUIState = useMemo(() => ({
  isRunning: execution.isRunning(),
  isComplete: execution.status === 'success',
  // ... all computed from execution state
}), [execution])

// 2. Pure UI derivation
const streamingUIState = useMemo(() => 
  deriveUIState({ isStreaming, error, data, progress }),
  [isStreaming, error, data, progress]
)

// 3. Side effects properly isolated
const handleStart = useCallback(async () => {
  const runId = `run-${Date.now()}-${Math.random()...}`
  
  execution.startExecution(intent, input, agentId)
  
  await streaming.startStream(runId, async (signal) => {
    // fetch with signal for proper abort
    return await fetch('/api/execute', { signal })
  })
  
  // Record to ledger when complete
  await execution.completeExecution(runId, result, metrics)
}, [execution, streaming, intent, input])

// 4. Error boundary with recovery
<ErrorBoundary resetKeys={[projectId, userId, intent]}>
  {/* Component content */}
</ErrorBoundary>
```

## Testing

All patterns include comprehensive tests:

- **useStreamingExecution.test.ts**: 14 tests covering start, cancel, mount safety, error handling
- **useExecutionState.test.ts**: 17 tests for lifecycle, ledger integration, async helpers
- **ErrorBoundary.test.tsx**: 12 tests for error handling, recovery, and edge cases

Run tests:
```bash
npm test -- src/hooks/__tests__/useStreamingExecution.test.ts --run
npm test -- src/hooks/__tests__/useExecutionState.test.ts --run
npm test -- src/components/__tests__/ErrorBoundary.test.tsx --run
```

### E2E Tests

Playwright E2E tests in [e2e/streaming-execution.spec.ts](e2e/streaming-execution.spec.ts) cover:
- Streaming execution flow
- Cancellation behavior
- Stale update prevention
- Error boundary recovery
- Full integration scenarios

## Migration Guide

### From Old Pattern
```typescript
// Before: State, side effects, and rendering mixed
function OldComponent() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  
  useEffect(() => {
    setLoading(true)
    fetch('/api/stream')
      .then(r => r.json())
      .then(d => setData(d))
      .finally(() => setLoading(false))
  }, [])
  
  return <div>{loading ? 'Loading...' : data.length}</div>
}
```

### To New Pattern
```typescript
// After: Pure state derivation, proper cleanup, error handling
function NewComponent() {
  const streaming = useStreamingExecution({
    onComplete: () => console.log('Done')
  })
  
  const uiState = useMemo(() => 
    deriveUIState(streaming.state),
    [streaming.state]
  )
  
  const handleStart = useCallback(async () => {
    await streaming.startStream('run-123', async (signal) =>
      fetch('/api/stream', { signal }).then(r => r.body)
    )
  }, [streaming])
  
  return (
    <ErrorBoundary>
      <div>
        {uiState.isLoading && 'Loading...'}
        {uiState.resultCount} results
        <button onClick={handleStart}>Start</button>
      </div>
    </ErrorBoundary>
  )
}
```

## Performance Considerations

### Memoization
All pure functions are wrapped in `useMemo` with appropriate dependencies:
```typescript
const uiState = useMemo(() => deriveUIState(state), [
  state.isStreaming,
  state.error,
  state.data,
  state.progress,
])
```

### Callback Stability
Event handlers use `useCallback` to prevent unnecessary re-renders:
```typescript
const handleStart = useCallback(async () => {
  // implementation
}, [execution, streaming, intent, input])
```

### Streaming Optimization
- Chunks are processed incrementally, not accumulated all at once
- Progress updates use 0-100 range for linear UI updates
- Data array is pre-allocated when possible

## Debug Mode

All hooks support logging in development:
```typescript
const streaming = useStreamingExecution({
  onChunk: (chunk) => console.debug('Chunk:', chunk),
  onComplete: () => console.debug('Complete'),
  onError: (error) => console.error('Error:', error),
})
```

## Common Patterns

### Retry with Exponential Backoff
```typescript
const handleRetry = useCallback(async () => {
  execution.reset()
  streaming.reset()
  
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await handleStart()
      break
    } catch (error) {
      if (attempt < 2) {
        await new Promise(r => 
          setTimeout(r, 1000 * Math.pow(2, attempt))
        )
      } else {
        throw error
      }
    }
  }
}, [execution, streaming, handleStart])
```

### Cancel on Component Unmount
```typescript
useEffect(() => {
  return () => {
    streaming.cancelStream()
    execution.cancelExecution()
  }
}, [streaming, execution])
```

### Combine Multiple Streams
```typescript
const handleStartMultiple = useCallback(async () => {
  const runIds = [
    `run-1-${Date.now()}`,
    `run-2-${Date.now()}`,
    `run-3-${Date.now()}`
  ]
  
  await Promise.all(
    runIds.map(runId => 
      streaming.startStream(runId, async (signal) =>
        fetch(`/api/stream/${runId}`, { signal }).then(r => r.body)
      )
    )
  )
}, [streaming])
```

## Best Practices

1. **Always use run IDs**: Ensures proper cancellation and tracking
2. **Memoize pure functions**: Improves performance and makes testing easier
3. **Handle AbortError separately**: It's not a real error, just cancellation
4. **Use ErrorBoundary for all async components**: Catches unexpected errors
5. **Record all executions**: Every execution should be recorded to ExecutionLedger
6. **Clean up on unmount**: Always cancel streams and abort requests
7. **Test error paths**: Use mock fetch to test error handling
8. **Provide reset functionality**: Always allow users to retry after failure

## Troubleshooting

### Stale Updates After Unmount
**Problem**: Console warning about setting state on unmounted component
**Solution**: Ensure all `setState` calls are wrapped in `setSafeState` with `mountedRef` check

### Stream Not Canceling
**Problem**: Stream continues after component unmount
**Solution**: Verify `AbortSignal` is passed to fetch and handlers respect it

### Memory Leaks
**Problem**: Component not cleaning up resources
**Solution**: Check that all useEffect cleanup functions properly cancel requests and clear timeouts

### Error Boundary Not Catching
**Problem**: Error not caught by ErrorBoundary
**Solution**: Ensure error is thrown during render, not in event handler (use error state for that)
