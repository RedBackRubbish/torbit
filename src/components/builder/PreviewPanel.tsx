'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'
import { useBuilderStore } from '@/store/builder'
import { useWebContainer } from '@/hooks/useWebContainer'
import { useTerminalStore } from '@/store/terminal'
import { NervousSystem } from '@/lib/nervous-system'

// Dynamic import Monaco
const CodeEditor = dynamic(() => import('./CodeEditor'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-[#0a0a0a]">
      <div className="flex items-center gap-2.5">
        <motion.div
          className="w-2 h-2 rounded-full bg-blue-500"
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
        <span className="text-[13px] text-[#737373]">Loading editor...</span>
      </div>
    </div>
  ),
})

/**
 * PreviewPanel - Clean, minimal preview with WebContainer
 */
export default function PreviewPanel() {
  const { previewTab, previewDevice, setPreviewDevice, files } = useBuilderStore()
  const { isBooting, isReady, serverUrl, error, isSupported } = useWebContainer()
  const terminalLines = useTerminalStore((s) => s.lines)
  const [showTerminal, setShowTerminal] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  
  useEffect(() => {
    setIsMounted(true)
  }, [])

  const deviceWidths = {
    desktop: '100%',
    tablet: '768px',
    mobile: '375px',
  }

  const prevLinesLength = useRef(terminalLines.length)
  
  useEffect(() => {
    const hasNewActivity = terminalLines.length > prevLinesLength.current
    prevLinesLength.current = terminalLines.length
    
    if (hasNewActivity && isBooting) {
      const frameId = requestAnimationFrame(() => {
        setShowTerminal(true)
      })
      return () => cancelAnimationFrame(frameId)
    }
  }, [terminalLines.length, isBooting])

  return (
    <div className="flex-1 flex flex-col bg-[#0a0a0a] overflow-hidden">
      {previewTab === 'preview' ? (
        <>
          {/* Controls Bar */}
          <div className="h-11 border-b border-[#1f1f1f] flex items-center justify-between px-4 bg-[#0a0a0a]">
            {/* Device Switcher */}
            <div className="flex items-center gap-1 p-1 bg-[#141414] rounded-lg border border-[#1f1f1f]">
              {(['desktop', 'tablet', 'mobile'] as const).map((device) => (
                <button
                  key={device}
                  onClick={() => setPreviewDevice(device)}
                  className={`p-1.5 rounded-md transition-all ${
                    previewDevice === device
                      ? 'bg-[#1f1f1f] text-[#fafafa]'
                      : 'text-[#525252] hover:text-[#a1a1a1]'
                  }`}
                  title={device.charAt(0).toUpperCase() + device.slice(1)}
                >
                  {device === 'desktop' && (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
                    </svg>
                  )}
                  {device === 'tablet' && (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5h3m-6.75 2.25h10.5a2.25 2.25 0 002.25-2.25v-15a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 4.5v15a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                  )}
                  {device === 'mobile' && (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                    </svg>
                  )}
                </button>
              ))}
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-2">
              {/* Terminal toggle */}
              <button
                onClick={() => setShowTerminal(!showTerminal)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-all border ${
                  showTerminal
                    ? 'bg-[#1f1f1f] border-[#262626] text-[#fafafa]'
                    : 'border-transparent text-[#525252] hover:text-[#a1a1a1]'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
                </svg>
                Terminal
              </button>

              {/* Refresh */}
              {serverUrl && (
                <button
                  onClick={() => {
                    const iframe = document.getElementById('webcontainer-preview') as HTMLIFrameElement
                    if (iframe) iframe.src = iframe.src
                  }}
                  className="p-1.5 rounded-lg text-[#525252] hover:text-[#fafafa] hover:bg-[#1f1f1f] transition-all"
                  title="Refresh"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                </button>
              )}

              {/* Status */}
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#141414] border border-[#1f1f1f]">
                <div className={`w-2 h-2 rounded-full ${
                  !isMounted ? 'bg-[#525252]' :
                  isBooting ? 'bg-amber-500 animate-pulse-subtle' :
                  serverUrl ? 'bg-emerald-500' :
                  error ? 'bg-red-500' :
                  'bg-[#525252]'
                }`} />
                <span className="text-[12px] text-[#a1a1a1]">
                  {!isMounted ? 'Ready' :
                   isBooting ? 'Starting...' :
                   serverUrl ? 'Live' :
                   error ? 'Error' :
                   'Ready'}
                </span>
              </div>
            </div>
          </div>
          
          {/* Preview Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className={`flex-1 flex items-center justify-center p-6 overflow-auto bg-[#0a0a0a] ${showTerminal ? 'h-1/2' : ''}`}>
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

            {/* Terminal */}
            <AnimatePresence>
              {showTerminal && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: '40%', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                  className="border-t border-[#1f1f1f] bg-[#000000] overflow-hidden"
                >
                  <TerminalOutput />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </>
      ) : (
        <CodeEditor />
      )}
    </div>
  )
}

// ============================================================================
// Preview Content
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
  
  if (!isMounted) {
    return <StatusCard icon="loading" title="Loading..." subtitle="Initializing preview" />
  }
  
  if (!isSupported) {
    return (
      <StatusCard 
        icon="error" 
        title="Browser Not Supported" 
        subtitle="WebContainers require Chrome or Edge with SharedArrayBuffer support."
        variant="error"
      />
    )
  }

  if (error) {
    return (
      <StatusCard 
        icon="error" 
        title="Something went wrong" 
        subtitle={error}
        variant="error"
      />
    )
  }

  if (isBooting) {
    return (
      <StatusCard 
        icon="loading" 
        title="Starting environment..." 
        subtitle="Booting Node.js runtime in browser"
        variant="blue"
      />
    )
  }

  if (serverUrl) {
    return (
      <LivePreviewFrame
        serverUrl={serverUrl}
        previewDevice={previewDevice}
        deviceWidths={deviceWidths}
      />
    )
  }

  if (isReady && files.length > 0) {
    return (
      <StatusCard 
        icon="loading" 
        title="Starting server..." 
        subtitle={`${files.length} files ready`}
        variant="amber"
      />
    )
  }

  return (
    <StatusCard 
      icon="empty" 
      title="No preview yet" 
      subtitle="Describe what you want to build and the preview will appear here."
    />
  )
}

// Status card component
function StatusCard({ 
  icon, 
  title, 
  subtitle, 
  variant = 'default' 
}: { 
  icon: 'loading' | 'error' | 'empty'
  title: string
  subtitle: string
  variant?: 'default' | 'error' | 'blue' | 'amber'
}) {
  const colors = {
    default: { bg: 'bg-[#1a1a1a]', border: 'border-[#262626]', text: 'text-[#525252]' },
    error: { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400' },
    blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400' },
    amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400' },
  }[variant]

  return (
    <div className="text-center max-w-sm">
      <div className={`w-14 h-14 mx-auto mb-5 rounded-xl ${colors.bg} border ${colors.border} flex items-center justify-center`}>
        {icon === 'loading' ? (
          <motion.svg 
            className={`w-6 h-6 ${colors.text}`} 
            viewBox="0 0 24 24"
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="32" strokeLinecap="round" />
          </motion.svg>
        ) : icon === 'error' ? (
          <svg className={`w-6 h-6 ${colors.text}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        ) : (
          <svg className="w-6 h-6 text-[#404040]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.64 0 8.577 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.64 0-8.577-3.007-9.963-7.178z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        )}
      </div>
      <h3 className={`text-[15px] font-medium mb-2 ${variant === 'default' ? 'text-[#fafafa]' : colors.text}`}>
        {title}
      </h3>
      <p className="text-[13px] text-[#737373] leading-relaxed">{subtitle}</p>
    </div>
  )
}

// ============================================================================
// Live Preview Frame
// ============================================================================

interface LivePreviewFrameProps {
  serverUrl: string
  previewDevice: 'desktop' | 'tablet' | 'mobile'
  deviceWidths: Record<string, string>
}

function LivePreviewFrame({ serverUrl, previewDevice, deviceWidths }: LivePreviewFrameProps) {
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'TORBIT_CONSOLE_ERROR') {
        const errorMessage = event.data.message
        const pain = NervousSystem.analyzeBrowserError(errorMessage)
        if (pain) {
          NervousSystem.dispatchPain(pain)
        }
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  const handleIframeLoad = () => {
    try {
      const iframe = document.getElementById('webcontainer-preview') as HTMLIFrameElement
      if (!iframe?.contentWindow) return

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
          
          window.addEventListener('error', function(event) {
            window.parent.postMessage({ 
              type: 'TORBIT_CONSOLE_ERROR', 
              message: event.message + ' at ' + event.filename + ':' + event.lineno
            }, '*');
          });
          
          window.addEventListener('unhandledrejection', function(event) {
            window.parent.postMessage({ 
              type: 'TORBIT_CONSOLE_ERROR', 
              message: 'Unhandled Promise Rejection: ' + String(event.reason)
            }, '*');
          });
        })();
      `

      iframe.contentWindow.postMessage({ type: 'TORBIT_INJECT_SPY', script }, '*')
    } catch {
      // Cross-origin restrictions
    }
  }

  return (
    <motion.div
      className="bg-white rounded-xl overflow-hidden shadow-2xl ring-1 ring-[#262626]"
      style={{ 
        width: previewDevice === 'desktop' ? '100%' : deviceWidths[previewDevice],
        maxWidth: '100%',
        height: previewDevice === 'mobile' ? '667px' : '100%',
      }}
      layout
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Browser chrome */}
      <div className="h-9 bg-[#f5f5f5] border-b border-[#e5e5e5] flex items-center px-3 gap-2">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
          <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
          <div className="w-3 h-3 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-white rounded-md text-[11px] text-[#737373] border border-[#e5e5e5]">
            <svg className="w-3 h-3 text-[#22c55e]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            localhost:3000
          </div>
        </div>
      </div>
      
      <iframe 
        id="webcontainer-preview"
        src={serverUrl} 
        className="w-full h-[calc(100%-2.25rem)] bg-white"
        title="Preview"
        sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
        onLoad={handleIframeLoad}
      />
    </motion.div>
  )
}

// ============================================================================
// Terminal Output
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
      default: return 'text-[#a1a1a1]'
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="h-9 border-b border-[#1f1f1f] flex items-center justify-between px-3 bg-[#0a0a0a]">
        <div className="flex items-center gap-2">
          <svg className="w-3.5 h-3.5 text-[#525252]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
          </svg>
          <span className="text-[12px] text-[#737373]">Terminal</span>
          {isRunning && (
            <motion.div
              className="w-1.5 h-1.5 rounded-full bg-amber-500"
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            />
          )}
        </div>
        <button
          onClick={clear}
          className="text-[11px] text-[#525252] hover:text-[#a1a1a1] transition-colors"
        >
          Clear
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-3 font-mono text-[12px] leading-relaxed custom-scrollbar">
        {lines.length === 0 ? (
          <span className="text-[#404040]">No output yet...</span>
        ) : (
          lines.map((line, i) => (
            <div key={i} className={`${getLineColor(line.type)} whitespace-pre-wrap`}>
              {line.content}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
