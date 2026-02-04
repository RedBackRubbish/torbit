/**
 * Branded Types for Type-Safe IDs
 * 
 * Branded types (also known as nominal types or opaque types) prevent
 * accidentally mixing up different ID types at compile time.
 * 
 * @example
 * const userId: UserId = createUserId('user_123')
 * const agentId: AgentId = createAgentId('agent_456')
 * 
 * // This would cause a compile error:
 * // const wrong: UserId = agentId // Error!
 */

// Brand symbol for nominal typing
declare const __brand: unique symbol

/**
 * Creates a branded type from a base type
 * The brand is erased at runtime but enforced at compile time
 */
type Brand<T, B extends string> = T & { readonly [__brand]: B }

// ============================================================================
// ID Types
// ============================================================================

/** Unique identifier for users */
export type UserId = Brand<string, 'UserId'>

/** Unique identifier for agents (Architect, Frontend, Backend, etc.) */
export type AgentId = Brand<string, 'AgentId'>

/** Unique identifier for chat messages */
export type MessageId = Brand<string, 'MessageId'>

/** Unique identifier for projects/sessions */
export type ProjectId = Brand<string, 'ProjectId'>

/** Unique identifier for transactions (fuel consumption) */
export type TransactionId = Brand<string, 'TransactionId'>

/** Unique identifier for tasks in the task queue */
export type TaskId = Brand<string, 'TaskId'>

/** Unique identifier for file operations */
export type FileOperationId = Brand<string, 'FileOperationId'>

/** Unique identifier for tool invocations */
export type ToolInvocationId = Brand<string, 'ToolInvocationId'>

// ============================================================================
// ID Creation Functions
// ============================================================================

/**
 * Generate a unique ID with an optional prefix
 */
function generateId(prefix?: string): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 10)
  return prefix ? `${prefix}_${timestamp}${random}` : `${timestamp}${random}`
}

/** Create a new UserId */
export function createUserId(value?: string): UserId {
  return (value || generateId('user')) as UserId
}

/** Create a new AgentId */
export function createAgentId(value?: string): AgentId {
  return (value || generateId('agent')) as AgentId
}

/** Create a new MessageId */
export function createMessageId(value?: string): MessageId {
  return (value || generateId('msg')) as MessageId
}

/** Create a new ProjectId */
export function createProjectId(value?: string): ProjectId {
  return (value || generateId('proj')) as ProjectId
}

/** Create a new TransactionId */
export function createTransactionId(value?: string): TransactionId {
  return (value || generateId('txn')) as TransactionId
}

/** Create a new TaskId */
export function createTaskId(value?: string): TaskId {
  return (value || generateId('task')) as TaskId
}

/** Create a new FileOperationId */
export function createFileOperationId(value?: string): FileOperationId {
  return (value || generateId('fop')) as FileOperationId
}

/** Create a new ToolInvocationId */
export function createToolInvocationId(value?: string): ToolInvocationId {
  return (value || generateId('tool')) as ToolInvocationId
}

// ============================================================================
// Validation & Utilities
// ============================================================================

/** Type guard to check if a string is a valid UserId format */
export function isUserId(value: string): value is UserId {
  return value.startsWith('user_')
}

/** Type guard to check if a string is a valid AgentId format */
export function isAgentId(value: string): value is AgentId {
  return value.startsWith('agent_')
}

/** Type guard to check if a string is a valid MessageId format */
export function isMessageId(value: string): value is MessageId {
  return value.startsWith('msg_')
}

/** Type guard to check if a string is a valid ProjectId format */
export function isProjectId(value: string): value is ProjectId {
  return value.startsWith('proj_')
}

/** Type guard to check if a string is a valid TransactionId format */
export function isTransactionId(value: string): value is TransactionId {
  return value.startsWith('txn_')
}

/** Type guard to check if a string is a valid TaskId format */
export function isTaskId(value: string): value is TaskId {
  return value.startsWith('task_')
}

/**
 * Extract the raw string value from a branded ID
 * Useful when you need to pass IDs to external APIs
 */
export function unwrapId<T extends string>(id: Brand<T, string>): string {
  return id as string
}

/**
 * Predefined agent IDs for the core agent types
 */
export const AGENT_IDS = {
  ARCHITECT: createAgentId('agent_architect'),
  FRONTEND: createAgentId('agent_frontend'),
  BACKEND: createAgentId('agent_backend'),
  DESIGNER: createAgentId('agent_designer'),
  DEBUGGER: createAgentId('agent_debugger'),
} as const

/**
 * Get agent display name from AgentId
 */
export function getAgentName(agentId: AgentId): string {
  const id = unwrapId(agentId)
  const name = id.replace('agent_', '')
  return name.charAt(0).toUpperCase() + name.slice(1)
}
