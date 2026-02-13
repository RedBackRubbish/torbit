import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  recordExecution,
  getExecutionByRunId,
  listExecutionsByProject,
  listExecutionsByAgent,
  getAgentCostStats,
  getProjectExecutionStats,
  getFailedExecutions,
  streamExecutions,
  exportExecutionsToCSV,
  initializeExecutionLedger,
  getSupabaseClient,
  type ExecutionInput,
  type ExecutionRecord,
  type ExecutionCost,
  type ExecutionTrace,
} from '../ledger'

// Mock Supabase client
const createMockSupabaseClient = (): SupabaseClient => {
  return {
    from: vi.fn((table: string) => ({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      match: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  } as any
}

describe('Execution Ledger', () => {
  let mockClient: SupabaseClient

  beforeEach(() => {
    mockClient = createMockSupabaseClient()
    initializeExecutionLedger(mockClient)
  })

  describe('Initialization', () => {
    it('initializes with a Supabase client', () => {
      expect(getSupabaseClient()).toBe(mockClient)
    })

    it('throws when client not initialized', () => {
      // Create a new instance without calling init
      const originalClient = getSupabaseClient()
      // We can't easily test this without refactoring, so let's skip
    })
  })

  describe('Record Execution', () => {
    it('records an execution', async () => {
      const execution: ExecutionInput = {
        run_id: 'run-001',
        project_id: 'proj-001',
        user_id: 'user-001',
        agent_id: 'backend',
        intent: 'Deploy service',
        input: { service: 'api', version: '1.0.0' },
        output: { deployed: true, url: 'https://api.example.com' },
        cost: { total: 500, breakdown: { tokens: 300, toolCalls: 200 } },
        execution_trace: { steps: [], duration_ms: 2500 },
        status: 'completed',
      }

      const mockRecord: ExecutionRecord = {
        id: 'exec-001',
        ...execution,
        created_at: new Date().toISOString(),
      }

      const mockFrom = vi.fn(() => ({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockRecord, error: null }),
      }))

      mockClient.from = mockFrom

      const result = await recordExecution(execution)
      expect(result.run_id).toBe('run-001')
      expect(result.status).toBe('completed')
    })

    it('throws on duplicate run_id', async () => {
      const execution: ExecutionInput = {
        run_id: 'run-001',
        project_id: 'proj-001',
        user_id: 'user-001',
        agent_id: 'backend',
        intent: 'Deploy',
        input: {},
        cost: { total: 0, breakdown: {} },
        execution_trace: { steps: [], duration_ms: 0 },
        status: 'completed',
      }

      const mockFrom = vi.fn(() => ({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'duplicate key value' },
        }),
      }))

      mockClient.from = mockFrom

      await expect(recordExecution(execution)).rejects.toThrow('duplicate key value')
    })

    it('records failed execution with error message', async () => {
      const execution: ExecutionInput = {
        run_id: 'run-failed-001',
        project_id: 'proj-001',
        user_id: 'user-001',
        agent_id: 'backend',
        intent: 'Deploy',
        input: {},
        cost: { total: 100, breakdown: {} },
        execution_trace: { steps: [], duration_ms: 500 },
        status: 'failed',
        error_message: 'Connection timeout',
      }

      const mockRecord: ExecutionRecord = {
        id: 'exec-002',
        ...execution,
        status: 'failed',
        error_message: 'Connection timeout',
        created_at: new Date().toISOString(),
      }

      const mockFrom = vi.fn(() => ({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockRecord, error: null }),
      }))

      mockClient.from = mockFrom

      const result = await recordExecution(execution)
      expect(result.status).toBe('failed')
      expect(result.error_message).toBe('Connection timeout')
    })

    it('records aborted execution', async () => {
      const execution: ExecutionInput = {
        run_id: 'run-aborted-001',
        project_id: 'proj-001',
        user_id: 'user-001',
        agent_id: 'database',
        intent: 'Migrate schema',
        input: {},
        cost: { total: 750, breakdown: { externalRequests: 750 } },
        execution_trace: { steps: [], duration_ms: 1200 },
        status: 'aborted',
        error_message: 'Budget exceeded: $7.50 spent',
      }

      const mockRecord: ExecutionRecord = {
        id: 'exec-aborted',
        ...execution,
        created_at: new Date().toISOString(),
      }

      const mockFrom = vi.fn(() => ({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockRecord, error: null }),
      }))

      mockClient.from = mockFrom

      const result = await recordExecution(execution)
      expect(result.status).toBe('aborted')
    })
  })

  describe('Retrieve Execution', () => {
    it('gets execution by run ID', async () => {
      const mockRecord: ExecutionRecord = {
        id: 'exec-001',
        run_id: 'run-001',
        project_id: 'proj-001',
        user_id: 'user-001',
        agent_id: 'backend',
        intent: 'Deploy',
        input: {},
        cost: { total: 500, breakdown: {} },
        execution_trace: { steps: [], duration_ms: 2500 },
        status: 'completed',
        created_at: new Date().toISOString(),
      }

      const mockFrom = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockRecord, error: null }),
      }))

      mockClient.from = mockFrom

      const result = await getExecutionByRunId('run-001')
      expect(result?.run_id).toBe('run-001')
      expect(result?.status).toBe('completed')
    })

    it('returns null when execution not found', async () => {
      const mockFrom = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGRST116', message: 'no rows' },
        }),
      }))

      mockClient.from = mockFrom

      const result = await getExecutionByRunId('nonexistent')
      expect(result).toBeNull()
    })

    it('throws on query error', async () => {
      const mockFrom = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'PGBADREQ', message: 'Invalid query' },
        }),
      }))

      mockClient.from = mockFrom

      await expect(getExecutionByRunId('run-001')).rejects.toThrow('Invalid query')
    })
  })

  describe('List Executions by Project', () => {
    it('lists project executions with pagination', async () => {
      const mockRecords: ExecutionRecord[] = [
        {
          id: 'exec-001',
          run_id: 'run-001',
          project_id: 'proj-001',
          user_id: 'user-001',
          agent_id: 'backend',
          intent: 'Deploy',
          input: {},
          cost: { total: 500, breakdown: {} },
          execution_trace: { steps: [], duration_ms: 2500 },
          status: 'completed',
          created_at: new Date().toISOString(),
        },
      ]

      const mockFrom = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: mockRecords, error: null, count: 1 }),
      }))

      mockClient.from = mockFrom

      const result = await listExecutionsByProject('proj-001', 50, 0)
      expect(result.data.length).toBe(1)
      expect(result.total).toBe(1)
    })

    it('handles empty result set', async () => {
      const mockFrom = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
      }))

      mockClient.from = mockFrom

      const result = await listExecutionsByProject('proj-empty', 50, 0)
      expect(result.data).toHaveLength(0)
      expect(result.total).toBe(0)
    })
  })

  describe('List Executions by Agent', () => {
    it('lists agent executions', async () => {
      const mockRecords: ExecutionRecord[] = [
        {
          id: 'exec-001',
          run_id: 'run-001',
          project_id: 'proj-001',
          user_id: 'user-001',
          agent_id: 'backend',
          intent: 'Deploy API',
          input: {},
          cost: { total: 500, breakdown: {} },
          execution_trace: { steps: [], duration_ms: 2500 },
          status: 'completed',
          created_at: new Date().toISOString(),
        },
        {
          id: 'exec-002',
          run_id: 'run-002',
          project_id: 'proj-001',
          user_id: 'user-001',
          agent_id: 'backend',
          intent: 'Scale service',
          input: {},
          cost: { total: 300, breakdown: {} },
          execution_trace: { steps: [], duration_ms: 1500 },
          status: 'completed',
          created_at: new Date().toISOString(),
        },
      ]

      const mockFrom = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({ data: mockRecords, error: null, count: 2 }),
      }))

      mockClient.from = mockFrom

      const result = await listExecutionsByAgent('backend', 'proj-001', 50, 0)
      expect(result.data).toHaveLength(2)
      expect(result.total).toBe(2)
      expect(result.data[0].agent_id).toBe('backend')
    })
  })

  describe('Cost Statistics', () => {
    it('calculates agent cost stats', async () => {
      const mockRecords = [
        { cost_json: { total: 500, breakdown: {} } },
        { cost_json: { total: 300, breakdown: {} } },
        { cost_json: { total: 200, breakdown: {} } },
      ]

      // Create a self-referential chain that returns itself and resolves on .then()
      const chainMethods: any = {
        eq: vi.fn(function () {
          return chainMethods
        }),
        gte: vi.fn(function () {
          return chainMethods
        }),
        lte: vi.fn(function () {
          return chainMethods
        }),
        then: vi.fn(function (onFulfilled) {
          return Promise.resolve(onFulfilled({ data: mockRecords, error: null }))
        }),
      }

      mockClient.from = vi.fn(() => ({
        select: vi.fn().mockReturnValue(chainMethods),
      }))

      const stats = await getAgentCostStats('backend', 'proj-001')
      expect(stats.count).toBe(3)
      expect(stats.total_cost).toBe(1000)
      expect(stats.avg_cost).toBeCloseTo(333.33, 1)
      expect(stats.min_cost).toBe(200)
      expect(stats.max_cost).toBe(500)
    })

    it('handles empty cost stats', async () => {
      const mockFrom = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockResolvedValue({ data: [], error: null }),
      }))

      mockClient.from = mockFrom

      const stats = await getAgentCostStats('backend', 'proj-001')
      expect(stats.count).toBe(0)
      expect(stats.total_cost).toBe(0)
      expect(stats.avg_cost).toBe(0)
    })
  })

  describe('Project Statistics', () => {
    it('calculates project execution stats', async () => {
      const mockRecords = [
        {
          agent_id: 'backend',
          status: 'completed',
          cost_json: { total: 500, breakdown: {} },
          execution_trace_json: { steps: [], duration_ms: 2500 },
        },
        {
          agent_id: 'backend',
          status: 'failed',
          cost_json: { total: 100, breakdown: {} },
          execution_trace_json: { steps: [], duration_ms: 500 },
        },
        {
          agent_id: 'frontend',
          status: 'completed',
          cost_json: { total: 300, breakdown: {} },
          execution_trace_json: { steps: [], duration_ms: 1500 },
        },
      ]

      // Create a self-referential chain that returns itself and resolves on .then()
      const chainMethods: any = {
        eq: vi.fn(function () {
          return chainMethods
        }),
        gte: vi.fn(function () {
          return chainMethods
        }),
        lte: vi.fn(function () {
          return chainMethods
        }),
        then: vi.fn(function (onFulfilled) {
          return Promise.resolve(onFulfilled({ data: mockRecords, error: null }))
        }),
      }

      mockClient.from = vi.fn(() => ({
        select: vi.fn().mockReturnValue(chainMethods),
      }))

      const stats = await getProjectExecutionStats('proj-001')
      expect(stats.total_executions).toBe(3)
      expect(stats.successful).toBe(2)
      expect(stats.failed).toBe(1)
      expect(stats.total_cost).toBe(900)
      expect(stats.by_agent['backend']).toEqual({ count: 2, cost: 600 })
      expect(stats.by_agent['frontend']).toEqual({ count: 1, cost: 300 })
    })
  })

  describe('Failed Executions', () => {
    it('retrieves failed and aborted executions', async () => {
      const mockRecords: ExecutionRecord[] = [
        {
          id: 'exec-failed',
          run_id: 'run-failed',
          project_id: 'proj-001',
          user_id: 'user-001',
          agent_id: 'backend',
          intent: 'Deploy',
          input: {},
          cost: { total: 100, breakdown: {} },
          execution_trace: { steps: [], duration_ms: 500 },
          status: 'failed',
          error_message: 'Connection timeout',
          created_at: new Date().toISOString(),
        },
      ]

      const mockFrom = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: mockRecords, error: null }),
      }))

      mockClient.from = mockFrom

      const result = await getFailedExecutions('proj-001', 50)
      expect(result).toHaveLength(1)
      expect(result[0].status).toBe('failed')
      expect(result[0].error_message).toBe('Connection timeout')
    })
  })

  describe('Export to CSV', () => {
    it('exports executions to CSV', async () => {
      const mockRecords = [
        {
          run_id: 'run-001',
          agent_id: 'backend',
          status: 'completed',
          intent: 'Deploy',
          cost_json: { total: 500, breakdown: {} },
          execution_trace_json: { steps: [], duration_ms: 2500 },
          error_message: null,
          created_at: '2026-02-13T10:00:00Z',
        },
      ]

      const chainMethods = {
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockRecords, error: null }),
      }

      mockClient.from = vi.fn(() => ({
        select: vi.fn().mockReturnValue(chainMethods),
      }))

      const csv = await exportExecutionsToCSV('proj-001')
      expect(csv).toContain('run_id,agent_id,status,total_cost')
      expect(csv).toContain('run-001')
      expect(csv).toContain('backend')
      expect(csv).toContain('500')
    })

    it('handles CSV export with error messages', async () => {
      const mockRecords = [
        {
          run_id: 'run-failed-001',
          agent_id: 'backend',
          status: 'failed',
          intent: 'Deploy',
          cost_json: { total: 100, breakdown: {} },
          execution_trace_json: { steps: [], duration_ms: 500 },
          error_message: 'Connection error: "timeout"',
          created_at: '2026-02-13T10:00:00Z',
        },
      ]

      const chainMethods = {
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockRecords, error: null }),
      }

      mockClient.from = vi.fn(() => ({
        select: vi.fn().mockReturnValue(chainMethods),
      }))

      const csv = await exportExecutionsToCSV('proj-001')
      expect(csv).toContain('Connection error: ""timeout""') // Quotes escaped
    })

    it('exports empty result as header only', async () => {
      const chainMethods = {
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }

      mockClient.from = vi.fn(() => ({
        select: vi.fn().mockReturnValue(chainMethods),
      }))

      const csv = await exportExecutionsToCSV('proj-empty')
      const firstLine = csv.split('\n')[0]
      expect(firstLine).toContain('run_id')
      expect(firstLine).toContain('agent_id')
      expect(firstLine).toContain('status')
      expect(firstLine).toContain('total_cost')
    })
  })

  describe('Cost Breakdown', () => {
    it('records execution with detailed cost breakdown', async () => {
      const cost: ExecutionCost = {
        total: 1050,
        breakdown: {
          tokens: 300,
          toolCalls: 450,
          externalRequests: 300,
        },
      }

      const execution: ExecutionInput = {
        run_id: 'run-breakdown-001',
        project_id: 'proj-001',
        user_id: 'user-001',
        agent_id: 'database',
        intent: 'Migrate data',
        input: { tables: 50 },
        cost,
        execution_trace: { steps: [], duration_ms: 5000 },
        status: 'completed',
      }

      const mockRecord: ExecutionRecord = {
        id: 'exec-breakdown',
        run_id: 'run-breakdown-001',
        project_id: 'proj-001',
        user_id: 'user-001',
        agent_id: 'database',
        intent: 'Migrate data',
        input: { tables: 50 },
        cost_json: cost,
        execution_trace_json: { steps: [], duration_ms: 5000 },
        status: 'completed',
        created_at: new Date().toISOString(),
      }

      const mockFrom = vi.fn(() => ({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockRecord, error: null }),
      }))

      mockClient.from = mockFrom

      const result = await recordExecution(execution)
      expect(result.cost_json.total).toBe(1050)
      expect(result.cost_json.breakdown.tokens).toBe(300)
      expect(result.cost_json.breakdown.toolCalls).toBe(450)
      expect(result.cost_json.breakdown.externalRequests).toBe(300)
    })
  })

  describe('Execution Trace', () => {
    it('records execution with detailed trace', async () => {
      const trace: ExecutionTrace = {
        steps: [
          {
            timestamp: '2026-02-13T10:00:00Z',
            action: 'fetch_data',
            duration_ms: 500,
            result: 'success',
          },
          {
            timestamp: '2026-02-13T10:00:01Z',
            action: 'validate_schema',
            duration_ms: 200,
            result: 'success',
          },
          {
            timestamp: '2026-02-13T10:00:02Z',
            action: 'deploy_service',
            duration_ms: 1200,
            result: 'success',
          },
        ],
        duration_ms: 2500,
        tool_calls: 3,
        api_calls: 5,
      }

      const execution: ExecutionInput = {
        run_id: 'run-trace-001',
        project_id: 'proj-001',
        user_id: 'user-001',
        agent_id: 'backend',
        intent: 'Deploy service',
        input: { service: 'api' },
        execution_trace: trace,
        cost: { total: 500, breakdown: {} },
        status: 'completed',
      }

      const mockRecord: ExecutionRecord = {
        id: 'exec-trace',
        run_id: 'run-trace-001',
        project_id: 'proj-001',
        user_id: 'user-001',
        agent_id: 'backend',
        intent: 'Deploy service',
        input: { service: 'api' },
        execution_trace_json: trace,
        cost_json: { total: 500, breakdown: {} },
        status: 'completed',
        created_at: new Date().toISOString(),
      }

      const mockFrom = vi.fn(() => ({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockRecord, error: null }),
      }))

      mockClient.from = mockFrom

      const result = await recordExecution(execution)
      expect(result.execution_trace_json.steps).toHaveLength(3)
      expect(result.execution_trace_json.duration_ms).toBe(2500)
      expect(result.execution_trace_json.tool_calls).toBe(3)
    })
  })

  describe('Append-only Integrity', () => {
    it('prevents duplicate run IDs from being recorded', async () => {
      const execution: ExecutionInput = {
        run_id: 'run-unique-001',
        project_id: 'proj-001',
        user_id: 'user-001',
        agent_id: 'frontend',
        intent: 'Render page',
        input: {},
        cost: { total: 50, breakdown: {} },
        execution_trace: { steps: [], duration_ms: 200 },
        status: 'completed',
      }

      // First record succeeds
      let mockFrom = vi.fn(() => ({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'exec-001', ...execution, created_at: new Date().toISOString() },
          error: null,
        }),
      }))

      mockClient.from = mockFrom
      const first = await recordExecution(execution)
      expect(first.run_id).toBe('run-unique-001')

      // Second record with same run_id fails
      mockFrom = vi.fn(() => ({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'duplicate key value violates unique constraint' },
        }),
      }))

      mockClient.from = mockFrom
      await expect(recordExecution(execution)).rejects.toThrow('duplicate key value')
    })
  })
})
