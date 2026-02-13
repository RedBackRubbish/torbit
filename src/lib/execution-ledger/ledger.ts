import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Execution Ledger - Write-once append-only system for tracking all agent executions.
 * Every execution creates an immutable record including cost, trace, input/output, and outcome.
 */

export interface ExecutionCost {
  total: number // Total cost in cents
  breakdown: {
    tokens?: number
    toolCalls?: number
    externalRequests?: number
    penalties?: number
  }
}

export interface ExecutionStep {
  timestamp: string
  action: string
  duration_ms: number
  result?: string
  error?: string
}

export interface ExecutionTrace {
  steps: ExecutionStep[]
  duration_ms: number
  tool_calls?: number
  api_calls?: number
}

export type ExecutionStatus = 'completed' | 'failed' | 'aborted'

export interface ExecutionRecord {
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

export interface ExecutionInput {
  run_id: string
  project_id: string
  user_id: string
  agent_id: string
  intent: string
  input: Record<string, unknown>
  output?: Record<string, unknown>
  cost: ExecutionCost
  execution_trace: ExecutionTrace
  status: ExecutionStatus
  error_message?: string
}

export interface ExecutionFilter {
  projectId?: string
  userId?: string
  agentId?: string
  status?: ExecutionStatus
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}

export interface ExecutionStats {
  total_executions: number
  successful: number
  failed: number
  aborted: number
  total_cost: number
  avg_cost: number
  avg_duration_ms: number
  by_agent: Record<string, { count: number; cost: number }>
}

let supabaseClient: SupabaseClient | null = null

/**
 * Initialize the execution ledger with a Supabase client
 */
export function initializeExecutionLedger(client: SupabaseClient): void {
  supabaseClient = client
}

/**
 * Get the current Supabase client
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    throw new Error('Execution ledger not initialized. Call initializeExecutionLedger first.')
  }
  return supabaseClient
}

/**
 * Record an execution in the ledger (append-only)
 * @throws {Error} If the run_id already exists (prevents duplicates)
 */
export async function recordExecution(execution: ExecutionInput): Promise<ExecutionRecord> {
  const client = getSupabaseClient()

  const { data, error } = await client
    .from('execution_ledger')
    .insert([
      {
        run_id: execution.run_id,
        project_id: execution.project_id,
        user_id: execution.user_id,
        agent_id: execution.agent_id,
        intent: execution.intent,
        input: execution.input,
        output: execution.output,
        cost_json: execution.cost,
        execution_trace_json: execution.execution_trace,
        status: execution.status,
        error_message: execution.error_message,
      },
    ])
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to record execution: ${error.message}`)
  }

  return data as ExecutionRecord
}

/**
 * Retrieve an execution record by run ID
 */
export async function getExecutionByRunId(runId: string): Promise<ExecutionRecord | null> {
  const client = getSupabaseClient()

  const { data, error } = await client
    .from('execution_ledger')
    .select('*')
    .eq('run_id', runId)
    .single()

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows found
    throw new Error(`Failed to fetch execution: ${error.message}`)
  }

  return (data as ExecutionRecord) || null
}

/**
 * List executions by project with pagination
 */
export async function listExecutionsByProject(
  projectId: string,
  limit: number = 50,
  offset: number = 0
): Promise<{ data: ExecutionRecord[]; total: number }> {
  const client = getSupabaseClient()

  const { data, error, count } = await client
    .from('execution_ledger')
    .select('*', { count: 'exact' })
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    throw new Error(`Failed to list executions: ${error.message}`)
  }

  return { data: (data as ExecutionRecord[]) || [], total: count || 0 }
}

/**
 * List executions by agent with pagination
 */
export async function listExecutionsByAgent(
  agentId: string,
  projectId?: string,
  limit: number = 50,
  offset: number = 0
): Promise<{ data: ExecutionRecord[]; total: number }> {
  const client = getSupabaseClient()

  let query = client
    .from('execution_ledger')
    .select('*', { count: 'exact' })
    .eq('agent_id', agentId)

  if (projectId) {
    query = query.eq('project_id', projectId)
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    throw new Error(`Failed to list executions by agent: ${error.message}`)
  }

  return { data: (data as ExecutionRecord[]) || [], total: count || 0 }
}

/**
 * Get execution cost statistics for an agent over time
 */
export async function getAgentCostStats(
  agentId: string,
  projectId?: string,
  startDate?: Date,
  endDate?: Date
): Promise<{
  total_cost: number
  avg_cost: number
  count: number
  min_cost: number
  max_cost: number
}> {
  const client = getSupabaseClient()

  let query = client
    .from('execution_ledger')
    .select('cost_json')
    .eq('agent_id', agentId)

  if (projectId) {
    query = query.eq('project_id', projectId)
  }

  if (startDate) {
    query = query.gte('created_at', startDate.toISOString())
  }

  if (endDate) {
    query = query.lte('created_at', endDate.toISOString())
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to get cost stats: ${error.message}`)
  }

  if (!data || data.length === 0) {
    return { total_cost: 0, avg_cost: 0, count: 0, min_cost: 0, max_cost: 0 }
  }

  const costs = data.map((record: any) => (record.cost_json?.total || 0) as number)
  const total_cost = costs.reduce((sum, c) => sum + c, 0)
  const count = costs.length
  const avg_cost = count > 0 ? total_cost / count : 0
  const min_cost = Math.min(...costs)
  const max_cost = Math.max(...costs)

  return { total_cost, avg_cost, count, min_cost, max_cost }
}

