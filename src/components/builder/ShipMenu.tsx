'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * ShipMenu - The Command Center for shipping code
 * 
 * "Throne Room" strategy - Top right corner holds:
 * - Primary: DEPLOY APP (the main action)
 * - Secondary dropdown: GitHub PR, Download ZIP
 * 
 * Visual: Split button pattern with glowing deploy action
 */
export default function ShipMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const [isDeploying, setIsDeploying] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close on escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  const handleDeploy = async () => {
    setIsDeploying(true)
    // TODO: Trigger deployToProduction tool
    // For now, simulate deployment
    await new Promise(resolve => setTimeout(resolve, 2000))
    setIsDeploying(false)
  }

  const handleGitHubPR = () => {
    setIsOpen(false)
    // TODO: Trigger syncToGithub tool
    console.log('Opening PR on GitHub...')
  }

  const handleDownloadZip = () => {
    setIsOpen(false)
    // TODO: Package all virtual files and download
    console.log('Downloading project as ZIP...')
  }

  return (
    <div ref={menuRef} className="flex items-center gap-0.5">
      {/* Primary Action: Deploy */}
      <button
        onClick={handleDeploy}
        disabled={isDeploying}
        className={`
          flex items-center gap-2 px-4 py-1.5 text-sm font-bold rounded-l-lg transition-all duration-200
          ${isDeploying 
            ? 'bg-emerald-600/50 text-emerald-200 cursor-wait' 
            : 'bg-emerald-500 text-black hover:bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)]'
          }
        `}
        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
      >
        {isDeploying ? (
          <>
            {/* Spinning rocket */}
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>DEPLOYING...</span>
          </>
        ) : (
          <>
            {/* Rocket icon */}
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
            </svg>
            <span>DEPLOY</span>
          </>
        )}
      </button>

      {/* Dropdown Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center justify-center w-8 py-1.5 rounded-r-lg border-l border-emerald-600/50 transition-all duration-200
          ${isOpen 
            ? 'bg-emerald-600 text-black' 
            : 'bg-emerald-500/80 text-black hover:bg-emerald-400'
          }
        `}
        aria-label="More ship options"
        aria-expanded={isOpen}
      >
        <svg 
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor" 
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute top-full right-0 mt-2 w-56 z-50"
          >
            <div className="bg-neutral-900/95 backdrop-blur-xl border border-neutral-700/50 rounded-lg shadow-2xl overflow-hidden">
              {/* Menu Header */}
              <div className="px-3 py-2 border-b border-neutral-800">
                <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
                  Ship Options
                </span>
              </div>

              {/* Menu Items */}
              <div className="py-1">
                {/* GitHub PR */}
                <button
                  onClick={handleGitHubPR}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-neutral-300 hover:bg-emerald-500/10 hover:text-emerald-400 transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Open PR on GitHub</span>
                    <span className="text-xs text-neutral-500">Push changes as pull request</span>
                  </div>
                </button>

                {/* Download ZIP */}
                <button
                  onClick={handleDownloadZip}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-neutral-300 hover:bg-blue-500/10 hover:text-blue-400 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <div className="flex flex-col items-start">
                    <span className="font-medium">Download as ZIP</span>
                    <span className="text-xs text-neutral-500">Export project to your machine</span>
                  </div>
                </button>
              </div>

              {/* Footer tip */}
              <div className="px-3 py-2 border-t border-neutral-800 bg-neutral-800/30">
                <p className="text-xs text-neutral-500">
                  <span className="text-emerald-500">Tip:</span> Deploy ships to Vercel automatically
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
