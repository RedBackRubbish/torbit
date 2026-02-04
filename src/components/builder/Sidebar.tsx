'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import FileExplorer from './FileExplorer'
import NeuralTimeline from './NeuralTimeline'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

type SidebarTab = 'files' | 'activity'

/**
 * Sidebar - Emergent-style minimal file explorer
 */
export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const [activeTab, setActiveTab] = useState<SidebarTab>('files')
  
  return (
    <motion.aside
      className="h-full bg-[#0a0a0a] border-r border-[#1a1a1a] flex flex-col"
      animate={{ width: collapsed ? 44 : 200 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Header */}
      <div className="h-11 border-b border-[#1a1a1a] flex items-center px-2 shrink-0">
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex items-center gap-0.5"
            >
              <TabButton 
                active={activeTab === 'files'} 
                onClick={() => setActiveTab('files')}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                </svg>
                Files
              </TabButton>
              <TabButton 
                active={activeTab === 'activity'} 
                onClick={() => setActiveTab('activity')}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                </svg>
                Activity
              </TabButton>
            </motion.div>
          )}
        </AnimatePresence>
        
        <button
          onClick={onToggle}
          className="w-6 h-6 flex items-center justify-center text-[#404040] hover:text-[#737373] hover:bg-[#141414] rounded transition-colors ml-auto"
        >
          <svg 
            className={`w-3.5 h-3.5 transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`}
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="h-full"
            >
              {activeTab === 'files' ? <FileExplorer /> : <NeuralTimeline />}
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Collapsed state icons */}
        {collapsed && (
          <div className="flex flex-col items-center gap-1 pt-2">
            <button
              onClick={() => { onToggle(); setActiveTab('files'); }}
              className="w-9 h-9 flex items-center justify-center text-[#525252] hover:text-[#fafafa] hover:bg-[#141414] rounded-lg transition-all"
              title="Files"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
              </svg>
            </button>
            <button
              onClick={() => { onToggle(); setActiveTab('activity'); }}
              className="w-9 h-9 flex items-center justify-center text-[#525252] hover:text-[#fafafa] hover:bg-[#141414] rounded-lg transition-all"
              title="Activity"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </motion.aside>
  )
}

// Emergent-style tab button
function TabButton({ 
  children, 
  active, 
  onClick 
}: { 
  children: React.ReactNode
  active: boolean
  onClick: () => void 
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium rounded transition-all ${
        active
          ? 'bg-[#141414] text-[#e5e5e5]'
          : 'text-[#404040] hover:text-[#737373]'
      }`}
    >
      {children}
    </button>
  )
}
