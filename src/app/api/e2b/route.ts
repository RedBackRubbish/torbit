import { NextRequest, NextResponse } from 'next/server'
import fs from 'node:fs'
import path from 'node:path'
import { Sandbox } from 'e2b'
import {
  strictRateLimiter,
  e2bSyncRateLimiter,
  getClientIP,
  rateLimitResponse,
} from '@/lib/rate-limit'
import { getAuthenticatedUser } from '@/lib/supabase/auth'
import {
  createSandboxAccessToken,
  verifySandboxAccessToken,
} from '@/lib/e2b/sandbox-auth'

// ============================================================================
// E2B API Route - Server-side Sandbox Operations
// ============================================================================
// The E2B SDK requires Node.js and can't run in the browser.
// This API route handles all sandbox operations server-side.
// ============================================================================

// Store active sandboxes in memory (in production, use Redis)
const activeSandboxes = new Map<string, Sandbox>()
// Track sandbox owner (user_id) for access control
const sandboxOwners = new Map<string, string>()
// Track which sandboxes have Node.js installed
const nodeInstalledSandboxes = new Set<string>()
const persistedSandboxOwners = new Map<string, string>()

let persistedOwnersLoaded = false

const HIGH_THROUGHPUT_ACTIONS = new Set(['writeFile', 'readFile', 'makeDir', 'getHost'])

function resolveRateLimiterForAction(action: string) {
  if (HIGH_THROUGHPUT_ACTIONS.has(action)) {
    return e2bSyncRateLimiter
  }
  return strictRateLimiter
}

function getDataRoot(): string {
  const configured = process.env.TORBIT_DATA_DIR
  if (configured && configured.trim().length > 0) {
    return path.resolve(configured)
  }

  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.join('/tmp', 'torbit-data')
  }

  return path.join(process.cwd(), '.torbit-data')
}

function getSandboxOwnershipFilePath(): string {
  return path.join(getDataRoot(), 'sandboxes', 'ownership.json')
}

function loadPersistedSandboxOwners(): void {
  if (persistedOwnersLoaded) return
  persistedOwnersLoaded = true

  const filePath = getSandboxOwnershipFilePath()
  if (!fs.existsSync(filePath)) return

  try {
    const raw = fs.readFileSync(filePath, 'utf8')
    const parsed = JSON.parse(raw) as Record<string, string>
    for (const [sandboxId, ownerId] of Object.entries(parsed)) {
      if (typeof sandboxId === 'string' && typeof ownerId === 'string' && sandboxId && ownerId) {
        persistedSandboxOwners.set(sandboxId, ownerId)
      }
    }
  } catch (error) {
    console.warn('[E2B] Failed to load persisted sandbox ownership map:', error)
  }
}

function persistSandboxOwners(): void {
  loadPersistedSandboxOwners()

  try {
    const filePath = getSandboxOwnershipFilePath()
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    const serialized = Object.fromEntries(persistedSandboxOwners.entries())
    const tempPath = `${filePath}.tmp`
    fs.writeFileSync(tempPath, `${JSON.stringify(serialized, null, 2)}\n`, 'utf8')
    fs.renameSync(tempPath, filePath)
  } catch (error) {
    console.warn('[E2B] Failed to persist sandbox ownership map:', error)
  }
}

function registerSandboxOwner(sandboxId: string, userId: string): void {
  sandboxOwners.set(sandboxId, userId)
  persistedSandboxOwners.set(sandboxId, userId)
  persistSandboxOwners()
}

function removeSandboxOwner(sandboxId: string): void {
  sandboxOwners.delete(sandboxId)
  persistedSandboxOwners.delete(sandboxId)
  persistSandboxOwners()
}

