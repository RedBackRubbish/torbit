import { describe, it, expect } from 'vitest'
import { tokens, MATRIX_CHARS, getRandomMatrixChar } from './design-tokens'

describe('design-tokens', () => {
  describe('tokens', () => {
    it('should have matrix color palette', () => {
      expect(tokens.colors.matrix).toBeDefined()
      expect(tokens.colors.matrix[400]).toBe('#00ff41')
    })

    it('should have void color palette', () => {
      expect(tokens.colors.void).toBeDefined()
      expect(tokens.colors.void[900]).toBe('#000000')
    })

    it('should have typography settings', () => {
      expect(tokens.typography.fontFamily.mono).toBeDefined()
      expect(tokens.typography.fontFamily.mono).toContain('JetBrains Mono')
    })

    it('should have spacing values', () => {
      expect(tokens.spacing).toBeDefined()
      expect(tokens.spacing[4]).toBe('1rem')
    })

    it('should have animation settings', () => {
      expect(tokens.animation).toBeDefined()
      expect(tokens.animation.rainSpeed).toBe('8s')
    })

    it('should have effect settings', () => {
      expect(tokens.effects.textGlow).toBeDefined()
      expect(tokens.effects.scanlines).toBe(0.03)
    })
  })

  describe('MATRIX_CHARS', () => {
    it('should contain Japanese characters', () => {
      expect(MATRIX_CHARS).toContain('ア')
      expect(MATRIX_CHARS).toContain('ン')
    })

    it('should contain numbers', () => {
      expect(MATRIX_CHARS).toContain('0')
      expect(MATRIX_CHARS).toContain('9')
    })

    it('should contain uppercase letters', () => {
      expect(MATRIX_CHARS).toContain('A')
      expect(MATRIX_CHARS).toContain('Z')
    })
  })

  describe('getRandomMatrixChar', () => {
    it('should return a single character', () => {
      const char = getRandomMatrixChar()
      expect(char).toHaveLength(1)
    })

    it('should return a character from MATRIX_CHARS', () => {
      for (let i = 0; i < 100; i++) {
        const char = getRandomMatrixChar()
        expect(MATRIX_CHARS).toContain(char)
      }
    })
  })
})
