import { promises as fs } from 'node:fs'
import { spawn } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'
import {
  buildMobilePipelinePlan,
  extractUrlsFromOutput,
  getDefaultSubmitProfile,
  getOutputExcerpt,
  mergeEasJson,
  normalizeMobileFilePath,
  summarizeOperation,
  type AndroidReleaseTrack,
  type MobileShipRequest,
} from '@/lib/mobile/pipeline'

const MAX_FILES = 2000
const MAX_TOTAL_FILE_BYTES = 8 * 1024 * 1024 // 8 MB

interface CommandResult {
  code: number
  stdout: string
  stderr: string
}

export interface MobilePipelineDiagnostics {
  expoTokenConfigured: boolean
  appleAppSpecificPasswordConfigured: boolean
  appleApiKeyConfigured: boolean
  iosSubmitAuthConfigured: boolean
  googleServiceAccountConfigured: boolean
  warnings: string[]
}

export interface MobileShipExecutionResult {
  success: true
  action: MobileShipRequest['action']
  projectName: string
  queued: boolean
  submitProfile: string
  androidTrack?: AndroidReleaseTrack
  message: string
  links: string[]
  output: string
}

export class MobileShipExecutionError extends Error {
  status: number
  details?: string

  constructor(message: string, options?: { status?: number; details?: string }) {
    super(message)
    this.name = 'MobileShipExecutionError'
    this.status = options?.status || 500
    this.details = options?.details
  }
}

function isConfigured(value: string | undefined): boolean {
  return Boolean(value && value.trim().length > 0)
}

export function getMobilePipelineDiagnostics(): MobilePipelineDiagnostics {
  const expoTokenConfigured = isConfigured(process.env.EXPO_TOKEN)
  const appleAppSpecificPasswordConfigured = isConfigured(process.env.APPLE_APP_SPECIFIC_PASSWORD)
    || isConfigured(process.env.EXPO_APPLE_APP_SPECIFIC_PASSWORD)
  const appleApiKeyConfigured = (
    isConfigured(process.env.ASC_API_KEY_PATH) || isConfigured(process.env.EXPO_ASC_API_KEY_PATH)
  ) && (
    isConfigured(process.env.ASC_API_KEY_ID) || isConfigured(process.env.EXPO_ASC_API_KEY_ID)
  ) && (
    isConfigured(process.env.ASC_API_KEY_ISSUER_ID) || isConfigured(process.env.EXPO_ASC_API_KEY_ISSUER_ID)
  )
  const googleServiceAccountConfigured = isConfigured(process.env.GOOGLE_SERVICE_ACCOUNT_JSON)
    || isConfigured(process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH)
    || isConfigured(process.env.EXPO_ANDROID_SERVICE_ACCOUNT_KEY_PATH)

  const diagnostics: MobilePipelineDiagnostics = {
    expoTokenConfigured,
    appleAppSpecificPasswordConfigured,
    appleApiKeyConfigured,
    iosSubmitAuthConfigured: appleAppSpecificPasswordConfigured || appleApiKeyConfigured,
    googleServiceAccountConfigured,
    warnings: [],
  }

  if (!expoTokenConfigured) {
    diagnostics.warnings.push('EXPO_TOKEN is missing. Remote mobile pipeline actions will fail.')
  }

  if (!diagnostics.iosSubmitAuthConfigured) {
    diagnostics.warnings.push('Apple submit credentials were not detected. iOS auto-submit may require interactive login.')
  }

  if (!googleServiceAccountConfigured) {
    diagnostics.warnings.push('Google service account credentials were not detected. Android auto-submit may fail.')
  }

  return diagnostics
}

function getNpxBinary(): string {
  return process.platform === 'win32' ? 'npx.cmd' : 'npx'
}

function runCommand(
  args: string[],
  options: {
    cwd: string
    env: NodeJS.ProcessEnv
    timeoutMs?: number
  }
): Promise<CommandResult> {
  const timeoutMs = options.timeoutMs ?? 240_000

  return new Promise((resolve, reject) => {
    const child = spawn(getNpxBinary(), ['--yes', 'eas-cli@latest', ...args], {
      cwd: options.cwd,
      env: options.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''
    let timeout: ReturnType<typeof setTimeout> | undefined

    if (timeoutMs > 0) {
      timeout = setTimeout(() => {
        child.kill('SIGTERM')
      }, timeoutMs)
    }

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString()
    })

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })

    child.on('error', (error) => {
      if (timeout) clearTimeout(timeout)
      reject(error)
    })

    child.on('close', (code) => {
      if (timeout) clearTimeout(timeout)
      resolve({
        code: code ?? 1,
        stdout,
        stderr,
      })
    })
  })
}

