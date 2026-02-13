# Write-Once Execution Ledger

A comprehensive append-only logging system for tracking all agent executions in Torbit. This system records immutable execution records including cost, trace, input/output, and final status for audit, cost tracking, and execution analysis.

## Overview

The execution ledger provides:

- **Append-Only Design**: Records cannot be updated or deleted, only inserted
- **Comprehensive Tracking**: Captures run ID, agent, intent, input, output, cost breakdown, and execution trace
- **Cost Accounting**: Integrates with CostManager for detailed cost tracking per execution
- **Status Recording**: Tracks completion status (completed, failed, aborted)
- **Analytics**: Provides aggregation queries for cost analysis and execution statistics
- **Audit Trail**: Full immutable record for compliance and debugging

## Database Schema

Created in `supabase/migrations/20260213_create_execution_ledger.sql`:

```sql
CREATE TABLE public.execution_ledger (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id TEXT NOT NULL UNIQUE,           -- Unique execution identifier
  project_id UUID REFERENCES public.projects(id) ON DELETE RESTRICT NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT NOT NULL,
  agent_id TEXT NOT NULL,                -- Agent that performed execution (backend, frontend, etc.)
  intent TEXT NOT NULL,                  -- What the user intended (Deploy service, Scale database, etc.)
  input JSONB NOT NULL,                  -- Input parameters to the execution
  output JSONB,                          -- Execution result(s)
  cost_json JSONB NOT NULL,              -- Cost breakdown {total, breakdown: {tokens, toolCalls, externalRequests, penalties}}
  execution_trace_json JSONB NOT NULL,   -- Trace with steps, duration, tool calls, etc.
  status TEXT NOT NULL CHECK (status IN ('completed', 'failed', 'aborted')),
  error_message TEXT,                    -- Error message if failed/aborted
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_execution_ledger_run_id ON public.execution_ledger(run_id);
CREATE INDEX idx_execution_ledger_project ON public.execution_ledger(project_id, created_at DESC);
CREATE INDEX idx_execution_ledger_user ON public.execution_ledger(user_id, created_at DESC);
CREATE INDEX idx_execution_ledger_agent ON public.execution_ledger(agent_id, created_at DESC);
CREATE INDEX idx_execution_ledger_status ON public.execution_ledger(status, created_at DESC);
CREATE INDEX idx_execution_ledger_costs ON public.execution_ledger(agent_id, created_at DESC) INCLUDE (cost_json);

-- Row Level Security
ALTER TABLE public.execution_ledger ENABLE ROW LEVEL SECURITY;

-- Users can only read their own project's execution ledgers
CREATE POLICY "Users can read own project execution ledger"
  ON public.execution_ledger
  FOR SELECT
  USING (user_id = auth.uid());

-- Prevent any updates or deletes (append-only)
CREATE POLICY "Prevent updates to execution ledger"
  ON public.execution_ledger
  FOR UPDATE
  USING (false);

CREATE POLICY "Prevent deletes from execution ledger"
  ON public.execution_ledger
  FOR DELETE
  USING (false);
```

## Access Layer API

Located in `src/lib/execution-ledger/ledger.ts`:

### Core Functions

```typescript
// Record a new execution (append-only)
recordExecution(execution: ExecutionInput): Promise<ExecutionRecord>

// Retrieve an execution by run ID
getExecutionByRunId(runId: string): Promise<ExecutionRecord | null>

// List executions for a project with pagination
listExecutionsByProject(projectId: string, limit?: number, offset?: number): Promise<{ data: ExecutionRecord[]; total: number }>

// List executions by agent
listExecutionsByAgent(agentId: string, projectId?: string, limit?: number, offset?: number): Promise<{ data: ExecutionRecord[]; total: number }>

// Get cost statistics for an agent over time
getAgentCostStats(agentId: string, projectId?: string, startDate?: Date, endDate?: Date): Promise<CostStats>

// Get comprehensive project execution statistics
getProjectExecutionStats(projectId: string, startDate?: Date, endDate?: Date): Promise<ExecutionStats>

// Get failed/aborted executions for debugging
getFailedExecutions(projectId?: string, limit?: number): Promise<ExecutionRecord[]>

// Stream executions for bulk analysis
streamExecutions(filter: ExecutionFilter): AsyncGenerator<ExecutionRecord>

// Export executions to CSV format
exportExecutionsToCSV(projectId: string, startDate?: Date, endDate?: Date): Promise<string>
```

### Types

```typescript
interface ExecutionRecord {
  id: string
  run_id: string
  project_id: string
  user_id: string
  agent_id: string
  intent: string
  input: Record<string, unknown>
  output?: Record<string, unknown>
  cost_json: ExecutionCost
  execution_trace_json: ExecutionTrace
  status: ExecutionStatus
  error_message?: string
  created_at: string
}

interface ExecutionCost {
  total: number // Total cost in cents
  breakdown: {
    tokens?: number
    toolCalls?: number
    externalRequests?: number
    penalties?: number
  }
}

interface ExecutionTrace {
  steps: ExecutionStep[]
  duration_ms: number
  tool_calls?: number
  api_calls?: number
}

interface ExecutionStats {
  total_executions: number
  successful: number
  failed: number
  aborted: number
  total_cost: number
  avg_cost: number
  avg_duration_ms: number
  by_agent: Record<string, { count: number; cost: number }>
}

type ExecutionStatus = 'completed' | 'failed' | 'aborted'
```

