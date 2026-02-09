import { describe, expect, it } from 'vitest'
import { resolveRuntimeProfile } from './E2BProvider'

describe('resolveRuntimeProfile', () => {
  it('defaults to Next.js when package.json is missing', () => {
    const profile = resolveRuntimeProfile([])
    expect(profile.framework).toBe('nextjs')
    expect(profile.port).toBe(3000)
  })

  it('selects Next.js profile when next dependency exists', () => {
    const profile = resolveRuntimeProfile([
      {
        path: 'package.json',
        content: JSON.stringify({
          dependencies: { next: '16.1.6' },
          scripts: { dev: 'next dev' },
        }),
      },
    ])

    expect(profile.framework).toBe('nextjs')
    expect(profile.command).toContain('--port 3000')
  })

  it('selects Vite profile when next is absent and vite is present', () => {
    const profile = resolveRuntimeProfile([
      {
        path: 'package.json',
        content: JSON.stringify({
          devDependencies: { vite: '^5.0.0' },
          scripts: { dev: 'vite dev' },
        }),
      },
    ])

    expect(profile.framework).toBe('vite')
    expect(profile.port).toBe(5173)
  })
})