function hasFile(files: Array<{ path: string }>, target: string): boolean {
  return files.some((file) => file.path === target)
}

function getTotalFileBytes(files: Array<{ content: string }>): number {
  return files.reduce((sum, file) => sum + Buffer.byteLength(file.content, 'utf8'), 0)
}

async function writeProjectFiles(
  targetDirectory: string,
  files: Array<{ path: string; content: string }>
): Promise<void> {
  await Promise.all(files.map(async (file) => {
    const absolutePath = path.join(targetDirectory, file.path)
    await fs.mkdir(path.dirname(absolutePath), { recursive: true })
    await fs.writeFile(absolutePath, file.content, 'utf8')
  }))
}

async function ensureEasConfig(
  targetDirectory: string,
  options: {
    action: 'testflight' | 'appstore-connect' | 'android'
    buildProfile: string
    submitProfile: string
    track: AndroidReleaseTrack
  }
): Promise<void> {
  const easPath = path.join(targetDirectory, 'eas.json')
  let existingContent: string | null = null

  try {
    existingContent = await fs.readFile(easPath, 'utf8')
  } catch {
    existingContent = null
  }

  const merged = mergeEasJson(existingContent, options)
  await fs.writeFile(easPath, merged, 'utf8')
}

export async function executeMobileShip(payload: MobileShipRequest): Promise<MobileShipExecutionResult> {
  const expoToken = process.env.EXPO_TOKEN
  if (!expoToken) {
    throw new MobileShipExecutionError('EXPO_TOKEN is not configured on the server.', { status: 500 })
  }

  if (payload.files.length > MAX_FILES) {
    throw new MobileShipExecutionError(`Too many files. Maximum allowed is ${MAX_FILES}.`, { status: 400 })
  }

  const totalBytes = getTotalFileBytes(payload.files)
  if (totalBytes > MAX_TOTAL_FILE_BYTES) {
    throw new MobileShipExecutionError(`Payload too large. Maximum is ${MAX_TOTAL_FILE_BYTES} bytes.`, { status: 400 })
  }

  const normalizedFiles = payload.files.map((file) => ({
    path: normalizeMobileFilePath(file.path),
    content: file.content,
  }))

  if (!hasFile(normalizedFiles, 'package.json')) {
    throw new MobileShipExecutionError('package.json is required to run mobile builds.', { status: 400 })
  }

  const projectName = (payload.projectName || 'Torbit Mobile Project').trim()
  const track = payload.androidTrack || 'internal'
  const buildProfile = (payload.buildProfile || 'production').trim()
  const submitProfile = (payload.submitProfile || getDefaultSubmitProfile(payload.action, track)).trim()

  let temporaryDirectory: string | null = null

  try {
    temporaryDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'torbit-mobile-'))
    await writeProjectFiles(temporaryDirectory, normalizedFiles)
    await ensureEasConfig(temporaryDirectory, {
      action: payload.action,
      buildProfile,
      submitProfile,
      track,
    })

    const plan = buildMobilePipelinePlan({
      action: payload.action,
      buildProfile,
      submitProfile,
      wait: payload.wait,
      track,
    })

    const commandResult = await runCommand(plan.args, {
      cwd: temporaryDirectory,
      env: {
        ...process.env,
        EXPO_TOKEN: expoToken,
        CI: '1',
        FORCE_COLOR: '0',
      },
      timeoutMs: payload.wait ? 600_000 : 240_000,
    })

    const combinedOutput = `${commandResult.stdout}\n${commandResult.stderr}`.trim()
    if (commandResult.code !== 0) {
      throw new MobileShipExecutionError(
        `Mobile pipeline command failed (${commandResult.code}).`,
        { status: 500, details: getOutputExcerpt(combinedOutput) }
      )
    }

    const links = extractUrlsFromOutput(combinedOutput)

    return {
      success: true,
      action: payload.action,
      projectName,
      queued: plan.expectsBuildQueue,
      submitProfile: plan.submitProfile,
      androidTrack: payload.action === 'android' ? track : undefined,
      message: summarizeOperation(payload.action, plan.expectsBuildQueue),
      links,
      output: getOutputExcerpt(combinedOutput),
    }
  } finally {
    if (temporaryDirectory) {
      try {
        await fs.rm(temporaryDirectory, { recursive: true, force: true })
      } catch {
        // Best effort cleanup.
      }
    }
  }
}
