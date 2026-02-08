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
// - Works with SvelteKit, Next.js 15+, Qwik, etc.
//
// ⚠️ INVARIANT: All generated apps use SvelteKit 2.x + DaisyUI
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
      
      // Ensure SvelteKit config files
      await ensureSvelteKitFiles(sandboxId, files, addLog)
      
      addLog('✅ Files synced', 'success')
      
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sync failed'
      addLog(`❌ Sync error: ${msg}`, 'error')
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
      try {
        addLog('🔄 Starting build process...', 'info')
        
        // Sync files
        await syncFilesToSandbox()
        
        // Install dependencies
        addLog('📦 Installing dependencies (npm install)...', 'info')
        const installResult = await runCommand('npm install', [], 90000)
        
        if (installResult.exitCode !== 0) {
          addLog('⚠️ npm install had issues, attempting to continue...', 'warning')
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
        addLog('🚀 Starting Vite dev server...', 'info')
        
        // Run dev server in background (don't await)
        e2bApi('runCommand', { 
          sandboxId, 
          command: 'npm run dev -- --host 0.0.0.0',
          timeoutMs: 300000,
        }).catch(console.error)
        
        // Wait a bit for server to start, then get URL
        await new Promise(resolve => setTimeout(resolve, 5000))
        
        const hostResult = await e2bApi('getHost', { sandboxId, port: 5173 })
        if (hostResult.host) {
          setServerUrl(hostResult.host)
          addLog(`✅ Preview ready: ${hostResult.host}`, 'success')
        }
        
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Build failed'
        addLog(`❌ Build error: ${msg}`, 'error')
        
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
// Helper: Ensure essential SvelteKit files exist
// ============================================================================
async function ensureSvelteKitFiles(
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
    addLog('📄 Adding base layout...', 'info')
    await e2bApi('writeFile', { 
      sandboxId, 
      path: 'src/routes/+layout.svelte', 
      content: `<script>
  import '../app.css';
</script>

<slot />
` 
    })
  }
  
  if (!hasPage) {
    addLog('📄 Adding base page...', 'info')
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
    <button class="btn btn-primary mt-8">Get Started</button>
  </div>
</main>
` 
    })
  }
  
  await e2bApi('writeFile', { 
    sandboxId, 
    path: 'src/app.css', 
    content: `@tailwind base;
@tailwind components;
@tailwind utilities;
` 
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
` 
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
` 
    })
  }
  
  if (!hasTailwindConfig) {
    await e2bApi('writeFile', { 
      sandboxId, 
      path: 'tailwind.config.js', 
      content: `/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {},
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: ['dark', 'light', 'cupcake', 'cyberpunk', 'synthwave'],
    darkTheme: 'dark',
  },
}
` 
    })
  }
  
  await e2bApi('writeFile', { 
    sandboxId, 
    path: 'postcss.config.js', 
    content: `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
` 
  })
  
  // Ensure package.json has correct dependencies
  const pkgFile = files.find(f => f.path === 'package.json' || f.path === '/package.json')
  if (pkgFile) {
    try {
      const pkg = JSON.parse(pkgFile.content)
      let needsUpdate = false
      
      if (!pkg.dependencies) pkg.dependencies = {}
      if (!pkg.devDependencies) pkg.devDependencies = {}
      
      const requiredDevDeps: Record<string, string> = {
        '@sveltejs/kit': '^2.0.0',
        '@sveltejs/adapter-auto': '^3.0.0',
        svelte: '^4.2.0',
        vite: '^5.0.0',
        '@sveltejs/vite-plugin-svelte': '^3.0.0',
        tailwindcss: '^3.4.0',
        postcss: '^8.4.0',
        autoprefixer: '^10.4.0',
        daisyui: '^4.0.0',
        typescript: '^5.0.0',
      }
      
      for (const [dep, version] of Object.entries(requiredDevDeps)) {
        if (!pkg.devDependencies[dep]) {
          pkg.devDependencies[dep] = version
          needsUpdate = true
        }
      }
      
      if (!pkg.scripts) pkg.scripts = {}
      if (!pkg.scripts.dev) { pkg.scripts.dev = 'vite dev'; needsUpdate = true }
      if (!pkg.scripts.build) { pkg.scripts.build = 'vite build'; needsUpdate = true }
      if (!pkg.scripts.preview) { pkg.scripts.preview = 'vite preview'; needsUpdate = true }
      
      if (needsUpdate) {
        await e2bApi('writeFile', { 
          sandboxId, 
          path: 'package.json', 
          content: JSON.stringify(pkg, null, 2) 
        })
        addLog('📦 Updated package.json with SvelteKit + DaisyUI deps', 'info')
      }
    } catch (e) {
      console.error('❌ Error parsing package.json:', e)
    }
  }
}
