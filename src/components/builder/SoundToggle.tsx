'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSoundSettings } from '@/store/soundSettings'
import { useSoundEffects } from '@/lib/audio'
import SoundSettingsPanel from './SoundSettingsPanel'

/**
 * SoundToggle - Header button to toggle sound + open settings
 */
export default function SoundToggle() {
  const { enabled, setEnabled, volume } = useSoundSettings()
  const { play, init } = useSoundEffects()
  const [showSettings, setShowSettings] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Keyboard shortcut: M to toggle mute
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'm' && !e.metaKey && !e.ctrlKey && !e.altKey) {
        // Don't trigger if typing in an input
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
        e.preventDefault()
        setEnabled(!enabled)
        play('click')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [enabled, setEnabled, play])

  // Initialize audio on first click
  const handleClick = async () => {
    await init()
    play('click')
    setShowSettings(true)
  }

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await init()
    setEnabled(!enabled)
    if (!enabled) {
      // Play a sound when enabling
      setTimeout(() => play('success'), 50)
    }
  }

  if (!isMounted) {
    return (
      <div className="w-7 h-7 rounded-md bg-[#141414] border border-[#1f1f1f]" />
    )
  }

  return (
    <>
      <div className="relative">
        {/* Sound Button */}
        <motion.button
          onClick={handleClick}
          onContextMenu={(e) => {
            e.preventDefault()
            handleToggle(e)
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`relative w-7 h-7 flex items-center justify-center rounded-md transition-all ${
            enabled
              ? 'text-[#808080] hover:text-[#c0c0c0] hover:bg-[#141414]'
              : 'text-[#404040] hover:text-[#606060] hover:bg-[#141414]'
          }`}
          title={`Sound ${enabled ? 'On' : 'Off'} (M to toggle)`}
        >
          {enabled ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
            </svg>
          )}

          {/* Volume indicator bar */}
          {enabled && (
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: volume }}
              className="absolute bottom-0 left-1 right-1 h-0.5 bg-[#c0c0c0]/40 rounded-full origin-left"
            />
          )}
        </motion.button>

        {/* Active indicator */}
        <AnimatePresence>
          {enabled && (
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[#c0c0c0]"
            />
          )}
        </AnimatePresence>
      </div>

      {/* Settings Panel */}
      <SoundSettingsPanel open={showSettings} onOpenChange={setShowSettings} />
    </>
  )
}
