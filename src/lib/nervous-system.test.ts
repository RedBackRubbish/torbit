import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NervousSystem, type PainSignal } from './nervous-system'

describe('NervousSystem', () => {
  beforeEach(() => {
    // Clear debounce cache before each test
    NervousSystem.clearDebounce()
  })

  describe('analyzeLog', () => {
    describe('Build Errors', () => {
      it('should detect "Failed to compile" as BUILD_ERROR', () => {
        const signal = NervousSystem.analyzeLog('Failed to compile')
        expect(signal).not.toBeNull()
        expect(signal?.type).toBe('BUILD_ERROR')
        expect(signal?.severity).toBe('critical')
      })

      it('should detect TypeScript errors', () => {
        const signal = NervousSystem.analyzeLog('error TS2304: Cannot find name "foo"')
        expect(signal).not.toBeNull()
        expect(signal?.type).toBe('BUILD_ERROR')
        expect(signal?.message).toContain('TS2304')
      })
    })

    describe('Dependency Errors', () => {
      it('should detect missing modules', () => {
        const signal = NervousSystem.analyzeLog("Module not found: Can't resolve 'react-three-fiber'")
        expect(signal).not.toBeNull()
        expect(signal?.type).toBe('DEPENDENCY_ERROR')
        expect(signal?.severity).toBe('critical')
        expect(signal?.suggestion).toContain('npm install')
      })

      it('should detect Cannot find module errors', () => {
        const signal = NervousSystem.analyzeLog("Cannot find module 'lodash'")
        expect(signal).not.toBeNull()
        expect(signal?.type).toBe('DEPENDENCY_ERROR')
      })
    })

    describe('Syntax Errors', () => {
      it('should detect SyntaxError', () => {
        const signal = NervousSystem.analyzeLog('SyntaxError: Unexpected token }')
        expect(signal).not.toBeNull()
        expect(signal?.type).toBe('SYNTAX_ERROR')
        expect(signal?.severity).toBe('critical')
      })

      it('should detect parsing errors', () => {
        const signal = NervousSystem.analyzeLog('Parsing error: Unexpected token')
        expect(signal).not.toBeNull()
        expect(signal?.type).toBe('SYNTAX_ERROR')
      })
    })

    describe('Runtime Errors', () => {
      it('should detect ReferenceError', () => {
        const signal = NervousSystem.analyzeLog('ReferenceError: myVariable is not defined')
        expect(signal).not.toBeNull()
        expect(signal?.type).toBe('RUNTIME_ERROR')
        expect(signal?.message).toContain('myVariable')
      })

      it('should detect window is not defined', () => {
        const signal = NervousSystem.analyzeLog('window is not defined')
        expect(signal).not.toBeNull()
        expect(signal?.type).toBe('RUNTIME_ERROR')
        expect(signal?.suggestion).toContain('useEffect')
      })

      it('should detect document is not defined', () => {
        const signal = NervousSystem.analyzeLog('document is not defined')
        expect(signal).not.toBeNull()
        expect(signal?.type).toBe('RUNTIME_ERROR')
      })
    })

    describe('Hydration Errors', () => {
      it('should detect hydration failures', () => {
        const signal = NervousSystem.analyzeLog('Hydration failed because the initial UI does not match')
        expect(signal).not.toBeNull()
        expect(signal?.type).toBe('HYDRATION_ERROR')
        expect(signal?.severity).toBe('critical')
      })

      it('should detect text content mismatch', () => {
        const signal = NervousSystem.analyzeLog('Text content does not match server-rendered HTML')
        expect(signal).not.toBeNull()
        expect(signal?.type).toBe('HYDRATION_ERROR')
      })

      it('should detect hydrating errors', () => {
        const signal = NervousSystem.analyzeLog('There was an error while hydrating')
        expect(signal).not.toBeNull()
        expect(signal?.type).toBe('HYDRATION_ERROR')
        expect(signal?.suggestion).toContain('dynamic')
      })
    })

    describe('Type Errors', () => {
      it('should detect TypeError', () => {
        const signal = NervousSystem.analyzeLog('TypeError: Cannot read property "foo" of undefined')
        expect(signal).not.toBeNull()
        expect(signal?.type).toBe('TYPE_ERROR')
      })

      it('should detect type assignment errors', () => {
        const signal = NervousSystem.analyzeLog("Type 'string' is not assignable to type 'number'")
        expect(signal).not.toBeNull()
        expect(signal?.type).toBe('TYPE_ERROR')
      })
    })

    describe('Network Errors', () => {
      it('should detect connection refused', () => {
        const signal = NervousSystem.analyzeLog('ECONNREFUSED 127.0.0.1:3000')
        expect(signal).not.toBeNull()
        expect(signal?.type).toBe('NETWORK_ERROR')
        expect(signal?.severity).toBe('warning')
      })

      it('should detect timeout errors', () => {
        const signal = NervousSystem.analyzeLog('ETIMEDOUT connecting to api')
        expect(signal).not.toBeNull()
        expect(signal?.type).toBe('NETWORK_ERROR')
      })
    })

    describe('Edge Cases', () => {
      it('should return null for empty logs', () => {
        expect(NervousSystem.analyzeLog('')).toBeNull()
        expect(NervousSystem.analyzeLog('   ')).toBeNull()
      })

      it('should return null for non-error logs', () => {
        expect(NervousSystem.analyzeLog('Compiling...')).toBeNull()
        expect(NervousSystem.analyzeLog('Server started on port 3000')).toBeNull()
      })

      it('should ignore webpack cache warnings', () => {
        expect(NervousSystem.analyzeLog('[webpack.cache.Pack] some warning')).toBeNull()
      })

      it('should extract file and line number when present', () => {
        const signal = NervousSystem.analyzeLog('Error: Something failed at /src/app/page.tsx:42')
        expect(signal).not.toBeNull()
        expect(signal?.file).toBe('/src/app/page.tsx')
        expect(signal?.line).toBe(42)
      })
    })

    describe('Debouncing', () => {
      it('should debounce identical errors within 3 seconds', () => {
        const first = NervousSystem.analyzeLog('SyntaxError: Unexpected token')
        expect(first).not.toBeNull()

        // Same error immediately - should be debounced
        const second = NervousSystem.analyzeLog('SyntaxError: Unexpected token')
        expect(second).toBeNull()
      })

      it('should allow different errors through', () => {
        const first = NervousSystem.analyzeLog('SyntaxError: Unexpected token')
        expect(first).not.toBeNull()

        // Different error - should pass
        const second = NervousSystem.analyzeLog('TypeError: undefined is not a function')
        expect(second).not.toBeNull()
      })
    })
  })

  describe('analyzeBrowserError', () => {
    it('should analyze browser console errors', () => {
      const signal = NervousSystem.analyzeBrowserError('Uncaught Error: Something went wrong')
      expect(signal).not.toBeNull()
      expect(signal?.type).toBe('RUNTIME_ERROR')
    })

    it('should catch hydration warnings from browser', () => {
      const signal = NervousSystem.analyzeBrowserError('Hydration failed because...')
      expect(signal).not.toBeNull()
      expect(signal?.type).toBe('HYDRATION_ERROR')
    })

    it('should create generic signal for unknown errors', () => {
      const signal = NervousSystem.analyzeBrowserError('Some weird error happened')
      expect(signal).not.toBeNull()
      expect(signal?.type).toBe('RUNTIME_ERROR')
      expect(signal?.severity).toBe('warning')
    })
  })

  describe('formatForAI', () => {
    it('should format pain signal for AI consumption', () => {
      const signal: PainSignal = {
        id: 'test-123',
        type: 'DEPENDENCY_ERROR',
        severity: 'critical',
        message: "Module not found: Can't resolve 'three'",
        context: 'npm install output...',
        file: 'src/components/Scene.tsx',
        line: 5,
        suggestion: 'Run npm install for the missing package.',
        timestamp: Date.now(),
      }

      const formatted = NervousSystem.formatForAI(signal)

      expect(formatted).toContain('🚨 SYSTEM ALERT')
      expect(formatted).toContain('DEPENDENCY_ERROR')
      expect(formatted).toContain('CRITICAL')
      expect(formatted).toContain("Module not found")
      expect(formatted).toContain('src/components/Scene.tsx:5')
      expect(formatted).toContain('npm install')
      expect(formatted).toContain('fix the code immediately')
    })

    it('should handle signals without file info', () => {
      const signal: PainSignal = {
        id: 'test-456',
        type: 'BUILD_ERROR',
        severity: 'critical',
        message: 'Failed to compile',
        context: 'Build error output',
        timestamp: Date.now(),
      }

      const formatted = NervousSystem.formatForAI(signal)

      expect(formatted).toContain('BUILD_ERROR')
      expect(formatted).not.toContain('**File:**')
    })
  })

  describe('dispatchPain', () => {
    it('should dispatch custom event on window', () => {
      const mockDispatch = vi.fn()
      const originalDispatch = window.dispatchEvent
      window.dispatchEvent = mockDispatch

      const signal: PainSignal = {
        id: 'test-789',
        type: 'SYNTAX_ERROR',
        severity: 'critical',
        message: 'Syntax error',
        context: 'Error context',
        timestamp: Date.now(),
      }

      NervousSystem.dispatchPain(signal)

      expect(mockDispatch).toHaveBeenCalledTimes(1)
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'torbit-pain-signal',
        })
      )

      window.dispatchEvent = originalDispatch
    })
  })
})
