'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * ShipMenu - Premium Deploy Button with Silver Accents
 * 
 * Pure black + silver theme with proper dropdown positioning
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
    await new Promise(resolve => setTimeout(resolve, 2000))
    setIsDeploying(false)
  }

  const handleGitHubPR = () => {
    setIsOpen(false)
    // TODO: Trigger syncToGithub tool
  }

  const handleDownloadZip = () => {
    setIsOpen(false)
    // TODO: Package all virtual files and download
  }
  
  const handleVercelDeploy = () => {
    setIsOpen(false)
    handleDeploy()
  }
  
  const handleNetlifyDeploy = () => {
    setIsOpen(false)
    // TODO: Deploy to Netlify
  }

  return (
    <div ref={menuRef} className="relative flex items-center">
      {/* Primary Action: Deploy */}
      <button
        onClick={handleDeploy}
        disabled={isDeploying}
        className={`
          flex items-center gap-2 px-4 py-1.5 text-[13px] font-semibold rounded-l-lg transition-all duration-200
          ${isDeploying 
            ? 'bg-[#c0c0c0]/50 text-[#000] cursor-wait' 
            : 'bg-[#c0c0c0] text-[#000] hover:bg-[#d4d4d4]'
          }
        `}
      >
        {isDeploying ? (
          <>
            <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span>Deploying...</span>
          </>
        ) : (
          <>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
          flex items-center justify-center w-7 py-1.5 rounded-r-lg border-l border-[#909090] transition-all duration-200
          ${isOpen 
            ? 'bg-[#a0a0a0] text-[#000]' 
            : 'bg-[#c0c0c0] text-[#000] hover:bg-[#d4d4d4]'
          }
        `}
        aria-label="More deploy options"
        aria-expanded={isOpen}
      >
        <svg 
          className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor" 
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            className="absolute top-full right-0 mt-2 w-64 z-50"
          >
            <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl shadow-2xl overflow-hidden">
              {/* Deploy Options */}
              <div className="p-1.5">
                <span className="block px-2.5 py-1.5 text-[10px] font-medium text-[#505050] uppercase tracking-wider">
                  Deploy to
                </span>
                
                {/* Vercel */}
                <button
                  onClick={handleVercelDeploy}
                  className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-[#a8a8a8] hover:bg-[#151515] hover:text-[#ffffff] transition-all group"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#000] border border-[#1a1a1a] flex items-center justify-center group-hover:border-[#333]">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M24 22.525H0l12-21.05 12 21.05z" />
                    </svg>
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-[12px] font-medium">Vercel</span>
                    <span className="text-[10px] text-[#505050]">Instant deployment</span>
                  </div>
                </button>

                {/* Netlify */}
                <button
                  onClick={handleNetlifyDeploy}
                  className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-[#a8a8a8] hover:bg-[#151515] hover:text-[#ffffff] transition-all group"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#000] border border-[#1a1a1a] flex items-center justify-center group-hover:border-[#333]">
                    <svg className="w-4 h-4 text-[#00C7B7]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.13 9.14h-1.59c-.19-.63-.49-1.22-.88-1.74l1.12-1.12a.62.62 0 000-.87l-1.19-1.19a.62.62 0 00-.87 0l-1.12 1.12c-.52-.39-1.11-.69-1.74-.88V2.87a.62.62 0 00-.62-.62h-1.68a.62.62 0 00-.62.62v1.59c-.63.19-1.22.49-1.74.88L4.88 4.22a.62.62 0 00-.87 0L2.82 5.41a.62.62 0 000 .87l1.12 1.12c-.39.52-.69 1.11-.88 1.74H1.47a.62.62 0 00-.62.62v1.68c0 .34.28.62.62.62h1.59c.19.63.49 1.22.88 1.74l-1.12 1.12a.62.62 0 000 .87l1.19 1.19c.24.24.63.24.87 0l1.12-1.12c.52.39 1.11.69 1.74.88v1.59c0 .34.28.62.62.62h1.68c.34 0 .62-.28.62-.62v-1.59c.63-.19 1.22-.49 1.74-.88l1.12 1.12c.24.24.63.24.87 0l1.19-1.19a.62.62 0 000-.87l-1.12-1.12c.39-.52.69-1.11.88-1.74h1.59c.34 0 .62-.28.62-.62v-1.68a.62.62 0 00-.62-.62zM9.28 13.09a2.54 2.54 0 110-5.08 2.54 2.54 0 010 5.08z"/>
                    </svg>
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-[12px] font-medium">Netlify</span>
                    <span className="text-[10px] text-[#505050]">Edge functions</span>
                  </div>
                </button>
              </div>
              
              {/* Divider */}
              <div className="border-t border-[#151515] mx-2" />

              {/* Export Options */}
              <div className="p-1.5">
                <span className="block px-2.5 py-1.5 text-[10px] font-medium text-[#505050] uppercase tracking-wider">
                  Export
                </span>
                
                {/* GitHub PR */}
                <button
                  onClick={handleGitHubPR}
                  className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-[#a8a8a8] hover:bg-[#151515] hover:text-[#ffffff] transition-all group"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#000] border border-[#1a1a1a] flex items-center justify-center group-hover:border-[#333]">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-[12px] font-medium">Push to GitHub</span>
                    <span className="text-[10px] text-[#505050]">Create pull request</span>
                  </div>
                </button>

                {/* Download ZIP */}
                <button
                  onClick={handleDownloadZip}
                  className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-[#a8a8a8] hover:bg-[#151515] hover:text-[#ffffff] transition-all group"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#000] border border-[#1a1a1a] flex items-center justify-center group-hover:border-[#333]">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-[12px] font-medium">Download ZIP</span>
                    <span className="text-[10px] text-[#505050]">Export to your machine</span>
                  </div>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
