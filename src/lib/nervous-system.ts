// ============================================================================
// NERVOUS SYSTEM - Pain Receptors for TORBIT
// ============================================================================
// Monitors terminal output and browser console for "blood" (errors).
// When detected, fires a "Pain Signal" that triggers the Reflex Arc,
// forcing the AI to acknowledge and fix the issue immediately.
//
// This makes Torbit FEEL its mistakes and self-heal before the user
// even has time to read the error message.
// ============================================================================

export type ErrorType = 
  | 'BUILD_ERROR' 
  | 'RUNTIME_ERROR' 
  | 'DEPENDENCY_ERROR'
  | 'TYPE_ERROR'
  | 'SYNTAX_ERROR'
  | 'HYDRATION_ERROR'
  | 'NETWORK_ERROR'

export type ErrorSeverity = 'critical' | 'warning' | 'info'

export interface PainSignal {
  id: string
  type: ErrorType
  severity: ErrorSeverity
  message: string
  context: string
  file?: string
  line?: number
  suggestion?: string
  timestamp: number
}

interface ErrorPattern {
  type: ErrorType
  severity: ErrorSeverity
  regex: RegExp
  suggestion?: string
}

export class NervousSystem {
  // Regex patterns that define "Pain" - only catastrophic errors, not warnings
  private static patterns: ErrorPattern[] = [
    // ========== Build Errors (Critical) ==========
    { 
      type: 'BUILD_ERROR', 
      severity: 'critical',
      regex: /Failed to compile/,
      suggestion: 'Check the error message below for syntax issues or missing imports.'
    },
    { 
      type: 'BUILD_ERROR', 
      severity: 'critical',
      regex: /Build failed because of webpack errors/,
      suggestion: 'Review webpack configuration and module resolution.'
    },
    { 
      type: 'BUILD_ERROR', 
      severity: 'critical',
      regex: /error TS\d+: (.*)/,
      suggestion: 'Fix the TypeScript error by checking types and imports.'
    },
    
    // ========== Dependency Errors (Critical) ==========
    { 
      type: 'DEPENDENCY_ERROR', 
      severity: 'critical',
      regex: /Module not found: Can't resolve '([^']+)'/,
      suggestion: 'Run npm install for the missing package.'
    },
    { 
      type: 'DEPENDENCY_ERROR', 
      severity: 'critical',
      regex: /Cannot find module '([^']+)'/,
      suggestion: 'The module is missing. Install it with npm install.'
    },
    { 
      type: 'DEPENDENCY_ERROR', 
      severity: 'critical',
      regex: /ERR! peer dep missing/,
      suggestion: 'Install missing peer dependencies.'
    },
    
    // ========== Syntax Errors (Critical) ==========
    { 
      type: 'SYNTAX_ERROR', 
      severity: 'critical',
      regex: /SyntaxError: (.*)/,
      suggestion: 'Check for typos, missing brackets, or invalid syntax.'
    },
    { 
      type: 'SYNTAX_ERROR', 
      severity: 'critical',
      regex: /Parsing error: (.*)/,
      suggestion: 'Fix the parsing error - likely a syntax issue.'
    },
    { 
      type: 'SYNTAX_ERROR', 
      severity: 'critical',
      regex: /Unexpected token/,
      suggestion: 'There is unexpected syntax. Check for typos.'
    },
    
    // ========== Type Errors (Critical) ==========
    { 
      type: 'TYPE_ERROR', 
      severity: 'critical',
      regex: /TypeError: (.*)/,
      suggestion: 'A type mismatch occurred. Check variable types.'
    },
    { 
      type: 'TYPE_ERROR', 
      severity: 'critical',
      regex: /Type '(.*)' is not assignable to type '(.*)'/,
      suggestion: 'Fix the type mismatch by updating the value or type annotation.'
    },
    
    // ========== Runtime Errors (Critical) ==========
    { 
      type: 'RUNTIME_ERROR', 
      severity: 'critical',
      regex: /ReferenceError: (.*) is not defined/,
      suggestion: 'The variable or function is not defined. Check imports and scope.'
    },
    { 
      type: 'RUNTIME_ERROR', 
      severity: 'critical',
      regex: /Error: (.*)/,
      suggestion: 'A runtime error occurred. Check the stack trace.'
    },
    { 
      type: 'RUNTIME_ERROR', 
      severity: 'critical',
      regex: /Uncaught Error/,
      suggestion: 'An unhandled error occurred. Add try-catch or fix the root cause.'
    },
    
    // ========== React/Next.js Specific (Critical) ==========
    { 
      type: 'HYDRATION_ERROR', 
      severity: 'critical',
      regex: /Hydration failed because/,
      suggestion: 'Server and client HTML mismatch. Check for browser-only code or dynamic content.'
    },
    { 
      type: 'HYDRATION_ERROR', 
      severity: 'critical',
      regex: /Text content does not match server-rendered HTML/,
      suggestion: 'Use useEffect for browser-only operations or add suppressHydrationWarning.'
    },
    { 
      type: 'HYDRATION_ERROR', 
      severity: 'critical',
      regex: /There was an error while hydrating/,
      suggestion: 'Check for window/document access during SSR. Use dynamic imports with ssr: false.'
    },
    { 
      type: 'RUNTIME_ERROR', 
      severity: 'critical',
      regex: /window is not defined/,
      suggestion: 'Window is only available in browser. Use useEffect or dynamic import.'
    },
    { 
      type: 'RUNTIME_ERROR', 
      severity: 'critical',
      regex: /document is not defined/,
      suggestion: 'Document is only available in browser. Use useEffect or dynamic import.'
    },
    
    // ========== Network Errors (Warning) ==========
    { 
      type: 'NETWORK_ERROR', 
      severity: 'warning',
      regex: /ECONNREFUSED/,
      suggestion: 'Connection refused. Check if the server is running.'
    },
    { 
      type: 'NETWORK_ERROR', 
      severity: 'warning',
      regex: /ETIMEDOUT/,
      suggestion: 'Connection timed out. Check network connectivity.'
    },
  ]

