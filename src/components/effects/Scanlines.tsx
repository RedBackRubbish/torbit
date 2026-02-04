'use client'

import { memo } from 'react'
import { cn } from '@/lib/utils'

interface ScanlinesProps {
  /** Opacity of scanlines (0-1) */
  opacity?: number
  /** CSS classes */
  className?: string
}

/**
 * Scanlines - CRT monitor scanline overlay effect
 * 
 * Creates the classic retro monitor look
 */
const Scanlines = memo(function Scanlines({
  opacity = 0.03,
  className = '',
}: ScanlinesProps) {
  return (
    <div
      data-testid="scanlines"
      className={cn(
        'pointer-events-none fixed inset-0 z-50',
        className
      )}
      style={{
        background: `repeating-linear-gradient(
          0deg,
          rgba(0, 0, 0, ${opacity}),
          rgba(0, 0, 0, ${opacity}) 1px,
          transparent 1px,
          transparent 2px
        )`,
      }}
      aria-hidden="true"
    />
  )
})

export default Scanlines
