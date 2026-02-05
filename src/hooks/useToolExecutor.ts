'use client'

import { useCallback, useRef } from 'react'
import { ExecutorService } from '@/services/executor'
import { useTerminalStore } from '@/store/terminal'
import { useTimeline } from '@/store/timeline'

// ============================================================================
// USE TOOL EXECUTOR HOOK
// ============================================================================
// This hook provides the interface between SSE tool calls from the server
// and the ExecutorService that runs them in the WebContainer.
// 
// The "Spinal Cord" connection pattern:
// 1. Server AI decides to call a tool → sends SSE event
// 2. ChatPanel receives event → calls executeToolCall()
// 3. This hook → routes to ExecutorService
// 4. ExecutorService → WebContainer (browser Node.js)
// 5. Result → returned to UI for display
// ============================================================================

export interface ToolCallEvent {
  id: string
  name: string
  args: Record<string, unknown>
}

export interface ToolResultEvent {
  id: string
  success: boolean
  output: string
  duration: number
  fuelConsumed?: number
}

export function useToolExecutor() {
  const pendingTools = useRef<Map<string, ToolCallEvent>>(new Map())
  const terminal = useTerminalStore()
  const timeline = useTimeline()
  
  /**
   * Execute a tool call from the AI
   * This is the bridge between server AI and client WebContainer
   */
  const executeToolCall = useCallback(async (
    toolCall: ToolCallEvent
  ): Promise<ToolResultEvent> => {
    // Track pending
    pendingTools.current.set(toolCall.id, toolCall)
    
    // Add timeline step (active state)
    const stepId = timeline.addStep({
      agent: 'Builder',
      label: toolCall.name,
      description: `Executing ${toolCall.name}...`,
      status: 'active',
    })
    
    try {
      // Execute via ExecutorService (routes to WebContainer)
      const result = await ExecutorService.executeTool(toolCall.name, toolCall.args)
      
      // Update timeline with result
      if (result.success) {
        timeline.completeStep(stepId, true)
      } else {
        timeline.failStep(stepId, result.output)
      }
      
      // Clean up pending
      pendingTools.current.delete(toolCall.id)
      
      return {
        id: toolCall.id,
        success: result.success,
        output: result.output,
        duration: result.duration,
        fuelConsumed: result.fuelConsumed,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      timeline.failStep(stepId, errorMessage)
      pendingTools.current.delete(toolCall.id)
      
      return {
        id: toolCall.id,
        success: false,
        output: `ERROR: ${errorMessage}`,
        duration: 0,
      }
    }
  }, [timeline])
  
  /**
   * Execute multiple tools in sequence
   */
  const executeToolBatch = useCallback(async (
    toolCalls: ToolCallEvent[]
  ): Promise<ToolResultEvent[]> => {
    const results: ToolResultEvent[] = []
    
    for (const toolCall of toolCalls) {
      const result = await executeToolCall(toolCall)
      results.push(result)
      
      // Fail-fast: stop on first error
      if (!result.success) {
        terminal.addLog('Batch execution stopped due to error', 'warning')
        break
      }
    }
    
    return results
  }, [executeToolCall, terminal])
  
  /**
   * Check if a tool is currently executing
   */
  const isToolPending = useCallback((toolId: string): boolean => {
    return pendingTools.current.has(toolId)
  }, [])
  
  /**
   * Get all pending tools
   */
  const getPendingTools = useCallback((): ToolCallEvent[] => {
    return Array.from(pendingTools.current.values())
  }, [])
  
  /**
   * Check if ExecutorService can handle a tool
   */
  const canExecute = useCallback((toolName: string): boolean => {
    return ExecutorService.isToolAvailable(toolName)
  }, [])
  
  /**
   * Get estimated fuel cost for a tool
   */
  const getFuelCost = useCallback((toolName: string): number => {
    return ExecutorService.getFuelCost(toolName)
  }, [])
  
  return {
    executeToolCall,
    executeToolBatch,
    isToolPending,
    getPendingTools,
    canExecute,
    getFuelCost,
  }
}
