'use client'

import { ReactNode } from 'react'

interface BuilderLayoutProps {
  children: ReactNode
}

/**
 * BuilderLayout - Main layout wrapper for the builder interface
 * 
 * Full-screen dark environment with Matrix accents
 */
export default function BuilderLayout({ children }: BuilderLayoutProps) {
  return (
    <div 
      className="h-screen w-screen overflow-hidden bg-[#09090b] flex"
      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
    >
      {children}
    </div>
  )
}
