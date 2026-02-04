import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import MatrixRain from './MatrixRain'

// Mock canvas context
const mockContext = {
  fillStyle: '',
  font: '',
  shadowColor: '',
  shadowBlur: 0,
  fillRect: vi.fn(),
  fillText: vi.fn(),
  scale: vi.fn(),
}

HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockContext)

describe('MatrixRain', () => {
  it('should render canvas element', () => {
    render(<MatrixRain />)
    expect(screen.getByTestId('matrix-rain')).toBeInTheDocument()
  })

  it('should have aria-hidden attribute', () => {
    render(<MatrixRain />)
    expect(screen.getByTestId('matrix-rain')).toHaveAttribute('aria-hidden', 'true')
  })

  it('should have pointer-events-none class', () => {
    render(<MatrixRain />)
    expect(screen.getByTestId('matrix-rain')).toHaveClass('pointer-events-none')
  })

  it('should have fixed positioning', () => {
    render(<MatrixRain />)
    expect(screen.getByTestId('matrix-rain')).toHaveClass('fixed')
  })

  it('should apply custom opacity', () => {
    render(<MatrixRain opacity={0.5} />)
    expect(screen.getByTestId('matrix-rain')).toHaveStyle({ opacity: '0.5' })
  })

  it('should apply custom className', () => {
    render(<MatrixRain className="custom-class" />)
    expect(screen.getByTestId('matrix-rain')).toHaveClass('custom-class')
  })
})
