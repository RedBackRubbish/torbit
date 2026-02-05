'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'
import { useBuilderStore } from '@/store/builder'
import { useWebContainer } from '@/hooks/useWebContainer'
import { useTerminalStore } from '@/store/terminal'
import { NervousSystem } from '@/lib/nervous-system'
import { IPhoneFrame, BrowserFrame } from './DeviceFrame'
import { DEVICE_PRESETS } from '@/lib/mobile/types'

// ============================================================================
// Device Preset Selector
// ============================================================================

function DevicePresetSelector() {
  const { devicePreset, setDevicePreset } = useBuilderStore()
  const [isOpen, setIsOpen] = useState(false)
  const currentDevice = DEVICE_PRESETS[devicePreset] || DEVICE_PRESETS['iphone-15-pro-max']

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2 py-1 text-[11px] text-[#808080] hover:text-[#a0a0a0] bg-[#050505] border border-[#151515] rounded-md transition-all"
      >
        <span className="text-[#c0c0c0]">{currentDevice.name}</span>
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)} 
            />
            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 mt-1 w-48 bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg shadow-xl z-50 overflow-hidden"
            >
              {Object.values(DEVICE_PRESETS).map((device) => (
                <button
                  key={device.id}
                  onClick={() => {
                    setDevicePreset(device.id)
                    setIsOpen(false)
                  }}
                  className={`
                    w-full flex items-center gap-2 px-3 py-2 text-left text-[12px] transition-all
                    ${devicePreset === device.id 
                      ? 'bg-[#c0c0c0]/10 text-[#c0c0c0]' 
                      : 'text-[#808080] hover:bg-[#141414] hover:text-white'
                    }
                  `}
                >
                  <div className="flex-1">
                    <div className="font-medium">{device.name}</div>
                    <div className="text-[10px] text-[#525252]">
                      {device.width} × {device.height}
                    </div>
                  </div>
                  {devicePreset === device.id && (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  )}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

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
  const { previewTab, previewDevice, setPreviewDevice, files, devicePreset, projectType } = useBuilderStore()
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
    <div className="flex-1 flex flex-col bg-[#000000] overflow-hidden">
      {previewTab === 'preview' ? (
        <>
          {/* Controls Bar - Pure black + silver */}
          <div className="h-10 border-b border-[#151515] flex items-center justify-between px-3 bg-[#000000]">
            {/* Device Switcher */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-0.5 p-0.5 bg-[#050505] rounded-md border border-[#151515]">
                {(['desktop', 'tablet', 'mobile'] as const).map((device) => (
                  <button
                    key={device}
                    onClick={() => setPreviewDevice(device)}
                    className={`p-1.5 rounded transition-all ${
                      previewDevice === device
                        ? 'bg-[#0f0f0f] text-[#c0c0c0]'
                        : 'text-[#505050] hover:text-[#808080]'
                    }`}
                    title={device.charAt(0).toUpperCase() + device.slice(1)}
                  >
                    {device === 'desktop' && (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
                      </svg>
                    )}
                    {device === 'tablet' && (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5h3m-6.75 2.25h10.5a2.25 2.25 0 002.25-2.25v-15a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 4.5v15a2.25 2.25 0 002.25 2.25z" />
                      </svg>
                    )}
                    {device === 'mobile' && (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>

              {/* Device Preset Selector (only shown when mobile) */}
              {previewDevice === 'mobile' && (
                <DevicePresetSelector />
              )}
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-1.5">
              {/* Terminal toggle */}
              <button
                onClick={() => setShowTerminal(!showTerminal)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium transition-all ${
                  showTerminal
                    ? 'bg-[#0f0f0f] text-[#c0c0c0]'
                    : 'text-[#505050] hover:text-[#808080]'
                }`}
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
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
                  className="w-6 h-6 flex items-center justify-center rounded text-[#505050] hover:text-[#808080] hover:bg-[#0a0a0a] transition-all"
                  title="Refresh"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                </button>
              )}

              {/* Status pill */}
              <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#050505] border border-[#151515]">
                <div className={`w-1.5 h-1.5 rounded-full ${
                  !isMounted ? 'bg-[#404040]' :
                  isBooting ? 'bg-amber-400 animate-pulse' :
                  serverUrl ? 'bg-[#c0c0c0]' :
                  error ? 'bg-red-400' :
                  'bg-[#404040]'
                }`} />
                <span className="text-[10px] text-[#707070]">
                  {!isMounted ? 'Idle' :
                   isBooting ? 'Starting' :
                   serverUrl ? 'Live' :
                   error ? 'Error' :
                   'Idle'}
                </span>
              </div>
            </div>
          </div>
          
          {/* Preview Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className={`flex-1 flex items-center justify-center p-4 overflow-auto bg-[#000000] ${showTerminal ? 'h-1/2' : ''}`}>
              <PreviewContent
                isBooting={isBooting}
                isReady={isReady}
                isSupported={isSupported}
                serverUrl={serverUrl}
                error={error}
                previewDevice={previewDevice}
                deviceWidths={deviceWidths}
                files={files}
                devicePreset={devicePreset}
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
                  className="border-t border-[#151515] bg-[#000000] overflow-hidden"
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
  devicePreset: string
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
  devicePreset,
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
        devicePreset={devicePreset}
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

// Status card component - Premium minimal design
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
  return (
    <div className="text-center max-w-xs">
      {/* Premium loading animation */}
      <div className="relative w-16 h-16 mx-auto mb-6">
        {icon === 'loading' ? (
          <>
            {/* Outer ring - slow pulse */}
            <motion.div
              className="absolute inset-0 rounded-full border border-[#1a1a1a]"
              animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.2, 0.5] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            />
            {/* Middle ring - silver accent */}
            <motion.div
              className="absolute inset-1 rounded-full border border-[#303030]"
              animate={{ scale: [1, 1.08, 1], opacity: [0.6, 0.3, 0.6] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
            />
            {/* Inner core - glowing silver */}
            <motion.div
              className="absolute inset-3 rounded-full bg-gradient-to-br from-[#151515] to-[#0a0a0a] border border-[#252525] flex items-center justify-center"
              animate={{ boxShadow: ['0 0 0 0 rgba(192,192,192,0)', '0 0 20px 2px rgba(192,192,192,0.15)', '0 0 0 0 rgba(192,192,192,0)'] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              {/* Orbiting dot */}
              <motion.div
                className="absolute w-1.5 h-1.5 rounded-full bg-[#c0c0c0]"
                animate={{ 
                  rotate: 360,
                  x: [0, 20, 0, -20, 0],
                  y: [-20, 0, 20, 0, -20]
                }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              />
            </motion.div>
            {/* Center icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.svg 
                className="w-5 h-5 text-[#c0c0c0]" 
                viewBox="0 0 24 24"
                fill="none"
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <path 
                  d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" 
                  stroke="currentColor" 
                  strokeWidth="1.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              </motion.svg>
            </div>
          </>
        ) : icon === 'error' ? (
          <div className="w-full h-full rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
        ) : (
          <div className="w-full h-full rounded-full bg-[#0a0a0a] border border-[#1a1a1a] flex items-center justify-center">
            <svg className="w-6 h-6 text-[#404040]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.64 0 8.577 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.64 0-8.577-3.007-9.963-7.178z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
        )}
      </div>
      
      {/* Title with silver gradient for loading */}
      <h3 className={`text-[14px] font-medium mb-1.5 ${
        icon === 'loading' 
          ? 'text-[#c0c0c0]' 
          : icon === 'error' 
            ? 'text-red-400' 
            : 'text-[#808080]'
      }`}>
        {title}
      </h3>
      
      {/* Subtitle */}
      <p className="text-[12px] text-[#505050] leading-relaxed">{subtitle}</p>
      
      {/* Loading progress bar */}
      {icon === 'loading' && (
        <div className="mt-5 w-32 h-0.5 mx-auto bg-[#151515] rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-[#252525] via-[#c0c0c0] to-[#252525]"
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            style={{ width: '60%' }}
          />
        </div>
      )}
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
  devicePreset?: string
}

function LivePreviewFrame({ serverUrl, previewDevice, deviceWidths, devicePreset = 'iphone-15-pro-max' }: LivePreviewFrameProps) {
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

  // iPhone frame for mobile preview
  if (previewDevice === 'mobile') {
    return (
      <div data-preview-capture="true">
        <IPhoneFrame preset={devicePreset}>
          <iframe 
            id="webcontainer-preview"
            src={serverUrl} 
            className="w-full h-full bg-white"
            title="Preview"
            sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
            onLoad={handleIframeLoad}
          />
        </IPhoneFrame>
      </div>
    )
  }

  // Browser frame for desktop/tablet
  return (
    <motion.div
      style={{ 
        width: previewDevice === 'desktop' ? '100%' : deviceWidths[previewDevice],
        maxWidth: '100%',
        height: '100%',
      }}
      layout
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
    >
      <BrowserFrame url="localhost:3000">
        <iframe 
          id="webcontainer-preview"
          src={serverUrl} 
          className="w-full h-full bg-white"
          title="Preview"
          sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
          onLoad={handleIframeLoad}
        />
      </BrowserFrame>
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
      case 'success': return 'text-[#c0c0c0]'
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
