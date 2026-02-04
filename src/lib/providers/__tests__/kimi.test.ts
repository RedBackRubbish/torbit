/**
 * Tests for Kimi K2.5 Provider
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  KIMI_MODEL_CAPABILITIES,
  modelSupports,
  selectKimiModel,
  estimateTokens,
  type KimiModel,
} from '../kimi'

describe('Kimi Provider', () => {
  describe('Model Capabilities', () => {
    it('should define kimi-k2.5 with correct capabilities', () => {
      const caps = KIMI_MODEL_CAPABILITIES['kimi-k2.5']

      expect(caps.contextWindow).toBe(262144) // 256K
      expect(caps.supportsVision).toBe(true)
      expect(caps.supportsThinking).toBe(true)
      expect(caps.supportsToolUse).toBe(true)
    })

    it('should define kimi-k2-turbo-preview as faster model', () => {
      const caps = KIMI_MODEL_CAPABILITIES['kimi-k2-turbo-preview']

      expect(caps.supportsVision).toBe(false) // turbo doesn't have vision
      expect(caps.tokensPerSecond).toBe('60-100')
    })

    it('should have all models with 256K context', () => {
      const models = Object.keys(KIMI_MODEL_CAPABILITIES) as Array<keyof typeof KIMI_MODEL_CAPABILITIES>

      for (const model of models) {
        expect(KIMI_MODEL_CAPABILITIES[model].contextWindow).toBe(262144)
      }
    })
  })

  describe('modelSupports', () => {
    it('should return true for kimi-k2.5 vision support', () => {
      expect(modelSupports('kimi-k2.5', 'vision')).toBe(true)
    })

    it('should return false for turbo vision support', () => {
      expect(modelSupports('kimi-k2-turbo-preview', 'vision')).toBe(false)
    })

    it('should return true for thinking support on kimi-k2.5', () => {
      expect(modelSupports('kimi-k2.5', 'thinking')).toBe(true)
    })

    it('should return false for thinking on turbo', () => {
      expect(modelSupports('kimi-k2-turbo-preview', 'thinking')).toBe(false)
    })

    it('should return true for tool use on all models', () => {
      expect(modelSupports('kimi-k2.5', 'toolUse')).toBe(true)
      expect(modelSupports('kimi-k2-turbo-preview', 'toolUse')).toBe(true)
      expect(modelSupports('kimi-k2-thinking', 'toolUse')).toBe(true)
    })
  })

  describe('selectKimiModel', () => {
    it('should select kimi-k2.5 for vision requirements', () => {
      const model = selectKimiModel({ needsVision: true })
      expect(model).toBe('kimi-k2.5')
    })

    it('should select turbo for speed priority without thinking', () => {
      const model = selectKimiModel({ prioritizeSpeed: true })
      expect(model).toBe('kimi-k2-turbo-preview')
    })

    it('should select thinking-turbo for speed with thinking', () => {
      const model = selectKimiModel({ prioritizeSpeed: true, needsThinking: true })
      expect(model).toBe('kimi-k2-thinking-turbo')
    })

    it('should default to kimi-k2.5 for general use', () => {
      const model = selectKimiModel({})
      expect(model).toBe('kimi-k2.5')
    })
  })

  describe('estimateTokens', () => {
    it('should estimate tokens for short text', () => {
      const tokens = estimateTokens('Hello world')
      expect(tokens).toBeGreaterThan(0)
      expect(tokens).toBeLessThan(10)
    })

    it('should estimate tokens for longer text', () => {
      const text = 'This is a longer piece of text that should have more tokens.'
      const tokens = estimateTokens(text)

      // Rough estimate: ~4 chars per token
      expect(tokens).toBeCloseTo(text.length / 4, 0)
    })

    it('should handle empty string', () => {
      const tokens = estimateTokens('')
      expect(tokens).toBe(0)
    })

    it('should handle code with special characters', () => {
      const code = `function hello() { console.log("world"); }`
      const tokens = estimateTokens(code)
      expect(tokens).toBeGreaterThan(5)
    })
  })

  describe('createKimiClient', () => {
    const originalEnv = process.env

    beforeEach(() => {
      process.env = { ...originalEnv }
    })

    afterEach(() => {
      process.env = originalEnv
    })

    it('should throw error when no API key configured', async () => {
      // Clear env vars
      delete process.env.KIMI_API_KEY
      delete process.env.MOONSHOT_API_KEY

      // Dynamic import to test with clean env
      const { createKimiClient } = await import('../kimi')

      expect(() => createKimiClient()).toThrow('Kimi API key not configured')
    })
  })
})

describe('Kimi Model Types', () => {
  it('should have correct model identifiers', () => {
    const models: KimiModel[] = [
      'kimi-k2.5',
      'kimi-k2-turbo-preview',
      'kimi-k2-0905-preview',
      'kimi-k2-thinking',
      'kimi-k2-thinking-turbo',
      'moonshot-v1-8k',
      'moonshot-v1-32k',
      'moonshot-v1-128k',
    ]

    // All should be valid
    expect(models).toHaveLength(8)
  })
})
