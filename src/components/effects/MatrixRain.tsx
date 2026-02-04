'use client'

import { useEffect, useRef, useCallback, memo } from 'react'
import { MATRIX_CHARS } from '@/lib/design-tokens'

interface MatrixRainProps {
  /** Opacity of the rain effect (0-1) */
  opacity?: number
  /** Speed multiplier for falling characters (lower = slower) */
  speed?: number
  /** Density of rain columns (lower = fewer columns, more readable) */
  density?: number
  /** Font size in pixels */
  fontSize?: number
  /** Whether the animation is active */
  active?: boolean
  /** Additional CSS classes */
  className?: string
  /** Color of the rain */
  color?: string
}

interface Drop {
  x: number
  y: number
  speed: number
  chars: string[]
  length: number
  opacity: number
}

/**
 * MatrixRain - Cinematic falling code animation (Movie-accurate)
 * 
 * Slower, more visible characters like in The Matrix film
 */
const MatrixRain = memo(function MatrixRain({
  opacity = 0.6,
  speed = 0.3,
  density = 0.4,
  fontSize = 18,
  active = true,
  className = '',
  color = '#00ff41',
}: MatrixRainProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | null>(null)
  const dropsRef = useRef<Drop[]>([])
  const lastTimeRef = useRef<number>(0)
  const animateRef = useRef<((timestamp: number) => void) | null>(null)

  const getRandomChar = useCallback(() => {
    return MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)]
  }, [])

  const initDrops = useCallback((width: number, height: number) => {
    const columns = Math.floor((width / fontSize) * density)
    const drops: Drop[] = []

    for (let i = 0; i < columns; i++) {
      const length = Math.floor(Math.random() * 15) + 8
      const chars: string[] = []
      for (let j = 0; j < length; j++) {
        chars.push(getRandomChar())
      }

      drops.push({
        x: (i / density) * fontSize + Math.random() * (fontSize * 2),
        y: Math.random() * height * 2 - height,
        speed: (Math.random() * 0.3 + 0.7) * speed,
        chars,
        length,
        opacity: Math.random() * 0.5 + 0.5,
      })
    }

    dropsRef.current = drops
  }, [fontSize, density, speed, getRandomChar])

  const draw = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number, deltaTime: number) => {
    // Slower fade for more visible trails
    ctx.fillStyle = 'rgba(0, 0, 0, 0.03)'
    ctx.fillRect(0, 0, width, height)

    ctx.font = `${fontSize}px "Menlo", "Monaco", monospace`
    ctx.textAlign = 'center'

    dropsRef.current.forEach((drop) => {
      const moveAmount = drop.speed * fontSize * 0.08 * deltaTime

      drop.chars.forEach((char, i) => {
        const y = drop.y - i * fontSize * 1.2

        if (y > -fontSize && y < height + fontSize) {
          // Head character - bright white
          if (i === 0) {
            ctx.fillStyle = '#ffffff'
            ctx.shadowColor = color
            ctx.shadowBlur = 20
            ctx.globalAlpha = drop.opacity
          } else if (i === 1) {
            // Second char - bright green
            ctx.fillStyle = color
            ctx.shadowBlur = 15
            ctx.globalAlpha = drop.opacity * 0.95
          } else if (i < 4) {
            // Near head - medium green
            ctx.fillStyle = color
            ctx.shadowBlur = 8
            ctx.globalAlpha = drop.opacity * (0.9 - i * 0.1)
          } else {
            // Tail - fading
            const fade = Math.max(0.1, 1 - (i / drop.length))
            ctx.fillStyle = color
            ctx.shadowBlur = 0
            ctx.globalAlpha = drop.opacity * fade * 0.6
          }

          ctx.fillText(char, drop.x, y)
        }
      })

      ctx.globalAlpha = 1
      ctx.shadowBlur = 0

      // Move drop down slowly
      drop.y += moveAmount

      // Reset drop when it goes off screen
      if (drop.y - drop.length * fontSize * 1.2 > height) {
        drop.y = -drop.length * fontSize
        drop.x = Math.random() * width
        drop.speed = (Math.random() * 0.3 + 0.7) * speed
        drop.opacity = Math.random() * 0.5 + 0.5

        // Randomize characters
        for (let i = 0; i < drop.chars.length; i++) {
          drop.chars[i] = getRandomChar()
        }
      }

      // Occasionally change a character (slow flicker)
      if (Math.random() > 0.995) {
        const idx = Math.floor(Math.random() * drop.chars.length)
        drop.chars[idx] = getRandomChar()
      }
    })
  }, [fontSize, speed, getRandomChar, color])

  // Store animate in ref to avoid self-reference in useCallback
  useEffect(() => {
    animateRef.current = (timestamp: number) => {
      const canvas = canvasRef.current
      if (!canvas || !active) return

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const deltaTime = lastTimeRef.current ? (timestamp - lastTimeRef.current) / 16.67 : 1
      lastTimeRef.current = timestamp

      draw(ctx, canvas.width, canvas.height, deltaTime)
      if (animateRef.current) {
        animationRef.current = requestAnimationFrame(animateRef.current)
      }
    }
  }, [active, draw])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleResize = () => {
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()

      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr

      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.scale(dpr, dpr)
        // Fill with black initially
        ctx.fillStyle = '#000000'
        ctx.fillRect(0, 0, rect.width, rect.height)
      }

      initDrops(rect.width, rect.height)
    }

    handleResize()
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [initDrops])

  useEffect(() => {
    if (active && animateRef.current) {
      animationRef.current = requestAnimationFrame(animateRef.current)
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [active])

  return (
    <canvas
      ref={canvasRef}
      data-testid="matrix-rain"
      className={`fixed inset-0 pointer-events-none ${className}`}
      style={{ opacity }}
      aria-hidden="true"
    />
  )
})

export default MatrixRain
