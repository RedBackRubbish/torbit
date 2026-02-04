import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import MatrixCard from './MatrixCard'

describe('MatrixCard', () => {
  it('should render children correctly', () => {
    render(<MatrixCard>Card content</MatrixCard>)
    expect(screen.getByText('Card content')).toBeInTheDocument()
  })

  it('should have data-testid', () => {
    render(<MatrixCard>Content</MatrixCard>)
    expect(screen.getByTestId('matrix-card')).toBeInTheDocument()
  })

  it('should render title in terminal header', () => {
    render(<MatrixCard title="Test Title">Content</MatrixCard>)
    expect(screen.getByText('Test Title')).toBeInTheDocument()
  })

  it('should apply default variant styles', () => {
    render(<MatrixCard>Content</MatrixCard>)
    const card = screen.getByTestId('matrix-card')
    expect(card).toHaveClass('bg-void-800/80')
  })

  it('should apply terminal variant styles', () => {
    render(<MatrixCard variant="terminal">Content</MatrixCard>)
    const card = screen.getByTestId('matrix-card')
    expect(card).toHaveClass('bg-void-900/95')
  })

  it('should apply highlight variant styles', () => {
    render(<MatrixCard variant="highlight">Content</MatrixCard>)
    const card = screen.getByTestId('matrix-card')
    expect(card).toHaveClass('bg-matrix-400/5')
  })

  it('should apply glow styles when glow is true', () => {
    render(<MatrixCard glow>Content</MatrixCard>)
    const card = screen.getByTestId('matrix-card')
    expect(card).toHaveClass('hover:border-matrix-400')
  })

  it('should apply custom className', () => {
    render(<MatrixCard className="custom-class">Content</MatrixCard>)
    const card = screen.getByTestId('matrix-card')
    expect(card).toHaveClass('custom-class')
  })
})
