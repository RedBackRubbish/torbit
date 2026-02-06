import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * SOUND SETTINGS STORE
 * Manages audio preferences with persistence
 */

export interface SoundSettings {
  // Master controls
  enabled: boolean
  volume: number // 0-1
  
  // Individual sound categories
  ambientHum: boolean
  uiSounds: boolean
  notifications: boolean
  agentSounds: boolean
  
  // Accessibility
  respectReducedMotion: boolean
}

interface SoundSettingsActions {
  setEnabled: (enabled: boolean) => void
  setVolume: (volume: number) => void
  toggleAmbientHum: () => void
  toggleUiSounds: () => void
  toggleNotifications: () => void
  toggleAgentSounds: () => void
  setRespectReducedMotion: (respect: boolean) => void
  resetToDefaults: () => void
}

const DEFAULT_SETTINGS: SoundSettings = {
  enabled: true,
  volume: 0.3,
  ambientHum: true,
  uiSounds: true,
  notifications: true,
  agentSounds: true,
  respectReducedMotion: true,
}

export const useSoundSettings = create<SoundSettings & SoundSettingsActions>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,

      setEnabled: (enabled) => set({ enabled }),
      
      setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)) }),
      
      toggleAmbientHum: () => set((s) => ({ ambientHum: !s.ambientHum })),
      
      toggleUiSounds: () => set((s) => ({ uiSounds: !s.uiSounds })),
      
      toggleNotifications: () => set((s) => ({ notifications: !s.notifications })),
      
      toggleAgentSounds: () => set((s) => ({ agentSounds: !s.agentSounds })),
      
      setRespectReducedMotion: (respect) => set({ respectReducedMotion: respect }),
      
      resetToDefaults: () => set(DEFAULT_SETTINGS),
    }),
    {
      name: 'torbit-sound-settings',
      version: 1,
    }
  )
)
