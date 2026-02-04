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
      className="h-screen w-screen overflow-hidden bg-[#0a0a0a] flex"
      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
    >
      {/* Subtle Matrix grid overlay */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0, 255, 65, 0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 255, 65, 0.5) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      />
      
      {/* Content */}
      {children}
    </div>
  )
}
