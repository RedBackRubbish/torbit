import { forwardRef, InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface MatrixInputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Label text */
  label?: string
  /** Error message */
  error?: string
  /** Glow effect on focus */
  glow?: boolean
}

/**
 * MatrixInput - Cyberpunk styled input component
 */
const MatrixInput = forwardRef<HTMLInputElement, MatrixInputProps>(
  function MatrixInput(
    { className, label, error, glow = true, id, ...props },
    ref
  ) {
    const inputId = id || label?.toLowerCase().replace(/\s/g, '-')

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-mono uppercase tracking-wider text-matrix-400 mb-2"
          >
            {label}
          </label>
        )}

        <div className="relative">
          {/* Terminal prompt decoration */}
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-matrix-600 font-mono text-sm">
            {'>'}
          </span>

          <input
            ref={ref}
            id={inputId}
            className={cn(
              `w-full bg-void-800 border border-matrix-700 rounded-none
              text-matrix-400 font-mono placeholder:text-matrix-800
              pl-8 pr-4 py-3
              focus:outline-none focus:border-matrix-400
              transition-all duration-200`,
              glow && 'focus:shadow-[0_0_15px_rgba(0,255,65,0.2)]',
              error && 'border-glitch-400 focus:border-glitch-400',
              className
            )}
            {...props}
          />

          {/* Corner decorations */}
          <span className="absolute top-0 left-0 w-2 h-2 border-t border-l border-matrix-600" />
          <span className="absolute top-0 right-0 w-2 h-2 border-t border-r border-matrix-600" />
          <span className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-matrix-600" />
          <span className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-matrix-600" />
        </div>

        {error && (
          <p className="mt-2 text-xs font-mono text-glitch-400">
            [ERROR] {error}
          </p>
        )}
      </div>
    )
  }
)

export default MatrixInput
