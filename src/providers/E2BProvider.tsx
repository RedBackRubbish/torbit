'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react'
import { useTerminalStore, type LogType } from '@/store/terminal'
import { useBuilderStore } from '@/store/builder'
import { NervousSystem } from '@/lib/nervous-system'
import { getSupabase } from '@/lib/supabase/client'

// ============================================================================
// E2B Sandbox Context (Client-Side)
// ============================================================================
// Provides a shared E2B cloud sandbox instance across the entire app.
// Communicates with /api/e2b route for actual sandbox operations.
//
// E2B Benefits:
// - Real Linux environment (not an emulation)
// - Persistent sessions up to 24 hours
// - No browser security restrictions (SharedArrayBuffer, etc.)
// - Faster npm installs via caching
// - Works with Next.js, Vite, and SvelteKit templates.
//
// ⚠️ INVARIANT: Runtime command and health port must match generated stack.
// ============================================================================

// Verification metadata for audit trail
export interface VerificationMetadata {
  environmentVerifiedAt: number | null
  runtimeVersion: string | null
  sandboxId: string | null
  dependenciesLockedAt: number | null
  dependencyCount: number
  lockfileHash: string | null
}

interface E2BContextValue {
  // State
  sandboxId: string | null
  isBooting: boolean
  isReady: boolean
  serverUrl: string | null
  error: string | null
  
  // Verification metadata
  verification: VerificationMetadata
  
  // Operations
  writeFile: (path: string, content: string) => Promise<void>
  readFile: (path: string) => Promise<string | null>
  runCommand: (cmd: string, args?: string[], timeoutMs?: number) => Promise<{ exitCode: number; stdout: string; stderr: string }>
  syncFilesToSandbox: () => Promise<void>
  killSandbox: () => Promise<void>
}

const E2BContext = createContext<E2BContextValue | null>(null)

// Module-level flag to prevent duplicate boot logs in Strict Mode
let hasLoggedBoot = false
const RUNTIME_STARTUP_TIMEOUT_MS = 45000

interface RuntimeProfile {
  framework: 'nextjs' | 'vite'
  command: string
  port: number
}

class E2BApiError extends Error {
  code?: string
  status: number

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'E2BApiError'
    this.status = status
    this.code = code
  }
}

// Simple hash generator for verification (deterministic)
function generateHash(input: string): string {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(16).padStart(16, '0')
}

export function resolveRuntimeProfile(files: Array<{ path: string; content: string }>): RuntimeProfile {
  const packageFile = files.find((file) => file.path === 'package.json' || file.path === '/package.json')
  if (!packageFile) {
    return {
      framework: 'nextjs',
      command: 'npm run dev -- --hostname 0.0.0.0 --port 3000',
      port: 3000,
    }
  }

  try {
    const pkg = JSON.parse(packageFile.content) as {
      scripts?: Record<string, string>
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
    }

    const deps = {
      ...(pkg.dependencies || {}),
      ...(pkg.devDependencies || {}),
    }

    const devScript = (pkg.scripts?.dev || '').toLowerCase()
    const hasNext = Boolean(deps.next) || devScript.includes('next')
    const hasVite = Boolean(deps.vite) || devScript.includes('vite')

    if (!hasNext && hasVite) {
      return {
        framework: 'vite',
        command: 'npm run dev -- --host 0.0.0.0 --port 5173',
        port: 5173,
      }
    }

    return {
      framework: 'nextjs',
      command: 'npm run dev -- --hostname 0.0.0.0 --port 3000',
      port: 3000,
    }
  } catch {
    return {
      framework: 'nextjs',
      command: 'npm run dev -- --hostname 0.0.0.0 --port 3000',
      port: 3000,
    }
  }
}

export function useE2BContext() {
  const context = useContext(E2BContext)
  if (!context) {
    throw new Error('useE2BContext must be used within E2BProvider')
  }
  return context
}

