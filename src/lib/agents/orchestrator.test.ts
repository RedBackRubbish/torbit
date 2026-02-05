import { describe, it, expect } from 'vitest'
import { 
  TorbitOrchestrator, 
  type OrchestrationConfig,
  type AgentResult,
  type AuditResult,
  type ModelTier,
  type PreflightResult,
  type ParallelTask,
  type ParallelResult
} from './orchestrator'

describe('Orchestrator', () => {
  describe('TorbitOrchestrator initialization', () => {
    it('should create orchestrator with minimal config', () => {
      const config: OrchestrationConfig = {
        projectId: 'test-project',
        userId: 'test-user',
      }

      const orchestrator = new TorbitOrchestrator(config)
      expect(orchestrator).toBeDefined()
    })

    it('should accept optional configuration', () => {
      const config: OrchestrationConfig = {
        projectId: 'test-project',
        userId: 'test-user',
        modelTier: 'sonnet',
        enableAudit: true,
        enableTicketSync: false,
        mcpServers: [
          { name: 'github-mcp', url: 'https://mcp.github.com' }
        ],
      }

      const orchestrator = new TorbitOrchestrator(config)
      expect(orchestrator).toBeDefined()
    })
  })

  describe('Type exports', () => {
    it('should export OrchestrationConfig type', () => {
      const config: OrchestrationConfig = {
        projectId: 'p1',
        userId: 'u1',
      }
      expect(config.projectId).toBe('p1')
    })

    it('should export AgentResult type', () => {
      const result: AgentResult = {
        agentId: 'architect',
        success: true,
        output: 'Plan created',
        toolCalls: [{
          name: 'planSteps',
          args: { steps: ['Step 1'] },
          result: { success: true },
          duration: 100,
        }],
        duration: 500,
      }
      expect(result.success).toBe(true)
    })

    it('should export AuditResult type', () => {
      const audit: AuditResult = {
        passed: true,
        gates: {
          visual: { passed: true, issues: [] },
          functional: { passed: true, issues: [] },
          hygiene: { passed: true, issues: [] },
          security: { passed: true, issues: [] },
        },
      }
      expect(audit.passed).toBe(true)
    })

    it('should export ModelTier type', () => {
      const tier: ModelTier = 'opus'
      expect(['opus', 'sonnet', 'flash']).toContain(tier)
    })
  })

  describe('Agent ID validation', () => {
    it('should support all agent types', () => {
      const validAgents = [
        'architect', 'frontend', 'backend', 'database',
        'devops', 'qa', 'planner', 'auditor'
      ]

      for (const agent of validAgents) {
        const result: AgentResult = {
          agentId: agent as AgentResult['agentId'],
          success: true,
          output: 'test',
          toolCalls: [],
          duration: 0,
        }
        expect(result.agentId).toBe(agent)
      }
    })
  })

  describe('AuditResult structure', () => {
    it('should have all three gates', () => {
      const audit: AuditResult = {
        passed: false,
        gates: {
          visual: { passed: false, issues: ['Color mismatch'] },
          functional: { passed: true, issues: [] },
          hygiene: { passed: false, issues: ['Console errors found'] },
          security: { passed: true, issues: [] },
        },
      }

      expect(audit.gates.visual).toBeDefined()
      expect(audit.gates.functional).toBeDefined()
      expect(audit.gates.hygiene).toBeDefined()
    })

    it('should aggregate gate results', () => {
      const audit: AuditResult = {
        passed: false,
        gates: {
          visual: { passed: true, issues: [] },
          functional: { passed: false, issues: ['E2E failed'] },
          hygiene: { passed: true, issues: [] },
          security: { passed: true, issues: [] },
        },
      }

      // Overall passed should be false if any gate fails
      const allGatesPassed = 
        audit.gates.visual.passed && 
        audit.gates.functional.passed && 
        audit.gates.hygiene.passed

      expect(allGatesPassed).toBe(false)
      expect(audit.passed).toBe(false)
    })
  })

  describe('Tool call tracking', () => {
    it('should track tool call metadata', () => {
      const result: AgentResult = {
        agentId: 'frontend',
        success: true,
        output: 'Component created',
        toolCalls: [
          {
            name: 'createFile',
            args: { path: 'src/Button.tsx', content: '...' },
            result: { success: true, path: 'src/Button.tsx' },
            duration: 150,
          },
          {
            name: 'editFile',
            args: { path: 'src/index.ts', edits: [] },
            result: { success: true },
            duration: 80,
          },
        ],
        duration: 1000,
      }

      expect(result.toolCalls).toHaveLength(2)
      expect(result.toolCalls[0].name).toBe('createFile')
      expect(result.toolCalls[0].duration).toBeGreaterThan(0)
    })

    it('should calculate total tool duration', () => {
      const result: AgentResult = {
        agentId: 'backend',
        success: true,
        output: '',
        toolCalls: [
          { name: 'think', args: {}, result: {}, duration: 100 },
          { name: 'createFile', args: {}, result: {}, duration: 200 },
          { name: 'runTests', args: {}, result: {}, duration: 500 },
        ],
        duration: 1500,
      }

      const totalToolDuration = result.toolCalls.reduce(
        (sum, tc) => sum + tc.duration, 
        0
      )

      expect(totalToolDuration).toBe(800)
      // Total duration should be >= tool duration (includes LLM time)
      expect(result.duration).toBeGreaterThanOrEqual(totalToolDuration)
    })
  })
})

describe('Orchestrator exports', () => {
  it('should export from index', async () => {
    // Dynamically import to test exports
    const exports = await import('./index')
    
    expect(exports.TorbitOrchestrator).toBeDefined()
  })
})

