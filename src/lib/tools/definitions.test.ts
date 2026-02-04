import { describe, it, expect } from 'vitest'
import { 
  TOOL_DEFINITIONS, 
  AGENT_TOOLS, 
  type AgentId 
} from './definitions'

describe('Tool Definitions', () => {
  describe('TOOL_DEFINITIONS structure', () => {
    it('should have multiple tools defined', () => {
      const toolCount = Object.keys(TOOL_DEFINITIONS).length
      expect(toolCount).toBeGreaterThan(30) // We have 50+ tools
    })

    it('each tool should have description and inputSchema', () => {
      for (const [name, def] of Object.entries(TOOL_DEFINITIONS)) {
        expect(def.description, `${name} missing description`).toBeDefined()
        expect(typeof def.description).toBe('string')
        expect(def.description.length).toBeGreaterThan(10)
        
        expect(def.inputSchema, `${name} missing inputSchema`).toBeDefined()
      }
    })

    it('tool descriptions should be meaningful', () => {
      for (const [name, def] of Object.entries(TOOL_DEFINITIONS)) {
        expect(def.description.toLowerCase()).not.toContain('todo')
        expect(def.description.toLowerCase()).not.toContain('placeholder')
      }
    })

    it('should have core file manipulation tools', () => {
      expect(TOOL_DEFINITIONS.createFile).toBeDefined()
      expect(TOOL_DEFINITIONS.editFile).toBeDefined()
      expect(TOOL_DEFINITIONS.readFile).toBeDefined()
      expect(TOOL_DEFINITIONS.deleteFile).toBeDefined()
    })

    it('should have AI reasoning tools', () => {
      expect(TOOL_DEFINITIONS.think).toBeDefined()
      expect(TOOL_DEFINITIONS.planSteps).toBeDefined()
      expect(TOOL_DEFINITIONS.delegateToAgent).toBeDefined()
    })

    it('should have vision tools', () => {
      expect(TOOL_DEFINITIONS.captureScreenshot).toBeDefined()
      expect(TOOL_DEFINITIONS.analyzeVisual).toBeDefined()
      expect(TOOL_DEFINITIONS.getBrowserLogs).toBeDefined()
    })

    it('should have checkpoint tools', () => {
      expect(TOOL_DEFINITIONS.createCheckpoint).toBeDefined()
      expect(TOOL_DEFINITIONS.rollbackToCheckpoint).toBeDefined()
      expect(TOOL_DEFINITIONS.listCheckpoints).toBeDefined()
    })

    it('should have MCP connectivity tools', () => {
      expect(TOOL_DEFINITIONS.connectMcpServer).toBeDefined()
      expect(TOOL_DEFINITIONS.listMcpTools).toBeDefined()
      expect(TOOL_DEFINITIONS.invokeMcpTool).toBeDefined()
    })

    it('should have secret management tools', () => {
      expect(TOOL_DEFINITIONS.listSecrets).toBeDefined()
      expect(TOOL_DEFINITIONS.getSecret).toBeDefined()
      expect(TOOL_DEFINITIONS.requireSecret).toBeDefined()
    })
  })

  describe('Tool input schemas', () => {
    it('think tool should accept thought string', () => {
      const schema = TOOL_DEFINITIONS.think.inputSchema
      const valid = schema.safeParse({ thought: 'This is my reasoning...' })
      expect(valid.success).toBe(true)
      
      const invalid = schema.safeParse({})
      expect(invalid.success).toBe(false)
    })

    it('createFile tool should validate path and content', () => {
      const schema = TOOL_DEFINITIONS.createFile.inputSchema
      const valid = schema.safeParse({
        path: 'src/components/Button.tsx',
        content: 'export default function Button() { return <button>Click</button> }',
      })
      expect(valid.success).toBe(true)
      
      const invalidNoContent = schema.safeParse({ path: 'file.ts' })
      expect(invalidNoContent.success).toBe(false)
    })

    it('runCommand tool should accept command string', () => {
      const schema = TOOL_DEFINITIONS.runCommand.inputSchema
      const valid = schema.safeParse({
        command: 'npm run build',
      })
      expect(valid.success).toBe(true)
    })

    it('captureScreenshot should accept selector and viewport', () => {
      const schema = TOOL_DEFINITIONS.captureScreenshot.inputSchema
      const valid = schema.safeParse({
        selector: '.header',
        viewport: { width: 1920, height: 1080 },
      })
      expect(valid.success).toBe(true)
      
      // Should also work with no params (optional)
      const validEmpty = schema.safeParse({})
      expect(validEmpty.success).toBe(true)
    })

    it('createCheckpoint should require name and reason', () => {
      const schema = TOOL_DEFINITIONS.createCheckpoint.inputSchema
      const valid = schema.safeParse({
        name: 'before-refactor',
        reason: 'Saving state before major changes',
      })
      expect(valid.success).toBe(true)
    })
  })

  describe('AGENT_TOOLS mapping', () => {
    const allAgents: AgentId[] = [
      'architect', 'frontend', 'backend', 'database', 
      'devops', 'qa', 'planner', 'auditor'
    ]

    it('should have tools defined for all agents', () => {
      for (const agent of allAgents) {
        expect(AGENT_TOOLS[agent], `Missing agent: ${agent}`).toBeDefined()
        expect(Object.keys(AGENT_TOOLS[agent]).length).toBeGreaterThan(0)
      }
    })

    it('architect should have planning and delegation tools', () => {
      const tools = Object.keys(AGENT_TOOLS.architect)
      expect(tools).toContain('think')
      expect(tools).toContain('planSteps')
      expect(tools).toContain('delegateToAgent')
    })

    it('frontend should have file manipulation tools', () => {
      const tools = Object.keys(AGENT_TOOLS.frontend)
      expect(tools).toContain('createFile')
      expect(tools).toContain('editFile')
      expect(tools).toContain('readFile')
    })

    it('all agent tools should reference valid tool definitions', () => {
      for (const [agentId, tools] of Object.entries(AGENT_TOOLS)) {
        for (const toolName of Object.keys(tools)) {
          expect(
            TOOL_DEFINITIONS[toolName as keyof typeof TOOL_DEFINITIONS],
            `Agent ${agentId} references invalid tool: ${toolName}`
          ).toBeDefined()
        }
      }
    })
  })

  describe('Schema edge cases', () => {
    it('should reject invalid types for all schemas', () => {
      for (const [name, def] of Object.entries(TOOL_DEFINITIONS)) {
        const result = def.inputSchema.safeParse(null)
        expect(result.success, `${name} should reject null`).toBe(false)
        
        const resultString = def.inputSchema.safeParse('invalid string')
        expect(resultString.success, `${name} should reject plain string`).toBe(false)
      }
    })
  })
})