// API helper for E2B operations
async function e2bApi(action: string, params: Record<string, unknown> = {}) {
  const headers: HeadersInit = { 'Content-Type': 'application/json' }
  const supabase = getSupabase()
  if (supabase) {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`
    }
  }

  const response = await fetch('/api/e2b', {
    method: 'POST',
    headers,
    body: JSON.stringify({ action, ...params }),
  })
  
  if (!response.ok) {
    let message = 'E2B API error'
    let code: string | undefined

    try {
      const error = await response.json() as { error?: string; code?: string }
      message = error.error || message
      code = error.code
    } catch {
      // Response body may be empty/non-JSON
    }

    throw new E2BApiError(message, response.status, code)
  }
  
  return response.json()
}

interface E2BProviderProps {
  children: ReactNode
}

export function E2BProvider({ children }: E2BProviderProps) {
  const [sandboxId, setSandboxId] = useState<string | null>(null)
  const [isBooting, setIsBooting] = useState(true)
  const [isReady, setIsReady] = useState(false)
  const [serverUrl, setServerUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const [verification, setVerification] = useState<VerificationMetadata>({
    environmentVerifiedAt: null,
    runtimeVersion: null,
    sandboxId: null,
    dependenciesLockedAt: null,
    dependencyCount: 0,
    lockfileHash: null,
  })
  
  const { addLog, addCommand, setRunning, setExitCode } = useTerminalStore()
  const { files, isGenerating } = useBuilderStore()
  
  // Track build state across renders
  const hasStartedBuildRef = useRef(false)
  const lastFilesHashRef = useRef<string>('')
  const wasGeneratingRef = useRef(false)
  
  // Reset build state when new generation starts
  useEffect(() => {
    if (isGenerating && !wasGeneratingRef.current) {
      // New generation starting - reset build state
      hasStartedBuildRef.current = false
      setServerUrl(null)
      setError(null)
    }
    wasGeneratingRef.current = isGenerating
  }, [isGenerating])
  
  // ==========================================================================
  // Boot E2B Sandbox
  // ==========================================================================
  useEffect(() => {
    let mounted = true
    
    async function bootSandbox() {
      // Prevent duplicate logging in Strict Mode
      if (!hasLoggedBoot) {
        addLog('🚀 Booting E2B cloud sandbox...', 'info')
        hasLoggedBoot = true
      }
      
      try {
        const result = await e2bApi('create')
        
        if (!mounted) return
        
        setSandboxId(result.sandboxId)
        setVerification(prev => ({
          ...prev,
          sandboxId: result.sandboxId,
          environmentVerifiedAt: Date.now(),
          runtimeVersion: 'E2B Linux',
        }))
        
        addLog(`✅ E2B sandbox ready: ${result.sandboxId.slice(0, 8)}...`, 'success')
        setIsBooting(false)
        setIsReady(true)
        
      } catch (err) {
        if (!mounted) return
        const msg = err instanceof Error ? err.message : 'Unknown error'
        const errorCode = err instanceof E2BApiError ? err.code : undefined

        if (errorCode === 'E2B_NOT_CONFIGURED') {
          addLog('ℹ️ Live preview disabled: E2B_API_KEY is not configured', 'warning')
          setError('Live preview is disabled for this deployment.')
          setIsBooting(false)
          setIsReady(false)
          return
        }

        console.error('❌ E2B boot failed:', msg)
        addLog(`❌ E2B boot failed: ${msg}`, 'error')
        setError(msg)
        setIsBooting(false)
        
        NervousSystem.dispatchPain({
          id: `e2b-boot-${Date.now()}`,
          type: 'BUILD_ERROR',
          severity: 'critical',
          message: `E2B sandbox failed to boot: ${msg}`,
          context: 'E2BProvider boot',
          timestamp: Date.now(),
        })
      }
    }
    
    bootSandbox()
    
    return () => {
      mounted = false
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Separate cleanup effect that tracks sandboxId via ref
  const sandboxIdRef = useRef<string | null>(null)
  useEffect(() => {
    sandboxIdRef.current = sandboxId
  }, [sandboxId])

  useEffect(() => {
    return () => {
      // Use ref to capture current sandboxId at cleanup time
      if (sandboxIdRef.current) {
        e2bApi('kill', { sandboxId: sandboxIdRef.current }).catch(console.error)
      }
    }
  }, [])
  
  // ==========================================================================
  // File Operations
  // ==========================================================================
  const writeFile = useCallback(async (path: string, content: string) => {
    if (!sandboxId) throw new Error('Sandbox not ready')
    await e2bApi('writeFile', { sandboxId, path, content })
  }, [sandboxId])
  
  const readFile = useCallback(async (path: string): Promise<string | null> => {
    if (!sandboxId) return null
    try {
      const result = await e2bApi('readFile', { sandboxId, path })
      return result.content
    } catch {
      return null
    }
  }, [sandboxId])
  
  // ==========================================================================
  // Command Execution
  // ==========================================================================
  const runCommand = useCallback(async (
    cmd: string,
    args: string[] = [],
    timeoutMs: number = 120000
  ): Promise<{ exitCode: number; stdout: string; stderr: string }> => {
    if (!sandboxId) throw new Error('Sandbox not ready')
    
    const fullCommand = args.length > 0 ? `${cmd} ${args.join(' ')}` : cmd
    addCommand(fullCommand)
    setRunning(true)
    
    try {
      const result = await e2bApi('runCommand', {
        sandboxId,
        command: fullCommand,
        timeoutMs,
      })
      
      setRunning(false)
      setExitCode(result.exitCode)
      
      if (result.stdout) addLog(result.stdout, 'info')
      if (result.stderr) addLog(result.stderr, result.exitCode === 0 ? 'warning' : 'error')
      
      return result
    } catch (err) {
      setRunning(false)
      setExitCode(1)
      const msg = err instanceof Error ? err.message : 'Command failed'
      addLog(msg, 'error')
      return { exitCode: 1, stdout: '', stderr: msg }
    }
  }, [sandboxId, addCommand, addLog, setRunning, setExitCode])
  
  // ==========================================================================
  // Sync Files to Sandbox
  // ==========================================================================
  const syncFilesToSandbox = useCallback(async () => {
    if (!sandboxId || files.length === 0) return
    
    addLog(`📦 Syncing ${files.length} files to sandbox...`, 'info')
    
    try {
      // Create directories first
      const dirs = new Set<string>()
      for (const file of files) {
        const parts = file.path.split('/')
        for (let i = 1; i < parts.length; i++) {
          dirs.add(parts.slice(0, i).join('/'))
        }
      }
      
      for (const dir of Array.from(dirs).sort()) {
        if (dir) {
          await e2bApi('makeDir', { sandboxId, path: dir })
        }
      }
      
      // Write all files
      for (const file of files) {
        const path = file.path.startsWith('/') ? file.path.slice(1) : file.path
        await e2bApi('writeFile', { sandboxId, path, content: file.content })
      }
      
      // Ensure baseline files for the detected framework.
      await ensureFrameworkFiles(sandboxId, files, addLog)
      
      addLog('✅ Files synced', 'success')
      
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sync failed'
      addLog(`❌ Sync error: ${msg}`, 'error')
      throw new Error(msg)
    }
  }, [sandboxId, files, addLog])
  
  // ==========================================================================
  // Kill Sandbox
  // ==========================================================================
  const killSandbox = useCallback(async () => {
    if (!sandboxId) return
    try {
      await e2bApi('kill', { sandboxId })
      setSandboxId(null)
      setIsReady(false)
      setServerUrl(null)
      addLog('🛑 Sandbox killed', 'info')
    } catch (err) {
      console.error('Kill sandbox error:', err)
    }
  }, [sandboxId, addLog])
  
  // ==========================================================================
  // Auto-build when files change (after generation completes)
  // ==========================================================================
  useEffect(() => {
    if (!sandboxId || !isReady || isGenerating) return
    if (files.length === 0) return
    if (hasStartedBuildRef.current) return
    
    // Check if we have a package.json
    const hasPackageJson = files.some(f => 
      f.path === 'package.json' || f.path === '/package.json'
    )
    if (!hasPackageJson) return
    
    // Calculate files hash to detect actual changes
    const filesHash = files.map(f => `${f.path}:${f.content.length}`).join('|')
    if (filesHash === lastFilesHashRef.current) return
    lastFilesHashRef.current = filesHash
    
    hasStartedBuildRef.current = true
    
    // Run build process
    ;(async () => {
      const buildStart = Date.now()
      try {
        const runtimeProfile = resolveRuntimeProfile(files)
        setError(null)
        setServerUrl(null)
        addLog('🔄 Starting build process...', 'info')
        
        // Sync files
        await syncFilesToSandbox()
        
        // Install dependencies
        addLog('📦 Installing dependencies (npm install)...', 'info')
        const installResult = await runCommand('npm install', [], 90000)
        
        if (installResult.exitCode !== 0) {
          const installError = installResult.stderr || installResult.stdout || 'npm install failed'
          throw new Error(`Dependency install failed: ${installError.slice(0, 300)}`)
        }
        
        // Update verification
        const pkgFile = files.find(f => f.path.includes('package.json'))
        if (pkgFile) {
          try {
            const pkg = JSON.parse(pkgFile.content)
            const depCount = Object.keys(pkg.dependencies || {}).length + 
                           Object.keys(pkg.devDependencies || {}).length
            setVerification(prev => ({
              ...prev,
              dependenciesLockedAt: Date.now(),
              dependencyCount: depCount,
              lockfileHash: generateHash(pkgFile.content),
            }))
          } catch (e) {
            console.error('Error parsing package.json:', e)
          }
        }
        
        // Start dev server
        addLog(`🚀 Starting ${runtimeProfile.framework === 'nextjs' ? 'Next.js' : 'Vite'} dev server...`, 'info')
        
        // Run dev server in background and check for early failures
        const devServerPromise = e2bApi('runCommand', {
          sandboxId, 
          command: runtimeProfile.command,
          timeoutMs: 300000,
        })

        const earlyExit = await Promise.race([
          devServerPromise
            .then((result) => ({ state: 'exited' as const, result }))
            .catch((err) => ({ state: 'failed' as const, error: err })),
          new Promise<{ state: 'running' }>((resolve) => setTimeout(() => resolve({ state: 'running' }), 7000)),
        ])

        if (earlyExit.state === 'exited') {
          const details = earlyExit.result.stderr || earlyExit.result.stdout || `exit code ${earlyExit.result.exitCode}`
          throw new Error(`Dev server exited early: ${details.slice(0, 300)}`)
        }

        if (earlyExit.state === 'failed') {
          const details = earlyExit.error instanceof Error ? earlyExit.error.message : 'unknown error'
          throw new Error(`Dev server failed to start: ${details}`)
        }

        // Poll for host availability
        let host: string | null = null
        let hostError: string | null = null

        while (!host && (Date.now() - buildStart) < RUNTIME_STARTUP_TIMEOUT_MS) {
          try {
            const hostResult = await e2bApi('getHost', { sandboxId, port: runtimeProfile.port })
            if (hostResult.host) {
              host = hostResult.host as string
              break
            }
          } catch (err) {
            hostError = err instanceof Error ? err.message : 'Host probe failed'
          }

          await new Promise(resolve => setTimeout(resolve, 1500))
        }

        if (host) {
          setServerUrl(host)
          addLog(`✅ Preview ready: ${host}`, 'success')
          return
        }

        throw new Error(
          hostError
            ? `Preview host not ready: ${hostError}`
            : 'Preview host did not become ready in time.'
        )
        
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Build failed'
        addLog(`❌ Build error: ${msg}`, 'error')
        setError(msg)
        setServerUrl(null)
        
        NervousSystem.dispatchPain({
          id: `e2b-build-${Date.now()}`,
          type: 'BUILD_ERROR',
          severity: 'critical',
          message: `Build failed: ${msg}`,
          context: 'E2BProvider build',
          timestamp: Date.now(),
        })
      }
    })()
  }, [sandboxId, isReady, isGenerating, files, syncFilesToSandbox, runCommand, addLog])
  
  // ==========================================================================
  // Context Value
  // ==========================================================================
  const value: E2BContextValue = {
    sandboxId,
    isBooting,
    isReady,
    serverUrl,
    error,
    verification,
    writeFile,
    readFile,
    runCommand,
    syncFilesToSandbox,
    killSandbox,
  }
  
  return (
    <E2BContext.Provider value={value}>
      {children}
    </E2BContext.Provider>
  )
}

// ============================================================================
// Framework Baseline Files
// ============================================================================
function normalizePath(value: string): string {
  return value.replace(/^\/+/, '')
}

function hasFile(files: Array<{ path: string; content: string }>, targetPath: string): boolean {
  const normalizedTarget = normalizePath(targetPath)
  return files.some((file) => normalizePath(file.path) === normalizedTarget)
}

async function ensureFrameworkFiles(
  sandboxId: string,
  files: Array<{ path: string; content: string }>,
  addLog: (message: string, type?: LogType) => void
) {
  const runtimeProfile = resolveRuntimeProfile(files)
  if (runtimeProfile.framework === 'nextjs') {
    await ensureNextJsFiles(sandboxId, files, addLog)
    return
  }

  await ensureSvelteKitFallbackFiles(sandboxId, files, addLog)
}

async function ensureNextJsFiles(
  sandboxId: string,
  files: Array<{ path: string; content: string }>,
  addLog: (message: string, type?: LogType) => void
) {
  const appRoot = hasFile(files, 'app/layout.tsx') || hasFile(files, 'app/page.tsx') ? 'app' : 'src/app'
  const hasLayout = hasFile(files, `${appRoot}/layout.tsx`)
  const hasPage = hasFile(files, `${appRoot}/page.tsx`)
  const hasGlobals = hasFile(files, `${appRoot}/globals.css`)
  const hasTailwindConfig = hasFile(files, 'tailwind.config.js') || hasFile(files, 'tailwind.config.ts')
  const hasPostcss = hasFile(files, 'postcss.config.js') || hasFile(files, 'postcss.config.mjs')

  await e2bApi('makeDir', { sandboxId, path: appRoot })

  if (!hasGlobals) {
    await e2bApi('writeFile', {
      sandboxId,
      path: `${appRoot}/globals.css`,
      content: `@tailwind base;
@tailwind components;
@tailwind utilities;
`,
    })
  }

  if (!hasLayout) {
    addLog('📄 Adding Next.js layout baseline...', 'info')
    await e2bApi('writeFile', {
      sandboxId,
      path: `${appRoot}/layout.tsx`,
      content: `import './globals.css'
import type { ReactNode } from 'react'

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
`,
    })
  }

  if (!hasPage) {
    addLog('📄 Adding Next.js page baseline...', 'info')
    await e2bApi('writeFile', {
      sandboxId,
      path: `${appRoot}/page.tsx`,
      content: `export default function HomePage() {
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
      <h1>Welcome to Torbit</h1>
    </main>
  )
}
`,
    })
  }

  if (!hasTailwindConfig) {
    await e2bApi('writeFile', {
      sandboxId,
      path: 'tailwind.config.ts',
      content: `/** @type {import('tailwindcss').Config} */
const config = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
}

