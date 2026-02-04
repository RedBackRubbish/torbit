'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'
import { useBuilderStore } from '@/store/builder'
import { useWebContainer } from '@/hooks/useWebContainer'
import { useTerminalStore } from '@/store/terminal'
import { NervousSystem } from '@/lib/nervous-system'

// Dynamic import Monaco to avoid SSR issues
const CodeEditor = dynamic(() => import('./CodeEditor'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-neutral-950">
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
        <span className="text-neutral-400 text-sm" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Loading editor...
        </span>
      </div>
    </div>
  ),
})

/**
 * PreviewPanel - Live preview with WebContainer or code editor
 */
export default function PreviewPanel() {
  const { previewTab, previewDevice, setPreviewDevice, files } = useBuilderStore()
  const { isBooting, isReady, serverUrl, error, isSupported } = useWebContainer()
  const terminalLines = useTerminalStore((s) => s.lines)
  const [showTerminal, setShowTerminal] = useState(false)
  
  // Prevent hydration mismatch - only show dynamic status after mount
  const [isMounted, setIsMounted] = useState(false)
  useEffect(() => {
    setIsMounted(true)
  }, [])

  const deviceWidths = {
    desktop: '100%',
    tablet: '768px',
    mobile: '375px',
  }

  // Track previous terminal lines length
  const prevLinesLength = useRef(terminalLines.length)
  
  // Auto-show terminal when there's NEW activity during boot
  // Using requestAnimationFrame to defer setState and satisfy react-hooks/set-state-in-effect
  useEffect(() => {
    const hasNewActivity = terminalLines.length > prevLinesLength.current
    prevLinesLength.current = terminalLines.length
    
    if (hasNewActivity && isBooting) {
      // Defer the setState to next frame to avoid synchronous setState in effect
      const frameId = requestAnimationFrame(() => {
        setShowTerminal(true)
      })
      return () => cancelAnimationFrame(frameId)
    }
  }, [terminalLines.length, isBooting])

  return (
    <div className="flex-1 flex flex-col bg-neutral-950 overflow-hidden">
      {previewTab === 'preview' ? (
        <>
          {/* Device Switcher & Controls */}
          <div className="h-10 border-b border-neutral-800 flex items-center justify-between px-4 bg-neutral-900/50">
            <div className="flex items-center gap-2">
              {(['desktop', 'tablet', 'mobile'] as const).map((device) => (
                <button
                  key={device}
                  onClick={() => setPreviewDevice(device)}
                  className={`px-3 py-1 rounded text-xs transition-all ${
                    previewDevice === device
                      ? 'bg-neutral-700/50 text-neutral-200'
                      : 'text-neutral-500 hover:text-neutral-300'
                  }`}
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {device === 'desktop' && '🖥️'}
                  {device === 'tablet' && '📱'}
                  {device === 'mobile' && '📲'}
                </button>
              ))}
              
              <div className="ml-4 text-neutral-600 text-xs" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {deviceWidths[previewDevice]}
              </div>
            </div>

            {/* Right side controls */}
            <div className="flex items-center gap-2">
              {/* Terminal toggle */}
              <button
                onClick={() => setShowTerminal(!showTerminal)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-all ${
                  showTerminal
                    ? 'bg-neutral-700 text-neutral-200'
                    : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Terminal
              </button>

              {/* Refresh button */}
              {serverUrl && (
                <button
                  onClick={() => {
                    const iframe = document.getElementById('webcontainer-preview') as HTMLIFrameElement
                    if (iframe) iframe.src = iframe.src
                  }}
                  className="p-1.5 rounded text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800 transition-all"
                  title="Refresh preview"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              )}

              {/* Status indicator */}
              <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-neutral-800/50 text-xs">
                <div className={`w-1.5 h-1.5 rounded-full ${
                  !isMounted ? 'bg-neutral-600' :
                  isBooting ? 'bg-amber-500 animate-pulse' :
                  serverUrl ? 'bg-emerald-500' :
                  error ? 'bg-red-500' :
                  'bg-neutral-600'
                }`} />
                <span className="text-neutral-400">
                  {!isMounted ? 'Ready' :
                   isBooting ? 'Booting...' :
                   serverUrl ? 'Live' :
                   error ? 'Error' :
                   'Ready'}
                </span>
              </div>
            </div>
          </div>
          
          {/* Main Preview Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Preview Frame */}
            <div className={`flex-1 flex items-center justify-center p-4 overflow-auto ${showTerminal ? 'h-1/2' : ''}`}>
              <PreviewContent
                isBooting={isBooting}
                isReady={isReady}
                isSupported={isSupported}
                serverUrl={serverUrl}
                error={error}
                previewDevice={previewDevice}
                deviceWidths={deviceWidths}
                files={files}
              />
            </div>

            {/* Terminal Panel */}
            <AnimatePresence>
              {showTerminal && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: '40%', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="border-t border-neutral-800 bg-black overflow-hidden"
                >
                  <TerminalOutput />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </>
      ) : (
        /* Code View - Real Monaco Editor */
        <CodeEditor />
      )}
    </div>
  )
}

// ============================================================================
// Preview Content Component
// ============================================================================

interface PreviewContentProps {
  isBooting: boolean
  isReady: boolean
  isSupported: boolean
  serverUrl: string | null
  error: string | null
  previewDevice: 'desktop' | 'tablet' | 'mobile'
  deviceWidths: Record<string, string>
  files: { path: string; content: string }[]
}

function PreviewContent({
  isBooting,
  isReady,
  isSupported,
  serverUrl,
  error,
  previewDevice,
  deviceWidths,
  files,
}: PreviewContentProps) {
  const [isMounted, setIsMounted] = useState(false)
  
  useEffect(() => {
    setIsMounted(true)
  }, [])
  
  // Prevent hydration mismatch - render neutral state on server
  if (!isMounted) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-neutral-500/10 border border-neutral-500/30 flex items-center justify-center">
          <div className="w-8 h-8" />
        </div>
        <h3 className="text-neutral-400 text-lg font-medium mb-2">
          Loading...
        </h3>
        <p className="text-neutral-500 text-sm">
          Initializing preview
        </p>
      </div>
    )
  }
  
  // Not supported
  if (!isSupported) {
    return (
      <div className="text-center max-w-md">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-red-400 text-lg font-medium mb-2">
          WebContainer Not Supported
        </h3>
        <p className="text-neutral-500 text-sm">
          Your browser doesn&apos;t support SharedArrayBuffer. 
          Try using Chrome or Edge with the required security headers.
        </p>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="text-center max-w-md">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h3 className="text-red-400 text-lg font-medium mb-2">
          Engine Failure
        </h3>
        <p className="text-neutral-500 text-sm">{error}</p>
      </div>
    )
  }

  // Booting state
  if (isBooting) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </motion.div>
        </div>
        <h3 className="text-blue-400 text-lg font-medium mb-2">
          Initializing Virtual Environment
        </h3>
        <p className="text-neutral-500 text-sm">
          Booting Node.js runtime in browser...
        </p>
      </div>
    )
  }

  // Server running - show iframe
  if (serverUrl) {
    return (
      <LivePreviewFrame
        serverUrl={serverUrl}
        previewDevice={previewDevice}
        deviceWidths={deviceWidths}
      />
    )
  }

  // Ready but no server yet
  if (isReady && files.length > 0) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
          <motion.div
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <svg className="w-8 h-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </motion.div>
        </div>
        <h3 className="text-amber-400 text-lg font-medium mb-2">
          Waiting for Server
        </h3>
        <p className="text-neutral-500 text-sm">
          {files.length} files generated. Starting development server...
        </p>
      </div>
    )
  }

  // Empty state
  return (
    <div className="text-center">
      <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-neutral-800/50 flex items-center justify-center">
        <span className="text-2xl opacity-30">⚡</span>
      </div>
      <h3 
        className="text-neutral-400 text-lg font-light mb-2"
        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
      >
        No preview yet
      </h3>
      <p 
        className="text-neutral-500 text-sm max-w-md"
        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
      >
        Enter a prompt in the chat to start building. The preview will appear here as agents generate code.
      </p>
    </div>
  )
}

