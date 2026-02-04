'use client'

import { useEffect, useState, memo } from 'react'
import { cn } from '@/lib/utils'

interface GlitchTextProps {
  /** The text to display */
  text: string
  /** Enable glitch animation */
  glitch?: boolean
  /** CSS classes */
  className?: string
  /** HTML tag to use */
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span'
}

/**
 * GlitchText - Text with Matrix-style glitch effect
 * 
 * Creates a cyberpunk text distortion effect using CSS
 */
const GlitchText = memo(function GlitchText({
  text,
  glitch = true,
  className = '',
  as: Tag = 'span',
}: GlitchTextProps) {
  const [isGlitching, setIsGlitching] = useState(false)

  useEffect(() => {
    if (!glitch) return

    // Random glitch intervals
    const triggerGlitch = () => {
      setIsGlitching(true)
      setTimeout(() => setIsGlitching(false), 200)
    }

    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        triggerGlitch()
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [glitch])

  return (
    <Tag
      data-testid="glitch-text"
      data-text={text}
      className={cn(
        'relative inline-block',
        glitch && 'glitch-text',
        isGlitching && 'glitching',
        className
      )}
    >
      {text}
      {glitch && (
        <>
          <span 
            className="glitch-layer glitch-layer-1" 
            aria-hidden="true"
          >
            {text}
          </span>
          <span 
            className="glitch-layer glitch-layer-2" 
            aria-hidden="true"
          >
            {text}
          </span>
        </>
      )}
    </Tag>
  )
})

export default GlitchText
