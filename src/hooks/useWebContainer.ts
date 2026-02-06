'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import type { WebContainer, WebContainerProcess } from '@webcontainer/api'
import { getWebContainer, isWebContainerSupported } from '@/lib/webcontainer'
import { useTerminalStore } from '@/store/terminal'

// ============================================================================
// useWebContainer Hook - The Interface to the Engine
// ============================================================================
// Exposes WebContainer functionality to React components.
// Handles booting, file operations, and command execution.
// ============================================================================

export interface UseWebContainerReturn {
  // State
  container: WebContainer | null
  isBooting: boolean
  isReady: boolean
  isSupported: boolean
  serverUrl: string | null
  error: string | null
  
  // File Operations (The Builder's Hands)
  writeFile: (path: string, content: string) => Promise<void>
  readFile: (path: string) => Promise<string | null>
  mkdir: (path: string) => Promise<void>
  readdir: (path: string) => Promise<string[]>
  rm: (path: string, options?: { recursive?: boolean }) => Promise<void>
  
  // Command Execution (The "Run" Button)
  runCommand: (cmd: string, args?: string[]) => Promise<number>
  spawnProcess: (cmd: string, args?: string[]) => Promise<WebContainerProcess>
  
  // Project Initialization
  initializeProject: (template?: 'nextjs' | 'react' | 'node') => Promise<void>
  
  // Server Management
  startDevServer: () => Promise<void>
  killProcess: (process: WebContainerProcess) => void
}

