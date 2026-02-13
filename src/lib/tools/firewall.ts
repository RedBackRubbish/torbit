/**
 * Tool Firewall Module
 *
 * Enforces agent-based access control for tool execution.
 * - Validates tool permissions per agent
 * - Sanitizes and validates arguments
 * - Blocks unauthorized calls
 * - Emits detailed audit logs
 */

import type { AgentId } from '@/lib/tools/definitions'

// ============================================
// TYPES
// ============================================

/**
 * Individual tool names that can be executed
 */
export type ToolName =
  | 'readFile'
  | 'writeFile'
  | 'appendFile'
  | 'deleteFile'
  | 'listDir'
  | 'httpRequest'
  | 'dbRead'
  | 'dbWrite'
  | 'dbMigrate'
  | 'externalApi'
  | 'createCheckpoint'
  | 'restoreCheckpoint'
  | 'executeCommand'
  | 'deployService'
  | 'getSecrets'
  | 'setSecrets'

/**
 * Tool execution request
 */
export interface ToolCall {
  name: ToolName
  args: Record<string, unknown>
  agentId: AgentId
  requestId?: string
}

/**
 * Tool execution result
 */
export interface ToolExecutionResult {
  success: boolean
  data?: unknown
  error?: string
  blocked?: boolean
  auditLogId: string
}

/**
 * Structured audit log entry
 */
export interface AuditLogEntry {
  id: string
  timestamp: string
  agentId: AgentId
  toolName: ToolName
  action: 'allowed' | 'denied' | 'sanitized' | 'error'
  reason?: string
  argsSnapshot?: Record<string, unknown>
  sanitizedArgs?: Record<string, unknown>
  result?: string
  duration: number
}

/**
 * Tool permission configuration
 */
export interface ToolPermission {
  allowed: boolean
  requiresApproval?: boolean
  argSanitizers?: Record<string, (value: unknown) => unknown>
  restrictions?: Record<string, unknown>
}

/**
 * Firewall configuration
 */
export interface FirewallConfig {
  enableAudit: boolean
  auditLogCapacity: number
  enableSanitization: boolean
  strictMode: boolean // Deny by default
  allowedDomains?: string[]
}

// ============================================
// AGENT TOOL ALLOWLISTS
// ============================================

/**
 * Per-agent tool permissions matrix
 */