async function getOwnedSandbox(
  sandboxId: unknown,
  userId: string,
  apiKey: string,
  sandboxAccessToken?: string
): Promise<{
  sandbox?: Sandbox
  error?: NextResponse
}> {
  if (!sandboxId || typeof sandboxId !== 'string') {
    return {
      error: NextResponse.json(
        { error: 'sandboxId is required', code: 'SANDBOX_ID_REQUIRED' },
        { status: 400 }
      ),
    }
  }

  loadPersistedSandboxOwners()

  let sandbox = activeSandboxes.get(sandboxId)
  let ownerId = sandboxOwners.get(sandboxId) || persistedSandboxOwners.get(sandboxId)
  const tokenPayload = sandboxAccessToken
    ? verifySandboxAccessToken(sandboxAccessToken)
    : null

  const tokenMatches =
    tokenPayload?.sandboxId === sandboxId &&
    tokenPayload?.userId === userId

  if (!ownerId && !tokenMatches) {
    return {
      error: NextResponse.json(
        {
          error: 'Forbidden: sandbox ownership could not be verified',
          code: 'SANDBOX_OWNERSHIP_UNVERIFIED',
        },
        { status: 403 }
      ),
    }
  }

  if (ownerId && ownerId !== userId && !tokenMatches) {
    return {
      error: NextResponse.json(
        {
          error: 'Forbidden: sandbox does not belong to current user',
          code: 'SANDBOX_ACCESS_DENIED',
        },
        { status: 403 }
      ),
    }
  }

  // If ownership came from token (or owner map is stale), refresh in-memory/persisted map.
  if (tokenMatches && ownerId !== userId) {
    registerSandboxOwner(sandboxId, userId)
    ownerId = userId
  } else if (!ownerId && tokenMatches) {
    registerSandboxOwner(sandboxId, userId)
    ownerId = userId
  }

  if (!sandbox) {
    try {
      // Recover sandbox handle across process restarts/cold starts.
      sandbox = await Sandbox.connect(sandboxId, { apiKey })
      activeSandboxes.set(sandboxId, sandbox)
      sandboxOwners.set(sandboxId, ownerId || userId)
      console.log(`♻️ Reconnected sandbox ${sandboxId.slice(0, 8)}...`)
    } catch {
      return {
        error: NextResponse.json(
          { error: 'Sandbox not found', code: 'SANDBOX_NOT_FOUND' },
          { status: 404 }
        ),
      }
    }
  }

  if (!sandbox) {
    return {
      error: NextResponse.json(
        { error: 'Sandbox not found', code: 'SANDBOX_NOT_FOUND' },
        { status: 404 }
      ),
    }
  }

  return { sandbox }
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>

  try {
    body = await request.json() as Record<string, unknown>
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body', code: 'INVALID_JSON_BODY' },
      { status: 400 }
    )
  }

  const action = typeof body.action === 'string' ? body.action : ''

  // ========================================================================
  // RATE LIMITING
  // ========================================================================
  const clientIP = getClientIP(request)
  const rateLimiter = resolveRateLimiterForAction(action)
  const rateLimitResult = await rateLimiter.check(`${clientIP}:${action || 'unknown'}`)

  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult)
  }

  // ========================================================================
  // AUTHENTICATION - Verify user is logged in
  // ========================================================================
  const user = await getAuthenticatedUser(request)
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized. Please log in.' },
      { status: 401 }
    )
  }

  try {
    const { action: _ignoredAction, sandboxId, ...rawParams } = body
    const params = rawParams as Record<string, any>
    const sandboxAccessToken = typeof params.sandboxAccessToken === 'string'
      ? params.sandboxAccessToken
      : undefined

    const apiKey = process.env.E2B_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        {
          error: 'E2B_API_KEY not configured',
          code: 'E2B_NOT_CONFIGURED',
        },
        { status: 503 }
      )
    }

    switch (action) {
      case 'create': {
        // Try different sandbox templates (E2B may have Node template)
        let sandbox
        try {
          // Try the 'base' template first - it includes Node 20
          sandbox = await Sandbox.create('base', {
            apiKey,
            timeoutMs: 5 * 60 * 1000,
          })
          console.log('✅ E2B sandbox created with base template')
        } catch (err) {
          console.error('❌ Failed to create sandbox:', err)
          throw err
        }

        activeSandboxes.set(sandbox.sandboxId, sandbox)
        registerSandboxOwner(sandbox.sandboxId, user.id)
        const accessToken = createSandboxAccessToken(sandbox.sandboxId, user.id)

        return NextResponse.json({
          sandboxId: sandbox.sandboxId,
          sandboxAccessToken: accessToken,
          success: true,
        })
      }

      case 'writeFile': {
        const owned = await getOwnedSandbox(sandboxId, user.id, apiKey, sandboxAccessToken)
        if (owned.error) return owned.error
        const sandbox = owned.sandbox as Sandbox

        await sandbox.files.write(params.path, params.content)
        return NextResponse.json({ success: true })
      }

      case 'readFile': {
        const owned = await getOwnedSandbox(sandboxId, user.id, apiKey, sandboxAccessToken)
        if (owned.error) return owned.error
        const sandbox = owned.sandbox as Sandbox

        const content = await sandbox.files.read(params.path)
        return NextResponse.json({ content, success: true })
      }

      case 'makeDir': {
        const owned = await getOwnedSandbox(sandboxId, user.id, apiKey, sandboxAccessToken)
        if (owned.error) return owned.error
        const sandbox = owned.sandbox as Sandbox

        await sandbox.files.makeDir(params.path)
        return NextResponse.json({ success: true })
      }

      case 'runCommand': {
        const owned = await getOwnedSandbox(sandboxId, user.id, apiKey, sandboxAccessToken)
        if (owned.error) return owned.error
        const sandbox = owned.sandbox as Sandbox

        const command = params.command as string

        // Install Node.js on-demand if running npm/node/npx commands
        const needsNode = command.startsWith('npm ') ||
                         command.startsWith('node ') ||
                         command.startsWith('npx ') ||
                         command.includes('vite')

        if (needsNode && !nodeInstalledSandboxes.has(sandbox.sandboxId)) {
          console.log('📦 Installing Node.js via prebuilt binary...')
          try {
            // Download Node.js prebuilt binary (more reliable than apt-get)
            const nodeVersion = '20.11.0'
            const downloadUrl = `https://nodejs.org/dist/v${nodeVersion}/node-v${nodeVersion}-linux-x64.tar.xz`

            // Download and extract Node.js
            const downloadCmd = `cd /tmp && curl -fsSL ${downloadUrl} -o node.tar.xz && tar -xf node.tar.xz`
            console.log('⏳ Downloading Node.js...')
            const dlResult = await sandbox.commands.run(downloadCmd, { timeoutMs: 60000 })
            if (dlResult.exitCode !== 0) {
              console.error('Download failed:', dlResult.stderr)
              throw new Error(`Download failed: ${dlResult.stderr}`)
            }

            // Move to /usr/local and add to PATH
            const installCmd = `cd /tmp/node-v${nodeVersion}-linux-x64 && cp -r bin/* /usr/local/bin/ && cp -r lib/* /usr/local/lib/ 2>/dev/null || true`
            console.log('⏳ Installing Node.js binaries...')
            await sandbox.commands.run(installCmd, { timeoutMs: 30000 })

            // Verify installation
            const verifyResult = await sandbox.commands.run('/usr/local/bin/node --version', { timeoutMs: 5000 })
            if (verifyResult.exitCode === 0) {
              nodeInstalledSandboxes.add(sandbox.sandboxId)
              console.log('✅ Node.js installed:', verifyResult.stdout.trim())
            } else {
              throw new Error('Node verification failed')
            }
          } catch (nodeErr) {
            console.error('⚠️ Node.js installation failed:', nodeErr)
            // Don't throw - try to run the command anyway
          }
        }

        // Use full path for npm/node commands if we installed Node
        let finalCommand = command
        if (nodeInstalledSandboxes.has(sandbox.sandboxId)) {
          if (command.startsWith('npm ')) {
            finalCommand = `/usr/local/bin/npm ${command.slice(4)}`
          } else if (command.startsWith('npx ')) {
            finalCommand = `/usr/local/bin/npx ${command.slice(4)}`
          } else if (command.startsWith('node ')) {
            finalCommand = `/usr/local/bin/node ${command.slice(5)}`
          }
        }

        const result = await sandbox.commands.run(finalCommand, {
          timeoutMs: params.timeoutMs || 120000,
        })

        return NextResponse.json({
          exitCode: result.exitCode,
          stdout: result.stdout,
          stderr: result.stderr,
          success: true,
        })
      }

      case 'getHost': {
        const owned = await getOwnedSandbox(sandboxId, user.id, apiKey, sandboxAccessToken)
        if (owned.error) return owned.error
        const sandbox = owned.sandbox as Sandbox

        const host = sandbox.getHost(params.port || 5173)
        return NextResponse.json({ host: `https://${host}`, success: true })
      }

      case 'kill': {
        const owned = await getOwnedSandbox(sandboxId, user.id, apiKey, sandboxAccessToken)
        if (owned.error) return owned.error
        const sandbox = owned.sandbox as Sandbox

        await Sandbox.kill(sandbox.sandboxId, { apiKey })
        activeSandboxes.delete(sandbox.sandboxId)
        removeSandboxOwner(sandbox.sandboxId)
        nodeInstalledSandboxes.delete(sandbox.sandboxId)

        return NextResponse.json({ success: true })
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('E2B API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
