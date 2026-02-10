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
      className="relative h-screen w-screen overflow-hidden bg-[#000000]"
      role="main"
      data-testid="builder-layout"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(900px_360px_at_10%_-10%,rgba(255,255,255,0.06),transparent_60%),radial-gradient(720px_320px_at_95%_-8%,rgba(255,255,255,0.04),transparent_62%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.02)_0%,transparent_25%,transparent_72%,rgba(255,255,255,0.02)_100%)]" />
      <div className="relative z-10 flex h-full w-full">
        {children}
      </div>
    </div>
  )
}
