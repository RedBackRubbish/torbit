'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'
import { useBuilderStore } from '@/store/builder'
import { useE2B } from '@/hooks/useE2B'
import { useTerminalStore } from '@/store/terminal'
import { NervousSystem } from '@/lib/nervous-system'
import { IPhoneFrame, BrowserFrame } from './DeviceFrame'
import { DEVICE_PRESETS } from '@/lib/mobile/types'
import { TorbitSpinner, TorbitLogo } from '@/components/ui/TorbitLogo'
import { SafariFallback, SafariBanner } from './SafariFallback'
import type { BuildFailure } from '@/lib/runtime/build-diagnostics'

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
 * PreviewPanel - Clean, minimal preview with E2B Cloud Sandbox
 * Uses E2B for real Linux environment instead of WebContainer
 */
export default function PreviewPanel() {
  const { previewTab, previewDevice, setPreviewDevice, files, devicePreset, chatInput, isGenerating } = useBuilderStore()
  const { isBooting, isReady, serverUrl, error, buildFailure } = useE2B()
  const isSupported = true // E2B is always supported (cloud-based)
  const terminalLines = useTerminalStore((s) => s.lines)
  const [showRuntimeLog, setShowRuntimeLog] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [designModeActive, setDesignModeActive] = useState(false)
  const wasBootingRef = useRef(false)
  
  useEffect(() => {
    setIsMounted(true)
  }, [])

  const deviceWidths = {
    desktop: '100%',
    tablet: '768px',
    mobile: '375px',
  }

  const prevLinesLength = useRef(terminalLines.length)
  
  // Auto-expand during boot, auto-collapse after environment verified
  useEffect(() => {
    const hasNewActivity = terminalLines.length > prevLinesLength.current
    prevLinesLength.current = terminalLines.length
    
    // Expand during boot
    if (hasNewActivity && isBooting) {
      wasBootingRef.current = true
      const frameId = requestAnimationFrame(() => {
        setShowRuntimeLog(true)
      })
      return () => cancelAnimationFrame(frameId)
    }
    
    // Auto-collapse 1.5s after environment is ready
    if (wasBootingRef.current && isReady && !isBooting) {
      wasBootingRef.current = false
      const timeout = setTimeout(() => {
        setShowRuntimeLog(false)
      }, 1500)
      return () => clearTimeout(timeout)
    }
  }, [terminalLines.length, isBooting, isReady])

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
              {/* Runtime Log toggle */}
              <button
                onClick={() => setShowRuntimeLog(!showRuntimeLog)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium transition-all ${
                  showRuntimeLog
                    ? 'bg-[#0f0f0f] text-[#c0c0c0]'
                    : 'text-[#505050] hover:text-[#808080]'
                }`}
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                Log
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
            <div className={`flex-1 flex items-center justify-center p-4 overflow-auto bg-[#000000] ${showRuntimeLog ? 'h-1/2' : ''}`}>
              <PreviewContent
                isBooting={isBooting}
                isReady={isReady}
                isSupported={isSupported}
                serverUrl={serverUrl}
                error={error}
                buildFailure={buildFailure}
                previewDevice={previewDevice}
                deviceWidths={deviceWidths}
                files={files}
                devicePreset={devicePreset}
                isTyping={chatInput.length > 0}
                isGenerating={isGenerating}
                onContinueWithoutExecution={() => setDesignModeActive(true)}
                designModeActive={designModeActive}
              />
            </div>

            {/* Runtime Log (formerly Terminal) */}
            <AnimatePresence>
              {showRuntimeLog && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: '40%', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                  className="border-t border-[#151515] bg-[#000000] overflow-hidden"
                >
                  <RuntimeLogOutput />
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
  buildFailure: BuildFailure | null
  previewDevice: 'desktop' | 'tablet' | 'mobile'
  deviceWidths: Record<string, string>
  files: { path: string; content: string }[]
  devicePreset: string
  isTyping: boolean
  isGenerating: boolean
  onContinueWithoutExecution?: () => void
  designModeActive?: boolean
}

function PreviewContent({
  isBooting,
  isReady,
  isSupported,
  serverUrl,
  error,
  buildFailure,
  previewDevice,
  deviceWidths,
  files,
  devicePreset,
  isTyping,
  isGenerating,
  onContinueWithoutExecution,
  designModeActive,
}: PreviewContentProps) {
  const [isMounted, setIsMounted] = useState(false)
  const [showVerified, setShowVerified] = useState(false)
  const prevServerUrl = useRef<string | null>(null)
  
  useEffect(() => {
    setIsMounted(true)
  }, [])
  
  // Verification Reveal Moment - brief pause when server becomes ready
  useEffect(() => {
    if (serverUrl && !prevServerUrl.current) {
      // Server just became ready - show verification moment
      setShowVerified(true)
      const timeout = setTimeout(() => {
        setShowVerified(false)
      }, 800) // Brief pause before showing preview
      return () => clearTimeout(timeout)
    }
    prevServerUrl.current = serverUrl
  }, [serverUrl])
  
  if (!isMounted) {
    return <StatusCard icon="loading" title="Loading..." subtitle="Initializing preview" />
  }
  
  // Safari / Unsupported browser - show honest fallback gate
  if (!isSupported && !designModeActive) {
    return (
      <SafariFallback 
        onContinue={onContinueWithoutExecution}
      />
    )
  }
  
  // Design mode active - user chose to continue without live execution
  if (!isSupported && designModeActive) {
    return (
      <DesignModePreview 
        files={files}
        isGenerating={isGenerating}
      />
    )
  }

  if (error) {
    const isE2BDisabled =
      error.includes('E2B_API_KEY not configured') ||
      error.includes('Live preview is disabled')

    if (isE2BDisabled) {
      return (
        <StatusCard
          icon="empty"
          title="Live preview unavailable"
          subtitle="Set E2B_API_KEY to enable runtime preview. Code generation still works."
        />
      )
    }

    const errorTitle = buildFailure
      ? (
        buildFailure.category === 'infra'
          ? 'Infrastructure verification failed'
          : buildFailure.category === 'dependency'
            ? 'Dependency resolution failed'
            : buildFailure.category === 'code'
              ? 'Runtime build failed'
              : 'Verification failed'
      )
      : 'Verification failed'

    const errorSubtitle = buildFailure
      ? `${buildFailure.command ? `Command: ${buildFailure.command}. ` : ''}${buildFailure.actionableFix}`
      : 'Check runtime log for details'

    return (
      <StatusCard 
        icon="error" 
        title={errorTitle}
        subtitle={errorSubtitle}
      />
    )
  }

  if (isBooting) {
    return (
      <StatusCard 
        icon="loading" 
        title="Verifying environment" 
        subtitle="Establishing secure runtime"
      />
    )
  }

  // Verification Reveal Moment - brief pause with checkmark
  if (showVerified && serverUrl) {
    return (
      <motion.div 
        className="text-center"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
      >
        <motion.div 
          className="w-12 h-12 mx-auto mb-4 rounded-full bg-white/[0.05] border border-white/[0.1] flex items-center justify-center"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <motion.svg 
            className="w-5 h-5 text-white/60" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor" 
            strokeWidth={2}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </motion.svg>
        </motion.div>
        <p className="text-[13px] text-white/50">Verified</p>
      </motion.div>
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
        title="Validating runtime" 
        subtitle={`${files.length} artifacts staged`}
      />
    )
  }

  // Show "Preparing preview..." when user is typing or generating
  if (isTyping || isGenerating) {
    return (
      <StatusCard 
        icon="loading" 
        title="Preparing preview" 
        subtitle="Output will appear here"
      />
    )
  }

  // Expectation Panel - show what will appear here
  return <ExpectationPanel />
}

// Expectation Panel - Premium minimal design showing what will appear
function ExpectationPanel() {
  return (
    <div className="text-center max-w-sm">
      {/* Ghosted browser frame */}
      <div className="relative w-48 h-32 mx-auto mb-8">
        <div className="absolute inset-0 border border-dashed border-white/[0.08] rounded-lg overflow-hidden">
          {/* Title bar */}
          <div className="h-5 border-b border-dashed border-white/[0.06] flex items-center gap-1 px-2">
            <div className="w-1.5 h-1.5 rounded-full bg-white/[0.06]" />
            <div className="w-1.5 h-1.5 rounded-full bg-white/[0.06]" />
            <div className="w-1.5 h-1.5 rounded-full bg-white/[0.06]" />
          </div>
          {/* Content area with grid */}
          <div className="flex-1 p-3">
            <div className="w-full h-2 bg-white/[0.03] rounded mb-2" />
            <div className="w-3/4 h-2 bg-white/[0.03] rounded mb-2" />
            <div className="w-1/2 h-2 bg-white/[0.03] rounded" />
          </div>
        </div>
      </div>

      <p className="text-[13px] text-white/30 mb-6">This panel will show:</p>
      
      <div className="space-y-2.5 text-left max-w-[200px] mx-auto">
        <div className="flex items-center gap-2.5 text-[12px] text-white/40">
          <div className="w-4 h-4 rounded border border-white/[0.1] flex items-center justify-center">
            <svg className="w-2.5 h-2.5 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span>Verified UI</span>
        </div>
        <div className="flex items-center gap-2.5 text-[12px] text-white/40">
          <div className="w-4 h-4 rounded border border-white/[0.1] flex items-center justify-center">
            <svg className="w-2.5 h-2.5 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span>Runtime output</span>
        </div>
        <div className="flex items-center gap-2.5 text-[12px] text-white/40">
          <div className="w-4 h-4 rounded border border-white/[0.1] flex items-center justify-center">
            <svg className="w-2.5 h-2.5 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span>Export-ready artifacts</span>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Design Mode Preview - For Safari/unsupported browsers
// ============================================================================

interface DesignModePreviewProps {
  files: { path: string; content: string }[]
  isGenerating: boolean
}

function DesignModePreview({ files, isGenerating }: DesignModePreviewProps) {
  return (
    <div className="h-full flex flex-col">
      {/* Design Mode Banner */}
      <SafariBanner />
      
      {/* Design Mode Content */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          {isGenerating ? (
            <>
              <TorbitSpinner size="xl" speed="normal" />
              <h3 className="text-[14px] font-medium text-white mt-6 mb-2">
                Generating code
              </h3>
              <p className="text-[12px] text-[#606060]">
                Code will appear in the file tree when complete
              </p>
            </>
          ) : files.length > 0 ? (
            <>
              {/* Success state - files generated */}
              <div className="w-16 h-16 mx-auto mb-6 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <svg className="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-[14px] font-medium text-white mb-2">
                {files.length} artifact{files.length !== 1 ? 's' : ''} ready
              </h3>
              <p className="text-[12px] text-[#606060] mb-6">
                Review in Code tab or export to run locally
              </p>
              <div className="flex items-center justify-center gap-3">
                <div className="flex items-center gap-2 px-3 py-2 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg text-[12px] text-[#808080]">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                  </svg>
                  View in Code tab
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg text-[12px] text-[#808080]">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  Export project
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Empty state */}
              <TorbitLogo size="xl" variant="muted" />
              <h3 className="text-[14px] font-medium text-[#606060] mt-6 mb-2">
                Design mode active
              </h3>
              <p className="text-[12px] text-[#404040]">
                Start a run - code will appear in the file tree
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Status card component - Premium minimal design with TORBIT branding
function StatusCard({ 
  icon, 
  title, 
  subtitle,
}: { 
  icon: 'loading' | 'error' | 'empty'
  title: string
  subtitle: string
}) {
  return (
    <div className="text-center max-w-xs">
      {/* TORBIT branded loading animation */}
      <div className="relative w-16 h-16 mx-auto mb-6">
        {icon === 'loading' ? (
          <TorbitSpinner size="xl" speed="normal" />
        ) : icon === 'error' ? (
          <div className="w-full h-full rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
        ) : (
          <TorbitLogo size="xl" variant="muted" />
        )}
      </div>
      
      {/* Title with red accent for loading */}
      <h3 className={`text-[14px] font-medium mb-1.5 ${
        icon === 'loading' 
          ? 'text-white' 
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
  const { setPendingHealRequest, isGenerating } = useBuilderStore()
  const lastAutoHealRef = useRef<number>(0)
  const AUTO_HEAL_DEBOUNCE_MS = 10000
  const displayUrl = (() => {
    try {
      return new URL(serverUrl).host
    } catch {
      return serverUrl.replace(/^https?:\/\//, '')
    }
  })()
  
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'TORBIT_CONSOLE_ERROR') {
        const errorMessage = event.data.message
        const pain = NervousSystem.analyzeBrowserError(errorMessage)
        if (pain) {
          NervousSystem.dispatchPain(pain)
          
          // Also trigger auto-heal for browser errors
          const now = Date.now()
          if (!isGenerating && (now - lastAutoHealRef.current) > AUTO_HEAL_DEBOUNCE_MS) {
            lastAutoHealRef.current = now
            console.log('🔧 PreviewPanel: Auto-heal triggered for browser error:', pain.type)
            setPendingHealRequest({
              error: `${pain.type}: ${pain.message}`,
              suggestion: pain.suggestion || 'Fix the runtime error',
            })
          }
        }
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [setPendingHealRequest, isGenerating])

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
      <BrowserFrame url={displayUrl}>
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
// Runtime Log Output (formerly Terminal)
// ============================================================================

function RuntimeLogOutput() {
  const { lines, clear, isRunning } = useTerminalStore()

  const getLineColor = (type: string) => {
    switch (type) {
      case 'command': return 'text-white/60'
      case 'error': return 'text-red-400/80'
      case 'success': return 'text-white/50'
      case 'warning': return 'text-amber-400/70'
      case 'info': return 'text-white/40'
      default: return 'text-white/30'
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="h-9 border-b border-[#1f1f1f] flex items-center justify-between px-3 bg-[#0a0a0a]">
        <div className="flex items-center gap-2">
          <svg className="w-3.5 h-3.5 text-[#525252]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <span className="text-[12px] text-[#737373]">Runtime Log</span>
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
          <span className="text-white/20">No execution output</span>
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