/**
 * Get execution statistics for a project
 */
export async function getProjectExecutionStats(
  projectId: string,
  startDate?: Date,
  endDate?: Date
): Promise<ExecutionStats> {
  const client = getSupabaseClient()

  let query = client
    .from('execution_ledger')
    .select('agent_id, status, cost_json, execution_trace_json')
    .eq('project_id', projectId)

  if (startDate) {
    query = query.gte('created_at', startDate.toISOString())
  }

  if (endDate) {
    query = query.lte('created_at', endDate.toISOString())
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to get project stats: ${error.message}`)
  }

  if (!data || data.length === 0) {
    return {
      total_executions: 0,
      successful: 0,
      failed: 0,
      aborted: 0,
      total_cost: 0,
      avg_cost: 0,
      avg_duration_ms: 0,
      by_agent: {},
    }
  }

  const stats: ExecutionStats = {
    total_executions: data.length,
    successful: data.filter((r: any) => r.status === 'completed').length,
    failed: data.filter((r: any) => r.status === 'failed').length,
    aborted: data.filter((r: any) => r.status === 'aborted').length,
    total_cost: 0,
    avg_cost: 0,
    avg_duration_ms: 0,
    by_agent: {},
  }

  let total_duration = 0

  for (const record of data) {
    const cost = record.cost_json?.total || 0
    stats.total_cost += cost

    const duration = record.execution_trace_json?.duration_ms || 0
    total_duration += duration

    const agent = record.agent_id
    if (!stats.by_agent[agent]) {
      stats.by_agent[agent] = { count: 0, cost: 0 }
    }
    stats.by_agent[agent].count += 1
    stats.by_agent[agent].cost += cost
  }

  stats.avg_cost = stats.total_executions > 0 ? stats.total_cost / stats.total_executions : 0
  stats.avg_duration_ms = stats.total_executions > 0 ? total_duration / stats.total_executions : 0

  return stats
}

/**
 * Get failed executions for audit/debugging
 */
export async function getFailedExecutions(
  projectId?: string,
  limit: number = 50
): Promise<ExecutionRecord[]> {
  const client = getSupabaseClient()

  let query = client
    .from('execution_ledger')
    .select('*')
    .in('status', ['failed', 'aborted'])

  if (projectId) {
    query = query.eq('project_id', projectId)
  }

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw new Error(`Failed to get failed executions: ${error.message}`)
  }

  return (data as ExecutionRecord[]) || []
}

/**
 * Stream execution records for bulk analysis
 * Returns an async iterator
 */
export async function* streamExecutions(filter: ExecutionFilter): AsyncGenerator<ExecutionRecord> {
  const client = getSupabaseClient()
  const pageSize = 100
  let offset = 0
  let hasMore = true

  while (hasMore) {
    const { data, error } = await client
      .from('execution_ledger')
      .select('*')
      .match({
        ...(filter.projectId && { project_id: filter.projectId }),
        ...(filter.userId && { user_id: filter.userId }),
        ...(filter.agentId && { agent_id: filter.agentId }),
        ...(filter.status && { status: filter.status }),
      })
      .gte('created_at', filter.startDate?.toISOString() || '1970-01-01')
      .lte('created_at', filter.endDate?.toISOString() || '2099-12-31')
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1)

    if (error) {
      throw new Error(`Failed to stream executions: ${error.message}`)
    }

    if (!data || data.length === 0) {
      hasMore = false
    } else {
      for (const record of data as ExecutionRecord[]) {
        yield record
      }
      offset += pageSize
    }
  }
}

/**
 * Export execution records to CSV format
 */
export async function exportExecutionsToCSV(
  projectId: string,
  startDate?: Date,
  endDate?: Date
): Promise<string> {
  const client = getSupabaseClient()

  let query = client
    .from('execution_ledger')
    .select('*')
    .eq('project_id', projectId)

  if (startDate) {
    query = query.gte('created_at', startDate.toISOString())
  }

  if (endDate) {
    query = query.lte('created_at', endDate.toISOString())
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to export executions: ${error.message}`)
  }

  const headers =
    'run_id,agent_id,status,total_cost,duration_ms,intent,created_at,error_message'

  if (!data || data.length === 0) {
    return headers
  }

  const rows = data.map((record: any) => {
    const cost = record.cost_json?.total || 0
    const duration = record.execution_trace_json?.duration_ms || 0
    const error = (record.error_message || '').replace(/"/g, '""')
    return `"${record.run_id}","${record.agent_id}","${record.status}",${cost},${duration},"${record.intent}","${record.created_at}","${error}"`
  })

  return [headers, ...rows].join('\n')
}
