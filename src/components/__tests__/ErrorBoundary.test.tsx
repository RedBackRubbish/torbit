import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import ErrorBoundary from '../ErrorBoundary'

const ThrowError = ({ message }: { message: string }) => {
  throw new Error(message)
}

const TestComponent = () => <div>Test content</div>

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <TestComponent />
      </ErrorBoundary>
    )

    expect(screen.getByText('Test content')).toBeInTheDocument()
  })

  it('renders fallback UI when error occurs', () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {})

    render(
      <ErrorBoundary fallback={<div>Error occurred</div>}>
        <ThrowError message="Test error" />
      </ErrorBoundary>
    )

    expect(screen.getByText('Error occurred')).toBeInTheDocument()
    consoleErrorSpy.mockRestore()
  })

  it('renders fallback function with error and reset callback', () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {})

    render(
      <ErrorBoundary
        fallback={(error, reset) => (
          <div>
            <div>{error?.message}</div>
            <button onClick={reset}>Retry</button>
          </div>
        )}
      >
        <ThrowError message="Test error" />
      </ErrorBoundary>
    )

    expect(screen.getByText('Test error')).toBeInTheDocument()
    expect(screen.getByText('Retry')).toBeInTheDocument()
    consoleErrorSpy.mockRestore()
  })

  it('calls onError callback when error occurs', () => {
    const onError = vi.fn()
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {})

    render(
      <ErrorBoundary onError={onError} fallback={<div>Error</div>}>
        <ThrowError message="Test error" />
      </ErrorBoundary>
    )

    expect(onError).toHaveBeenCalled()
    const call = onError.mock.calls[0]
    expect(call[0]).toEqual(expect.objectContaining({
      message: 'Test error',
    }))
    consoleErrorSpy.mockRestore()
  })

  it('catches and displays multiple errors', () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {})

    const { rerender } = render(
      <ErrorBoundary fallback={<div>Error occurred</div>}>
        <ThrowError message="First error" />
      </ErrorBoundary>
    )

    expect(screen.getByText('Error occurred')).toBeInTheDocument()

    rerender(
      <ErrorBoundary fallback={<div>Error caught</div>}>
        <ThrowError message="Second error" />
      </ErrorBoundary>
    )

    expect(screen.getByText('Error caught')).toBeInTheDocument()
    consoleErrorSpy.mockRestore()
  })

  it('respects level prop for error severity', () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {})

    const { container: errorContainer } = render(
      <ErrorBoundary level="error" fallback={<div>Error</div>}>
        <ThrowError message="Test error" />
      </ErrorBoundary>
    )

    const { container: warningContainer } = render(
      <ErrorBoundary level="warning" fallback={<div>Warning</div>}>
        <TestComponent />
      </ErrorBoundary>
    )

    expect(errorContainer).toBeInTheDocument()
    expect(warningContainer).toBeInTheDocument()
    consoleErrorSpy.mockRestore()
  })

  it('resets error when resetKeys change', () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {})

    const { rerender } = render(
      <ErrorBoundary resetKeys={[1]} fallback={<div>Error</div>}>
        <ThrowError message="Test error" />
      </ErrorBoundary>
    )

    expect(screen.getByText('Error')).toBeInTheDocument()

    rerender(
      <ErrorBoundary resetKeys={[2]} fallback={<div>Error</div>}>
        <TestComponent />
      </ErrorBoundary>
    )

    expect(screen.getByText('Test content')).toBeInTheDocument()
    consoleErrorSpy.mockRestore()
  })

  it('can recover from errors', () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {})

    const { rerender } = render(
      <ErrorBoundary
        resetKeys={['key1']}
        fallback={<div>Error</div>}
      >
        <ThrowError message="Error" />
      </ErrorBoundary>
    )

    expect(screen.getByText('Error')).toBeInTheDocument()

    // Change resetKey to trigger recovery
    rerender(
      <ErrorBoundary
        resetKeys={['key2']}
        fallback={<div>Error</div>}
      >
        <TestComponent />
      </ErrorBoundary>
    )

    expect(screen.getByText('Test content')).toBeInTheDocument()
    consoleErrorSpy.mockRestore()
  })

  it('handles multiple error boundaries independently', () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {})

    const { container } = render(
      <div>
        <ErrorBoundary fallback={<div>Error 1</div>}>
          <ThrowError message="Test error 1" />
        </ErrorBoundary>
        <ErrorBoundary fallback={<div>Error 2</div>}>
          <TestComponent />
        </ErrorBoundary>
      </div>
    )

    expect(screen.getByText('Error 1')).toBeInTheDocument()
    expect(screen.getByText('Test content')).toBeInTheDocument()
    expect(screen.queryByText('Error 2')).not.toBeInTheDocument()

    consoleErrorSpy.mockRestore()
  })

  it('renders without crashing', () => {
    const { container } = render(
      <ErrorBoundary fallback={<div>Error</div>}>
        <TestComponent />
      </ErrorBoundary>
    )

    expect(container).toBeInTheDocument()
  })

  it('preserves error message and stack trace', () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {})
    const onError = vi.fn()

    render(
      <ErrorBoundary onError={onError} fallback={<div>Error</div>}>
        <ThrowError message="Custom error message" />
      </ErrorBoundary>
    )

    const [error] = onError.mock.calls[0]
    expect(error.message).toBe('Custom error message')

    consoleErrorSpy.mockRestore()
  })

  it('works with functional fallback without reset', () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {})

    render(
      <ErrorBoundary
        fallback={(error) => <div>Error: {error?.message}</div>}
      >
        <ThrowError message="Functional fallback error" />
      </ErrorBoundary>
    )

    expect(screen.getByText('Error: Functional fallback error')).toBeInTheDocument()
    consoleErrorSpy.mockRestore()
  })
})
