import { ReactNode, memo } from 'react'
import { cn } from '@/lib/utils'

export interface MatrixCardProps {
  /** Card content */
  children: ReactNode
  /** Card title */
  title?: string
  /** CSS classes */
  className?: string
  /** Glow effect on hover */
  glow?: boolean
  /** Variant style */
  variant?: 'default' | 'terminal' | 'highlight'
}

/**
 * MatrixCard - Cyberpunk styled card component
 */
const MatrixCard = memo(function MatrixCard({
  children,
  title,
  className = '',
  glow = true,
  variant = 'default',
}: MatrixCardProps) {
  const variants = {
    default: 'bg-void-800/80 border-matrix-800',
    terminal: 'bg-void-900/95 border-matrix-700',
    highlight: 'bg-matrix-400/5 border-matrix-500',
  }

  return (
    <div
      data-testid="matrix-card"
      className={cn(
        `relative border backdrop-blur-sm
        transition-all duration-300`,
        variants[variant],
        glow && 'hover:border-matrix-400 hover:shadow-[0_0_30px_rgba(0,255,65,0.15)]',
        className
      )}
    >
      {/* Terminal header */}
      {title && (
        <div className="border-b border-matrix-800 px-4 py-2 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-glitch-400" />
          <span className="w-2 h-2 rounded-full bg-warning" />
          <span className="w-2 h-2 rounded-full bg-matrix-400" />
          <span className="ml-3 text-xs font-mono text-matrix-600 uppercase tracking-wider">
            {title}
          </span>
        </div>
      )}

      {/* Content */}
      <div className="p-6">
        {children}
      </div>

      {/* Corner brackets */}
      <span className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-matrix-500" />
      <span className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-matrix-500" />
      <span className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-matrix-500" />
      <span className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-matrix-500" />
    </div>
  )
})

export default MatrixCard
