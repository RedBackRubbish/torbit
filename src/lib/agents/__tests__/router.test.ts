/**
 * Tests for Kimi K2.5 Intelligent Router
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { KimiRouter, type RoutingDecision } from '../router'

// Mock the Kimi provider
vi.mock('../../providers/kimi', () => ({
  createKimiClient: vi.fn(() => ({
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
  })),
}))

describe('KimiRouter', () => {
  let router: KimiRouter

  beforeEach(() => {
    router = new KimiRouter({
      enableThinking: false,
      fastMode: true,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('quickRoute - Fast Path Decisions', () => {
    it('should route vision tasks to frontend with opus tier', async () => {
      const result = await router.route('implement this Figma design', {
        hasImages: true,
      })

      expect(result.targetAgent).toBe('frontend')
      expect(result.modelTier).toBe('opus')
      expect(result.requiresVision).toBe(true)
      expect(result.category).toBe('ui-design')
      expect(result.confidence).toBeGreaterThan(0.8)
    })

    it('should route screenshot analysis to frontend', async () => {
      const result = await router.route('analyze this screenshot and fix the layout')

      expect(result.targetAgent).toBe('frontend')
      expect(result.requiresVision).toBe(true)
    })

    it('should route simple queries to flash tier', async () => {
      const result = await router.route('what is useState?')

      expect(result.modelTier).toBe('flash')
      expect(result.complexity).toBe('trivial')
      expect(result.category).toBe('general-query')
    })

    it('should route testing tasks to qa agent', async () => {
      const result = await router.route('write unit tests for the auth module')

      expect(result.targetAgent).toBe('qa')
      expect(result.category).toBe('testing')
    })

    it('should route devops tasks correctly', async () => {
      const result = await router.route('set up GitHub Actions for CI/CD')

      expect(result.targetAgent).toBe('devops')
      expect(result.category).toBe('devops')
    })

    it('should route database tasks correctly', async () => {
      const result = await router.route('create a Prisma schema for user authentication')

      expect(result.targetAgent).toBe('database')
      expect(result.category).toBe('database')
    })

    it('should route architecture tasks with opus and thinking', async () => {
      const result = await router.route('architect a new microservices system')

      expect(result.targetAgent).toBe('architect')
      expect(result.modelTier).toBe('opus')
      expect(result.complexity).toBe('architectural')
      expect(result.useThinking).toBe(true)
    })
  })

  describe('Complexity Assessment', () => {
    it('should classify simple queries as trivial', async () => {
      const result = await router.route('explain React hooks')

      expect(result.complexity).toBe('trivial')
    })

    it('should classify refactoring as architectural', async () => {
      const result = await router.route('refactor entire authentication system')

      expect(result.complexity).toBe('architectural')
    })
  })

  describe('Model Tier Selection', () => {
    it('should use opus for architectural tasks', async () => {
      const result = await router.route('design the system architecture')

      expect(result.modelTier).toBe('opus')
    })

    it('should use flash for trivial queries', async () => {
      const result = await router.route('what is a Promise?')

      expect(result.modelTier).toBe('flash')
    })

    it('should use sonnet for moderate tasks', async () => {
      const result = await router.route('write a test for the login function')

      expect(result.modelTier).toBe('sonnet')
    })
  })

  describe('Fallback Behavior', () => {
    it('should return valid decision for unknown prompt patterns', async () => {
      // This won't match quick route patterns, but will use fallback
      // since we're mocking the API
      const result = await router.route('foobar baz qux')

      expect(result.targetAgent).toBeDefined()
      expect(result.modelTier).toBeDefined()
      expect(result.confidence).toBeGreaterThan(0)
    })
  })

  describe('Multimodal Detection', () => {
    it('should detect UI/UX keywords as requiring vision', async () => {
      const result = await router.route('match this mockup exactly')

      expect(result.requiresVision).toBe(true)
    })

    it('should not require vision for pure code tasks', async () => {
      const result = await router.route('write a test for the API endpoint')

      expect(result.requiresVision).toBe(false)
    })
  })
})

describe('RoutingDecision Validation', () => {
  const router = new KimiRouter()

  it('should validate agent IDs', async () => {
    const result = await router.route('deploy to production')

    const validAgents = ['architect', 'frontend', 'backend', 'database', 'devops', 'qa', 'planner', 'auditor']
    expect(validAgents).toContain(result.targetAgent)
  })

  it('should validate model tiers', async () => {
    const result = await router.route('build a component')

    expect(['opus', 'sonnet', 'flash']).toContain(result.modelTier)
  })

  it('should include reasoning', async () => {
    const result = await router.route('create a button component')

    expect(result.reasoning).toBeDefined()
    expect(typeof result.reasoning).toBe('string')
    expect(result.reasoning.length).toBeGreaterThan(0)
  })

  it('should include confidence score', async () => {
    const result = await router.route('write documentation')

    expect(typeof result.confidence).toBe('number')
    expect(result.confidence).toBeGreaterThanOrEqual(0)
    expect(result.confidence).toBeLessThanOrEqual(1)
  })
})
