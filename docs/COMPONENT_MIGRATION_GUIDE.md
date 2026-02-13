# Component Migration & Integration Guide

## Overview

This guide demonstrates how to migrate existing components (ChatPanel, ExecutionPanel, etc.) from legacy patterns to the new frontend architecture with proper hooks, performance monitoring, and analytics tracking.

## Migration Steps

### 1. Import New Hooks and Utilities

```typescript
import { useStreamingExecution, deriveUIState } from '@/hooks/useStreamingExecution'
import { useExecutionState } from '@/hooks/useExecutionState'
import ErrorBoundary from '@/components/ErrorBoundary'
import { usePerformanceMonitor, useMemoWithTracking } from '@/lib/performance/profiling'
import { useAnalyticsTracker } from '@/lib/analytics/tracking'
import { useChatExecution, deriveChatUIState } from '@/lib/chat/execution-service'
```

### 2. Replace Manual State Management

#### Before (Legacy Pattern):
```typescript
function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [liveMessage, setLiveMessage] = useState('')
  
  const controller = useRef(new AbortController())
  
  useEffect(() => {
    // Manual streaming logic
    fetch('/api/chat', { signal: controller.current.signal })
      .then(r => r.body?.getReader())
      .then(reader => {
        // Manual chunk parsing
        // Manual state updates
      })
  }, [])
}
```

#### After (New Pattern):
```typescript
function ChatPanel() {
  const { projectId, userId } = useBuilderStore()
  
  // Execution tracking with automatic ledger recording
  const execution = useExecutionState({
    projectId,
    userId,
    agentId: 'chat-agent',
    onExecutionComplete: (record) => {
      console.log('Chat recorded to ledger:', record)
    },
  })
  
  // Streaming with proper cancellation
  const streaming = useStreamingExecution({
    onChunk: (chunk) => console.log('Chunk received:', chunk),
    onComplete: () => console.log('Streaming done'),
    onError: (error) => execution.failExecution(execution.runId!, error),
  })
  
  // Pure UI state derivation
  const uiState = useMemoWithTracking(
    () => deriveUIState({
      isStreaming: streaming.isStreaming,
      error: streaming.error,
      data: streaming.data,
      progress: streaming.progress,
    }),
    [streaming.isStreaming, streaming.error, streaming.data, streaming.progress],
    'chatUiState'
  )
  
  // Analytics tracking
  const { trackExecution, trackEvent, trackPerformance } = useAnalyticsTracker('ChatPanel', userId)
  
  // Performance monitoring
  const { metrics } = usePerformanceMonitor('ChatPanel', true)
}
```

### 3. Replace Manual Stream Parsing

#### Before:
```typescript
const parseSSEStream = useCallback(async (reader) => {
  let buffer = ''
  const decoder = new TextDecoder()
  
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const chunk = JSON.parse(line.slice(6))
          handleChunk(chunk) // Manual handling
        } catch (e) {
          // Error handling
        }
      }
    }
  }
}, [])
```

#### After:
```typescript
const chat = useChatExecution({
  onChunk: (chunk) => {
    if (chunk.type === 'content') {
      // Handle content
    } else if (chunk.type === 'tool_call') {
      // Handle tool call
    }
  },
  onStatusChange: (status) => setStatus(status),
  onError: (error) => console.error(error),
})

// Use built-in parser
const result = await chat.parseSSEStream(reader)
```

### 4. Add Error Boundary Wrapper

```typescript
<ErrorBoundary
  resetKeys={[projectId, userId, chatId]} // Reset on prop changes
  level="error"
  fallback={(error, reset) => (
    <div className="error-boundary">
      <h3>Chat Error</h3>
      <p>{error?.message}</p>
      <button onClick={reset}>Retry</button>
    </div>
  )}
  onError={(error, componentStack) => {
    trackEvent({
      event: 'error_caught',
      metadata: { error: error.message, componentStack },
    })
  }}
>
  <YourChatComponent />
</ErrorBoundary>
```

### 5. Implement Proper Async Cleanup

```typescript
useEffect(() => {
  // Cleanup is automatic with hooks
  return () => {
    // mounting cleanup
    streaming.cancelStream()
    execution.cancelExecution()
  }
}, [streaming, execution])
```

### 6. Track Metrics

