'use client'

import Link from 'next/link'
import { TorbitLogo } from '@/components/ui/TorbitLogo'

interface HeroHeaderProps {
  showContent: boolean
  isLoggedIn: boolean
}

export function HeroHeader({ showContent, isLoggedIn }: HeroHeaderProps) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 md:px-8 md:py-5">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <div
          className={`flex items-center gap-2.5 transition-all duration-700 ${
            showContent ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'
          }`}
        >
          <TorbitLogo size="sm" animated />
          <span className="font-medium tracking-tight text-white">TORBIT</span>
        </div>

        <div
          className={`flex items-center gap-4 transition-all delay-150 duration-700 md:gap-6 ${
            showContent ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'
          }`}
        >
          <a href="#guarantee" className="hidden text-sm text-white/40 transition-colors hover:text-white/70 sm:block">
            Guarantee
          </a>
          <a href="#pricing" className="hidden text-sm text-white/40 transition-colors hover:text-white/70 sm:block">
            Governance Docs
          </a>
          <div className="hidden h-4 w-px bg-white/10 sm:block" />

          {isLoggedIn ? (
            <Link
              href="/dashboard"
              className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black transition-all hover:bg-white/90"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-sm text-white/50 transition-colors hover:text-white">
                Sign In
              </Link>
              <Link
                href="/login"
                className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black transition-all hover:bg-white/90"
              >
                Build with Guarantees
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
