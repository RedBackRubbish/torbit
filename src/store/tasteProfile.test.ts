import { beforeEach, describe, expect, it } from 'vitest'
import { useTasteProfileStore } from './tasteProfile'

describe('taste profile store', () => {
  beforeEach(() => {
    useTasteProfileStore.setState({ profiles: {} })
  })

  it('ingests prompts and stores profile signals per project', () => {
    const store = useTasteProfileStore.getState()
    store.ingestPrompt('project-1', 'Make it premium, bold, and clean. No purple.')

    const profile = useTasteProfileStore.getState().getProfileForProject('project-1')
    expect(profile).not.toBeNull()
    expect(profile?.likes).toContain('premium polished styling')
    expect(profile?.likes).toContain('bold expressive presentation')
    expect(profile?.avoids).toContain('purple-heavy color systems')
  })

  it('records run outcomes and exposes a prompt block', () => {
    const store = useTasteProfileStore.getState()
    store.ingestPrompt('project-2', 'Use strong typography and a clean layout.')
    store.recordRunOutcome('project-2', true)
    store.recordRunOutcome('project-2', false)

    const profile = useTasteProfileStore.getState().getProfileForProject('project-2')
    expect(profile?.runStats.total).toBe(2)
    expect(profile?.runStats.successful).toBe(1)
    expect(profile?.runStats.failed).toBe(1)

    const prompt = useTasteProfileStore.getState().getPromptForProject('project-2')
    expect(prompt).toContain('PERSISTED USER TASTE PROFILE')
    expect(prompt).toContain('Execution reliability: 1/2 successful implementation runs.')
  })

  it('resets a project profile', () => {
    const store = useTasteProfileStore.getState()
    store.ingestPrompt('project-3', 'Keep it mobile-first and avoid clutter.')
    expect(useTasteProfileStore.getState().getProfileForProject('project-3')).not.toBeNull()

    store.resetProjectProfile('project-3')
    expect(useTasteProfileStore.getState().getProfileForProject('project-3')).toBeNull()
  })

  it('removes individual signals from a project profile', () => {
    const store = useTasteProfileStore.getState()
    store.ingestPrompt('project-4', 'Use bold typography and premium polish. Avoid clutter.')

    let profile = useTasteProfileStore.getState().getProfileForProject('project-4')
    expect(profile?.likes).toContain('bold expressive presentation')

    store.removeSignal('project-4', 'likes', 'bold expressive presentation')
    profile = useTasteProfileStore.getState().getProfileForProject('project-4')
    expect(profile?.likes).not.toContain('bold expressive presentation')
  })

  it('resets all taste profiles', () => {
    const store = useTasteProfileStore.getState()
    store.ingestPrompt('project-a', 'Make it premium')
    store.ingestPrompt('project-b', 'Make it clean')
    expect(Object.keys(useTasteProfileStore.getState().profiles).length).toBe(2)

    store.resetAllProfiles()
    expect(Object.keys(useTasteProfileStore.getState().profiles).length).toBe(0)
  })
})
