import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  buildTasteProfilePrompt,
  createEmptyTasteProfile,
  deriveTasteUpdateFromPrompt,
  mergeTasteProfile,
  recordTasteRunOutcome,
  type TasteProfile,
} from '@/lib/design/taste-profile'

const DEFAULT_PROJECT_ID = 'default'

function resolveProjectId(projectId: string | null | undefined): string {
  const normalized = projectId?.trim()
  return normalized && normalized.length > 0 ? normalized : DEFAULT_PROJECT_ID
}

interface TasteProfileState {
  profiles: Record<string, TasteProfile>
}

interface TasteProfileActions {
  ingestPrompt: (projectId: string | null | undefined, prompt: string) => void
  recordRunOutcome: (projectId: string | null | undefined, success: boolean) => void
  getProfileForProject: (projectId: string | null | undefined) => TasteProfile | null
  getPromptForProject: (projectId: string | null | undefined) => string | null
  removeSignal: (
    projectId: string | null | undefined,
    signalType: 'likes' | 'avoids' | 'directives',
    value: string
  ) => void
  resetProjectProfile: (projectId: string | null | undefined) => void
  resetAllProfiles: () => void
}

export const useTasteProfileStore = create<TasteProfileState & TasteProfileActions>()(
  persist(
    (set, get) => ({
      profiles: {},

      ingestPrompt: (projectId, prompt) => {
        const update = deriveTasteUpdateFromPrompt(prompt)
        const hasSignals = update.likes.length > 0 || update.avoids.length > 0 || update.directives.length > 0
        if (!hasSignals) return

        const key = resolveProjectId(projectId)

        set((state) => {
          const current = state.profiles[key] || createEmptyTasteProfile()
          return {
            profiles: {
              ...state.profiles,
              [key]: mergeTasteProfile(current, update),
            },
          }
        })
      },

      recordRunOutcome: (projectId, success) => {
        const key = resolveProjectId(projectId)

        set((state) => {
          const current = state.profiles[key] || createEmptyTasteProfile()
          return {
            profiles: {
              ...state.profiles,
              [key]: recordTasteRunOutcome(current, success),
            },
          }
        })
      },

      getProfileForProject: (projectId) => {
        const key = resolveProjectId(projectId)
        return get().profiles[key] || null
      },

      getPromptForProject: (projectId) => {
        const key = resolveProjectId(projectId)
        const profile = get().profiles[key]
        if (!profile) return null
        return buildTasteProfilePrompt(profile)
      },

      removeSignal: (projectId, signalType, value) => {
        const key = resolveProjectId(projectId)
        const normalizedTarget = value.trim().toLowerCase()
        if (!normalizedTarget) return

        set((state) => {
          const current = state.profiles[key]
          if (!current) return state

          const nextValues = current[signalType].filter((entry) => entry.trim().toLowerCase() !== normalizedTarget)
          const nextProfile = {
            ...current,
            [signalType]: nextValues,
            updatedAt: Date.now(),
          }

          return {
            profiles: {
              ...state.profiles,
              [key]: nextProfile,
            },
          }
        })
      },

      resetProjectProfile: (projectId) => {
        const key = resolveProjectId(projectId)
        set((state) => {
          const next = { ...state.profiles }
          delete next[key]
          return { profiles: next }
        })
      },

      resetAllProfiles: () => set({ profiles: {} }),
    }),
    {
      name: 'torbit-taste-profile',
      version: 1,
      partialize: (state) => ({
        profiles: state.profiles,
      }),
    }
  )
)
