import { describe, it, expect, vi, beforeEach } from 'vitest'
import { featureFlags, DEFAULT_FLAGS } from './feature-flags'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

describe('Feature Flags', () => {
  beforeEach(() => {
    localStorageMock.clear()
    featureFlags.clearOverrides()
  })

  describe('DEFAULT_FLAGS', () => {
    it('should have required properties for each flag', () => {
      for (const [id, flag] of Object.entries(DEFAULT_FLAGS)) {
        expect(flag.id).toBe(id)
        expect(flag.name).toBeDefined()
        expect(flag.description).toBeDefined()
        expect(typeof flag.defaultValue).toBe('boolean')
      }
    })

    it('should include expected default flags', () => {
      expect(DEFAULT_FLAGS['multi-agent']).toBeDefined()
      expect(DEFAULT_FLAGS['code-streaming']).toBeDefined()
      expect(DEFAULT_FLAGS['preview-hot-reload']).toBeDefined()
    })
  })

  describe('isEnabled', () => {
    it('should return default value for flags at 100% rollout', () => {
      expect(featureFlags.isEnabled('multi-agent')).toBe(true)
      expect(featureFlags.isEnabled('code-streaming')).toBe(true)
    })

    it('should return false for unknown flags', () => {
      expect(featureFlags.isEnabled('unknown-flag')).toBe(false)
    })

    it('should respect overrides', () => {
      featureFlags.setOverride('multi-agent', false)
      expect(featureFlags.isEnabled('multi-agent')).toBe(false)
      
      featureFlags.setOverride('multi-agent', true)
      expect(featureFlags.isEnabled('multi-agent')).toBe(true)
    })
  })

  describe('Overrides', () => {
    it('should set and remove overrides', () => {
      featureFlags.setOverride('multi-agent', false)
      expect(featureFlags.isEnabled('multi-agent')).toBe(false)
      
      featureFlags.removeOverride('multi-agent')
      expect(featureFlags.isEnabled('multi-agent')).toBe(true)
    })

    it('should clear all overrides', () => {
      featureFlags.setOverride('multi-agent', false)
      featureFlags.setOverride('code-streaming', false)
      
      featureFlags.clearOverrides()
      
      expect(featureFlags.isEnabled('multi-agent')).toBe(true)
      expect(featureFlags.isEnabled('code-streaming')).toBe(true)
    })
  })

  describe('getAllFlags', () => {
    it('should return all flags with enabled status', () => {
      const allFlags = featureFlags.getAllFlags()
      
      expect(Object.keys(allFlags).length).toBeGreaterThan(0)
      
      for (const [_id, { flag, enabled }] of Object.entries(allFlags)) {
        expect(flag.id).toBeDefined()
        expect(typeof enabled).toBe('boolean')
      }
    })
  })

  describe('Subscription', () => {
    it('should notify listeners on override change', () => {
      const listener = vi.fn()
      const unsubscribe = featureFlags.subscribe(listener)
      
      featureFlags.setOverride('multi-agent', false)
      expect(listener).toHaveBeenCalledTimes(1)
      
      featureFlags.removeOverride('multi-agent')
      expect(listener).toHaveBeenCalledTimes(2)
      
      unsubscribe()
      featureFlags.setOverride('multi-agent', false)
      expect(listener).toHaveBeenCalledTimes(2) // Not called again
    })
  })

  describe('User Targeting', () => {
    it('should set and use user ID', () => {
      featureFlags.setUserId('user_123')
      expect(localStorageMock.setItem).toHaveBeenCalledWith('torbit_user_id', 'user_123')
    })
  })

  describe('registerFlag', () => {
    it('should register custom flags', () => {
      featureFlags.registerFlag({
        id: 'custom-flag',
        name: 'Custom Flag',
        description: 'A custom test flag',
        defaultValue: true,
        rolloutPercentage: 100,
      })
      
      expect(featureFlags.isEnabled('custom-flag')).toBe(true)
    })
  })
})
