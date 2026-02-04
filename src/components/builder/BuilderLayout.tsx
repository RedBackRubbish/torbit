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
    <div className="h-screen w-screen overflow-hidden bg-[#000000] flex">
      {children}
    </div>
  )
}