// ============================================================================
// Live Preview Frame with Visual Nerve (Browser Error Detection)
// ============================================================================

interface LivePreviewFrameProps {
  serverUrl: string
  previewDevice: 'desktop' | 'tablet' | 'mobile'
  deviceWidths: Record<string, string>
}

function LivePreviewFrame({ serverUrl, previewDevice, deviceWidths }: LivePreviewFrameProps) {
  // VISUAL NERVE: Listen for console.error messages from the iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Only accept messages from our iframe
      if (event.data?.type === 'TORBIT_CONSOLE_ERROR') {
        const errorMessage = event.data.message
        console.warn('[PreviewFrame] Browser error intercepted:', errorMessage)
        
        // Analyze and dispatch pain signal
        const pain = NervousSystem.analyzeBrowserError(errorMessage)
        if (pain) {
          NervousSystem.dispatchPain(pain)
        }
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  // Handle iframe load to inject console spy
  const handleIframeLoad = () => {
    try {
      const iframe = document.getElementById('webcontainer-preview') as HTMLIFrameElement
      if (!iframe?.contentWindow) return

      // Inject console spy script into the iframe
      // This intercepts console.error and sends it to parent
      const script = `
        (function() {
          if (window.__torbitConsoleSpy) return;
          window.__torbitConsoleSpy = true;
          
          const originalError = console.error;
          const originalWarn = console.warn;
          
          console.error = function(...args) {
            window.parent.postMessage({ 
              type: 'TORBIT_CONSOLE_ERROR', 
              message: args.map(a => {
                if (a instanceof Error) return a.message + '\\n' + a.stack;
                return String(a);
              }).join(' ')
            }, '*');
            originalError.apply(console, args);
          };
          
          // Also catch React hydration warnings
          console.warn = function(...args) {
            const msg = args.join(' ');
            if (msg.includes('Hydration') || msg.includes('hydration')) {
              window.parent.postMessage({ 
                type: 'TORBIT_CONSOLE_ERROR', 
                message: msg
              }, '*');
            }
            originalWarn.apply(console, args);
          };
          
          // Catch unhandled errors
          window.addEventListener('error', function(event) {
            window.parent.postMessage({ 
              type: 'TORBIT_CONSOLE_ERROR', 
              message: event.message + ' at ' + event.filename + ':' + event.lineno
            }, '*');
          });
          
          // Catch unhandled promise rejections
          window.addEventListener('unhandledrejection', function(event) {
            window.parent.postMessage({ 
              type: 'TORBIT_CONSOLE_ERROR', 
              message: 'Unhandled Promise Rejection: ' + String(event.reason)
            }, '*');
          });
        })();
      `

      // Try to inject the script
      iframe.contentWindow.postMessage({ type: 'TORBIT_INJECT_SPY', script }, '*')
    } catch {
      // Cross-origin restrictions may prevent injection
      console.warn('[PreviewFrame] Could not inject console spy (cross-origin)')
    }
  }

  return (
    <motion.div
      className="bg-white rounded-lg shadow-2xl overflow-hidden"
      style={{ 
        width: previewDevice === 'desktop' ? '100%' : deviceWidths[previewDevice],
        maxWidth: '100%',
        height: previewDevice === 'mobile' ? '667px' : '100%',
      }}
      layout
      transition={{ duration: 0.3 }}
    >
      {/* Address bar */}
      <div className="h-8 bg-gray-100 border-b flex items-center px-3 gap-2">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-1.5 px-3 py-0.5 bg-white rounded-md text-xs text-gray-500">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            localhost:3000
          </div>
        </div>
      </div>
      
      <iframe 
        id="webcontainer-preview"
        src={serverUrl} 
        className="w-full h-[calc(100%-2rem)] bg-white"
        title="App Preview"
        sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
        onLoad={handleIframeLoad}
      />
    </motion.div>
  )
}

// ============================================================================
// Terminal Output Component
// ============================================================================

function TerminalOutput() {
  const { lines, clear, isRunning } = useTerminalStore()

  const getLineColor = (type: string) => {
    switch (type) {
      case 'command': return 'text-cyan-400'
      case 'error': return 'text-red-400'
      case 'success': return 'text-emerald-400'
      case 'warning': return 'text-amber-400'
      case 'info': return 'text-blue-400'
      default: return 'text-neutral-300'
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Terminal Header */}
      <div className="h-8 border-b border-neutral-800 flex items-center justify-between px-3 bg-neutral-900/50">
        <div className="flex items-center gap-2">
          <svg className="w-3.5 h-3.5 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-xs text-neutral-500">Terminal</span>
          {isRunning && (
            <motion.div
              className="w-1.5 h-1.5 rounded-full bg-amber-500"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            />
          )}
        </div>
        <button
          onClick={clear}
          className="text-xs text-neutral-600 hover:text-neutral-400 transition-colors"
        >
          Clear
        </button>
      </div>

      {/* Terminal Content */}
      <div className="flex-1 overflow-auto p-3 font-mono text-xs">
        {lines.length === 0 ? (
          <div className="text-neutral-600">
            Waiting for commands...
          </div>
        ) : (
          lines.map((line) => (
            <div key={line.id} className={`${getLineColor(line.type)} whitespace-pre-wrap`}>
              {line.content}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
