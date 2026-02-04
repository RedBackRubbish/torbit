'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useBuilderStore } from '@/store/builder'
import FileExplorer from './FileExplorer'
import AgentPanel from './AgentPanel'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

/**
 * Sidebar - Left panel with file explorer and agent visualization
 */
export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { sidebarTab, setSidebarTab } = useBuilderStore()

  return (
    <motion.div
      className="h-full bg-black/60 border-r border-white/5 flex flex-col"
      animate={{ width: collapsed ? 48 : 280 }}
      transition={{ duration: 0.2 }}
    >
      {/* Header */}
      <div className="h-12 border-b border-white/5 flex items-center justify-between px-3">
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2"
            >
              <div className="w-2 h-2 bg-[#00ff41] rounded-full animate-pulse" />
              <span className="text-white/60 text-sm font-medium">TORBIT</span>
            </motion.div>
          )}
        </AnimatePresence>
        
        <button
          onClick={onToggle}
          className="w-6 h-6 flex items-center justify-center text-white/40 hover:text-white/80 transition-colors"
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

      {/* Tab Switcher */}
      <AnimatePresence mode="wait">
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex border-b border-white/5"
          >
            <button
              onClick={() => setSidebarTab('agents')}
              className={`flex-1 py-2 text-xs uppercase tracking-wider transition-colors ${
                sidebarTab === 'agents'
                  ? 'text-[#00ff41] border-b-2 border-[#00ff41]'
                  : 'text-white/30 hover:text-white/50'
              }`}
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Agents
            </button>
            <button
              onClick={() => setSidebarTab('files')}
              className={`flex-1 py-2 text-xs uppercase tracking-wider transition-colors ${
                sidebarTab === 'files'
                  ? 'text-[#00ff41] border-b-2 border-[#00ff41]'
                  : 'text-white/30 hover:text-white/50'
              }`}
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Files
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              key={sidebarTab}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {sidebarTab === 'files' ? <FileExplorer /> : <AgentPanel />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