describe('Pre-flight Check', () => {
  let orchestrator: TorbitOrchestrator

  it('should reject unfeasible requests - Facebook clone', () => {
    orchestrator = new TorbitOrchestrator({
      projectId: 'test',
      userId: 'user1',
    })

    const result = orchestrator.preflight('build me a Facebook clone')
    
    expect(result.feasible).toBe(false)
    expect(result.reason).toContain('scope')
    expect(result.warnings?.length).toBeGreaterThan(0)
  })

  it('should reject unfeasible requests - malicious intent', () => {
    orchestrator = new TorbitOrchestrator({
      projectId: 'test',
      userId: 'user1',
    })

    const result = orchestrator.preflight('write me a keylogger')
    
    expect(result.feasible).toBe(false)
    expect(result.reason?.toLowerCase()).toContain('malicious')
  })

  it('should accept reasonable requests', () => {
    orchestrator = new TorbitOrchestrator({
      projectId: 'test',
      userId: 'user1',
    })

    const result = orchestrator.preflight('create a landing page with a hero section')
    
    expect(result.feasible).toBe(true)
    expect(result.estimatedComplexity).toBeDefined()
    expect(result.estimatedFuel).toBeDefined()
    expect(result.estimatedFuel.min).toBeGreaterThan(0)
  })

  it('should estimate complexity based on prompt length', () => {
    orchestrator = new TorbitOrchestrator({
      projectId: 'test',
      userId: 'user1',
    })

    const shortResult = orchestrator.preflight('add a button')
    const longResult = orchestrator.preflight(
      'Build a complete e-commerce platform with user authentication, ' +
      'product catalog, shopping cart, checkout flow, payment integration, ' +
      'order management, admin dashboard, inventory tracking, and analytics'
    )
    
    expect(shortResult.estimatedFuel.max).toBeLessThan(longResult.estimatedFuel.max)
  })
})

describe('AuditResult with Security Gate', () => {
  it('should include security gate in audit result', () => {
    const audit: AuditResult = {
      passed: true,
      gates: {
        visual: { passed: true, issues: [] },
        functional: { passed: true, issues: [] },
        hygiene: { passed: true, issues: [] },
        security: { passed: true, issues: [] },
      },
    }

    expect(audit.gates.security).toBeDefined()
    expect(audit.gates.security?.passed).toBe(true)
  })

  it('should fail audit if security gate fails', () => {
    const audit: AuditResult = {
      passed: false,
      gates: {
        visual: { passed: true, issues: [] },
        functional: { passed: true, issues: [] },
        hygiene: { passed: true, issues: [] },
        security: { 
          passed: false,
          issues: ['Hardcoded Stripe key exposed in src/payments.ts']
        },
      },
    }

    expect(audit.gates.security?.passed).toBe(false)
    expect(audit.gates.security?.issues).toHaveLength(1)
    expect(audit.gates.security?.issues?.[0]).toContain('Stripe')
  })
})

describe('PreflightResult type', () => {
  it('should export PreflightResult type', () => {
    const result: PreflightResult = {
      feasible: true,
      estimatedComplexity: 'simple',
      estimatedFuel: { min: 10, max: 30 },
      warnings: [],
    }

    expect(result.feasible).toBe(true)
    expect(['trivial', 'simple', 'medium', 'complex', 'architectural']).toContain(result.estimatedComplexity)
  })
})

describe('Parallel Execution Types', () => {
  it('should export ParallelTask type', () => {
    const task: ParallelTask = {
      agent: 'frontend',
      prompt: 'Create a dashboard component',
      modelTier: 'sonnet',
    }

    expect(task.agent).toBe('frontend')
    expect(task.prompt).toContain('dashboard')
    expect(task.modelTier).toBe('sonnet')
  })

  it('should allow optional modelTier in ParallelTask', () => {
    const task: ParallelTask = {
      agent: 'backend',
      prompt: 'Build REST API',
    }

    expect(task.modelTier).toBeUndefined()
  })

  it('should export ParallelResult type', () => {
    const result: ParallelResult = {
      results: [
        {
          agentId: 'frontend',
          success: true,
          output: 'Created dashboard',
          toolCalls: [],
          duration: 1000,
        },
        {
          agentId: 'backend',
          success: true,
          output: 'Built API',
          toolCalls: [],
          duration: 1200,
        },
      ],
      checkpoint: 'checkpoint-123',
      totalDuration: 1500,
      parallelSpeedup: 1.47, // (1000 + 1200) / 1500
    }

    expect(result.results).toHaveLength(2)
    expect(result.parallelSpeedup).toBeGreaterThan(1)
    expect(result.checkpoint).toBeDefined()
  })

  it('should include merged result when architect integrates', () => {
    const result: ParallelResult = {
      results: [],
      merged: {
        agentId: 'architect',
        success: true,
        output: 'Integrated frontend + backend',
        toolCalls: [],
        duration: 800,
      },
      checkpoint: 'checkpoint-456',
      totalDuration: 2300,
      parallelSpeedup: 2.5,
    }

    expect(result.merged).toBeDefined()
    expect(result.merged?.agentId).toBe('architect')
  })
})

describe('Parallel Execution', () => {
  it('should create orchestrator with parallel execution capability', () => {
    const orchestrator = new TorbitOrchestrator({
      projectId: 'test',
      userId: 'user1',
    })

    expect(orchestrator.executeParallel).toBeDefined()
    expect(typeof orchestrator.executeParallel).toBe('function')
  })

  it('should have orchestrateParallel method', () => {
    const orchestrator = new TorbitOrchestrator({
      projectId: 'test',
      userId: 'user1',
    })

    expect(orchestrator.orchestrateParallel).toBeDefined()
    expect(typeof orchestrator.orchestrateParallel).toBe('function')
  })
})
