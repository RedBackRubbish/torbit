'use client'

import { useEffect, useState } from 'react'
import { useBuilderStore } from '@/store/builder'
import { WebContainerProvider } from '@/providers/WebContainerProvider'
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
  const { 
    initProject, 
    prompt,
    previewTab, 
    setPreviewTab,
    sidebarCollapsed,
    toggleSidebar,
  } = useBuilderStore()

  // Initialize project from session storage (from landing page)
  useEffect(() => {
    const storedPrompt = sessionStorage.getItem('torbit_prompt')
    if (storedPrompt && !prompt) {
      initProject(storedPrompt)
      sessionStorage.removeItem('torbit_prompt')
    }
  }, [initProject, prompt])

  return (
    <BuilderLayout>
      {/* Left Sidebar - File Explorer & Agents */}
      <Sidebar 
        collapsed={sidebarCollapsed} 
        onToggle={toggleSidebar} 
      />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Top Bar */}
        <header className="h-12 bg-neutral-900/80 border-b border-neutral-800 flex items-center justify-between px-4">
          <AgentStatusBar />
          
          {/* Tab Switcher */}
          <div className="flex items-center gap-1 bg-neutral-800/50 rounded-lg p-1">
            <button
              onClick={() => setPreviewTab('preview')}
              className={`px-4 py-1.5 text-sm rounded-md transition-all duration-200 ${
                previewTab === 'preview'
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Preview
            </button>
            <button
              onClick={() => setPreviewTab('code')}
              className={`px-4 py-1.5 text-sm rounded-md transition-all duration-200 ${
                previewTab === 'code'
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Code
            </button>
            <button
              onClick={() => setShowTasks(!showTasks)}
              className={`px-4 py-1.5 text-sm rounded-md transition-all duration-200 flex items-center gap-2 ${
                showTasks
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              Tasks
            </button>
          </div>
          
          {/* Actions - Throne Room: Reactor Core + Ship Command */}
          <div className="flex items-center gap-4 relative">
            {/* Fuel Gauge (Reactor Core) */}
            <FuelGauge />
            
            {/* Ship Menu (Deploy + Export) */}
            <ShipMenu />
          </div>
        </header>
        
        {/* Preview/Code Panel */}
        <PreviewPanel />
        
        {/* Tasks Slide-out Panel */}
        {showTasks && (
          <div className="absolute top-12 right-0 bottom-0 w-96 z-40 border-l border-neutral-800 shadow-2xl">
            <div className="h-full flex flex-col bg-neutral-900">
              <div className="h-10 border-b border-neutral-800 flex items-center justify-between px-4">
                <span className="text-sm font-medium text-neutral-300">Tasks</span>
                <button
                  onClick={() => setShowTasks(false)}
                  className="w-6 h-6 flex items-center justify-center text-neutral-500 hover:text-neutral-300 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <TasksPanel />
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Right Panel - Chat */}
      <ChatPanel />
    </BuilderLayout>
  )
}