export const AGENT_TOOL_ALLOWLIST: Record<AgentId, Record<ToolName, ToolPermission>> = {
  architect: {
    readFile: { allowed: true },
    writeFile: { allowed: true },
    appendFile: { allowed: true },
    deleteFile: { allowed: true, requiresApproval: true },
    listDir: { allowed: true },
    httpRequest: { allowed: false },
    dbRead: { allowed: false },
    dbWrite: { allowed: false },
    dbMigrate: { allowed: false },
    externalApi: { allowed: false },
    createCheckpoint: { allowed: true },
    restoreCheckpoint: { allowed: true },
    executeCommand: { allowed: false },
    deployService: { allowed: false },
    getSecrets: { allowed: false },
    setSecrets: { allowed: false },
  },

  frontend: {
    readFile: {
      allowed: true,
      argSanitizers: { path: sanitizeFrontendPath },
      restrictions: { allowedPathPattern: /^src\/.*\.(tsx?|css|json)$/ },
    },
    writeFile: {
      allowed: true,
      argSanitizers: { path: sanitizeFrontendPath },
      restrictions: { allowedPathPattern: /^src\/.*\.(tsx?|css)$/ },
    },
    appendFile: { allowed: false },
    deleteFile: {
      allowed: true,
      requiresApproval: true,
      argSanitizers: { path: sanitizeFrontendPath },
    },
    listDir: {
      allowed: true,
      argSanitizers: { path: sanitizeFrontendPath },
    },
    httpRequest: {
      allowed: true,
      argSanitizers: { url: sanitizeHttpUrl },
      restrictions: { allowedHosts: ['localhost', '127.0.0.1', 'api.local'] },
    },
    dbRead: { allowed: false },
    dbWrite: { allowed: false },
    dbMigrate: { allowed: false },
    externalApi: { allowed: false },
    createCheckpoint: { allowed: false },
    restoreCheckpoint: { allowed: false },
    executeCommand: { allowed: false },
    deployService: { allowed: false },
    getSecrets: { allowed: false },
    setSecrets: { allowed: false },
  },

  backend: {
    readFile: { allowed: true },
    writeFile: { allowed: true },
    appendFile: { allowed: true },
    deleteFile: { allowed: true, requiresApproval: true },
    listDir: { allowed: true },
    httpRequest: {
      allowed: true,
      argSanitizers: { url: sanitizeHttpUrl },
    },
    dbRead: { allowed: true },
    dbWrite: { allowed: true },
    dbMigrate: { allowed: true, requiresApproval: true },
    externalApi: {
      allowed: true,
      argSanitizers: { apiKey: sanitizeSecret },
    },
    createCheckpoint: { allowed: true },
    restoreCheckpoint: { allowed: true },
    executeCommand: {
      allowed: true,
      argSanitizers: { command: sanitizeCommand },
      restrictions: { forbiddenPatterns: [/rm\s+-rf/, /:\(\)/] },
    },
    deployService: { allowed: false },
    getSecrets: { allowed: true, requiresApproval: true },
    setSecrets: { allowed: true, requiresApproval: true },
  },

  database: {
    readFile: { allowed: false },
    writeFile: { allowed: false },
    appendFile: { allowed: false },
    deleteFile: { allowed: false },
    listDir: { allowed: false },
    httpRequest: { allowed: false },
    dbRead: { allowed: true },
    dbWrite: { allowed: true },
    dbMigrate: { allowed: true, requiresApproval: true },
    externalApi: { allowed: false },
    createCheckpoint: { allowed: false },
    restoreCheckpoint: { allowed: false },
    executeCommand: { allowed: false },
    deployService: { allowed: false },
    getSecrets: { allowed: false },
    setSecrets: { allowed: false },
  },

  devops: {
    readFile: { allowed: true },
    writeFile: { allowed: true },
    appendFile: { allowed: true },
    deleteFile: { allowed: true, requiresApproval: true },
    listDir: { allowed: true },
    httpRequest: { allowed: true },
    dbRead: { allowed: true },
    dbWrite: { allowed: true },
    dbMigrate: { allowed: true, requiresApproval: true },
    externalApi: { allowed: true },
    createCheckpoint: { allowed: true },
    restoreCheckpoint: { allowed: true },
    executeCommand: { allowed: true, argSanitizers: { command: sanitizeCommand } },
    deployService: { allowed: true, requiresApproval: true },
    getSecrets: { allowed: true, requiresApproval: true },
    setSecrets: { allowed: true, requiresApproval: true },
  },

  qa: {
    readFile: { allowed: true },
    writeFile: { allowed: true },
    appendFile: { allowed: true },
    deleteFile: { allowed: true, requiresApproval: true },
    listDir: { allowed: true },
    httpRequest: {
      allowed: true,
      argSanitizers: { url: sanitizeHttpUrl },
    },
    dbRead: { allowed: true },
    dbWrite: { allowed: false },
    dbMigrate: { allowed: false },
    externalApi: { allowed: true },
    createCheckpoint: { allowed: true },
    restoreCheckpoint: { allowed: true },
    executeCommand: {
      allowed: true,
      argSanitizers: { command: sanitizeCommand },
    },
    deployService: { allowed: false },
    getSecrets: { allowed: false },
    setSecrets: { allowed: false },
  },

  planner: {
    readFile: { allowed: true },
    writeFile: { allowed: false },
    appendFile: { allowed: false },
    deleteFile: { allowed: false },
    listDir: { allowed: true },
    httpRequest: { allowed: false },
    dbRead: { allowed: true },
    dbWrite: { allowed: false },
    dbMigrate: { allowed: false },
    externalApi: { allowed: false },
    createCheckpoint: { allowed: false },
    restoreCheckpoint: { allowed: false },
    executeCommand: { allowed: false },
    deployService: { allowed: false },
    getSecrets: { allowed: false },
    setSecrets: { allowed: false },
  },

  strategist: {
    readFile: { allowed: true },
    writeFile: { allowed: false },
    appendFile: { allowed: false },
    deleteFile: { allowed: false },
    listDir: { allowed: true },
    httpRequest: { allowed: false },
    dbRead: { allowed: true },
    dbWrite: { allowed: false },
    dbMigrate: { allowed: false },
    externalApi: { allowed: false },
    createCheckpoint: { allowed: false },
    restoreCheckpoint: { allowed: false },
    executeCommand: { allowed: false },
    deployService: { allowed: false },
    getSecrets: { allowed: false },
    setSecrets: { allowed: false },
  },

  auditor: {
    readFile: { allowed: true },
    writeFile: { allowed: false },
    appendFile: { allowed: false },
    deleteFile: { allowed: false },
    listDir: { allowed: true },
    httpRequest: { allowed: false },
    dbRead: { allowed: true },
    dbWrite: { allowed: false },
    dbMigrate: { allowed: false },
    externalApi: { allowed: false },
    createCheckpoint: { allowed: false },
    restoreCheckpoint: { allowed: false },
    executeCommand: { allowed: false },
    deployService: { allowed: false },
    getSecrets: { allowed: false },
    setSecrets: { allowed: false },
  },
}

