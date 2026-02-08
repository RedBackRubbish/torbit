import { z } from 'zod'

export type MobileShipAction = 'testflight' | 'appstore-connect' | 'android'
export type AndroidReleaseTrack = 'internal' | 'alpha' | 'beta' | 'production'

export interface MobileShipFile {
  path: string
  content: string
}

export interface MobilePipelinePlan {
  action: MobileShipAction
  command: 'build' | 'submit'
  args: string[]
  expectsBuildQueue: boolean
  submitProfile: string
  track?: AndroidReleaseTrack
}

const MobileShipFileSchema = z.object({
  path: z.string().min(1),
  content: z.string(),
})

export const MobileShipRequestSchema = z.object({
  action: z.enum(['testflight', 'appstore-connect', 'android']),
  projectName: z.string().optional(),
  buildProfile: z.string().optional(),
  submitProfile: z.string().optional(),
  androidTrack: z.enum(['internal', 'alpha', 'beta', 'production']).optional(),
  wait: z.boolean().default(false),
  files: z.array(MobileShipFileSchema).min(1),
})

export type MobileShipRequest = z.infer<typeof MobileShipRequestSchema>

export function normalizeMobileFilePath(path: string): string {
  const normalized = path.replace(/^\/+/, '').replace(/\\/g, '/').replace(/\/{2,}/g, '/')
  if (!normalized || normalized.includes('..')) {
    throw new Error(`Invalid file path: ${path}`)
  }

  return normalized
}

export function getDefaultSubmitProfile(
  action: MobileShipAction,
  track: AndroidReleaseTrack
): string {
  if (action === 'testflight') return 'testflight'
  if (action === 'appstore-connect') return 'appstore'
  return `android-${track}`
}

export function mergeEasJson(
  existingContent: string | null,
  options: {
    action: MobileShipAction
    buildProfile: string
    submitProfile: string
    track: AndroidReleaseTrack
  }
): string {
  let base: Record<string, unknown> = {}
  if (existingContent) {
    try {
      base = JSON.parse(existingContent) as Record<string, unknown>
    } catch {
      // If eas.json is malformed, replace with a valid config.
      base = {}
    }
  }

  const cliSection = (base.cli as Record<string, unknown> | undefined) || {}
  const buildSection = (base.build as Record<string, unknown> | undefined) || {}
  const submitSection = (base.submit as Record<string, unknown> | undefined) || {}

  if (!buildSection.production || typeof buildSection.production !== 'object') {
    buildSection.production = { autoIncrement: true }
  }

  if (!buildSection.preview || typeof buildSection.preview !== 'object') {
    buildSection.preview = { distribution: 'internal' }
  }

  if (!buildSection[options.buildProfile] || typeof buildSection[options.buildProfile] !== 'object') {
    buildSection[options.buildProfile] = { autoIncrement: true }
  }

  const submitProfile = (submitSection[options.submitProfile] as Record<string, unknown> | undefined) || {}

  if (options.action === 'android') {
    const androidSubmit = (submitProfile.android as Record<string, unknown> | undefined) || {}
    androidSubmit.track = options.track
    if (options.track !== 'production') {
      androidSubmit.releaseStatus = 'draft'
    }
    submitProfile.android = androidSubmit
  } else {
    submitProfile.ios = (submitProfile.ios as Record<string, unknown> | undefined) || {}
  }

  submitSection[options.submitProfile] = submitProfile

  // Keep convenient defaults available even if the caller used custom profiles.
  if (!submitSection.testflight || typeof submitSection.testflight !== 'object') {
    submitSection.testflight = { ios: {} }
  }
  if (!submitSection.appstore || typeof submitSection.appstore !== 'object') {
    submitSection.appstore = { ios: {} }
  }
  if (!submitSection['android-internal'] || typeof submitSection['android-internal'] !== 'object') {
    submitSection['android-internal'] = { android: { track: 'internal', releaseStatus: 'draft' } }
  }

  const nextConfig = {
    ...base,
    cli: {
      version: '>= 10.0.0',
      ...cliSection,
    },
    build: buildSection,
    submit: submitSection,
  }

  return `${JSON.stringify(nextConfig, null, 2)}\n`
}

export function buildMobilePipelinePlan(input: {
  action: MobileShipAction
  buildProfile: string
  submitProfile: string
  wait: boolean
  track: AndroidReleaseTrack
}): MobilePipelinePlan {
  const { action, buildProfile, submitProfile, wait, track } = input

  if (action === 'testflight' || action === 'appstore-connect') {
    return {
      action,
      command: 'build',
      args: [
        'build',
        '--platform', 'ios',
        '--profile', buildProfile,
        '--non-interactive',
        '--json',
        '--auto-submit-with-profile', submitProfile,
        ...(wait ? [] : ['--no-wait']),
      ],
      expectsBuildQueue: !wait,
      submitProfile,
    }
  }

  return {
    action,
    command: 'build',
    args: [
      'build',
      '--platform', 'android',
      '--profile', buildProfile,
      '--non-interactive',
      '--json',
      '--auto-submit-with-profile', submitProfile,
      ...(wait ? [] : ['--no-wait']),
    ],
    expectsBuildQueue: !wait,
    submitProfile,
    track,
  }
}

export function extractUrlsFromOutput(output: string): string[] {
  const matches = output.match(/https?:\/\/[^\s)]+/g)
  if (!matches) return []
  return Array.from(new Set(matches))
}

export function summarizeOperation(action: MobileShipAction, queued: boolean): string {
  if (action === 'testflight') {
    return queued
      ? 'iOS build queued. TestFlight upload will run automatically after build.'
      : 'iOS build and TestFlight submission completed.'
  }

  if (action === 'appstore-connect') {
    return queued
      ? 'iOS build queued. App Store Connect submission will run automatically after build.'
      : 'iOS build and App Store Connect submission completed.'
  }

  return queued
    ? 'Android build queued. Play Console submission will run automatically after build.'
    : 'Android build and Play Console submission completed.'
}

export function getOutputExcerpt(output: string, maxChars = 1400): string {
  if (output.length <= maxChars) return output
  return `${output.slice(0, maxChars)}…`
}
