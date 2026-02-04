import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import GlitchText from './GlitchText'

describe('GlitchText', () => {
  it('should render text correctly', () => {
    render(<GlitchText text="Hello World" />)
    expect(screen.getByTestId('glitch-text')).toHaveTextContent('Hello World')
  })

  it('should have data-testid', () => {
    render(<GlitchText text="Test" />)
    expect(screen.getByTestId('glitch-text')).toBeInTheDocument()
  })

  it('should render as span by default', () => {
    render(<GlitchText text="Test" />)
    expect(screen.getByTestId('glitch-text').tagName).toBe('SPAN')
  })

  it('should render as custom tag', () => {
    render(<GlitchText text="Test" as="h1" />)
    expect(screen.getByTestId('glitch-text').tagName).toBe('H1')
  })

  it('should apply glitch-text class when glitch is true', () => {
    render(<GlitchText text="Test" glitch />)
    expect(screen.getByTestId('glitch-text')).toHaveClass('glitch-text')
  })

  it('should not apply glitch-text class when glitch is false', () => {
    render(<GlitchText text="Test" glitch={false} />)
    expect(screen.getByTestId('glitch-text')).not.toHaveClass('glitch-text')
  })

  it('should render glitch layers when glitch is enabled', () => {
    render(<GlitchText text="Test" glitch />)
    const layers = screen.getAllByText('Test')
    // Original text + 2 glitch layers
    expect(layers.length).toBeGreaterThanOrEqual(2)
  })

  it('should not render glitch layers when glitch is disabled', () => {
    render(<GlitchText text="Test" glitch={false} />)
    const layers = screen.getAllByText('Test')
    expect(layers).toHaveLength(1)
  })

  it('should apply custom className', () => {
    render(<GlitchText text="Test" className="custom-class" />)
    expect(screen.getByTestId('glitch-text')).toHaveClass('custom-class')
  })

  it('should have data-text attribute', () => {
    render(<GlitchText text="Test" />)
    expect(screen.getByTestId('glitch-text')).toHaveAttribute('data-text', 'Test')
  })
})
