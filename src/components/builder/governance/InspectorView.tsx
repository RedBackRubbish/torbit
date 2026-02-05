'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ============================================================================
// INSPECTOR VIEW
// 
// Opt-in timeline for advanced users. NOT the default experience.
// 
// UX RULES:
// - Timeline, not chat.
// - Each entry expandable to: Summary, Inputs, Outputs
// - NEVER shows: Raw prompts, chain-of-thought, tool arguments, agent-to-agent chat
// - Model names hidden by default (optional toggle for dev accounts)
// ============================================================================

export type ActivityType = 
  | 'plan-created'
  | 'plan-reviewed'
  | 'amendment-applied'
  | 'ui-built'
  | 'api-wired'
  | 'validated'
  | 'quality-gate'
  | 'export-ready'
  | 'error'

export interface ActivityEntry {
  id: string
  timestamp: Date
  type: ActivityType
  summary: string
  agent?: string // Only shown if showAgentNames is true
  expanded?: {
    inputs?: string
    outputs?: string
  }
  status: 'pending' | 'complete' | 'error'
}

interface InspectorViewProps {
  activities: ActivityEntry[]
  isOpen: boolean
  onClose: () => void
  showAgentNames?: boolean // For internal/dev accounts only
}

const TYPE_LABELS: Record<ActivityType, string> = {
  'plan-created': 'Created execution plan',
  'plan-reviewed': 'Reviewed plan',
  'amendment-applied': 'Applied amendments',
  'ui-built': 'Built UI',
  'api-wired': 'Wired APIs',
  'validated': 'Validated flows',
  'quality-gate': 'Quality gate',
  'export-ready': 'Ready for export',
  'error': 'Error occurred',
}

const TYPE_ICONS: Record<ActivityType, React.ReactNode> = {
  'plan-created': (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
    </svg>
  ),
  'plan-reviewed': (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  'amendment-applied': (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
    </svg>
  ),
  'ui-built': (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
    </svg>
  ),
  'api-wired': (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z" />
    </svg>
  ),
  'validated': (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  ),
  'quality-gate': (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m8.9-4.414c.376.023.75.05 1.124.08 1.131.094 1.976 1.057 1.976 2.192V16.5A2.25 2.25 0 0118 18.75h-2.25m-7.5-10.5H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V18.75m-7.5-10.5h6.375c.621 0 1.125.504 1.125 1.125v9.375m-8.25-3l1.5 1.5 3-3.75" />
    </svg>
  ),
  'export-ready': (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
  ),
  'error': (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
    </svg>
  ),
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  })
}

export function InspectorView({ 
  activities, 
  isOpen, 
  onClose,
  showAgentNames = false 
}: InspectorViewProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 z-40"
            onClick={onClose}
          />
          
          {/* Panel */}
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="fixed right-0 top-0 h-full w-[380px] bg-[#0a0a0a] border-l border-[#1a1a1a] z-50 flex flex-col"
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-[#1a1a1a] flex items-center justify-between">
              <div>
                <h2 className="text-[13px] font-medium text-[#888]">Internal Activity</h2>
                <p className="text-[11px] text-[#505050]">Timeline of operations</p>
              </div>
              <button
                onClick={onClose}
                className="w-6 h-6 flex items-center justify-center text-[#505050] hover:text-[#888] rounded transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Timeline */}
            <div className="flex-1 overflow-y-auto p-4">
              {activities.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-[13px] text-[#505050]">
                  No activity yet
                </div>
              ) : (
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-[7px] top-2 bottom-2 w-px bg-[#1a1a1a]" />
                  
                  {/* Entries */}
                  <div className="space-y-1">
                    {activities.map((activity) => {
                      const isExpanded = expandedId === activity.id
                      const hasDetails = activity.expanded?.inputs || activity.expanded?.outputs
                      
                      return (
                        <div key={activity.id} className="relative pl-6">
                          {/* Timeline dot */}
                          <div 
                            className={`absolute left-0 top-2 w-[14px] h-[14px] rounded-full border-2 flex items-center justify-center ${
                              activity.status === 'complete' 
                                ? 'bg-[#0a0a0a] border-emerald-500/50' 
                                : activity.status === 'error'
                                ? 'bg-[#0a0a0a] border-red-500/50'
                                : 'bg-[#0a0a0a] border-[#333]'
                            }`}
                          >
                            {activity.status === 'pending' && (
                              <motion.div
                                className="w-2 h-2 rounded-full bg-[#505050]"
                                animate={{ opacity: [0.3, 1, 0.3] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                              />
                            )}
                          </div>
                          
                          {/* Entry */}
                          <button
                            onClick={() => hasDetails && setExpandedId(isExpanded ? null : activity.id)}
                            disabled={!hasDetails}
                            className={`w-full text-left py-2 px-2.5 rounded-lg transition-colors ${
                              hasDetails ? 'hover:bg-[#111] cursor-pointer' : 'cursor-default'
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              {/* Time */}
                              <span className="text-[11px] text-[#404040] font-mono shrink-0 w-10">
                                [{formatTime(activity.timestamp)}]
                              </span>
                              
                              {/* Icon + Summary */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={`shrink-0 ${
                                    activity.status === 'error' ? 'text-red-400' : 'text-[#606060]'
                                  }`}>
                                    {TYPE_ICONS[activity.type]}
                                  </span>
                                  <span className="text-[12px] text-[#999] truncate">
                                    {showAgentNames && activity.agent 
                                      ? `${activity.agent} ${TYPE_LABELS[activity.type].toLowerCase()}`
                                      : activity.summary || TYPE_LABELS[activity.type]
                                    }
                                  </span>
                                  {activity.status === 'complete' && activity.type === 'plan-reviewed' && (
                                    <span className="text-[10px] text-emerald-500">→ Approved</span>
                                  )}
                                </div>
                              </div>
                              
                              {/* Expand indicator */}
                              {hasDetails && (
                                <svg 
                                  className={`w-3 h-3 text-[#404040] transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                                  fill="none" 
                                  viewBox="0 0 24 24" 
                                  stroke="currentColor" 
                                  strokeWidth={2}
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                                </svg>
                              )}
                            </div>
                          </button>
                          
                          {/* Expanded details */}
                          <AnimatePresence>
                            {isExpanded && hasDetails && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="px-2.5 pb-2 space-y-2">
                                  {activity.expanded?.inputs && (
                                    <div>
                                      <p className="text-[10px] text-[#404040] mb-1">Inputs</p>
                                      <p className="text-[11px] text-[#666] bg-[#0f0f0f] rounded px-2 py-1.5">
                                        {activity.expanded.inputs}
                                      </p>
                                    </div>
                                  )}
                                  {activity.expanded?.outputs && (
                                    <div>
                                      <p className="text-[10px] text-[#404040] mb-1">Outputs</p>
                                      <p className="text-[11px] text-[#666] bg-[#0f0f0f] rounded px-2 py-1.5">
                                        {activity.expanded.outputs}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="px-5 py-3 border-t border-[#1a1a1a]">
              <p className="text-[10px] text-[#404040]">
                This view shows internal orchestration. No raw prompts or model reasoning are exposed.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