## Integration Examples

### Example 1: Record a Successful Execution

```typescript
import { recordExecution, initializeExecutionLedger } from '@/lib/execution-ledger/ledger'
import { createClient } from '@supabase/supabase-js'

const client = createClient(url, key)
initializeExecutionLedger(client)

// After successful execution
const record = await recordExecution({
  run_id: 'run-12345-abc',
  project_id: 'proj-001',
  user_id: 'user-001',
  agent_id: 'backend',
  intent: 'Deploy microservice to production',
  input: {
    service: 'user-api',
    version: 'v2.1.0',
    environment: 'production',
  },
  output: {
    deployed: true,
    url: 'https://user-api.example.com',
    instances: 3,
    health_check: 'passing',
  },
  cost: {
    total: 850, // $8.50
    breakdown: {
      tokens: 300,
      toolCalls: 450,
      externalRequests: 100,
    },
  },
  execution_trace: {
    steps: [
      {
        timestamp: '2026-02-13T10:30:00Z',
        action: 'validate_service',
        duration_ms: 250,
        result: 'success',
      },
      {
        timestamp: '2026-02-13T10:30:01Z',
        action: 'build_docker_image',
        duration_ms: 3000,
        result: 'success',
      },
      {
        timestamp: '2026-02-13T10:30:05Z',
        action: 'push_to_registry',
        duration_ms: 1500,
        result: 'success',
      },
      {
        timestamp: '2026-02-13T10:30:07Z',
        action: 'deploy_kubernetes',
        duration_ms: 2000,
        result: 'success',
      },
    ],
    duration_ms: 6750,
    tool_calls: 8,
    api_calls: 12,
  },
  status: 'completed',
})

console.log(`Execution recorded: ${record.id}`)
```

### Example 2: Record a Failed Execution

```typescript
const failedRecord = await recordExecution({
  run_id: 'run-failed-001',
  project_id: 'proj-001',
  user_id: 'user-001',
  agent_id: 'database',
  intent: 'Migrate schema with data validation',
  input: {
    migration_id: 'migration-2026-02-001',
    tables: ['users', 'profiles', 'settings'],
  },
  cost: {
    total: 250, // Partial execution
    breakdown: { tokens: 100, toolCalls: 150 },
  },
  execution_trace: {
    steps: [
      {
        timestamp: '2026-02-13T11:00:00Z',
        action: 'backup_database',
        duration_ms: 5000,
        result: 'success',
      },
      {
        timestamp: '2026-02-13T11:00:06Z',
        action: 'validate_and_migrate',
        duration_ms: 2000,
        error: 'Constraint violation on users.email UNIQUE index',
      },
    ],
    duration_ms: 7000,
  },
  status: 'failed',
  error_message: 'Database migration failed: Constraint violation on users.email UNIQUE index. Changes rolled back.',
})
```

### Example 3: Record Execution Aborted by Cost Limit

```typescript
const abortedRecord = await recordExecution({
  run_id: 'run-aborted-001',
  project_id: 'proj-001',
  user_id: 'user-001',
  agent_id: 'devops',
  intent: 'Full infrastructure audit and optimization',
  input: {
    audit_type: 'comprehensive',
    include_optimization: true,
  },
  cost: {
    total: 10000, // $100 spent
    breakdown: {
      tokens: 4000,
      toolCalls: 4000,
      externalRequests: 2000,
    },
  },
  execution_trace: {
    steps: [
      {
        timestamp: '2026-02-13T12:00:00Z',
        action: 'audit_compute_resources',
        duration_ms: 3000,
        result: 'success',
      },
      {
        timestamp: '2026-02-13T12:00:04Z',
        action: 'audit_networking',
        duration_ms: 2000,
        result: 'success',
      },
    ],
    duration_ms: 5000,
    tool_calls: 12,
  },
  status: 'aborted',
  error_message: 'Execution aborted: Budget exceeded. Allocated: $50.00, Spent: $100.00',
})
```

### Example 4: Query Cost Statistics

```typescript
// Get cost stats for backend agent over the last week
const stats = await getAgentCostStats(
  'backend',
  'proj-001',
  new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
  new Date() // Now
)

console.log(`Backend executions last week:`)
console.log(`- Count: ${stats.count}`)
console.log(`- Total cost: $${(stats.total_cost / 100).toFixed(2)}`)
console.log(`- Average cost: $${(stats.avg_cost / 100).toFixed(2)}`)
console.log(`- Min: $${(stats.min_cost / 100).toFixed(2)}, Max: $${(stats.max_cost / 100).toFixed(2)}`)
```

### Example 5: Project Analytics

