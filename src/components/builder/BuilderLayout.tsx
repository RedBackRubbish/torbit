'use client'

import { ReactNode } from 'react'

interface BuilderLayoutProps {
  children: ReactNode
}

/**
 * BuilderLayout - Clean, minimal layout wrapper
 */
export default function BuilderLayout({ children }: BuilderLayoutProps) {
  return (
    <div
      className="builder-ambient relative h-screen w-screen overflow-hidden bg-[#000000]"
      role="main"
      data-testid="builder-layout"
    >
      <div className="builder-grid pointer-events-none absolute inset-0" />
      <div className="builder-orbital-glow pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/[0.06] via-white/[0.01] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 left-[18%] w-px bg-gradient-to-b from-transparent via-white/[0.14] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-[34%] w-px bg-gradient-to-b from-transparent via-white/[0.1] to-transparent" />
      <div className="relative z-10 flex h-full w-full">
        {children}
      </div>
    </div>
  )
}