  // Debounce tracking to prevent notification storms
  private static recentSignals: Map<string, number> = new Map()
  private static readonly DEBOUNCE_MS = 3000 // 3 second debounce

  /**
   * Analyzes a log line for errors. Returns a PainSignal if blood is detected.
   */
  static analyzeLog(log: string): PainSignal | null {
    // Skip empty logs or common noise
    if (!log || log.trim().length < 5) return null
    if (log.includes('[webpack.cache.Pack]')) return null
    if (log.includes('Compiling')) return null
    
    for (const pattern of this.patterns) {
      const match = log.match(pattern.regex)
      if (match) {
        const signalKey = `${pattern.type}:${match[0].slice(0, 50)}`
        const now = Date.now()
        
        // Debounce: skip if we've seen this exact error recently
        const lastSeen = this.recentSignals.get(signalKey)
        if (lastSeen && (now - lastSeen) < this.DEBOUNCE_MS) {
          return null
        }
        
        // Track this signal
        this.recentSignals.set(signalKey, now)
        
        // Clean up old signals (prevent memory leak)
        if (this.recentSignals.size > 100) {
          const cutoff = now - this.DEBOUNCE_MS * 2
          for (const [key, time] of this.recentSignals) {
            if (time < cutoff) this.recentSignals.delete(key)
          }
        }
        
        // Extract file and line number if present
        const fileMatch = log.match(/(?:at |in |from )([^\s:]+):(\d+)/)
        
        return {
          id: `pain-${now}-${Math.random().toString(36).slice(2, 7)}`,
          type: pattern.type,
          severity: pattern.severity,
          message: match[0],
          context: log.slice(0, 500), // Surrounding context for AI
          file: fileMatch?.[1],
          line: fileMatch?.[2] ? parseInt(fileMatch[2], 10) : undefined,
          suggestion: pattern.suggestion,
          timestamp: now,
        }
      }
    }
    
    return null
  }

  /**
   * Analyzes browser console errors
   */
  static analyzeBrowserError(errorMessage: string): PainSignal | null {
    // Browser errors are always runtime
    const signal = this.analyzeLog(errorMessage)
    
    if (signal) {
      // Override type for browser context
      if (!signal.type.includes('HYDRATION')) {
        signal.type = 'RUNTIME_ERROR'
      }
      return signal
    }
    
    // If no pattern matched but it's clearly an error
    if (errorMessage.toLowerCase().includes('error')) {
      const now = Date.now()
      return {
        id: `pain-${now}-${Math.random().toString(36).slice(2, 7)}`,
        type: 'RUNTIME_ERROR',
        severity: 'warning',
        message: errorMessage.slice(0, 200),
        context: `Browser console error: ${errorMessage}`,
        timestamp: now,
      }
    }
    
    return null
  }

  /**
   * Formats a PainSignal into a message for the AI
   */
  static formatForAI(signal: PainSignal): string {
    let message = `🚨 SYSTEM ALERT: The execution environment reported a critical error.

**Type:** ${signal.type}
**Severity:** ${signal.severity.toUpperCase()}
**Error:** ${signal.message}
`

    if (signal.file) {
      message += `**File:** ${signal.file}${signal.line ? `:${signal.line}` : ''}\n`
    }

    if (signal.suggestion) {
      message += `**Suggested Fix:** ${signal.suggestion}\n`
    }

    message += `
**Context:**
\`\`\`
${signal.context}
\`\`\`

Please analyze this error and fix the code immediately. Do not ask for permission. Just fix it.`

    return message
  }

  /**
   * Dispatch a pain signal as a DOM event
   */
  static dispatchPain(signal: PainSignal): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('torbit-pain-signal', {
        detail: signal
      }))
      console.warn(`[NervousSystem] 🔴 Pain detected: ${signal.type} - ${signal.message.slice(0, 80)}`)
    }
  }

  /**
   * Clear debounce cache (useful for testing)
   */
  static clearDebounce(): void {
    this.recentSignals.clear()
  }
}

// Type declaration for the custom event
declare global {
  interface WindowEventMap {
    'torbit-pain-signal': CustomEvent<PainSignal>
  }
}