```typescript
// Get comprehensive project statistics
const stats = await getProjectExecutionStats('proj-001')

console.log(`Project Statistics:`)
console.log(`- Total executions: ${stats.total_executions}`)
console.log(`- Successful: ${stats.successful} (${((stats.successful / stats.total_executions) * 100).toFixed(1)}%)`)
console.log(`- Failed: ${stats.failed}`)
console.log(`- Aborted: ${stats.aborted}`)
console.log(`- Total cost: $${(stats.total_cost / 100).toFixed(2)}`)
console.log(`- Average cost: $${(stats.avg_cost / 100).toFixed(2)}`)
console.log(`- Average duration: ${stats.avg_duration_ms}ms`)

console.log(`By Agent:`)
for (const [agent, data] of Object.entries(stats.by_agent)) {
  console.log(`- ${agent}: ${data.count} executions, $${(data.cost / 100).toFixed(2)} total`)
}
```

### Example 6: Export for Analysis

```typescript
// Export all executions from the last month as CSV
const csv = await exportExecutionsToCSV(
  'proj-001',
  new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  new Date()
)

// Save to file
import fs from 'fs'
fs.writeFileSync('executions-report.csv', csv)
```

### Example 7: Stream Large Result Sets

```typescript
// Process all failed executions in a project
let failureCount = 0
let totalCost = 0

for await (const execution of streamExecutions({
  projectId: 'proj-001',
  status: 'failed',
})) {
  failureCount++
  totalCost += execution.cost_json.total
  console.log(`Failed: ${execution.run_id} - ${execution.error_message}`)
}

console.log(`Total failures: ${failureCount}, Total cost: $${(totalCost / 100).toFixed(2)}`)
```

## Integration with Cost Manager

The execution ledger works seamlessly with the CostManager for comprehensive cost tracking:

```typescript
import { getCostManager } from '@/lib/costs/costManager'
import { recordExecution, initializeExecutionLedger } from '@/lib/execution-ledger/ledger'

// During execution
const costManager = getCostManager()
const runId = 'run-' + Date.now()

costManager.createExecution(runId, 'backend', 5000) // $50 budget

try {
  // Execute operations
  costManager.accountTokens(runId, 10000, 15000)
  costManager.accountToolCall(runId, 'deployService')
  costManager.accountExternalRequest(runId, 'stripe', 3)

  // Check budget
  if (costManager.isBudgetExceeded(runId)) {
    throw new BudgetExceededError(...)
  }

  // Record successful execution
  const metrics = costManager.getMetrics(runId)
  await recordExecution({
    run_id: runId,
    project_id: 'proj-001',
    user_id: 'user-001',
    agent_id: 'backend',
    intent: 'Deploy service',
    input: { /* ... */ },
    output: { /* ... */ },
    cost: {
      total: metrics.totalCost,
      breakdown: {
        tokens: metrics.tokensCost,
        toolCalls: metrics.toolCallsCost,
        externalRequests: metrics.externalRequestsCost,
        penalties: metrics.penaltiesCost,
      },
    },
    execution_trace: { /* ... */ },
    status: 'completed',
  })
} catch (error) {
  await recordExecution({
    run_id: runId,
    project_id: 'proj-001',
    user_id: 'user-001',
    agent_id: 'backend',
    intent: 'Deploy service',
    input: { /* ... */ },
    cost: costManager.getMetrics(runId).totalCost,
    execution_trace: { /* ... */ },
    status: 'failed',
    error_message: error.message,
  })
}
```

## Test Coverage

Comprehensive test suite with 22 tests covering:

- ✅ Initialization and client setup
- ✅ Record execution (successful, failed, aborted)
- ✅ Retrieve by run ID (found, not found, errors)
- ✅ Listing by project and agent (pagination)
- ✅ Cost statistics (calculations, empty sets)
- ✅ Project analytics (status counts, agent breakdown)
- ✅ Failed/aborted execution retrieval
- ✅ CSV export (with headers, error handling)
- ✅ Cost breakdown tracking
- ✅ Execution trace recording
- ✅ Append-only integrity (duplicate prevention)

Run tests:
```bash
npx vitest run src/lib/execution-ledger/__tests__/ledger.test.ts
```

## Security & Compliance

- **RLS Policies**: Users can only read executions from their own projects
- **Immutable Records**: No updates or deletes allowed
- **Audit Trail**: Complete record of all executions with timestamps
- **Cost Tracking**: Detailed cost breakdown for billing and allocation
- **Error Recording**: Failed/aborted executions logged with error messages
- **Unique Run IDs**: Prevents duplicate execution records

## Performance Considerations

- **Indexed Queries**: Run ID, project, user, agent, status, and timing all indexed
- **Covering Index**: Cost aggregation uses covering index for efficient analytics
- **Pagination**: All list queries support pagination for large result sets
- **Streaming**: Async generator for processing large datasets without loading into memory
- **Partitioning**: Ready for time-based partitioning as table grows

## Future Enhancements

- Execution dependency tracking (run A triggered run B)
- Tool-level cost attribution within traces
- Custom cost allocation rules by agent/project
- Execution replay logs for debugging
- Anomaly detection on cost or runtime patterns
- Integration with cost attribution UI dashboard
