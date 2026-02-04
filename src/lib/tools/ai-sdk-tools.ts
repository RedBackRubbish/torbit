/**
 * AI SDK v6 Tool Adapter
 * 
 * Wraps TORBIT tool definitions with execute functions for proper multi-step tool calling.
 * AI SDK v6 requires tools to have execute functions for automatic multi-step execution.
 */

import { tool } from 'ai'
import { z } from 'zod'
import { AGENT_TOOLS, type AgentId } from './definitions'
import { executeTool, createExecutionContext, type ToolExecutionContext } from './executor'

type ToolDef = {
  description: string
  inputSchema: z.ZodType
}

/**
 * Create AI SDK tools with execute functions for an agent
 * This enables proper multi-step tool calling in AI SDK v6
 */
export function createAgentTools(
  agentId: AgentId,
  context: ToolExecutionContext
) {
  const agentToolDefs = AGENT_TOOLS[agentId] as Record<string, ToolDef>
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const aiSdkTools: Record<string, ReturnType<typeof tool<any, any>>> = {}
  
  for (const [toolName, toolDef] of Object.entries(agentToolDefs)) {
    // Create a wrapper tool that delegates to our executor
    aiSdkTools[toolName] = tool({
      description: toolDef.description,
      inputSchema: toolDef.inputSchema,
      execute: async (args) => {
        const result = await executeTool(
          toolName as Parameters<typeof executeTool>[0],
          args as Record<string, unknown>,
          context
        )
        // Return a string representation for the model
        return result.success 
          ? result.output 
          : `Error: ${result.error || result.output}`
      },
    })
  }
  
  return aiSdkTools
}

/**
 * Create execution context from request params
 */
export function createContextFromRequest(projectId: string, userId: string) {
  return createExecutionContext(projectId, userId)
}
