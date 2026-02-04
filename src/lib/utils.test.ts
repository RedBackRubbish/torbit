import { describe, it, expect } from 'vitest'
import { cn, randomInt, clamp } from './utils'

describe('utils', () => {
  describe('cn', () => {
    it('should merge class names correctly', () => {
      expect(cn('foo', 'bar')).toBe('foo bar')
    })

    it('should handle conditional classes', () => {
      expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz')
    })

    it('should merge tailwind classes correctly', () => {
      expect(cn('px-2', 'px-4')).toBe('px-4')
    })

    it('should handle arrays', () => {
      expect(cn(['foo', 'bar'], 'baz')).toBe('foo bar baz')
    })
  })

  describe('randomInt', () => {
    it('should return a number within range', () => {
      for (let i = 0; i < 100; i++) {
        const result = randomInt(1, 10)
        expect(result).toBeGreaterThanOrEqual(1)
        expect(result).toBeLessThanOrEqual(10)
      }
    })

    it('should return the only option when min equals max', () => {
      expect(randomInt(5, 5)).toBe(5)
    })
  })

  describe('clamp', () => {
    it('should return the value if within range', () => {
      expect(clamp(5, 0, 10)).toBe(5)
    })

    it('should return min if value is below range', () => {
      expect(clamp(-5, 0, 10)).toBe(0)
    })

    it('should return max if value is above range', () => {
      expect(clamp(15, 0, 10)).toBe(10)
    })

    it('should handle edge cases', () => {
      expect(clamp(0, 0, 10)).toBe(0)
      expect(clamp(10, 0, 10)).toBe(10)
    })
  })
})
