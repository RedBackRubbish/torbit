'use client'

import { Component, ReactNode, ErrorInfo } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  /** Component name for error reporting */
  name?: string
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

/**
 * ErrorBoundary - Catches JavaScript errors in child component tree
 * 
 * Usage:
 * <ErrorBoundary name="ChatPanel" fallback={<ErrorFallback />}>
 *   <ChatPanel />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error to console in development
    console.error(`[ErrorBoundary${this.props.name ? `: ${this.props.name}` : ''}]`, error, errorInfo)
    
    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo)
    
    // In production, you might want to send this to an error tracking service
    // e.g., Sentry, LogRocket, etc.
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null })
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // If custom fallback provided, use it
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default fallback UI
      return (
        <div className="flex flex-col items-center justify-center p-8 bg-red-950/20 border border-red-800/50 rounded-lg">
          <div className="text-red-400 text-lg font-semibold mb-2">
            Something went wrong
          </div>
          <div className="text-red-300/70 text-sm mb-4 text-center max-w-md">
            {this.state.error?.message || 'An unexpected error occurred'}
          </div>
          <button
            onClick={this.handleRetry}
            className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-300 rounded-md text-sm transition-colors border border-red-700/50"
          >
            Try Again
          </button>
        </div>
      )
    }

    return this.props.children
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
  reset 
}: { 
  error?: Error
  reset?: () => void 
}) {
  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center">
        <div className="text-6xl mb-6">💥</div>
        <h1 className="text-2xl font-bold text-white mb-4">
          Oops! Something crashed
        </h1>
        <p className="text-neutral-400 mb-6">
          {error?.message || "We're not sure what happened, but we're on it."}
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
            onClick={() => window.location.href = '/'}
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
        <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      </div>
      <h2 className="text-[15px] font-medium text-[#fafafa] mb-2">
        Chat encountered an error
      </h2>
      <p className="text-[13px] text-[#737373] mb-6 max-w-sm leading-relaxed">
        The AI chat system ran into a problem. Your conversation history is safe.
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
        <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.64 0 8.577 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.64 0-8.577-3.007-9.963-7.178z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </div>
      <h2 className="text-[15px] font-medium text-[#fafafa] mb-2">
        Preview failed to load
      </h2>
      <p className="text-[13px] text-[#737373] mb-6 max-w-sm leading-relaxed">
        The preview panel encountered an error. This might be due to a code issue.
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
