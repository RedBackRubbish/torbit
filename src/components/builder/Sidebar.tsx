'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence } from 'framer-motion'
import { ProjectTypeSelector } from './ProjectTypeSelector'
import { useBuilderStore } from '@/store/builder'
import { useInvariantCount } from '@/store/governance'
import { FileExplorerSkeleton } from '@/components/ui/skeletons'

const FileExplorer = dynamic(() => import('./FileExplorer'), {
  loading: () => <FileExplorerSkeleton rows={8} />,
})

const NeuralTimeline = dynamic(() => import('./NeuralTimeline'), {
  loading: () => <FileExplorerSkeleton rows={6} />,
})

const CapabilitiesPanel = dynamic(
  () => import('./CapabilitiesPanel').then((module) => module.CapabilitiesPanel),
  { loading: () => <FileExplorerSkeleton rows={4} /> }
)

const ProtectedPanel = dynamic(
  () => import('./ProtectedPanel').then((module) => module.ProtectedPanel),
  { loading: () => <FileExplorerSkeleton rows={6} /> }
)

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

type SidebarTab = 'files' | 'activity' | 'protected'

/**
 * Sidebar - Emergent-style minimal file explorer
 */
export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const [activeTab, setActiveTab] = useState<SidebarTab>('files')
  const { projectType } = useBuilderStore()
  const invariantCount = useInvariantCount()
  
  return (
    <motion.aside
      className="h-full bg-[#000000] border-r border-[#151515] flex flex-col"
      animate={{ width: collapsed ? 44 : 200 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Header */}
      <div className="h-11 border-b border-[#151515] flex items-center px-2 shrink-0">
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
              <TabButton 
                active={activeTab === 'protected'} 
                onClick={() => setActiveTab('protected')}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
                {invariantCount > 0 && (
                  <span className="text-[9px] text-emerald-500/60 tabular-nums">{invariantCount}</span>
                )}
              </TabButton>
            </motion.div>
          )}
        </AnimatePresence>
        
        <button
          onClick={onToggle}
          className="w-6 h-6 flex items-center justify-center text-[#505050] hover:text-[#a8a8a8] hover:bg-[#0a0a0a] rounded transition-colors ml-auto"
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

      {/* Project Type Selector */}
      {!collapsed && (
        <div className="px-2 py-2 border-b border-[#151515]">
          <ProjectTypeSelector compact />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex-1 overflow-hidden"
            >
              {activeTab === 'files' && <FileExplorer />}
              {activeTab === 'activity' && <NeuralTimeline />}
              {activeTab === 'protected' && <ProtectedPanel />}
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Capabilities Panel - Only show when mobile and not collapsed */}
        {!collapsed && projectType === 'mobile' && (
          <CapabilitiesPanel />
        )}
        
        {/* Collapsed state icons */}
        {collapsed && (
          <div className="flex flex-col items-center gap-1 pt-2">
            <button
              onClick={() => { onToggle(); setActiveTab('files'); }}
              className={`relative w-9 h-9 flex items-center justify-center hover:text-[#c0c0c0] hover:bg-[#0a0a0a] rounded-lg transition-all ${
                activeTab === 'files' ? 'text-[#c0c0c0]' : 'text-[#505050]'
              }`}
              title="Files"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
              </svg>
              {activeTab === 'files' && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-[#c0c0c0] rounded-r" />}
            </button>
            <button
              onClick={() => { onToggle(); setActiveTab('activity'); }}
              className={`relative w-9 h-9 flex items-center justify-center hover:text-[#c0c0c0] hover:bg-[#0a0a0a] rounded-lg transition-all ${
                activeTab === 'activity' ? 'text-[#c0c0c0]' : 'text-[#505050]'
              }`}
              title="Activity"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
              {activeTab === 'activity' && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-[#c0c0c0] rounded-r" />}
            </button>
            <button
              onClick={() => { onToggle(); setActiveTab('protected'); }}
              className={`relative w-9 h-9 flex items-center justify-center hover:text-[#c0c0c0] hover:bg-[#0a0a0a] rounded-lg transition-all ${
                activeTab === 'protected' ? 'text-[#c0c0c0]' : 'text-[#505050]'
              }`}
              title="Protected"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
              {invariantCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-emerald-500/60 rounded-full" />
              )}
              {activeTab === 'protected' && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-[#c0c0c0] rounded-r" />}
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
  onClick,
}: {
  children: React.ReactNode
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium rounded transition-all ${
        active
          ? 'bg-[#0f0f0f] text-[#c0c0c0]'
          : 'text-[#505050] hover:text-[#909090]'
      }`}
    >
      {children}
    </button>
  )
}