// ============================================
// ARGUMENT SANITIZERS
// ============================================

/**
 * Sanitize file paths for frontend agent (ensure within src/)
 */
export function sanitizeFrontendPath(value: unknown): string {
  const path = String(value || '')
  // Prevent directory traversal
  if (path.includes('..') || path.startsWith('/')) {
    throw new Error('Invalid path: traversal attempt detected')
  }
  return path
}

/**
 * Sanitize HTTP URLs
 */
export function sanitizeHttpUrl(value: unknown): string {
  const url = String(value || '')
  try {
    const parsed = new URL(url)
    // Prevent SSRF attacks
    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
      return url
    }
    // For other hosts, restrict to whitelisted domains
    throw new Error('URL host not whitelisted')
  } catch {
    throw new Error('Invalid URL format')
  }
}

/**
 * Sanitize commands (prevent injection)
 */
export function sanitizeCommand(value: unknown): string {
  const command = String(value || '')
  const dangerous = [
    /[;&|`$]/,      // Shell operators
    /\$\(/,          // Command substitution
    /`.*`/,          // Backticks
    /rm\s+-rf/,      // Destructive
    /:\(\)/,         // Forkbomb
  ]

  for (const pattern of dangerous) {
    if (pattern.test(command)) {
      throw new Error(`Dangerous pattern detected in command: ${pattern}`)
    }
  }

  return command
}

/**
 * Sanitize API keys and secrets
 */
export function sanitizeSecret(value: unknown): string {
  // Don't log or expose secrets
  return '[REDACTED]'
}

/**
 * Generic argument validator
 */
export function sanitizeArg(value: unknown): unknown {
  // Basic sanitization: no code execution vectors
  if (typeof value === 'string') {
    return value.trim()
  }
  if (typeof value === 'object' && value !== null) {
    const sanitized: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) {
      sanitized[k] = sanitizeArg(v)
    }
    return sanitized
  }
  return value
}

// ============================================
// TOOL FIREWALL
// ============================================

export class ToolFirewall {
  private auditLog: AuditLogEntry[] = []
  private config: FirewallConfig

  constructor(config: Partial<FirewallConfig> = {}) {
    this.config = {
      enableAudit: true,
      auditLogCapacity: 500,
      enableSanitization: true,
      strictMode: true,
      ...config,
    }
  }

  /**
   * Check if an agent is allowed to call a tool
   */
  canExecuteTool(agentId: AgentId, toolName: ToolName): boolean {
    const allowlist = AGENT_TOOL_ALLOWLIST[agentId]
    if (!allowlist) return false

    const permission = allowlist[toolName]
    if (!permission) return !this.config.strictMode

    return permission.allowed
  }

  /**
   * Validate and sanitize tool arguments
   */
  validateAndSanitizeArgs(
    agentId: AgentId,
    toolName: ToolName,
    args: Record<string, unknown>
  ): { valid: boolean; sanitized: Record<string, unknown>; errors: string[] } {
    const allowlist = AGENT_TOOL_ALLOWLIST[agentId]
    const permission = allowlist?.[toolName]
    const errors: string[] = []
    const sanitized: Record<string, unknown> = { ...args }

    if (!permission?.argSanitizers) {
      return { valid: true, sanitized, errors }
    }

    for (const [argName, sanitizer] of Object.entries(permission.argSanitizers)) {
      if (!(argName in args)) continue

      try {
        sanitized[argName] = sanitizer(args[argName])
      } catch (error) {
        errors.push(`${argName}: ${error instanceof Error ? error.message : 'Sanitization failed'}`)
      }
    }

    return {
      valid: errors.length === 0,
      sanitized,
      errors,
    }
  }

  /**
   * Check restrictions (path patterns, forbidden commands, etc.)
   */
  checkRestrictions(
    agentId: AgentId,
    toolName: ToolName,
    args: Record<string, unknown>
  ): { allowed: boolean; reason?: string } {
    const allowlist = AGENT_TOOL_ALLOWLIST[agentId]
    const permission = allowlist?.[toolName]

    if (!permission?.restrictions) {
      return { allowed: true }
    }

    const restrictions = permission.restrictions

    // Check path pattern if present
    if (restrictions.allowedPathPattern && typeof args.path === 'string') {
      const pattern = restrictions.allowedPathPattern as RegExp
      if (!pattern.test(args.path)) {
        return { allowed: false, reason: `Path does not match allowed pattern: ${pattern}` }
      }
    }

    // Check allowed hosts
    if (restrictions.allowedHosts && typeof args.url === 'string') {
      try {
        const url = new URL(args.url)
        const hosts = restrictions.allowedHosts as string[]
        if (!hosts.includes(url.hostname)) {
          return { allowed: false, reason: `Host ${url.hostname} not in allowlist` }
        }
      } catch {
        return { allowed: false, reason: 'Invalid URL' }
      }
    }

    // Check forbidden patterns
    if (restrictions.forbiddenPatterns && typeof args.command === 'string') {
      const patterns = restrictions.forbiddenPatterns as RegExp[]
      for (const pattern of patterns) {
        if (pattern.test(args.command)) {
          return { allowed: false, reason: `Command matches forbidden pattern: ${pattern}` }
        }
      }
    }

    return { allowed: true }
  }

  /**
   * Execute a tool with firewall protection
   */
  async executeToolSafely(
    toolCall: ToolCall,
    executor: (name: ToolName, args: Record<string, unknown>) => Promise<unknown>
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now()
    const auditId = this.generateAuditId()
    const { agentId, name: toolName, args } = toolCall

    // Check permission
    if (!this.canExecuteTool(agentId, toolName)) {
      const entry: AuditLogEntry = {
        id: auditId,
        timestamp: new Date().toISOString(),
        agentId,
        toolName,
        action: 'denied',
        reason: 'Tool not allowed for agent',
        argsSnapshot: this.redactArgs(args),
        duration: Date.now() - startTime,
      }
      this.recordAudit(entry)

      return {
        success: false,
        blocked: true,
        error: `Agent ${agentId} is not authorized to call ${toolName}`,
        auditLogId: auditId,
      }
    }

    // Validate and sanitize arguments
    const { valid, sanitized, errors } = this.validateAndSanitizeArgs(agentId, toolName, args)
    if (!valid) {
      const entry: AuditLogEntry = {
        id: auditId,
        timestamp: new Date().toISOString(),
        agentId,
        toolName,
        action: 'denied',
        reason: `Argument validation failed: ${errors.join(', ')}`,
        argsSnapshot: this.redactArgs(args),
        duration: Date.now() - startTime,
      }
      this.recordAudit(entry)

      return {
        success: false,
        error: `Invalid arguments: ${errors.join(', ')}`,
        auditLogId: auditId,
      }
    }

    // Check restrictions
    const restrictionCheck = this.checkRestrictions(agentId, toolName, sanitized)
    if (!restrictionCheck.allowed) {
      const entry: AuditLogEntry = {
        id: auditId,
        timestamp: new Date().toISOString(),
        agentId,
        toolName,
        action: 'denied',
        reason: `Restriction violation: ${restrictionCheck.reason}`,
        argsSnapshot: this.redactArgs(args),
        duration: Date.now() - startTime,
      }
      this.recordAudit(entry)

      return {
        success: false,
        blocked: true,
        error: restrictionCheck.reason || 'Restriction violation',
        auditLogId: auditId,
      }
    }

    // Execute
    try {
      const result = await executor(toolName, sanitized)

      const action = errors.length === 0 ? 'allowed' : 'sanitized'
      const entry: AuditLogEntry = {
        id: auditId,
        timestamp: new Date().toISOString(),
        agentId,
        toolName,
        action,
        argsSnapshot: this.redactArgs(args),
        sanitizedArgs: errors.length > 0 ? sanitized : undefined,
        result: typeof result === 'string' ? result : JSON.stringify(result).slice(0, 100),
        duration: Date.now() - startTime,
      }
      this.recordAudit(entry)

      return {
        success: true,
        data: result,
        auditLogId: auditId,
      }
    } catch (error) {
      const entry: AuditLogEntry = {
        id: auditId,
        timestamp: new Date().toISOString(),
        agentId,
        toolName,
        action: 'error',
        reason: error instanceof Error ? error.message : 'Unknown error',
        argsSnapshot: this.redactArgs(args),
        duration: Date.now() - startTime,
      }
      this.recordAudit(entry)

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Tool execution failed',
        auditLogId: auditId,
      }
    }
  }

  /**
   * Get audit log entries
   */
  getAuditLog(filter?: { agentId?: AgentId; toolName?: ToolName; action?: string }): AuditLogEntry[] {
    if (!filter) return [...this.auditLog]

    return this.auditLog.filter((entry) => {
      if (filter.agentId && entry.agentId !== filter.agentId) return false
      if (filter.toolName && entry.toolName !== filter.toolName) return false
      if (filter.action && entry.action !== filter.action) return false
      return true
    })
  }

  /**
   * Clear audit log (test utility)
   */
  clearAuditLog(): void {
    this.auditLog.length = 0
  }

  /**
   * Record audit entry
   */
  private recordAudit(entry: AuditLogEntry): void {
    if (!this.config.enableAudit) return

    this.auditLog.push(entry)
    if (this.auditLog.length > this.config.auditLogCapacity) {
      this.auditLog.shift()
    }
  }

  /**
   * Generate unique audit ID
   */
  private generateAuditId(): string {
    return `audit-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  }

  /**
   * Redact sensitive data from args
   */
  private redactArgs(args: Record<string, unknown>): Record<string, unknown> {
    const redacted: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(args)) {
      if (k.toLowerCase().includes('secret') || k.toLowerCase().includes('key')) {
        redacted[k] = '[REDACTED]'
      } else if (typeof v === 'object' && v !== null) {
        redacted[k] = this.redactArgs(v as Record<string, unknown>)
      } else {
        redacted[k] = v
      }
    }
    return redacted
  }
}

/**
 * Global firewall instance
 */
let globalFirewall: ToolFirewall | null = null

/**
 * Get or create global firewall
 */
export function getToolFirewall(config?: Partial<FirewallConfig>): ToolFirewall {
  if (!globalFirewall) {
    globalFirewall = new ToolFirewall(config)
  }
  return globalFirewall
}

/**
 * Reset global firewall (test utility)
 */
export function resetToolFirewall(): void {
  globalFirewall = null
}