```typescript
useEffect(() => {
  if (execution.status === 'success' && execution.metrics) {
    trackExecution({
      runId: execution.runId!,
      projectId,
      userId,
      agentId: 'chat-agent',
      executionTime: execution.metrics.duration,
      status: 'success',
      cost: execution.metrics.cost,
      tokensUsed: execution.metrics.tokensUsed,
      toolCalls: execution.metrics.toolCalls,
      retryCount: 0,
    })
  }
}, [execution.status])
```

## Running Tests

### Unit Tests
```bash
# Test streaming execution
npm test -- src/hooks/__tests__/useStreamingExecution.test.ts --run

# Test execution state
npm test -- src/hooks/__tests__/useExecutionState.test.ts --run

# Test error boundary
npm test -- src/components/__tests__/ErrorBoundary.test.tsx --run
```

### E2E Tests

#### Local Development
```bash
npm run test:e2e
```

#### Staging Environment
```bash
PLAYWRIGHT_ENV=staging \
STAGING_URL=https://staging.torbit.dev \
E2E_AUTH_TOKEN=your_token \
npm run test:e2e
```

#### Production Testing
```bash
PLAYWRIGHT_ENV=production \
PRODUCTION_URL=https://torbit.dev \
E2E_AUTH_TOKEN=your_token \
npm run test:e2e
```

### Storybook Development

```bash
# View component stories
npm run storybook

# Build storybook for deployment
npm run build-storybook
```

## Performance Monitoring

### Enable Development Profiling

In your component:
```typescript
import { usePerformanceMonitor } from '@/lib/performance/profiling'

function MyComponent() {
  const { metrics, recordMemoHit, recordMemoMiss } = usePerformanceMonitor('MyComponent')
  
  // In console:
  // window.__GET_PERFORMANCE_METRICS() - Get all metrics
  // window.__GET_METRIC('MyComponent') - Get specific component
  // window.__CLEAR_PERFORMANCE_METRICS() - Clear all metrics
}
```

### Track Memoization

```typescript
import { useMemoWithTracking } from '@/lib/performance/profiling'

const uiState = useMemoWithTracking(
  () => deriveUIState(state),
  [state.isStreaming, state.error, state.data, state.progress],
  'uiStateDerivation'
)
```

### Custom Timing

```typescript
import { usePerformanceMark } from '@/lib/performance/profiling'

function MyComponent() {
  const { start, end } = usePerformanceMark('dataFetch')
  
  const handleFetch = useCallback(async () => {
    start()
    const data = await fetch('/api/data').then(r => r.json())
    end()
  }, [start, end])
}
```

## Analytics Integration

### Enable in App

```typescript
// app.tsx or layout.tsx
import { enableAnalytics } from '@/lib/analytics/tracking'

useEffect(() => {
  enableAnalytics()
}, [])
```

### Track Execution Metrics

```typescript
const { trackExecution } = useAnalyticsTracker('ChatPanel', userId)

// When execution completes:
trackExecution({
  runId: execution.runId!,
  projectId,
  userId,
  agentId: 'chat-agent',
  executionTime: execution.getDuration() || 0,
  status: execution.status as 'success' | 'error' | 'cancelled',
  cost: execution.metrics?.cost || 0,
  tokensUsed: execution.metrics?.tokensUsed || 0,
  toolCalls: execution.metrics?.toolCalls || 0,
  errorType: execution.error?.constructor.name,
  errorMessage: execution.error?.message,
  retryCount: retries,
})
```

### Track User Events

```typescript
const { trackEvent } = useAnalyticsTracker('ChatPanel', userId)

trackEvent({
  event: 'chat_message_sent',
  projectId,
  metadata: {
    messageLength: message.length,
    hasAttachments: files.length > 0,
  },
})
```

### Track Performance

```typescript
const { trackPerformance } = useAnalyticsTracker('ChatPanel', userId)

trackPerformance({
  componentName: 'ChatPanel',
  renderTime: metrics.lastRenderTime,
  memoHits: metrics.memoHits,
  memoMisses: metrics.memoMisses,
})
```

## Common Migration Patterns

### Pattern 1: Simple Streaming Component

```typescript
import { useStreamingExecution, deriveUIState } from '@/hooks/useStreamingExecution'
import ErrorBoundary from '@/components/ErrorBoundary'

function SimpleStream() {
  const streaming = useStreamingExecution()
  const uiState = useMemo(
    () => deriveUIState({ isStreaming: streaming.isStreaming, ... }),
    [streaming.isStreaming, ...]
  )

  return (
    <ErrorBoundary>
      {uiState.isLoading && <Loading />}
      {uiState.isComplete && <Results data={streaming.data} />}
      {uiState.isFailed && <Error error={streaming.error} />}
      <button onClick={() => streaming.startStream('run-1', fetch)}>
        Start
      </button>
    </ErrorBoundary>
  )
}
```

