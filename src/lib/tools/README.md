# Tools Module Documentation

## Overview

The Tools module provides a secure, agent-based framework for executing tools with comprehensive access control, input validation, and audit logging.

**Test Status**: ✅ 163 tests passing

### Modules

| Module | Purpose | Tests |
|--------|---------|-------|
| [firewall.ts](./firewall.ts) | Role-based access control, argument sanitization, audit logging | 76 |
| [firewall-examples.test.ts](./__tests__/firewall-examples.test.ts) | Real-world usage patterns and scenarios | 44 |
| [executor.ts](./executor.ts) | Tool execution orch estration | 24 |
| [definitions.ts](./definitions.ts) | Shared type definitions | 19 |

## Quick Start

### 1. Initialize firewall in your app

```typescript
import { getToolFirewall } from '@/lib/tools/firewall'

// At app startup
const firewall = getToolFirewall({
  enableAudit: true,
  auditLogCapacity: 1000,
  strictMode: true,
})
```

### 2. Execute tools with protection

```typescript
import type { ToolCall } from '@/lib/tools/firewall'

const result = await firewall.executeToolSafely(
  {
    agentId: 'backend',
    name: 'dbRead',
    args: { query: 'SELECT * FROM users' },
  },
  async (toolName, sanitizedArgs) => {
    // Execute actual tool here
    return database.query(sanitizedArgs.query)
  }
)

if (result.success) {
  console.log('Result:', result.data)
} else if (result.blocked) {
  console.log('Access denied:', result.error)
} else {
  console.log('Execution error:', result.error)
}
```

### 3. Monitor security events

```typescript
const firewall = getToolFirewall()

// Get all denied access attempts
const denied = firewall.getAuditLog({ action: 'denied' })

// Get denied access by specific agent
const frontendDenials = firewall.getAuditLog({ 
  agentId: 'frontend',
  action: 'denied'
})

// All audit events
const allEvents = firewall.getAuditLog()
```

## Agent Roles & Permissions

### Frontend Agent
- **Can**: Read source files, write CSS/JS/TS files, make HTTP requests to localhost
- **Cannot**: Access database, execute commands, deploy
- **Use Case**: Browser-based development tools

### Backend Agent
- **Can**: Read/write files, access database, execute safe commands, call external APIs
- **Cannot**: Deploy services, manage secrets without approval
- **Use Case**: Server-side automation, data processing

### DevOps Agent
- **Can**: All operations including deployments, secret management, debugging
- **Cannot**: Nothing (unrestricted, but all actions are audited)
- **Use Case**: Infrastructure automation, deployment pipelines

### Planner Agent (Read-Only)
- **Can**: Read files, query database (read-only)
- **Cannot**: Write files, execute commands, access secrets
- **Use Case**: Planning agents, data analysis

### Other Agents
- **Database**: Read/write database only
- **QA**: Testing tools, HTTP requests, safe commands (no Deploy)
- **Auditor**: Read-only access for compliance
- **Strategist**: Read-only access for planning

See [FIREWALL_EXAMPLES.md](./FIREWALL_EXAMPLES.md) for complete matrix and examples.

## Security Features

### 1. Role-Based Access Control (RBAC)

```typescript
// System automatically enforces permissions
const allowed = firewall.canExecuteTool('frontend', 'dbRead')
// false - Frontend cannot access database
```

### 2. Input Sanitization

Each tool has custom sanitizers that:
- **File paths**: Block directory traversal (`../`), absolute paths (`/etc/passwd`)
- **Commands**: Block shell operators (`;`, `|`, `&&`), command substitution, forkbomb patterns
- **URLs**: Block SSRF attacks, allow only whitelisted domains
- **Secrets**: Redact in audit logs automatically

```typescript
// These are blocked automatically:
// ❌ path: '../../.env'           → Directory traversal
// ❌ path: '/etc/passwd'           → Absolute path
// ❌ command: 'npm test; rm -rf /' → Shell injection
// ❌ command: ':(){ :|: & };:'     → Forkbomb
```

### 3. Argument Validation

```typescript
// Restrictions validated before execution
const restrictions = {
  allowedPathPattern: /^src\/.*\.(tsx?|css)$/, // Frontend CSS/JS only
  allowedHosts: ['localhost', '127.0.0.1'],    // Frontend localhost only
  forbiddenPatterns: [/rm\s+-rf/, /:/],        // Backend forbidden patterns
}
```

### 4. Audit Logging

Every tool execution is logged with:
- Timestamp
- Agent ID
- Tool name
- Action (allowed/denied/sanitized/error)
- Secret redaction
- Execution duration
- Result (first 100 chars)

```typescript
// Audit log entry
{
  id: 'audit-1722516294837',
  timestamp: '2024-08-01T14:38:14.837Z',
  agentId: 'backend',
  toolName: 'externalApi',
  action: 'allowed',
  argsSnapshot: {
    endpoint: 'https://api.stripe.com/charges',
    apiKey: '[REDACTED]'  // Automatically redacted
  },
  duration: 245,
}
```

## Testing

### Run all tests

```bash
npm test -- src/lib/tools --run
```

Output:
```
✓ src/lib/tools/__tests__/firewall-examples.test.ts (44 tests)
✓ src/lib/tools/executor.test.ts (24 tests)
✓ src/lib/tools/__tests__/firewall.test.ts (76 tests)
✓ src/lib/tools/definitions.test.ts (19 tests)

Tests  163 passed (163)
```

