import { NextRequest, NextResponse } from 'next/server'
import { Sandbox } from 'e2b'

// ============================================================================
// E2B API Route - Server-side Sandbox Operations
// ============================================================================
// The E2B SDK requires Node.js and can't run in the browser.
// This API route handles all sandbox operations server-side.
// ============================================================================

// Store active sandboxes in memory (in production, use Redis)
const activeSandboxes = new Map<string, Sandbox>()
// Track which sandboxes have Node.js installed
const nodeInstalledSandboxes = new Set<string>()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, sandboxId, ...params } = body
    
    const apiKey = process.env.E2B_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'E2B_API_KEY not configured' },
        { status: 500 }
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
        
        return NextResponse.json({
          sandboxId: sandbox.sandboxId,
          success: true,
        })
      }

      case 'writeFile': {
        const sandbox = activeSandboxes.get(sandboxId)
        if (!sandbox) {
          return NextResponse.json(
            { error: 'Sandbox not found' },
            { status: 404 }
          )
        }
        
        await sandbox.files.write(params.path, params.content)
        return NextResponse.json({ success: true })
      }

      case 'readFile': {
        const sandbox = activeSandboxes.get(sandboxId)
        if (!sandbox) {
          return NextResponse.json(
            { error: 'Sandbox not found' },
            { status: 404 }
          )
        }
        
        const content = await sandbox.files.read(params.path)
        return NextResponse.json({ content, success: true })
      }

      case 'makeDir': {
        const sandbox = activeSandboxes.get(sandboxId)
        if (!sandbox) {
          return NextResponse.json(
            { error: 'Sandbox not found' },
            { status: 404 }
          )
        }
        
        await sandbox.files.makeDir(params.path)
        return NextResponse.json({ success: true })
      }

      case 'runCommand': {
        const sandbox = activeSandboxes.get(sandboxId)
        if (!sandbox) {
          return NextResponse.json(
            { error: 'Sandbox not found' },
            { status: 404 }
          )
        }
        
        const command = params.command as string
        
        // Install Node.js on-demand if running npm/node/npx commands
        const needsNode = command.startsWith('npm ') || 
                         command.startsWith('node ') || 
                         command.startsWith('npx ') ||
                         command.includes('vite')
        
        if (needsNode && !nodeInstalledSandboxes.has(sandboxId)) {
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
              nodeInstalledSandboxes.add(sandboxId)
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
        if (nodeInstalledSandboxes.has(sandboxId)) {
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
        const sandbox = activeSandboxes.get(sandboxId)
        if (!sandbox) {
          return NextResponse.json(
            { error: 'Sandbox not found' },
            { status: 404 }
          )
        }
        
        const host = sandbox.getHost(params.port || 5173)
        return NextResponse.json({ host: `https://${host}`, success: true })
      }

      case 'kill': {
        const sandbox = activeSandboxes.get(sandboxId)
        if (sandbox) {
          await Sandbox.kill(sandboxId, { apiKey })
          activeSandboxes.delete(sandboxId)
        }
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
