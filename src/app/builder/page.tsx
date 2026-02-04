'use client'

import { useEffect } from 'react'
import { useBuilderStore } from '@/store/builder'
import BuilderLayout from '@/components/builder/BuilderLayout'
import Sidebar from '@/components/builder/Sidebar'
import ChatPanel from '@/components/builder/ChatPanel'
import PreviewPanel from '@/components/builder/PreviewPanel'
import AgentStatusBar from '@/components/builder/AgentStatusBar'

export default function BuilderPage() {
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
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-12 bg-black/40 border-b border-white/5 flex items-center justify-between px-4">
          <AgentStatusBar />
          
          {/* Tab Switcher */}
          <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
            <button
              onClick={() => setPreviewTab('preview')}
              className={`px-4 py-1.5 text-sm rounded-md transition-all duration-200 ${
                previewTab === 'preview'
                  ? 'bg-[#00ff41]/20 text-[#00ff41]'
                  : 'text-white/40 hover:text-white/60'
              }`}
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Preview
            </button>
            <button
              onClick={() => setPreviewTab('code')}
              className={`px-4 py-1.5 text-sm rounded-md transition-all duration-200 ${
                previewTab === 'code'
                  ? 'bg-[#00ff41]/20 text-[#00ff41]'
                  : 'text-white/40 hover:text-white/60'
              }`}
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Code
            </button>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-3">
            <button 
              className="px-4 py-1.5 text-sm text-white/60 hover:text-white border border-white/10 hover:border-white/20 rounded-lg transition-all"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Export
            </button>
            <button 
              className="px-4 py-1.5 text-sm bg-[#00ff41] text-black font-medium rounded-lg hover:bg-[#00ff41]/90 transition-all hover:shadow-[0_0_20px_rgba(0,255,65,0.3)]"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Deploy
            </button>
          </div>
        </header>
        
        {/* Preview/Code Panel */}
        <PreviewPanel />
      </div>
      
      {/* Right Panel - Chat */}
      <ChatPanel />
    </BuilderLayout>
  )
}