### Run specific test suite

```bash
# Just firewall tests
npm test -- src/lib/tools/__tests__/firewall.test.ts --run

# Just examples
npm test -- src/lib/tools/__tests__/firewall-examples.test.ts --run

# With coverage
npm test -- src/lib/tools --run --coverage
```

## Common Patterns

### Pattern 1: Execute with error handling

```typescript
const firewall = getToolFirewall()

async function safeExecute(agentId, toolName, args) {
  const result = await firewall.executeToolSafely(
    { agentId, name: toolName, args },
    executor
  )
  
  if (!result.success) {
    if (result.blocked) {
      // Log security incident
      logger.warn(`Access denied: ${result.error}`, { 
        agentId, 
        toolName,
        auditId: result.auditLogId 
      })
    } else {
      // Log execution error
      logger.error(`Tool failed: ${result.error}`, { 
        auditId: result.auditLogId 
      })
    }
    throw new Error(result.error)
  }
  
  return result.data
}
```

### Pattern 2: Monitor security events

```typescript
import { getToolFirewall } from '@/lib/tools/firewall'

function startSecurityMonitoring() {
  const firewall = getToolFirewall()
  
  setInterval(() => {
    // Check for suspicious activity
    const denied = firewall.getAuditLog({ action: 'denied' })
    
    if (denied.length > 10) {
      // Alert security team
      sendAlert({
        severity: 'high',
        message: `${denied.length} unauthorized access attempts`,
        denials: denied.slice(-10)
      })
    }
  }, 300000) // Every 5 minutes
}
```

### Pattern 3: Integration test

```typescript
import { test, expect } from 'vitest'
import { ToolFirewall } from '@/lib/tools/firewall'

test('frontend cannot access database', async () => {
  const firewall = new ToolFirewall({ strictMode: true })
  
  const result = await firewall.executeToolSafely(
    {
      agentId: 'frontend',
      name: 'dbRead',
      args: { query: 'SELECT * FROM users' },
    },
    async () => 'should not execute'
  )
  
  expect(result.success).toBe(false)
  expect(result.blocked).toBe(true)
  expect(result.error).toContain('not authorized')
})
```

## Performance

- **Overhead**: ~1ms per tool call (negligible)
- **Memory**: Fixed audit log buffer (default 500 entries, ~50KB)
- **Sanitization**: All patterns compiled once at startup
- **Thread-safe**: Safe to use in concurrent environments

## Production Checklist

- [ ] Enable audit logging: `enableAudit: true`
- [ ] Set audit capacity: `auditLogCapacity: 1000+` (for production volume)
- [ ] Configure max 3 approval-required tools per agent
- [ ] Monitor denied accesses weekly
- [ ] Test recovery from audit log overflow
- [ ] Document custom sanitizers if added
- [ ] Set up security alerts for suspicious patterns
- [ ] Test with actual agent load before deployment

## Troubleshooting

### "Agent X is not authorized to call tool Y"

The agent doesn't have permission. Check the permission matrix in [FIREWALL_EXAMPLES.md](./FIREWALL_EXAMPLES.md#permission-matrix-summary).

### "Invalid arguments: path: traversal attempt detected"

The path contains `../` or starts with `/`. This is a security protection.

**Valid**: `src/components/Button.tsx`
**Invalid**: `../../.env`, `/etc/passwd`

### "Dangerous pattern detected in command"

The command contains shell operators. See sanitizeCommand in firewall.ts for blocked patterns.

**Valid**: `npm run build`, `ls -la`, `echo "test"`
**Invalid**: `npm test; rm -rf /`, `npm test $(curl ...)`

### Tool execution is slow

Check if there are many audit log entries. The buffer maintains a circular list - older entries are automatically removed at capacity.

```typescript
const firewall = getToolFirewall()
console.log(`Audit log size: ${firewall.getAuditLog().length}`)
```

## API Reference

### `getToolFirewall(config?): ToolFirewall`

Get or create the global firewall instance.

### `firewall.canExecuteTool(agentId, toolName): boolean`

Check if an agent can execute a tool (without running arbitrary executor).

### `firewall.executeToolSafely(toolCall, executor): Promise<ToolExecutionResult>`

Execute a tool with security checks. Returns success/error result with audit ID.

### `firewall.getAuditLog(filters?): AuditLogEntry[]`

Get audit log entries with optional filtering by agentId/toolName/action.

### `firewall.clearAuditLog(): void`

Clear all audit log entries (for testing).

## Contributing

When adding new tools:

1. Add tool name to `ToolName` type in [definitions.ts](./definitions.ts)
2. Define agent permissions in `AGENT_TOOL_ALLOWLIST` in [firewall.ts](./firewall.ts)
3. Create sanitizer function if needed (in firewall.ts)
4. Add tests to [firewall.test.ts](./__tests__/firewall.test.ts)
5. Add real-world example to [firewall-examples.test.ts](./__tests__/firewall-examples.test.ts)

## See Also

- [FIREWALL_EXAMPLES.md](./FIREWALL_EXAMPLES.md) - Real-world usage examples
- [definitions.ts](./definitions.ts) - Type definitions
- [executor.ts](./executor.ts) - Tool execution orchestration
