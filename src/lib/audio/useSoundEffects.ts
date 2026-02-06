'use client'

import { useCallback, useEffect, useRef } from 'react'
import { getSoundEngine, type SoundType } from './SoundEngine'
import { useSoundSettings } from '@/store/soundSettings'

/**
 * TORBIT SOUND HOOK
 * Easy-to-use React hook for playing sounds
 */

export function useSoundEffects() {
  const engineRef = useRef(getSoundEngine())
  const { enabled, volume, ambientHum, uiSounds, notifications, agentSounds, respectReducedMotion } = useSoundSettings()
  
  // Check for reduced motion preference
  const prefersReducedMotion = typeof window !== 'undefined' 
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches 
    : false
  
  const shouldPlay = enabled && !(respectReducedMotion && prefersReducedMotion)

  // Sync settings with engine
  useEffect(() => {
    const engine = engineRef.current
    engine.setVolume(volume)
    engine.setEnabled(shouldPlay)
  }, [volume, shouldPlay])

  /**
   * Play a sound effect
   */
  const play = useCallback((type: SoundType) => {
    if (!shouldPlay) return

    // Category filtering
    const isUiSound = ['click', 'hover', 'file-create', 'file-edit', 'terminal-command'].includes(type)
    const isNotification = ['notification', 'warning', 'error', 'success', 'fuel-low', 'fuel-refuel'].includes(type)
    const isAgentSound = type.startsWith('agent-')
    const isAmbient = type.startsWith('generation-')

    if (isUiSound && !uiSounds) return
    if (isNotification && !notifications) return
    if (isAgentSound && !agentSounds) return
    if (isAmbient && !ambientHum) return

    engineRef.current.play(type)
  }, [shouldPlay, uiSounds, notifications, agentSounds, ambientHum])

  /**
   * Start the ambient generation hum
   */
  const startHum = useCallback(() => {
    if (!shouldPlay || !ambientHum) return
    engineRef.current.startGenerationHum()
  }, [shouldPlay, ambientHum])

  /**
   * Stop the ambient generation hum
   */
  const stopHum = useCallback(() => {
    engineRef.current.stopGenerationHum()
  }, [])

  /**
   * Initialize audio (call after user interaction)
   */
  const init = useCallback(async () => {
    await engineRef.current.init()
  }, [])

  return {
    play,
    startHum,
    stopHum,
    init,
    isEnabled: shouldPlay,
  }
}

/**
 * Pre-configured hooks for specific use cases
 */

export function useAgentSound() {
  const { play } = useSoundEffects()
  
  return useCallback((agent: 'architect' | 'frontend' | 'backend' | 'auditor') => {
    play(`agent-${agent}` as SoundType)
  }, [play])
}

export function useFileSound() {
  const { play } = useSoundEffects()
  
  return {
    onCreate: useCallback(() => play('file-create'), [play]),
    onEdit: useCallback(() => play('file-edit'), [play]),
  }
}

export function useGenerationSound() {
  const { play, startHum, stopHum } = useSoundEffects()
  
  return {
    onStart: useCallback(() => {
      play('generation-start')
      startHum()
    }, [play, startHum]),
    onComplete: useCallback(() => {
      stopHum()
      play('generation-complete')
    }, [play, stopHum]),
    onError: useCallback(() => {
      stopHum()
      play('error')
    }, [play, stopHum]),
  }
}

export function useNotificationSound() {
  const { play } = useSoundEffects()
  
  return {
    notify: useCallback(() => play('notification'), [play]),
    success: useCallback(() => play('success'), [play]),
    warning: useCallback(() => play('warning'), [play]),
    error: useCallback(() => play('error'), [play]),
  }
}
