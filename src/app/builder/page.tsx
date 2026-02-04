'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useBuilderStore } from '@/store/builder'
import { WebContainerProvider } from '@/providers/WebContainerProvider'
import { ErrorBoundary, ChatErrorFallback, PreviewErrorFallback } from '@/components/ErrorBoundary'
import BuilderLayout from '@/components/builder/BuilderLayout'
import Sidebar from '@/components/builder/Sidebar'
import ChatPanel from '@/components/builder/ChatPanel'
import PreviewPanel from '@/components/builder/PreviewPanel'
import AgentStatusBar from '@/components/builder/AgentStatusBar'
import TasksPanel from '@/components/builder/TasksPanel'
import FuelGauge from '@/components/builder/FuelGauge'
import ShipMenu from '@/components/builder/ShipMenu'

export default function BuilderPage() {
  return (
    <WebContainerProvider>
      <BuilderPageContent />
    </WebContainerProvider>
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
  } = useBuilderStore()

  const handleChatRetry = useCallback(() => setChatKey(k => k + 1), [])
  const handlePreviewRetry = useCallback(() => setPreviewKey(k => k + 1), [])

  useEffect(() => {
    const storedPrompt = sessionStorage.getItem('torbit_prompt')
    if (storedPrompt && !prompt) {
      initProject(storedPrompt)
      sessionStorage.removeItem('torbit_prompt')
    }
  }, [initProject, prompt])

  return (
    <BuilderLayout>
      {/* Left Sidebar */}
      <Sidebar 
        collapsed={sidebarCollapsed} 
        onToggle={toggleSidebar} 
      />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Premium Header */}
        <header className="h-12 bg-[#0a0a0a] border-b border-[#1a1a1a] flex items-center justify-between px-4">
          {/* Left: Agent Status */}
          <AgentStatusBar />
          
          {/* Center: Tab Switcher - v0 style */}
          <div className="flex items-center">
            <div className="flex items-center bg-[#141414] rounded-lg p-0.5 border border-[#1f1f1f]">
              <TabButton 
                active={previewTab === 'preview'} 
                onClick={() => setPreviewTab('preview')}
                icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.64 0 8.577 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.64 0-8.577-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                }
              >
                Preview
              </TabButton>
              <TabButton 
                active={previewTab === 'code'} 
                onClick={() => setPreviewTab('code')}
                icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                  </svg>
                }
              >
                Code
              </TabButton>
              <TabButton 
                active={showTasks} 
                onClick={() => setShowTasks(!showTasks)}
                icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              >
                Tasks
              </TabButton>
            </div>
          </div>
          
          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            <FuelGauge />
            <ShipMenu />
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
            className="absolute top-12 right-0 bottom-0 w-96 z-40 border-l border-[#1a1a1a] bg-[#0a0a0a] shadow-2xl"
          >
            <div className="h-full flex flex-col">
              <div className="h-11 border-b border-[#1a1a1a] flex items-center justify-between px-4">
                <span className="text-[13px] font-medium text-[#fafafa]">Tasks</span>
                <button
                  onClick={() => setShowTasks(false)}
                  className="w-6 h-6 flex items-center justify-center text-[#525252] hover:text-[#fafafa] hover:bg-[#1f1f1f] rounded transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
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
      
      {/* Right Panel - Chat */}
      <ErrorBoundary 
        name="ChatPanel" 
        fallback={<ChatErrorFallback onRetry={handleChatRetry} />}
      >
        <ChatPanel key={chatKey} />
      </ErrorBoundary>
    </BuilderLayout>
  )
}

// Premium tab button component
function TabButton({ 
  children, 
  active, 
  onClick,
  icon 
}: { 
  children: React.ReactNode
  active: boolean
  onClick: () => void
  icon: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium rounded-md transition-all duration-150 ${
        active
          ? 'bg-[#1f1f1f] text-[#fafafa] shadow-sm'
          : 'text-[#525252] hover:text-[#a1a1a1]'
      }`}
    >
      <span className={active ? 'text-[#fafafa]' : 'text-[#404040]'}>{icon}</span>
      {children}
    </button>
  )
}
