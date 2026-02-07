'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useBuilderStore } from '@/store/builder'
import { E2BProvider } from '@/providers/E2BProvider'
import { useAuthContext } from '@/providers/AuthProvider'
import { ErrorBoundary, ChatErrorFallback, PreviewErrorFallback } from '@/components/ErrorBoundary'
import BuilderLayout from '@/components/builder/BuilderLayout'
import Sidebar from '@/components/builder/Sidebar'
import ChatPanel from '@/components/builder/ChatPanel'
import PreviewPanel from '@/components/builder/PreviewPanel'
import TasksPanel from '@/components/builder/TasksPanel'
import FuelGauge from '@/components/builder/FuelGauge'
import SoundToggle from '@/components/builder/SoundToggle'
import ShipMenu from '@/components/builder/ShipMenu'
import { PublishPanel } from '@/components/builder/PublishPanel'
import { ScreenshotButton } from '@/components/builder/ScreenshotButton'
import { UserMenu } from '@/components/builder/UserMenu'
import { TorbitSpinner } from '@/components/ui/TorbitLogo'

export default function BuilderPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuthContext()

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login?next=/builder')
    }
  }, [authLoading, user, router])

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <TorbitSpinner size="lg" />
      </div>
    )
  }

  return (
    <E2BProvider>
      <BuilderPageContent />
    </E2BProvider>
  )
}

function BuilderPageContent() {
  const [showTasks, setShowTasks] = useState(false)
  const [chatKey, setChatKey] = useState(0)
  const [previewKey, setPreviewKey] = useState(0)
  const { 
    initProject, 
    prompt,
    previewTab, 
    setPreviewTab,
    sidebarCollapsed,
    toggleSidebar,
    agents,
    isGenerating,
  } = useBuilderStore()

  const handleChatRetry = useCallback(() => setChatKey(k => k + 1), [])
  const handlePreviewRetry = useCallback(() => setPreviewKey(k => k + 1), [])

  useEffect(() => {
    const storedPrompt = sessionStorage.getItem('torbit_prompt')
    const storedCapabilityContext = sessionStorage.getItem('torbit_capability_context')
    
    if (storedPrompt && !prompt) {
      // If capabilities were selected, enhance the prompt with context
      const enhancedPrompt = storedCapabilityContext 
        ? `${storedPrompt}\n\n${storedCapabilityContext}`
        : storedPrompt
      
      initProject(enhancedPrompt)
      
      // Clean up session storage
      sessionStorage.removeItem('torbit_prompt')
      sessionStorage.removeItem('torbit_platform')
      sessionStorage.removeItem('torbit_capabilities')
      sessionStorage.removeItem('torbit_capability_context')
    }
  }, [initProject, prompt])

  // Get current active agent
  const activeAgent = agents.find(a => a.status === 'working' || a.status === 'thinking')
  const isWorking = isGenerating || !!activeAgent

  return (
    <BuilderLayout>
      {/* Left Sidebar - Files (collapsible) */}
      <Sidebar 
        collapsed={sidebarCollapsed} 
        onToggle={toggleSidebar} 
      />
      
      {/* Chat Panel - Left side (Emergent style) */}
      <ErrorBoundary 
        name="ChatPanel" 
        fallback={<ChatErrorFallback onRetry={handleChatRetry} />}
      >
        <ChatPanel key={chatKey} />
      </ErrorBoundary>
      
      {/* Preview Panel - Right side with header */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Preview Header */}
        <header className="h-11 bg-[#0a0a0a] border-b border-[#1f1f1f] flex items-center justify-between px-2 sm:px-4 gap-2">
          {/* Left: Title + Tabs */}
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <span className="hidden lg:block text-[13px] font-medium text-[#fafafa]">App Preview</span>
            <div className="flex items-center bg-[#141414] rounded-lg p-0.5 border border-[#1f1f1f]">
              <TabButton
                label="Preview"
                active={previewTab === 'preview'}
                onClick={() => setPreviewTab('preview')}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.64 0 8.577 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.64 0-8.577-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </TabButton>
              <TabButton
                label="Code"
                active={previewTab === 'code'}
                onClick={() => setPreviewTab('code')}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                </svg>
              </TabButton>
            </div>
          </div>
          
          {/* Right: Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Home button */}
            <Link
              href="/dashboard"
              aria-label="Go to dashboard"
              className="w-7 h-7 flex items-center justify-center rounded-md text-[#525252] hover:text-[#fafafa] hover:bg-[#141414] transition-all"
              title="Dashboard"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
              </svg>
            </Link>
            
            {/* Status indicator */}
            <div className="flex items-center gap-1.5 px-2 border-r border-[#1f1f1f]">
              {isWorking ? (
                <TorbitSpinner size="xs" speed="fast" />
              ) : (
                <div className="w-1.5 h-1.5 rounded-full bg-[#333]" />
              )}
              <span className="hidden md:inline text-[11px] text-[#525252]">
                {isWorking ? 'Building...' : 'Idle'}
              </span>
            </div>
            
            <div className="hidden md:block">
              <ScreenshotButton />
            </div>
            <div className="hidden md:block">
              <SoundToggle />
            </div>
            <div className="hidden md:block">
              <FuelGauge />
            </div>
            <div className="hidden md:block">
              <ShipMenu />
            </div>
            <PublishPanel />
            <UserMenu />
            
            {/* Tasks toggle */}
            <button
              onClick={() => setShowTasks(!showTasks)}
              className={`w-7 h-7 flex items-center justify-center rounded-md transition-all ${
                showTasks 
                  ? 'bg-[#1f1f1f] text-[#fafafa]' 
                  : 'text-[#525252] hover:text-[#a1a1a1] hover:bg-[#141414]'
              }`}
              title="Tasks"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>
        </header>
        
        {/* Preview/Code Panel */}
        <ErrorBoundary 
          name="PreviewPanel" 
          fallback={<PreviewErrorFallback onRetry={handlePreviewRetry} />}
        >
          <PreviewPanel key={previewKey} />
        </ErrorBoundary>
        
        {/* Tasks Slide-out */}
        {showTasks && (
          <motion.div 
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 20, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute top-11 right-0 bottom-0 w-72 z-40 border-l border-[#1f1f1f] bg-[#0a0a0a] shadow-2xl"
          >
            <div className="h-full flex flex-col">
              <div className="h-10 border-b border-[#1f1f1f] flex items-center justify-between px-3">
                <span className="text-[12px] font-medium text-[#a1a1a1]">Tasks</span>
                <button
                  onClick={() => setShowTasks(false)}
                  className="w-5 h-5 flex items-center justify-center text-[#525252] hover:text-[#fafafa] hover:bg-[#1a1a1a] rounded transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <TasksPanel />
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </BuilderLayout>
  )
}

function TabButton({
  children,
  label,
  active,
  onClick,
}: {
  children: React.ReactNode
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={`flex items-center justify-center w-8 h-8 rounded-md transition-all ${
        active
          ? 'bg-[#1f1f1f] text-[#fafafa]'
          : 'text-[#525252] hover:text-[#a1a1a1]'
      }`}
    >
      {children}
    </button>
  )
}