export default config
`,
    })
  }

  if (!hasPostcss) {
    await e2bApi('writeFile', {
      sandboxId,
      path: 'postcss.config.mjs',
      content: `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
`,
    })
  }
}

async function ensureSvelteKitFallbackFiles(
  sandboxId: string,
  files: Array<{ path: string; content: string }>,
  addLog: (message: string, type?: LogType) => void
) {
  const hasLayout = files.some(f => f.path.includes('+layout.svelte'))
  const hasPage = files.some(f => f.path.includes('+page.svelte') && f.path.includes('routes'))
  const hasSvelteConfig = files.some(f => f.path.includes('svelte.config'))
  const hasViteConfig = files.some(f => f.path.includes('vite.config'))
  const hasTailwindConfig = files.some(f => f.path.includes('tailwind.config'))

  await e2bApi('makeDir', { sandboxId, path: 'src/routes' })

  if (!hasLayout) {
    addLog('📄 Adding SvelteKit layout baseline...', 'info')
    await e2bApi('writeFile', {
      sandboxId,
      path: 'src/routes/+layout.svelte',
      content: `<script>
  import '../app.css';
</script>

<slot />
`,
    })
  }

  if (!hasPage) {
    addLog('📄 Adding SvelteKit page baseline...', 'info')
    await e2bApi('writeFile', {
      sandboxId,
      path: 'src/routes/+page.svelte',
      content: `<script lang="ts">
  // SvelteKit + DaisyUI starter