export function useWebContainer(): UseWebContainerReturn {
  const [container, setContainer] = useState<WebContainer | null>(null)
  const [isSupported] = useState(() => isWebContainerSupported())
  // Initialize with proper error state based on support
  const [isBooting, setIsBooting] = useState(() => isWebContainerSupported())
  const [isReady, setIsReady] = useState(false)
  const [serverUrl, setServerUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(() => 
    isWebContainerSupported() ? null : 'WebContainer not supported in this browser. Requires SharedArrayBuffer.'
  )
  
  const activeProcesses = useRef<WebContainerProcess[]>([])
  const { addLog, addCommand, setRunning, setExitCode } = useTerminalStore()

  // ========================================================================
  // Boot WebContainer on mount
  // ========================================================================
  useEffect(() => {
    if (!isSupported) {
      return
    }

    let mounted = true

    async function boot() {
      try {
        // Note: Logging handled by WebContainerProvider to avoid duplicates
        const instance = await getWebContainer()
        
        if (!mounted) return
        
        setContainer(instance)
        
        // Listen for server-ready events
        instance.on('server-ready', (port, url) => {
          console.log(`🚀 Server ready on port ${port}: ${url}`)
          setServerUrl(url)
        })
        
        // Listen for errors
        instance.on('error', (err) => {
          console.error('WebContainer error:', err)
        })
        
        setIsBooting(false)
        setIsReady(true)
        
      } catch (err) {
        if (!mounted) return
        
        const message = err instanceof Error ? err.message : 'Unknown error'
        setError(message)
        setIsBooting(false)
      }
    }

    boot()

    return () => {
      mounted = false
      // Kill any active processes on unmount
      activeProcesses.current.forEach(p => p.kill())
    }
  }, [isSupported])

  // ========================================================================
  // File Operations
  // ========================================================================
  
  const writeFile = useCallback(async (path: string, content: string) => {
    if (!container) throw new Error('Container not ready')
    
    // Ensure parent directory exists
    const dir = path.substring(0, path.lastIndexOf('/'))
    if (dir) {
      await container.fs.mkdir(dir, { recursive: true })
    }
    
    await container.fs.writeFile(path, content)
    addLog(`📝 Written: ${path}`, 'info')
  }, [container, addLog])

  const readFile = useCallback(async (path: string): Promise<string | null> => {
    if (!container) return null
    
    try {
      const content = await container.fs.readFile(path, 'utf-8')
      return content
    } catch {
      return null
    }
  }, [container])

  const mkdir = useCallback(async (path: string) => {
    if (!container) throw new Error('Container not ready')
    await container.fs.mkdir(path, { recursive: true })
  }, [container])

  const readdir = useCallback(async (path: string): Promise<string[]> => {
    if (!container) return []
    
    try {
      const entries = await container.fs.readdir(path)
      return entries
    } catch {
      return []
    }
  }, [container])

  const rm = useCallback(async (path: string, options?: { recursive?: boolean }) => {
    if (!container) throw new Error('Container not ready')
    await container.fs.rm(path, options)
    addLog(`🗑️ Deleted: ${path}`, 'info')
  }, [container, addLog])

  // ========================================================================
  // Command Execution
  // ========================================================================
  
  const spawnProcess = useCallback(async (
    cmd: string, 
    args: string[] = []
  ): Promise<WebContainerProcess> => {
    if (!container) throw new Error('Container not ready')
    
    const process = await container.spawn(cmd, args)
    activeProcesses.current.push(process)
    
    // Stream output to terminal
    process.output.pipeTo(new WritableStream({
      write(data) {
        addLog(data, 'output')
      }
    })).catch(() => {
      // Stream closed, that's fine
    })
    
    return process
  }, [container, addLog])

  const runCommand = useCallback(async (
    cmd: string, 
    args: string[] = []
  ): Promise<number> => {
    if (!container) throw new Error('Container not ready')
    
    const fullCommand = `${cmd} ${args.join(' ')}`.trim()
    addCommand(fullCommand)
    setRunning(true)
    
    try {
      const process = await spawnProcess(cmd, args)
      const exitCode = await process.exit
      
      setExitCode(exitCode)
      
      if (exitCode !== 0) {
        addLog(`Process exited with code ${exitCode}`, 'warning')
      }
      
      // Remove from active processes
      activeProcesses.current = activeProcesses.current.filter(p => p !== process)
      
      return exitCode
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Command failed'
      addLog(`❌ ${message}`, 'error')
      setRunning(false)
      throw err
    }
  }, [container, addCommand, setRunning, setExitCode, spawnProcess, addLog])

  const killProcess = useCallback((process: WebContainerProcess) => {
    process.kill()
    activeProcesses.current = activeProcesses.current.filter(p => p !== process)
  }, [])

  // ========================================================================
  // Project Initialization
  // ========================================================================
  
  const initializeProject = useCallback(async (template: 'nextjs' | 'react' | 'node' = 'nextjs') => {
    if (!container) throw new Error('Container not ready')
    
    addLog('📦 Initializing project...', 'info')
    
    // Create package.json based on template
    const packageJson = getPackageJson(template)
    await writeFile('package.json', JSON.stringify(packageJson, null, 2))
    
    // Create basic project structure
    if (template === 'nextjs') {
      await setupNextJsProject(container, writeFile)
    } else if (template === 'react') {
      await setupReactProject(container, writeFile)
    } else {
      await setupNodeProject(container, writeFile)
    }
    
    addLog('📥 Installing dependencies...', 'info')
    addLog('(This may take a moment)', 'info')
    
    // Install dependencies
    const installExitCode = await runCommand('npm', ['install'])
    
    if (installExitCode === 0) {
      addLog('✅ Dependencies installed successfully', 'success')
    } else {
      addLog('⚠️ Some dependencies may have failed to install', 'warning')
    }
  }, [container, writeFile, runCommand, addLog])

  const startDevServer = useCallback(async () => {
    if (!container) throw new Error('Container not ready')
    
    addLog('🚀 Starting development server (Webpack mode)...', 'info')
    
    // Start in background (don't await exit)
    // Use npx next dev (no --turbo flag - Turbopack not supported in WebContainer WASM)
    spawnProcess('npx', ['next', 'dev'])
  }, [container, spawnProcess, addLog])

  return {
    container,
    isBooting,
    isReady,
    isSupported,
    serverUrl,
    error,
    writeFile,
    readFile,
    mkdir,
    readdir,
    rm,
    runCommand,
    spawnProcess,
    initializeProject,
    startDevServer,
    killProcess,
  }
}

// ============================================================================
// Template Helpers
// ============================================================================

function getPackageJson(template: 'nextjs' | 'react' | 'node') {
  const base = {
    name: 'torbit-app',
    version: '0.1.0',
    private: true,
  }
  
  switch (template) {
    case 'nextjs':
      return {
        ...base,
        scripts: {
          dev: 'next dev',
          build: 'next build',
          start: 'next start',
        },
        dependencies: {
          next: '14.2.28',
          react: '^19',
          'react-dom': '^19',
          'lucide-react': 'latest',
          'framer-motion': 'latest',
          clsx: 'latest',
          'tailwind-merge': 'latest',
        },
      }
    case 'react':
      return {
        ...base,
        scripts: {
          dev: 'vite',
          build: 'vite build',
          preview: 'vite preview',
        },
        dependencies: {
          react: '^18',
          'react-dom': '^18',
        },
        devDependencies: {
          vite: '^5',
          '@vitejs/plugin-react': '^4',
        },
      }
    case 'node':
      return {
        ...base,
        type: 'module',
        scripts: {
          start: 'node index.js',
          dev: 'node --watch index.js',
        },
        dependencies: {},
      }
  }
}

async function setupNextJsProject(
  container: WebContainer, 
  writeFile: (path: string, content: string) => Promise<void>
) {
  // Create app directory structure
  await container.fs.mkdir('app', { recursive: true })
  
  // Create layout.tsx
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

  // Create page.tsx
  await writeFile('app/page.tsx', `export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-white mb-4">
          Welcome to Torbit
        </h1>
        <p className="text-gray-400">
          Your AI-powered app is ready to build
        </p>
      </div>
    </main>
  )
}
`)

  // Create next.config.js
  await writeFile('next.config.js', `/** @type {import('next').NextConfig} */
const nextConfig = {}
module.exports = nextConfig
`)

  // Create tsconfig.json
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
}

async function setupReactProject(
  container: WebContainer,
  writeFile: (path: string, content: string) => Promise<void>
) {
  await container.fs.mkdir('src', { recursive: true })
  
  await writeFile('src/App.jsx', `export default function App() {
  return (
    <div className="app">
      <h1>Welcome to Torbit</h1>
      <p>Your AI-powered React app</p>
    </div>
  )
}
`)
  
  await writeFile('src/main.jsx', `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
`)

  await writeFile('index.html', `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Torbit App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`)
}

async function setupNodeProject(
  _container: WebContainer,
  writeFile: (path: string, content: string) => Promise<void>
) {
  await writeFile('index.js', `console.log('Hello from Torbit!')
console.log('Your Node.js app is ready.')
`)
}
