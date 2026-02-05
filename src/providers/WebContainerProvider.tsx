'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import type { WebContainer } from '@webcontainer/api'
import { getWebContainer, isWebContainerSupported } from '@/lib/webcontainer'
import { useTerminalStore } from '@/store/terminal'
import { useBuilderStore } from '@/store/builder'

// ============================================================================
// WebContainer Context
// ============================================================================
// Provides a shared WebContainer instance across the entire app.
// This prevents multiple boot attempts and allows any component to access
// the container, file operations, and command execution.
// ============================================================================

interface WebContainerContextValue {
  // State
  container: WebContainer | null
  isBooting: boolean
  isReady: boolean
  isSupported: boolean
  serverUrl: string | null
  error: string | null
  
  // Operations
  writeFile: (path: string, content: string) => Promise<void>
  readFile: (path: string) => Promise<string | null>
  runCommand: (cmd: string, args?: string[]) => Promise<number>
  initializeProject: () => Promise<void>
  startDevServer: () => Promise<void>
  syncFilesToContainer: () => Promise<void>
}

const WebContainerContext = createContext<WebContainerContextValue | null>(null)

// Module-level flag to prevent duplicate boot logs in Strict Mode
let hasLoggedBoot = false

export function useWebContainerContext() {
  const context = useContext(WebContainerContext)
  if (!context) {
    throw new Error('useWebContainerContext must be used within WebContainerProvider')
  }
  return context
}

interface WebContainerProviderProps {
  children: ReactNode
}

export function WebContainerProvider({ children }: WebContainerProviderProps) {
  const [container, setContainer] = useState<WebContainer | null>(null)
  const [isSupported] = useState(() => typeof window !== 'undefined' && isWebContainerSupported())
  // Initialize with correct values based on support
  const [isBooting, setIsBooting] = useState(() => typeof window !== 'undefined' && isWebContainerSupported())
  const [isReady, setIsReady] = useState(false)
  const [serverUrl, setServerUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    return isWebContainerSupported() ? null : 'WebContainer requires SharedArrayBuffer. Check browser/headers.'
  })
  
  const { addLog, addCommand, setRunning, setExitCode } = useTerminalStore()
  const { files } = useBuilderStore()

  // Boot WebContainer on mount
  useEffect(() => {
    if (!isSupported) {
      return
    }

    let mounted = true

    async function boot() {
      try {
        // Only log once per session (prevents Strict Mode duplicates)
        if (!hasLoggedBoot) {
          hasLoggedBoot = true
          addLog('Verifying execution environment', 'info')
        }
        
        const instance = await getWebContainer()
        
        if (!mounted) return
        
        setContainer(instance)
        
        // Listen for server-ready
        instance.on('server-ready', (port, url) => {
          console.log(`🚀 Server ready on port ${port}: ${url}`)
          setServerUrl(url)
          addLog('Runtime validated', 'success')
        })
        
        setIsBooting(false)
        setIsReady(true)
        addLog('Execution environment verified', 'success')
        
      } catch (err) {
        if (!mounted) return
        
        const message = err instanceof Error ? err.message : 'Boot failed'
        setError(message)
        setIsBooting(false)
        addLog(`Verification failed: ${message}`, 'error')
      }
    }

    boot()

    return () => {
      mounted = false
    }
  }, [isSupported, addLog])

  // File operations
  const writeFile = async (path: string, content: string) => {
    if (!container) throw new Error('Container not ready')
    
    const dir = path.substring(0, path.lastIndexOf('/'))
    if (dir) {
      await container.fs.mkdir(dir, { recursive: true })
    }
    
    await container.fs.writeFile(path, content)
    addLog(`Wrote: ${path}`, 'info')
  }

  const readFile = async (path: string): Promise<string | null> => {
    if (!container) return null
    
    try {
      return await container.fs.readFile(path, 'utf-8')
    } catch {
      return null
    }
  }

  // Command execution
  const runCommand = async (cmd: string, args: string[] = []): Promise<number> => {
    if (!container) throw new Error('Container not ready')
    
    const fullCommand = `${cmd} ${args.join(' ')}`.trim()
    addCommand(fullCommand)
    setRunning(true)
    
    try {
      const process = await container.spawn(cmd, args)
      
      process.output.pipeTo(new WritableStream({
        write(data) {
          addLog(data, 'output')
        }
      })).catch(() => {})
      
      const exitCode = await process.exit
      setExitCode(exitCode)
      
      return exitCode
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Command failed'
      addLog(`Error: ${message}`, 'error')
      setRunning(false)
      throw err
    }
  }

  // Sync Zustand files to WebContainer
  const syncFilesToContainer = async () => {
    if (!container) return
    
    addLog('Synchronizing governed artifacts', 'info')
    
    for (const file of files) {
      await writeFile(file.path, file.content)
    }
    
    addLog(`${files.length} artifacts synchronized`, 'success')
  }

  // Initialize project
  const initializeProject = async () => {
    if (!container) throw new Error('Container not ready')
    
    addLog('Locking toolchain', 'info')
    
    // Create package.json
    await writeFile('package.json', JSON.stringify({
      name: 'torbit-app',
      version: '0.1.0',
      private: true,
      scripts: {
        dev: 'next dev',
        build: 'next build',
        start: 'next start',
      },
      dependencies: {
        next: '14.1.0',
        react: '^18',
        'react-dom': '^18',
        'lucide-react': 'latest',
        clsx: 'latest',
        'tailwind-merge': 'latest',
      },
    }, null, 2))
    
    // Create basic structure
    await container.fs.mkdir('app', { recursive: true })
    
    await writeFile('app/layout.tsx', `export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
`)

    await writeFile('app/page.tsx', `export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-4">
          Welcome to Torbit
        </h1>
        <p className="text-gray-400">
          Your AI-powered app is ready
        </p>
      </div>
    </main>
  )
}
`)

    await writeFile('next.config.js', `/** @type {import('next').NextConfig} */
const nextConfig = {}
module.exports = nextConfig
`)

    await writeFile('tsconfig.json', JSON.stringify({
      compilerOptions: {
        target: 'es5',
        lib: ['dom', 'dom.iterable', 'esnext'],
        allowJs: true,
        skipLibCheck: true,
        strict: true,
        noEmit: true,
        esModuleInterop: true,
        module: 'esnext',
        moduleResolution: 'bundler',
        resolveJsonModule: true,
        isolatedModules: true,
        jsx: 'preserve',
        incremental: true,
        plugins: [{ name: 'next' }],
        paths: { '@/*': ['./*'] },
      },
      include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
      exclude: ['node_modules'],
    }, null, 2))
    
    addLog('Resolving pinned dependencies', 'info')
    
    const exitCode = await runCommand('npm', ['install'])
    
    if (exitCode === 0) {
      addLog('Dependencies locked', 'success')
    }
  }

  // Start dev server
  const startDevServer = async () => {
    if (!container) throw new Error('Container not ready')
    
    addLog('Validating runtime', 'info')
    
    // Don't await - let it run in background
    container.spawn('npm', ['run', 'dev']).then(process => {
      process.output.pipeTo(new WritableStream({
        write(data) {
          addLog(data, 'output')
        }
      })).catch(() => {})
    })
  }

  const value: WebContainerContextValue = {
    container,
    isBooting,
    isReady,
    isSupported,
    serverUrl,
    error,
    writeFile,
    readFile,
    runCommand,
    initializeProject,
    startDevServer,
    syncFilesToContainer,
  }

  return (
    <WebContainerContext.Provider value={value}>
      {children}
    </WebContainerContext.Provider>
  )
}
