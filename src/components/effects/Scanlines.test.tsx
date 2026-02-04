import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Scanlines from './Scanlines'

describe('Scanlines', () => {
  it('should render with data-testid', () => {
    render(<Scanlines />)
    expect(screen.getByTestId('scanlines')).toBeInTheDocument()
  })

  it('should have aria-hidden attribute', () => {
    render(<Scanlines />)
    expect(screen.getByTestId('scanlines')).toHaveAttribute('aria-hidden', 'true')
  })

  it('should have pointer-events-none class', () => {
    render(<Scanlines />)
    expect(screen.getByTestId('scanlines')).toHaveClass('pointer-events-none')
  })

  it('should have fixed positioning', () => {
    render(<Scanlines />)
    expect(screen.getByTestId('scanlines')).toHaveClass('fixed')
  })

  it('should apply custom opacity via style', () => {
    render(<Scanlines opacity={0.05} />)
    const scanlines = screen.getByTestId('scanlines')
    // Check that the style attribute contains the opacity value
    const style = scanlines.getAttribute('style')
    expect(style).toContain('0.05')
  })

  it('should apply custom className', () => {
    render(<Scanlines className="custom-class" />)
    expect(screen.getByTestId('scanlines')).toHaveClass('custom-class')
  })
})
