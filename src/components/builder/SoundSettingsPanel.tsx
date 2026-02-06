'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSoundSettings } from '@/store/soundSettings'
import { useSoundEffects } from '@/lib/audio'

/**
 * SoundSettingsPanel - Controls for all audio settings
 */
export default function SoundSettingsPanel({ 
  open, 
  onOpenChange 
}: { 
  open: boolean
  onOpenChange: (open: boolean) => void 
}) {
  const {
    enabled,
    volume,
    ambientHum,
    uiSounds,
    notifications,
    agentSounds,
    setEnabled,
    setVolume,
    toggleAmbientHum,
    toggleUiSounds,
    toggleNotifications,
    toggleAgentSounds,
    resetToDefaults,
  } = useSoundSettings()

  const { play, init } = useSoundEffects()
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Initialize audio on first interaction
  const handleInteraction = async () => {
    await init()
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value)
    setVolume(newVolume)
  }

  const handleToggle = (toggle: () => void) => {
    toggle()
    play('click')
  }

  if (!isMounted) return null

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={() => onOpenChange(false)}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md"
            onClick={handleInteraction}
          >
            <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-2xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="px-6 py-4 border-b border-[#1a1a1a] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#c0c0c0]/10 flex items-center justify-center">
                    <svg className="w-4 h-4 text-[#c0c0c0]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-[15px] font-semibold text-[#e0e0e0]">Sound Settings</h2>
                    <p className="text-[11px] text-[#606060]">Audio feedback & ambiance</p>
                  </div>
                </div>
                <button
                  onClick={() => onOpenChange(false)}
                  className="w-8 h-8 rounded-lg bg-[#0f0f0f] border border-[#1a1a1a] flex items-center justify-center text-[#606060] hover:text-[#c0c0c0] hover:border-[#333] transition-all"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Master Enable */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[13px] font-medium text-[#e0e0e0]">Enable Sound</p>
                    <p className="text-[11px] text-[#606060]">Master audio toggle</p>
                  </div>
                  <button
                    onClick={() => handleToggle(() => setEnabled(!enabled))}
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      enabled ? 'bg-[#c0c0c0]' : 'bg-[#1a1a1a]'
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 rounded-full bg-[#0a0a0a] transition-transform ${
                        enabled ? 'left-6' : 'left-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Volume Slider */}
                <div className={enabled ? '' : 'opacity-40 pointer-events-none'}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[13px] font-medium text-[#e0e0e0]">Volume</p>
                    <span className="text-[11px] text-[#606060] font-mono">{Math.round(volume * 100)}%</span>
                  </div>
                  <div className="relative">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={volume}
                      onChange={handleVolumeChange}
                      className="w-full h-2 rounded-full bg-[#1a1a1a] appearance-none cursor-pointer
                        [&::-webkit-slider-thumb]:appearance-none
                        [&::-webkit-slider-thumb]:w-4
                        [&::-webkit-slider-thumb]:h-4
                        [&::-webkit-slider-thumb]:rounded-full
                        [&::-webkit-slider-thumb]:bg-[#c0c0c0]
                        [&::-webkit-slider-thumb]:cursor-pointer
                        [&::-webkit-slider-thumb]:transition-transform
                        [&::-webkit-slider-thumb]:hover:scale-110"
                    />
                    <div 
                      className="absolute top-0 left-0 h-2 bg-[#c0c0c0]/30 rounded-full pointer-events-none"
                      style={{ width: `${volume * 100}%` }}
                    />
                  </div>
                </div>

                {/* Category Toggles */}
                <div className={`space-y-3 ${enabled ? '' : 'opacity-40 pointer-events-none'}`}>
                  <p className="text-[11px] font-medium text-[#606060] uppercase tracking-wider">Categories</p>
                  
                  <ToggleRow
                    label="Ambient Hum"
                    description="Reactor drone during generation"
                    enabled={ambientHum}
                    onToggle={() => handleToggle(toggleAmbientHum)}
                  />
                  
                  <ToggleRow
                    label="UI Sounds"
                    description="Clicks, file actions, terminal"
                    enabled={uiSounds}
                    onToggle={() => handleToggle(toggleUiSounds)}
                  />
                  
                  <ToggleRow
                    label="Notifications"
                    description="Success, error, warnings"
                    enabled={notifications}
                    onToggle={() => handleToggle(toggleNotifications)}
                  />
                  
                  <ToggleRow
                    label="Agent Sounds"
                    description="Audio cues when agents activate"
                    enabled={agentSounds}
                    onToggle={() => handleToggle(toggleAgentSounds)}
                  />
                </div>

                {/* Test Sound */}
                <button
                  onClick={() => play('success')}
                  disabled={!enabled}
                  className="w-full py-2.5 rounded-lg bg-[#0f0f0f] border border-[#1a1a1a] text-[12px] font-medium text-[#808080] hover:text-[#c0c0c0] hover:border-[#333] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                  </svg>
                  Test Sound
                </button>

                {/* Reset */}
                <button
                  onClick={resetToDefaults}
                  className="w-full py-2 text-[11px] text-[#505050] hover:text-[#808080] transition-colors"
                >
                  Reset to defaults
                </button>
              </div>

              {/* Keyboard shortcut hint */}
              <div className="px-6 py-3 border-t border-[#1a1a1a] flex items-center justify-center gap-2">
                <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-[#0f0f0f] border border-[#1a1a1a] rounded text-[#505050]">M</kbd>
                <span className="text-[10px] text-[#505050]">to toggle mute</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function ToggleRow({ 
  label, 
  description, 
  enabled, 
  onToggle 
}: { 
  label: string
  description: string
  enabled: boolean
  onToggle: () => void 
}) {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-[#0f0f0f] border border-[#1a1a1a]">
      <div>
        <p className="text-[12px] font-medium text-[#c0c0c0]">{label}</p>
        <p className="text-[10px] text-[#505050]">{description}</p>
      </div>
      <button
        onClick={onToggle}
        className={`relative w-9 h-5 rounded-full transition-colors ${
          enabled ? 'bg-[#c0c0c0]/40' : 'bg-[#1a1a1a]'
        }`}
      >
        <div
          className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${
            enabled ? 'left-[18px] bg-[#c0c0c0]' : 'left-0.5 bg-[#404040]'
          }`}
        />
      </button>
    </div>
  )
}
