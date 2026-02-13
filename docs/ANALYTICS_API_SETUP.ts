/**
 * Analytics API Middleware Setup
 * Add these routes to your Next.js app for analytics collection
 * 
 * Usage: Save as app/api/analytics/route.ts
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase/client'

/**
 * Batch endpoint for receiving analytics from frontend
 * POST /api/analytics/execution
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const pathname = request.nextUrl.pathname

    if (pathname.includes('/analytics/execution')) {
      return await handleExecutionAnalytics(body, request)
    } else if (pathname.includes('/analytics/performance')) {
      return await handlePerformanceAnalytics(body, request)
    } else if (pathname.includes('/analytics/user')) {
      return await handleUserAnalytics(body, request)
    }

    return NextResponse.json({ error: 'Unknown analytics type' }, { status: 400 })
  } catch (error) {
    console.error('Analytics error:', error)
    return NextResponse.json({ error: 'Failed to process analytics' }, { status: 500 })
  }
}

/**
 * Handle execution metrics
 */
async function handleExecutionAnalytics(body: any, request: NextRequest) {
  const { events } = body

  if (!Array.isArray(events)) {
    return NextResponse.json({ error: 'Events must be array' }, { status: 400 })
  }

  try {
    const supabase = getSupabase()
    if (!supabase) {
      console.warn('Supabase not available, skipping persistence')
      return NextResponse.json({ success: true })
    }

    // Insert into execution_analytics table
    // This table should have columns:
    // - id (uuid, primary key)
    // - run_id (text, indexed)
    // - project_id (text, indexed)
    // - user_id (text, indexed)
    // - agent_id (text)
    // - execution_time (integer)
    // - status (text)
    // - cost (integer)
    // - tokens_used (integer)
    // - tool_calls (integer)
    // - error_type (text)
    // - error_message (text)
    // - retry_count (integer)
    // - created_at (timestamp)

    const { error } = await supabase
      .from('execution_analytics')
      .insert(
        events.map((e: any) => ({
          run_id: e.runId,
          project_id: e.projectId,
          user_id: e.userId,
          agent_id: e.agentId,
          execution_time: e.executionTime,
          status: e.status,
          cost: e.cost,
          tokens_used: e.tokensUsed,
          tool_calls: e.toolCalls,
          error_type: e.errorType,
          error_message: e.errorMessage,
          retry_count: e.retryCount,
          created_at: new Date(e.timestamp).toISOString(),
        }))
      )

    if (error) {
      console.error('Failed to insert execution analytics:', error)
      return NextResponse.json({ error: 'Failed to store analytics' }, { status: 500 })
    }

    return NextResponse.json({ success: true, recorded: events.length })
  } catch (error) {
    console.error('Execution analytics error:', error)
    return NextResponse.json({ error: 'Failed to process execution analytics' }, { status: 500 })
  }
}

/**
 * Handle performance metrics
 */
async function handlePerformanceAnalytics(body: any, request: NextRequest) {
  const { events } = body

  if (!Array.isArray(events)) {
    return NextResponse.json({ error: 'Events must be array' }, { status: 400 })
  }

  try {
    const supabase = getSupabase()
    if (!supabase) {
      console.warn('Supabase not available, skipping persistence')
      return NextResponse.json({ success: true })
    }

    // Insert into performance_analytics table
    // Columns:
    // - id (uuid)
    // - component_name (text, indexed)
    // - render_time (numeric)
    // - memo_hits (integer)
    // - memo_misses (integer)
    // - created_at (timestamp)

    const { error } = await supabase
      .from('performance_analytics')
      .insert(
        events.map((e: any) => ({
          component_name: e.componentName,
          render_time: e.renderTime,
          memo_hits: e.memoHits,
          memo_misses: e.memoMisses,
          created_at: new Date(e.timestamp).toISOString(),
        }))
      )

    if (error) {
      console.error('Failed to insert performance analytics:', error)
      return NextResponse.json({ error: 'Failed to store analytics' }, { status: 500 })
    }

    return NextResponse.json({ success: true, recorded: events.length })
  } catch (error) {
    console.error('Performance analytics error:', error)
    return NextResponse.json({ error: 'Failed to process performance analytics' }, { status: 500 })
  }
}

/**
 * Handle user events
 */
async function handleUserAnalytics(body: any, request: NextRequest) {
  const { events } = body

  if (!Array.isArray(events)) {
    return NextResponse.json({ error: 'Events must be array' }, { status: 400 })
  }

  try {
    const supabase = getSupabase()
    if (!supabase) {
      console.warn('Supabase not available, skipping persistence')
      return NextResponse.json({ success: true })
    }

    // Insert into user_analytics table
    // Columns:
    // - id (uuid)
    // - event (text, indexed)
    // - user_id (text, indexed)
    // - project_id (text, indexed)
    // - metadata (jsonb)
    // - created_at (timestamp)

    const { error } = await supabase
      .from('user_analytics')
      .insert(
        events.map((e: any) => ({
          event: e.event,
          user_id: e.userId,
          project_id: e.projectId,
          metadata: e.metadata || {},
          created_at: new Date(e.timestamp).toISOString(),
        }))
      )

    if (error) {
      console.error('Failed to insert user analytics:', error)
      return NextResponse.json({ error: 'Failed to store analytics' }, { status: 500 })
    }

    return NextResponse.json({ success: true, recorded: events.length })
  } catch (error) {
    console.error('User analytics error:', error)
    return NextResponse.json({ error: 'Failed to process user analytics' }, { status: 500 })
  }
}
