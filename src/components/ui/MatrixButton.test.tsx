import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import MatrixButton from './MatrixButton'

describe('MatrixButton', () => {
  it('should render children correctly', () => {
    render(<MatrixButton>Click me</MatrixButton>)
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
  })

  it('should apply primary variant styles by default', () => {
    render(<MatrixButton>Primary</MatrixButton>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('text-matrix-400')
    expect(button).toHaveClass('border-matrix-400')
  })

  it('should apply secondary variant styles', () => {
    render(<MatrixButton variant="secondary">Secondary</MatrixButton>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('text-matrix-300')
  })

  it('should apply ghost variant styles', () => {
    render(<MatrixButton variant="ghost">Ghost</MatrixButton>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('border-transparent')
  })

  it('should apply danger variant styles', () => {
    render(<MatrixButton variant="danger">Danger</MatrixButton>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('text-glitch-400')
  })

  it('should apply size classes', () => {
    const { rerender } = render(<MatrixButton size="sm">Small</MatrixButton>)
    expect(screen.getByRole('button')).toHaveClass('text-xs')

    rerender(<MatrixButton size="lg">Large</MatrixButton>)
    expect(screen.getByRole('button')).toHaveClass('text-base')
  })

  it('should be disabled when disabled prop is true', () => {
    render(<MatrixButton disabled>Disabled</MatrixButton>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('should be disabled when loading', () => {
    render(<MatrixButton loading>Loading</MatrixButton>)
    expect(screen.getByRole('button')).toBeDisabled()
    expect(screen.getByText(/processing/i)).toBeInTheDocument()
  })

  it('should pass additional props to button', () => {
    render(<MatrixButton data-testid="custom-button">Test</MatrixButton>)
    expect(screen.getByTestId('custom-button')).toBeInTheDocument()
  })
})
