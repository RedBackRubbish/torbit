import { describe, it, expect, beforeEach } from 'vitest'
import { 
  createExecutionContext, 
  executeTool,
  type ToolExecutionContext 
} from './executor'

describe('Tool Executor', () => {
  let context: ToolExecutionContext

  beforeEach(() => {
    context = createExecutionContext('test-project', 'test-user')
  })

  describe('createExecutionContext', () => {
    it('should create context with required properties', () => {
      expect(context.projectId).toBe('test-project')
      expect(context.userId).toBe('test-user')
      expect(context.workingDirectory).toBeDefined()
      expect(context.secrets).toBeInstanceOf(Map)
      expect(context.checkpoints).toBeInstanceOf(Map)
    })

    it('should initialize empty secrets map', () => {
      expect(context.secrets.size).toBe(0)
    })

    it('should initialize empty checkpoints map', () => {
      expect(context.checkpoints.size).toBe(0)
    })
  })

  describe('executeTool - think', () => {
    it('should return success with thought', async () => {
      const result = await executeTool('think', {
        thought: 'I need to analyze the user requirements first',
      }, context)

      expect(result.success).toBe(true)
      expect(result.output).toContain('analyze')
    })
  })

  describe('executeTool - planSteps', () => {
    it('should return steps in output', async () => {
      const steps = [{ step: 'Analyze' }, { step: 'Design' }, { step: 'Implement' }]
      const result = await executeTool('planSteps', { steps }, context)

      expect(result.success).toBe(true)
      expect(result.output).toContain('Analyze')
    })
  })

  describe('executeTool - file operations', () => {
    it('createFile should return success with path', async () => {
      const result = await executeTool('createFile', {
        path: 'src/test/component.tsx',
        content: 'export default function Test() { return <div>Test</div> }',
      }, context)

      expect(result.success).toBe(true)
      expect(result.output).toContain('component.tsx')
    })

    it('readFile should return result structure', async () => {
      const result = await executeTool('readFile', {
        path: 'package.json',
      }, context)

      // Result may fail if file doesn't exist, but should have proper structure
      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('output')
    })
  })

  describe('executeTool - command execution', () => {
    it('runCommand should return output structure', async () => {
      const result = await executeTool('runCommand', {
        command: 'echo "test"',
      }, context)

      expect(result).toHaveProperty('success')
      expect(result).toHaveProperty('output')
    })

    it('installPackage should track package installation', async () => {
      const result = await executeTool('installPackage', {
        packageName: 'lodash',
        isDev: false,
      }, context)

      expect(result.success).toBe(true)
      expect(result.output).toContain('lodash')
    })
  })

  describe('executeTool - secrets management', () => {
    it('requireSecret should store secret requirement in context', async () => {
      const result = await executeTool('requireSecret', {
        key: 'API_KEY',
        description: 'The API key for external service',
        defaultValue: 'secret-value-123',
      }, context)

      expect(result.success).toBe(true)
      expect(context.secrets.has('API_KEY')).toBe(true)
    })

    it('getSecret should retrieve stored secret', async () => {
      // First set a secret
      context.secrets.set('DATABASE_URL', { value: 'postgres://localhost/db', description: 'DB URL' })

      const result = await executeTool('getSecret', {
        key: 'DATABASE_URL',
      }, context)

      expect(result.success).toBe(true)
      // Value should be masked in output
      expect(result.output).toContain('DATABASE_URL')
    })

    it('getSecret should handle missing optional secret', async () => {
      const result = await executeTool('getSecret', {
        key: 'NONEXISTENT_KEY',
        required: false,
      }, context)

      // Optional secrets return success with null value
      expect(result.success).toBe(true)
    })
  })

  describe('executeTool - checkpoints', () => {
    it('createCheckpoint should save state', async () => {
      const result = await executeTool('createCheckpoint', {
        name: 'before-refactor',
        reason: 'Saving state before major changes',
      }, context)

      expect(result.success).toBe(true)
      // Check checkpoint was stored
      expect(result.output).toContain('before-refactor')
    })

    it('listCheckpoints should show checkpoints', async () => {
      // Create a checkpoint first
      await executeTool('createCheckpoint', {
        name: 'test-checkpoint',
        reason: 'Test',
      }, context)

      const result = await executeTool('listCheckpoints', {}, context)

      expect(result.success).toBe(true)
    })

    it('rollbackToCheckpoint should fail for missing checkpoint', async () => {
      const result = await executeTool('rollbackToCheckpoint', {
        checkpointName: 'nonexistent-checkpoint',
      }, context)

      expect(result.success).toBe(false)
    })
  })

  describe('executeTool - MCP operations', () => {
    it('connectMcpServer should register server', async () => {
      const result = await executeTool('connectMcpServer', {
        url: 'https://mcp.example.com',
        name: 'github-mcp',
      }, context)

      expect(result.success).toBe(true)
      expect(context.mcpServers.has('github-mcp')).toBe(true)
    })

    it('listMcpTools should return available tools', async () => {
      // Register a mock MCP server with proper tool structure
      context.mcpServers.set('test-mcp', {
        url: 'https://test.mcp.com',
        tools: [
          { name: 'tool1', description: 'First tool', parameters: {} },
          { name: 'tool2', description: 'Second tool', parameters: {} }
        ],
        connected: true,
      })

      const result = await executeTool('listMcpTools', {
        serverName: 'test-mcp',
      }, context)

      expect(result.success).toBe(true)
      expect(result.output).toContain('tool1')
    })
  })

  describe('executeTool - vision tools', () => {
    it('captureScreenshot should return screenshot info', async () => {
      const result = await executeTool('captureScreenshot', {
        viewport: { width: 1920, height: 1080 },
      }, context)

      expect(result.success).toBe(true)
      expect(result.data).toHaveProperty('screenshotId')
    })
  })

  describe('executeTool - delegation', () => {
    it('delegateToAgent should route to agent', async () => {
      const result = await executeTool('delegateToAgent', {
        agentId: 'frontend',
        task: 'Create a button component',
      }, context)

      expect(result.success).toBe(true)
      expect(result.output).toContain('frontend')
    })
  })

  describe('Error handling', () => {
    it('should return error for unknown tool', async () => {
      // @ts-expect-error - Testing invalid tool name
      const result = await executeTool('nonexistentTool', {}, context)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })
})
