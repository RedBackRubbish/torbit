'use client'

import { memo } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { TorbitLogo } from '@/components/ui/TorbitLogo'

interface NavbarProps {
  className?: string
}

/**
 * Navbar - Matrix-themed navigation bar
 */
const Navbar = memo(function Navbar({ className }: NavbarProps) {
  return (
    <nav
      data-testid="navbar"
      className={cn(
        `fixed top-0 left-0 right-0 z-40
        border-b border-matrix-800/50
        bg-void-900/80 backdrop-blur-md`,
        className
      )}
    >
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link 
            href="/"
            className="flex items-center gap-2.5 group"
          >
            <TorbitLogo size="md" animated />
            <span className="text-xl font-bold text-white tracking-tight">
              TORBIT
            </span>
          </Link>

          {/* Nav Links */}
          <div className="hidden md:flex items-center gap-8">
            {['Features', 'How it Works', 'Pricing', 'Docs'].map((item) => (
              <Link
                key={item}
                href={`#${item.toLowerCase().replace(/\s/g, '-')}`}
                className="text-sm font-mono text-matrix-600 hover:text-matrix-400 transition-colors uppercase tracking-wider"
              >
                {item}
              </Link>
            ))}
          </div>

          {/* CTA */}
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="hidden sm:block text-sm font-mono text-matrix-500 hover:text-matrix-400 transition-colors"
            >
              Login
            </Link>
            <Link
              href="/signup"
              className="
                px-4 py-2 text-sm font-mono font-medium
                border border-matrix-400 text-matrix-400
                hover:bg-matrix-400/10 hover:shadow-[0_0_20px_rgba(0,255,65,0.3)]
                transition-all uppercase tracking-wider
              "
            >
              Jack In
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
})

export default Navbar
