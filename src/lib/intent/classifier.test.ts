import { describe, expect, it } from 'vitest'
import { classifyIntent, isActionIntent } from './classifier'

describe('classifyIntent', () => {
  it('classifies conversational questions as chat', () => {
    expect(classifyIntent('What is the difference between RSC and SSR?')).toBe('chat')
    expect(classifyIntent('Can you explain this error to me?')).toBe('chat')
    expect(classifyIntent('Why am I seeing a 500 error on this endpoint?')).toBe('chat')
  })

  it('classifies conversational support prompts as chat', () => {
    expect(classifyIntent('hey boss I need some encouragement with building something')).toBe('chat')
    expect(classifyIntent('I feel overwhelmed and need advice on staying focused')).toBe('chat')
  })

  it('classifies create instructions', () => {
    expect(classifyIntent('Build a Next.js dashboard from scratch')).toBe('create')
  })

  it('classifies edit instructions', () => {
    expect(classifyIntent('Update the sidebar layout and add keyboard shortcuts')).toBe('edit')
  })

  it('classifies debug instructions', () => {
    expect(classifyIntent('Fix this 500 error and debug the failing endpoint')).toBe('debug')
    expect(classifyIntent('Can you fix this 500 error?')).toBe('debug')
  })

  it('classifies deploy instructions', () => {
    expect(classifyIntent('Deploy this to production on Vercel')).toBe('deploy')
  })

  it('treats empty prompt as chat', () => {
    expect(classifyIntent('   ')).toBe('chat')
  })

  it('defaults ambiguous non-action statements to chat', () => {
    expect(classifyIntent('just thinking out loud today')).toBe('chat')
  })
})

describe('isActionIntent', () => {
  it('returns false only for chat intent', () => {
    expect(isActionIntent('chat')).toBe(false)
    expect(isActionIntent('create')).toBe(true)
    expect(isActionIntent('edit')).toBe(true)
    expect(isActionIntent('debug')).toBe(true)
    expect(isActionIntent('deploy')).toBe(true)
  })
})
