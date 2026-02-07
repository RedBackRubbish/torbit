/**
 * TORBIT Mobile - Screenshot Button
 * Trigger for App Store screenshot generation
 */

'use client'

import { useState, useRef, useEffect } from 'react'
import { Camera } from 'lucide-react'
import { useBuilderStore } from '@/store/builder'
import { ScreenshotPanel } from './ScreenshotPanel'

export function ScreenshotButton() {
  const [isOpen, setIsOpen] = useState(false)
  const previewRef = useRef<HTMLElement>(null)
  
  const { projectType, files } = useBuilderStore()
  
  const isMobile = projectType === 'mobile'
  const hasFiles = files.length > 0
  
  // Find the preview element when opening
  useEffect(() => {
    if (isOpen) {
      // Look for the iPhone frame element
      const previewElement = document.querySelector('[data-preview-capture]') as HTMLElement
      if (previewElement) {
        previewRef.current = previewElement
      } else {
        // Fallback to finding the iframe container
        const iframeContainer = document.querySelector('#webcontainer-preview')?.parentElement as HTMLElement
        if (iframeContainer) {
          previewRef.current = iframeContainer
        }
      }
    }
  }, [isOpen])
  
  if (!isMobile) return null
  
  return (
    <>
      {/* Screenshots Button - Premium Style */}
      <button
        onClick={() => setIsOpen(true)}
        disabled={!hasFiles}
        aria-label="Generate App Store screenshots for your mobile app"
        aria-disabled={!hasFiles}
        className="group relative flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-lg transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed overflow-hidden
          bg-gradient-to-b from-[#1a1a1a] to-[#0f0f0f]
          text-[#909090] hover:text-white
          border border-[#2a2a2a] hover:border-[#404040]
          shadow-[0_1px_2px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.03)]
          hover:shadow-[0_2px_8px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.05)]
          active:scale-[0.98]"
        title="Generate App Store Screenshots"
      >
        <Camera className="w-3.5 h-3.5 transition-transform group-hover:scale-110" aria-hidden="true" />
        <span className="hidden sm:inline">Screenshots</span>
      </button>
      
      <ScreenshotPanel
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        previewRef={previewRef}
      />
    </>
  )
}
