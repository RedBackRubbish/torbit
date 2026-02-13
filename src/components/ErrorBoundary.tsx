'use client'

import { Component, ReactNode, ErrorInfo } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode)
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  /** Component name for error reporting */
  name?: string
  resetKeys?: unknown[]
  level?: 'error' | 'warning'
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorCount: number
}

/**
 * Strict ErrorBoundary - Catches JavaScript errors in child component tree
 * 
 * Features:
 * - Prevents infinite error loops with error counting
 * - Supports error recovery with resetKeys
 * - Automatic reset after excessive errors
 * - Component-level isolation
 * 
 * Usage:
 * <ErrorBoundary name="ChatPanel" resetKeys={[chatId]}>
 *   <ChatPanel />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutRef: NodeJS.Timeout | null = null
  private previousResetKeysRef: unknown[] = []

  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null, errorCount: 0 }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to console in development
    console.error(
      `[ErrorBoundary${this.props.name ? `: ${this.props.name}` : ''}]`,
      error,
      {
        componentStack: errorInfo.componentStack,
        count: this.state.errorCount + 1,
      }
    )

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo)

    // Increment error count to prevent infinite loops
    this.setState((prev) => ({
      errorCount: prev.errorCount + 1,
    }))

    // Auto-reset after 3 consecutive errors
    if ((this.state.errorCount + 1) % 3 === 0) {
      if (this.resetTimeoutRef) clearTimeout(this.resetTimeoutRef)
      this.resetTimeoutRef = setTimeout(() => {
        this.handleReset()
      }, 5000)
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { resetKeys = [] } = this.props
    const { hasError } = this.state

    // Reset error if resetKeys change
    if (hasError && this.previousResetKeysRef.length === resetKeys.length) {
      const hasChanged = resetKeys.some(
        (key, index) => key !== this.previousResetKeysRef[index]
      )

      if (hasChanged) {
        this.handleReset()
      }
    }

    this.previousResetKeysRef = [...resetKeys]
  }

  componentWillUnmount() {
    if (this.resetTimeoutRef) {
      clearTimeout(this.resetTimeoutRef)
    }
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorCount: 0 })
  }

  render(): ReactNode {
    const { hasError, error } = this.state
    const { children, fallback, level = 'error', name } = this.props

    if (hasError && error) {
      // Use custom fallback if provided
      if (typeof fallback === 'function') {
        return fallback(error, this.handleReset)
      }

      if (fallback) {
        return fallback
      }

      // Default fallback UI
      const isWarning = level === 'warning'
      const bgColor = isWarning ? '#fef3c7' : '#fee2e2'
      const borderColor = isWarning ? '#fbbf24' : '#ef4444'
      const textColor = isWarning ? '#b45309' : '#dc2626'

      return (
        <div
          role="alert"
          style={{
            padding: '1rem',
            margin: '1rem 0',
            border: `2px solid ${borderColor}`,
            borderRadius: '0.5rem',
            backgroundColor: bgColor,
            color: textColor,
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', fontWeight: 'bold' }}>
            {isWarning ? '⚠ Warning' : '❌ Error'}
            {name && ` in ${name}`}
          </h2>
          <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem' }}>
            {error.message}
          </p>
          <button
            onClick={this.handleReset}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: textColor,
              color: 'white',
              border: 'none',
              borderRadius: '0.25rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '500',
            }}
          >
            Try Again
          </button>
        </div>
      )
    }

    return children
  }
}

/**
 * Minimal error fallback for inline/small components
 */
export function InlineErrorFallback({ message = 'Error loading component' }: { message?: string }) {
  return (
    <div className="inline-flex items-center gap-2 text-red-400 text-sm">
      <span className="text-red-500">⚠</span>
      {message}
    </div>
  )
}

/**
 * Full-page error fallback for critical failures
 */
export function PageErrorFallback({
  error,
  reset,
}: {
  error?: Error
  reset?: () => void
}) {
  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center">
        <div className="text-6xl mb-6">💥</div>
        <h1 className="text-2xl font-bold text-white mb-4">
          Something went wrong
        </h1>
        <p className="text-neutral-400 mb-6">
          {error?.message || 'We hit an unexpected issue. Please try again.'}
        </p>
        <div className="flex gap-4 justify-center">
          {reset && (
            <button
              onClick={reset}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Try Again
            </button>
          )}
          <button
            onClick={() => (window.location.href = '/')}
            className="px-6 py-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Chat-specific error fallback
 */
export function ChatErrorFallback({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-[#0a0a0a]">
      <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
        <svg
          className="w-6 h-6 text-red-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
          />
        </svg>
      </div>
      <h2 className="text-[15px] font-medium text-[#fafafa] mb-2">
        Session interrupted
      </h2>
      <p className="text-[13px] text-[#737373] mb-6 max-w-sm leading-relaxed">
        Something interrupted the build. Your chat history is safe.
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[13px] font-medium transition-colors"
        >
          Reload Chat
        </button>
      )}
    </div>
  )
}

/**
 * Preview panel error fallback
 */
export function PreviewErrorFallback({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-[#0a0a0a]">
      <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
        <svg
          className="w-6 h-6 text-red-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.64 0 8.577 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.64 0-8.577-3.007-9.963-7.178z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </div>
      <h2 className="text-[15px] font-medium text-[#fafafa] mb-2">
        Preview failed to load
      </h2>
      <p className="text-[13px] text-[#737373] mb-6 max-w-sm leading-relaxed">
        {"This can happen after a code change. Try again — if it keeps failing, we'll fix the error."}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[13px] font-medium transition-colors"
        >
          Retry Preview
        </button>
      )}
    </div>
  )
}

export default ErrorBoundary
