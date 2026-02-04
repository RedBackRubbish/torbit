/**
 * TORBIT Agent System
 * 
 * Exports all agent prompts, tools, and the orchestrator.
 */

// Agent Prompts
export { AUDITOR_SYSTEM_PROMPT, AUDITOR_TOOLS, type AuditorTool } from './prompts/auditor'
export { ARCHITECT_SYSTEM_PROMPT, ARCHITECT_TOOLS, type ArchitectTool } from './prompts/architect'
export { PLANNER_SYSTEM_PROMPT, PLANNER_TOOLS, type PlannerTool } from './prompts/planner'
export { FRONTEND_SYSTEM_PROMPT, FRONTEND_TOOLS, type FrontendTool } from './prompts/frontend'
export { DEVOPS_SYSTEM_PROMPT, DEVOPS_TOOLS, type DevOpsTool } from './prompts/devops'
export { QA_SYSTEM_PROMPT, QA_TOOLS, type QATool } from './prompts/qa'

// Orchestrator
export {
  TorbitOrchestrator,
  createOrchestrator,
  executeWithAgent,
  type OrchestrationConfig,
  type AgentResult,
  type ModelTier,
} from './orchestrator'

// Re-export tool definitions
export { TOOL_DEFINITIONS, AGENT_TOOLS, type ToolName, type AgentId } from '../tools/definitions'
export { executeTool, createExecutionContext, type ToolExecutionContext } from '../tools/executor'
