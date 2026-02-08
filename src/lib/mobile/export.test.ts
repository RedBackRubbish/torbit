import { describe, expect, it } from 'vitest'
import { generateExportBundle } from './export'
import { DEFAULT_MOBILE_CONFIG, DEFAULT_CAPABILITIES } from './types'

describe('mobile export bundle', () => {
  it('adds pipeline docs and eas config for android-enabled projects', () => {
    const bundle = generateExportBundle(
      [{ path: 'app.config.ts', content: 'export default {}' }],
      {
        ...DEFAULT_MOBILE_CONFIG,
        appName: 'Pipeline App',
        capabilities: { ...DEFAULT_CAPABILITIES },
        platforms: ['ios', 'android'],
      }
    )

    const paths = bundle.files.map((file) => file.path)
    expect(paths).toContain('README-MOBILE-PIPELINE.md')
    expect(paths).toContain('README-ANDROID.md')
    expect(paths).toContain('PLAY-STORE-CHECKLIST.md')
    expect(paths).toContain('eas.json')
  })

  it('does not overwrite existing eas.json from project files', () => {
    const bundle = generateExportBundle(
      [
        { path: 'app.config.ts', content: 'export default {}' },
        { path: '/eas.json', content: '{"build":{"production":{"autoIncrement":false}}}' },
      ],
      {
        ...DEFAULT_MOBILE_CONFIG,
        appName: 'Existing EAS',
        capabilities: { ...DEFAULT_CAPABILITIES },
        platforms: ['ios', 'android'],
      }
    )

    const easFiles = bundle.files.filter((file) => file.path.replace(/^\/+/, '') === 'eas.json')
    expect(easFiles).toHaveLength(1)
    expect(easFiles[0].content).toContain('"autoIncrement":false')
  })
})

