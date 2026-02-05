'use client'

import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

interface TorbitLogoProps {
  className?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'default' | 'white' | 'muted'
  animated?: boolean
}

interface TorbitSpinnerProps {
  className?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  speed?: 'slow' | 'normal' | 'fast'
}

const sizeMap = {
  xs: 'w-4 h-4',
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-10 h-10',
  xl: 'w-12 h-12',
}

const colorMap = {
  default: '#DC2626', // Red
  white: '#ffffff',
  muted: '#525252',
}

/**
 * TORBIT Logo - Two circles in a rounded square frame
 * Based on the geometric brand identity
 */
export function TorbitLogo({ 
  className, 
  size = 'md', 
  variant = 'default',
  animated = false 
}: TorbitLogoProps) {
  const color = colorMap[variant]
  
  const Logo = (
    <svg 
      viewBox="0 0 100 100" 
      className={cn(sizeMap[size], className)}
      fill="none"
    >
      {/* Rounded square frame */}
      <rect 
        x="4" 
        y="4" 
        width="92" 
        height="92" 
        rx="20" 
        stroke={color}
        strokeWidth="6"
        fill="none"
      />
      {/* Large circle - positioned lower right */}
      <circle 
        cx="58" 
        cy="58" 
        r="22" 
        fill={color}
      />
      {/* Small circle - positioned upper left */}
      <circle 
        cx="34" 
        cy="34" 
        r="12" 
        fill={color}
      />
    </svg>
  )

  if (animated) {
    return (
      <motion.div
        className="inline-flex"
        whileHover={{ scale: 1.05 }}
        transition={{ type: 'spring', stiffness: 400, damping: 10 }}
      >
        {Logo}
      </motion.div>
    )
  }

  return Logo
}

/**
 * TORBIT Spinner - Animated loading version of the logo
 * The circles orbit around during loading states
 */
export function TorbitSpinner({ 
  className, 
  size = 'md',
  speed = 'normal' 
}: TorbitSpinnerProps) {
  const speedMap = {
    slow: 3,
    normal: 1.5,
    fast: 0.8,
  }

  return (
    <div className={cn(sizeMap[size], 'relative', className)}>
      <svg 
        viewBox="0 0 100 100" 
        className="w-full h-full"
        fill="none"
      >
        {/* Static rounded square frame */}
        <rect 
          x="4" 
          y="4" 
          width="92" 
          height="92" 
          rx="20" 
          stroke="#DC2626"
          strokeWidth="6"
          fill="none"
          className="opacity-30"
        />
        
        {/* Animated frame - draws itself */}
        <motion.rect 
          x="4" 
          y="4" 
          width="92" 
          height="92" 
          rx="20" 
          stroke="#DC2626"
          strokeWidth="6"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ 
            duration: speedMap[speed] * 1.5, 
            repeat: Infinity,
            ease: 'linear'
          }}
        />
      </svg>
      
      {/* Orbiting circles container */}
      <motion.div
        className="absolute inset-0"
        animate={{ rotate: 360 }}
        transition={{ 
          duration: speedMap[speed], 
          repeat: Infinity, 
          ease: 'linear' 
        }}
      >
        <svg 
          viewBox="0 0 100 100" 
          className="w-full h-full"
          fill="none"
        >
          {/* Large circle - orbits */}
          <motion.circle 
            cx="58" 
            cy="58" 
            r="18" 
            fill="#DC2626"
            animate={{ 
              scale: [1, 1.1, 1],
              opacity: [0.8, 1, 0.8]
            }}
            transition={{ 
              duration: speedMap[speed] * 0.5, 
              repeat: Infinity,
              ease: 'easeInOut'
            }}
          />
          {/* Small circle - orbits */}
          <motion.circle 
            cx="34" 
            cy="34" 
            r="10" 
            fill="#DC2626"
            animate={{ 
              scale: [1.1, 1, 1.1],
              opacity: [1, 0.8, 1]
            }}
            transition={{ 
              duration: speedMap[speed] * 0.5, 
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 0.25
            }}
          />
        </svg>
      </motion.div>
    </div>
  )
}

/**
 * TORBIT Icon - Minimal version for tight spaces
 * Just the two circles without the frame
 */
export function TorbitIcon({ 
  className, 
  size = 'sm',
  variant = 'default'
}: TorbitLogoProps) {
  const color = colorMap[variant]
  
  return (
    <svg 
      viewBox="0 0 100 100" 
      className={cn(sizeMap[size], className)}
      fill="none"
    >
      {/* Large circle */}
      <circle 
        cx="62" 
        cy="62" 
        r="30" 
        fill={color}
      />
      {/* Small circle */}
      <circle 
        cx="30" 
        cy="30" 
        r="16" 
        fill={color}
      />
    </svg>
  )
}

/**
 * TORBIT Wordmark - Logo with text
 */
export function TorbitWordmark({ 
  className, 
  size = 'md',
  variant = 'default'
}: TorbitLogoProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <TorbitLogo size={size} variant={variant} />
      <span className={cn(
        'font-bold tracking-tight',
        size === 'xs' && 'text-sm',
        size === 'sm' && 'text-base',
        size === 'md' && 'text-xl',
        size === 'lg' && 'text-2xl',
        size === 'xl' && 'text-3xl',
        variant === 'default' && 'text-white',
        variant === 'white' && 'text-white',
        variant === 'muted' && 'text-neutral-500',
      )}>
        TORBIT
      </span>
    </div>
  )
}

export default TorbitLogo
