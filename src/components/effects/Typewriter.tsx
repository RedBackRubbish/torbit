'use client'

import { useState, useEffect, memo, useCallback } from 'react'
import { getRandomMatrixChar } from '@/lib/design-tokens'
import { cn } from '@/lib/utils'

interface TypewriterProps {
  /** Text to type out */
  text: string
  /** Typing speed in ms per character */
  speed?: number
  /** Delay before starting */
  delay?: number
  /** Show blinking cursor */
  cursor?: boolean
  /** Callback when typing is complete */
  onComplete?: () => void
  /** CSS classes */
  className?: string
  /** Scramble effect before revealing each character */
  scramble?: boolean
}

/**
 * Typewriter - Matrix-style typing effect
 * 
 * Characters "decode" from random Matrix symbols to the actual text
 */
const Typewriter = memo(function Typewriter({
  text,
  speed = 50,
  delay = 0,
  cursor = true,
  onComplete,
  className = '',
  scramble = true,
}: TypewriterProps) {
  const [displayText, setDisplayText] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [scrambleChar, setScrambleChar] = useState('')
  const [isScrambling, setIsScrambling] = useState(false)
  const [started, setStarted] = useState(false)
  const [completed, setCompleted] = useState(false)

  // Start after delay
  useEffect(() => {
    const timer = setTimeout(() => setStarted(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  // Scramble effect for current character
  useEffect(() => {
    if (!started || currentIndex >= text.length) return

    if (scramble) {
      setIsScrambling(true)
      let scrambleCount = 0
      const maxScrambles = 3

      const scrambleInterval = setInterval(() => {
        setScrambleChar(getRandomMatrixChar())
        scrambleCount++

        if (scrambleCount >= maxScrambles) {
          clearInterval(scrambleInterval)
          setIsScrambling(false)
          setDisplayText((prev) => prev + text[currentIndex])
          setCurrentIndex((prev) => prev + 1)
        }
      }, speed / 3)

      return () => clearInterval(scrambleInterval)
    } else {
      const timer = setTimeout(() => {
        setDisplayText((prev) => prev + text[currentIndex])
        setCurrentIndex((prev) => prev + 1)
      }, speed)
      return () => clearTimeout(timer)
    }
  }, [currentIndex, started, text, speed, scramble])

  // Completion callback
  const handleComplete = useCallback(() => {
    if (!completed && currentIndex >= text.length) {
      setCompleted(true)
      onComplete?.()
    }
  }, [completed, currentIndex, text.length, onComplete])

  useEffect(() => {
    handleComplete()
  }, [handleComplete])

  return (
    <span 
      data-testid="typewriter"
      className={cn('font-mono', className)}
      aria-label={text}
    >
      <span className="text-matrix-400">{displayText}</span>
      {isScrambling && (
        <span className="text-matrix-300 opacity-70">{scrambleChar}</span>
      )}
      {cursor && !completed && (
        <span 
          className="animate-pulse text-matrix-400 ml-0.5"
          aria-hidden="true"
        >
          ▌
        </span>
      )}
      {cursor && completed && (
        <span 
          className="animate-blink text-matrix-400 ml-0.5"
          aria-hidden="true"
        >
          _
        </span>
      )}
    </span>
  )
})

export default Typewriter
