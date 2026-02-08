import fs from 'node:fs'
import path from 'node:path'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { 
  createExecutionContext, 
  executeTool,
  type ToolExecutionContext 
} from './executor'

describe('Tool Executor', () => {
  let context: ToolExecutionContext
  let dataDir: string
  let projectId: string

  beforeEach(() => {
    dataDir = path.join(process.cwd(), '.tmp', `tool-executor-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
    process.env.TORBIT_DATA_DIR = dataDir
    fs.rmSync(dataDir, { recursive: true, force: true })

    projectId = `test-project-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    context = createExecutionContext(projectId, 'test-user')
  })

  afterEach(() => {
    fs.rmSync(dataDir, { recursive: true, force: true })
    delete process.env.TORBIT_DATA_DIR
  })

  describe('createExecutionContext', () => {
    it('should create context with required properties', () => {
      expect(context.projectId).toBe(projectId)
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
        checkpointId: 'nonexistent-checkpoint',
        confirm: true,
      }, context)

      expect(result.success).toBe(false)
    })

    it('atomicRollback should restore files, database state, and deployment config', async () => {
      await executeTool('createFile', {
        path: 'src/state.ts',
        content: 'export const version = 1',
      }, context)
      context.dbState = {
        schema: {
          todos: {
            columns: [{ name: 'id', type: 'uuid', nullable: false }],
            indexes: ['PRIMARY KEY (id)'],
          },
        },
        data: {
          todos: [{ id: 'todo-1', title: 'first' }],
        },
      }
      context.dbSchema = context.dbState.schema
      context.deploymentConfig = {
        provider: 'vercel',
        environment: 'production',
        url: 'https://initial.example.com',
      }

      const checkpointResult = await executeTool('createCheckpoint', {
        name: 'atomic-restore-point',
        reason: 'before mutation',
      }, context)
      const checkpointId = (
        checkpointResult.data as { checkpointId?: string } | undefined
      )?.checkpointId
      expect(checkpointId).toBeTruthy()

      await executeTool('editFile', {
        path: 'src/state.ts',
        oldContent: 'version = 1',
        newContent: 'version = 2',
      }, context)
      context.dbState = {
        ...(context.dbState || {}),
        data: {
          todos: [{ id: 'todo-2', title: 'changed' }],
        },
      }
      context.dbSchema = context.dbState.schema
      context.deploymentConfig = {
        provider: 'netlify',
        environment: 'staging',
        url: 'https://changed.example.com',
      }

      const rollbackResult = await executeTool('atomicRollback', {
        checkpointId: checkpointId!,
        confirm: true,
      }, context)

      expect(rollbackResult.success).toBe(true)
      expect(context.files.get('src/state.ts')).toContain('version = 1')
      expect(context.dbState?.data).toEqual({ todos: [{ id: 'todo-1', title: 'first' }] })
      expect(context.deploymentConfig?.provider).toBe('vercel')
      expect(rollbackResult.output).toContain('Scopes restored: files, database, deployment')
    })

    it('should replay the latest checkpoint in a new execution context', async () => {
      await executeTool('createFile', {
        path: 'src/resume.ts',
        content: 'export const resumed = true',
      }, context)

      const restoredContext = createExecutionContext(projectId, 'test-user')

      expect(restoredContext.lastReplayedCheckpointId).toBeTruthy()
      expect(restoredContext.files.get('src/resume.ts')).toContain('resumed = true')
    })

    it('should persist explicit checkpoints across contexts', async () => {
      await executeTool('createCheckpoint', {
        name: 'persisted-checkpoint',
        reason: 'durability test',
      }, context)

      const restoredContext = createExecutionContext(projectId, 'test-user', undefined, {
        replayLatestCheckpoint: false,
      })

      const ids = Array.from(restoredContext.checkpoints.keys())
      expect(ids.some((id) => id.includes('persisted-checkpoint'))).toBe(true)
    })

    it('should replay checkpoint scopes and atomic state in a new execution context', async () => {
      context.dbState = {
        schema: {
          sessions: {
            columns: [{ name: 'id', type: 'uuid', nullable: false }],
            indexes: ['PRIMARY KEY (id)'],
          },
        },
        data: {
          sessions: [{ id: 'session-1' }],
        },
      }
      context.dbSchema = context.dbState.schema
      context.deploymentConfig = {
        provider: 'vercel',
        environment: 'production',
        url: 'https://resume.example.com',
      }

      await executeTool('createCheckpoint', {
        name: 'atomic-replay',
      }, context)

      const restoredContext = createExecutionContext(projectId, 'test-user')
      expect(restoredContext.lastReplayedCheckpointId).toBeTruthy()
      expect(restoredContext.lastReplayedCheckpointScopes).toEqual(['files', 'database', 'deployment'])
      expect(restoredContext.dbState?.data).toEqual({ sessions: [{ id: 'session-1' }] })
      expect(restoredContext.deploymentConfig?.url).toBe('https://resume.example.com')
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
