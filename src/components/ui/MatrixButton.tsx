import { forwardRef, ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { TorbitSpinner } from './TorbitLogo'

export interface MatrixButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button variant */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  /** Button size */
  size?: 'sm' | 'md' | 'lg'
  /** Show loading state */
  loading?: boolean
  /** Glow effect intensity */
  glow?: boolean
}

/**
 * MatrixButton - Cyberpunk styled button component
 */
const MatrixButton = forwardRef<HTMLButtonElement, MatrixButtonProps>(
  function MatrixButton(
    {
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      glow = true,
      disabled,
      children,
      ...props
    },
    ref
  ) {
    const baseStyles = `
      relative inline-flex items-center justify-center
      font-mono font-medium tracking-wider uppercase
      border transition-all duration-200
      disabled:opacity-50 disabled:cursor-not-allowed
      focus:outline-none focus:ring-2 focus:ring-matrix-400 focus:ring-offset-2 focus:ring-offset-void-900
    `

    const variants = {
      primary: `
        bg-matrix-400/10 text-matrix-400 border-matrix-400
        hover:bg-matrix-400/20 hover:shadow-[0_0_20px_rgba(0,255,65,0.4)]
        active:bg-matrix-400/30
      `,
      secondary: `
        bg-transparent text-matrix-300 border-matrix-600
        hover:border-matrix-400 hover:text-matrix-400
        active:bg-matrix-400/10
      `,
      ghost: `
        bg-transparent text-matrix-400 border-transparent
        hover:bg-matrix-400/10 hover:border-matrix-400/50
        active:bg-matrix-400/20
      `,
      danger: `
        bg-glitch-400/10 text-glitch-400 border-glitch-400
        hover:bg-glitch-400/20 hover:shadow-[0_0_20px_rgba(255,0,64,0.4)]
        active:bg-glitch-400/30
      `,
    }

    const sizes = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-5 py-2.5 text-sm',
      lg: 'px-8 py-3.5 text-base',
    }

    const glowStyles = glow
      ? 'hover:drop-shadow-[0_0_10px_rgba(0,255,65,0.5)]'
      : ''

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          baseStyles,
          variants[variant],
          sizes[size],
          glowStyles,
          className
        )}
        {...props}
      >
        {/* Corner decorations */}
        <span className="absolute top-0 left-0 w-2 h-2 border-t border-l border-current opacity-50" />
        <span className="absolute top-0 right-0 w-2 h-2 border-t border-r border-current opacity-50" />
        <span className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-current opacity-50" />
        <span className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-current opacity-50" />

        {loading ? (
          <span className="flex items-center gap-2">
            <TorbitSpinner size="xs" speed="fast" />
            <span>Processing...</span>
          </span>
        ) : (
          children
        )}
      </button>
    )
  }
)

export default MatrixButton