### Pattern 2: Execution Tracking

```typescript
function TrackedExecution() {
  const execution = useExecutionState({
    projectId,
    userId,
    agentId,
    onExecutionComplete: (record) => {
      console.log('Execution recorded:', record)
    },
  })

  const handleExecute = useCallback(async () => {
    const runId = execution.startExecution('My Task', { ... })
    
    try {
      const result = await doWork()
      await execution.completeExecution(runId, result, {
        cost: 100,
        duration: 5000,
        tokensUsed: 500,
        toolCalls: 2,
      })
    } catch (error) {
      await execution.failExecution(runId, error as Error)
    }
  }, [execution])

  return <button onClick={handleExecute}>Execute</button>
}
```

### Pattern 3: Streaming + Execution + Error Boundary

```typescript
function FullStack() {
  const streaming = useStreamingExecution()
  const execution = useExecutionState({ projectId, userId, agentId })
  const { trackExecution, trackEvent } = useAnalyticsTracker('FullStack', userId)

  const uiState = useMemo(
    () => deriveUIState({ ... }),
    [streaming.isStreaming, ...]
  )

  const handleStart = useCallback(async () => {
    const runId = execution.startExecution('Task', {})
    trackEvent({ event: 'task_started' })

    try {
      await streaming.startStream(runId, async (signal) =>
        fetch('/api/task', { signal }).then(r => r.body)
      )

      await execution.completeExecution(runId, streaming.data, {
        cost: 100,
        duration: execution.getDuration() || 0,
        tokensUsed: streaming.data.length * 50,
        toolCalls: 0,
      })

      trackExecution({
        runId,
        projectId,
        userId,
        agentId: 'task-agent',
        executionTime: execution.getDuration() || 0,
        status: 'success',
        cost: 100,
        tokensUsed: 0,
        toolCalls: 0,
        retryCount: 0,
      })
    } catch (error) {
      execution.failExecution(runId, error as Error)
      trackEvent({
        event: 'task_failed',
        metadata: { error: (error as Error).message },
      })
    }
  }, [streaming, execution, trackExecution, trackEvent])

  return (
    <ErrorBoundary resetKeys={[userId]} level="error">
      {uiState.isLoading && <div>Processing...</div>}
      {uiState.isComplete && <div>Done!</div>}
      {uiState.isFailed && <div>Error: {uiState.errorMessage}</div>}
      <button onClick={handleStart}>Start</button>
    </ErrorBoundary>
  )
}
```

## Debugging

### Enable Debug Logging

Set environment variable in development:
```bash
NEXT_PUBLIC_DEBUG_HOOKS=true
```

Then in code:
```typescript
if (process.env.NEXT_PUBLIC_DEBUG_HOOKS) {
  console.debug('[HOOK] State changed:', { ... })
}
```

### React DevTools Integration

1. Open React DevTools
2. Go to "Profiler" tab
3. Check `__PERFORMANCE_METRICS` in console:
   ```javascript
   window.__GET_PERFORMANCE_METRICS()
   ```

### Playwright Debugging

```bash
# Run with headed browser
PLAYWRIGHT_DEBUG=true npm run test:e2e

# Step through tests
npx playwright test --debug

# Generate trace for failed tests (auto-included)
# Open trace viewer
npx playwright show-trace test-results/trace.zip
```

## Troubleshooting

### Issue: Stale Updates After Unmount
**Solution**: All state updates should go through `setSafeState` or be in hook (done automatically)

### Issue: Stream Not Cancelling
**Solution**: Ensure AbortSignal is passed to fetch and respected

### Issue: Memory Leaks
**Solution**: Check cleanup in useEffect, verify AbortControllers cleared

### Issue: Performance Degradation
**Solution**: Check memoization with `window.__GET_PERFORMANCE_METRICS()`

## Next Steps

1. **Migrate ChatPanel**: Use `useChatExecution` for streaming
2. **Add Web Workers**: Offload heavy computation
3. **Implement Offline Mode**: Queue analytics in IndexedDB
4. **Add Real-time Collaboration**: Sync execution state across clients
5. **Setup Monitoring**: Send analytics to backend dashboard

---

See [FRONTEND_ARCHITECTURE.md](FRONTEND_ARCHITECTURE.md) for API reference and [EXECUTION_LEDGER.md](EXECUTION_LEDGER.md) for ledger integration.
