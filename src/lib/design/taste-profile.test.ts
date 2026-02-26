import { describe, expect, it } from 'vitest'
import {
  buildTasteProfilePrompt,
  createEmptyTasteProfile,
  deriveTasteUpdateFromPrompt,
  mergeTasteProfile,
  recordTasteRunOutcome,
} from './taste-profile'

describe('taste profile helpers', () => {
  it('derives likes, avoids, and directives from prompt text', () => {
    const update = deriveTasteUpdateFromPrompt(
      'Make it bold and premium. No purple. Keep the layout clean and mobile-first.'
    )

    expect(update.likes).toContain('bold expressive presentation')
    expect(update.likes).toContain('premium polished styling')
    expect(update.likes).toContain('minimal visual hierarchy')
    expect(update.likes).toContain('mobile-first responsive layouts')
    expect(update.avoids).toContain('purple-heavy color systems')
    expect(update.directives.length).toBeGreaterThan(0)
  })

  it('merges updates without duplicates and keeps newest directives first', () => {
    const base = {
      ...createEmptyTasteProfile(10),
      likes: ['minimal visual hierarchy'],
      directives: ['Use clean card layouts'],
    }

    const merged = mergeTasteProfile(
      base,
      {
        likes: ['premium polished styling', 'minimal visual hierarchy'],
        avoids: ['cluttered layouts'],
        directives: ['Use clean card layouts', 'Add purposeful motion only where helpful'],
      },
      20
    )

    expect(merged.likes).toEqual(['premium polished styling', 'minimal visual hierarchy'])
    expect(merged.avoids).toEqual(['cluttered layouts'])
    expect(merged.directives[0]).toBe('Add purposeful motion only where helpful')
    expect(merged.updatedAt).toBe(20)
  })

  it('records run outcomes and renders a prompt block', () => {
    const base = mergeTasteProfile(
      createEmptyTasteProfile(1),
      {
        likes: ['premium polished styling'],
        avoids: ['generic boilerplate UI patterns'],
        directives: ['Use strong typography hierarchy'],
      },
      2
    )

    const updated = recordTasteRunOutcome(base, true, 3)
    const prompt = buildTasteProfilePrompt(updated)

    expect(updated.runStats.total).toBe(1)
    expect(updated.runStats.successful).toBe(1)
    expect(prompt).toContain('PERSISTED USER TASTE PROFILE')
    expect(prompt).toContain('Preferred style directions:')
    expect(prompt).toContain('Avoid these directions:')
    expect(prompt).toContain('Execution reliability: 1/1 successful implementation runs.')
  })

  it('returns null prompt when profile has no taste signals', () => {
    const empty = createEmptyTasteProfile()
    expect(buildTasteProfilePrompt(empty)).toBeNull()
  })
})
