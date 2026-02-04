'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import FileExplorer from './FileExplorer'
import NeuralTimeline from './NeuralTimeline'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

type SidebarTab = 'files' | 'neural'

/**
 * Sidebar - Left panel with file explorer and neural timeline
 */
export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const [activeTab, setActiveTab] = useState<SidebarTab>('files')
  
  return (
    <motion.div
      className="h-full bg-neutral-900/80 border-r border-neutral-800 flex flex-col"
      animate={{ width: collapsed ? 48 : 280 }}
      transition={{ duration: 0.2 }}
    >
      {/* Header with Tabs */}
      <div className="h-12 border-b border-neutral-800 flex items-center justify-between px-2">
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-1 bg-neutral-800/50 rounded-lg p-0.5"
            >
              {/* Files Tab */}
              <button
                onClick={() => setActiveTab('files')}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                  activeTab === 'files'
                    ? 'bg-neutral-700 text-neutral-200'
                    : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                Files
              </button>
              
              {/* Neural Tab */}
              <button
                onClick={() => setActiveTab('neural')}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                  activeTab === 'neural'
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Neural
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        
        <button
          onClick={onToggle}
          className="w-6 h-6 flex items-center justify-center text-neutral-500 hover:text-neutral-300 transition-colors"
        >
          <svg 
            className={`w-4 h-4 transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`}
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.15 }}
              className="h-full"
            >
              {activeTab === 'files' ? (
                <FileExplorer />
              ) : (
                <NeuralTimeline />
              )}
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Collapsed Icons */}
        {collapsed && (
          <div className="flex flex-col items-center gap-2 pt-3">
            <button
              onClick={() => { onToggle(); setActiveTab('files'); }}
              className="w-8 h-8 flex items-center justify-center text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800 rounded-lg transition-all"
              title="Files"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </button>
            <button
              onClick={() => { onToggle(); setActiveTab('neural'); }}
              className="w-8 h-8 flex items-center justify-center text-neutral-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all"
              title="Neural Link"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </motion.div>
  )
}