</script>

<main class="min-h-screen bg-base-200 flex items-center justify-center">
  <div class="text-center">
    <h1 class="text-5xl font-bold text-primary mb-4">Welcome to Torbit</h1>
    <p class="text-base-content/70">Your app is loading...</p>
  </div>
</main>
`,
    })
  }

  await e2bApi('writeFile', {
    sandboxId,
    path: 'src/app.css',
    content: `@tailwind base;
@tailwind components;
@tailwind utilities;
`,
  })

  if (!hasSvelteConfig) {
    await e2bApi('writeFile', {
      sandboxId,
      path: 'svelte.config.js',
      content: `import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter()
  }
};

export default config;
`,
    })
  }

  if (!hasViteConfig) {
    await e2bApi('writeFile', {
      sandboxId,
      path: 'vite.config.ts',
      content: `import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()]
});
`,
    })
  }

  if (!hasTailwindConfig) {
    await e2bApi('writeFile', {
      sandboxId,
      path: 'tailwind.config.ts',
      content: `import daisyui from 'daisyui'

/** @type {import('tailwindcss').Config} */
const config = {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {},
  },
  plugins: [daisyui],
}

export default config
`,
    })
  }

  await e2bApi('writeFile', {
    sandboxId,
    path: 'postcss.config.mjs',
    content: `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
`,
  })
}
