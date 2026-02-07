'use client'

/**
 * TORBIT - Integration History Panel
 * 
 * Read-only timeline view of integration lifecycle events.
 * Lives in InspectorView for advanced/enterprise users.
 * 
 * Philosophy: Invisible by default, always available.
 */

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  History,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Shield,
  Package,
  Download,
  Upload,
  Wrench,
  Clock,
  User,
  Eye,
  Filter,
} from 'lucide-react'
import type { IntegrationLedger, LedgerEntry, LedgerEventType } from '@/lib/integrations/ledger/types'
import { queryEntries, getTrackedIntegrations } from '@/lib/integrations/ledger/service'

interface IntegrationHistoryPanelProps {
  ledger: IntegrationLedger | null
  onClose?: () => void
}

export function IntegrationHistoryPanel({
  ledger,
  onClose,
}: IntegrationHistoryPanelProps) {
  const [filter, setFilter] = useState<string | null>(null)
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set())
  void onClose
  
  const integrations = useMemo(() => {
    if (!ledger) return []
    return getTrackedIntegrations(ledger)
  }, [ledger])
  
  const entries = useMemo(() => {
    if (!ledger) return []
    return queryEntries(ledger, {
      integration: filter || undefined,
    }).reverse() // Most recent first
  }, [ledger, filter])
  
  const toggleExpanded = (entryId: string) => {
    setExpandedEntries((prev) => {
      const next = new Set(prev)
      if (next.has(entryId)) {
        next.delete(entryId)
      } else {
        next.add(entryId)
      }
      return next
    })
  }
  
  if (!ledger) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-neutral-400 p-8">
        <History className="w-12 h-12 mb-4 opacity-50" />
        <p className="text-sm">No integration history yet</p>
        <p className="text-xs mt-1 opacity-75">Events will appear as integrations are installed</p>
      </div>
    )
  }
  
  return (
    <div className="flex flex-col h-full bg-neutral-950">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-neutral-400" />
          <span className="text-sm font-medium text-white">Integration History</span>
          <span className="px-1.5 py-0.5 text-xs bg-neutral-800 text-neutral-400 rounded">
            {ledger.entryCount} events
          </span>
        </div>
        
        {/* Filter dropdown */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={filter || ''}
              onChange={(e) => setFilter(e.target.value || null)}
              className="appearance-none pl-7 pr-8 py-1.5 text-xs bg-neutral-900 border border-neutral-700 rounded text-neutral-300 focus:outline-none focus:border-neutral-600"
            >
              <option value="">All integrations</option>
              {integrations.map((int) => (
                <option key={int} value={int}>
                  {int}
                </option>
              ))}
            </select>
            <Filter className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-500" />
          </div>
        </div>
      </div>
      
      {/* Timeline */}
      <div className="flex-1 overflow-y-auto">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-neutral-400 p-8">
            <Eye className="w-8 h-8 mb-3 opacity-50" />
            <p className="text-sm">No events for this filter</p>
          </div>
        ) : (
          <div className="p-4 space-y-2">
            {entries.map((entry) => (
              <TimelineEntry
                key={entry.id}
                entry={entry}
                expanded={expandedEntries.has(entry.id)}
                onToggle={() => toggleExpanded(entry.id)}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="px-4 py-2 border-t border-neutral-800 text-xs text-neutral-500">
        Ledger created {new Date(ledger.createdAt).toLocaleDateString()}
        {' • '}
        Last updated {new Date(ledger.lastUpdated).toLocaleString()}
      </div>
    </div>
  )
}

interface TimelineEntryProps {
  entry: LedgerEntry
  expanded: boolean
  onToggle: () => void
}

function TimelineEntry({ entry, expanded, onToggle }: TimelineEntryProps) {
  const config = getEventConfig(entry.event)
  const Icon = config.icon
  const time = new Date(entry.timestamp)
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-lg border ${config.borderColor} ${config.bgColor} overflow-hidden`}
    >
      {/* Entry header */}
      <button
        onClick={onToggle}
        className="w-full flex items-start gap-3 p-3 text-left hover:bg-white/5 transition-colors"
      >
        <div className={`shrink-0 p-1.5 rounded-md ${config.iconBg}`}>
          <Icon className={`w-4 h-4 ${config.iconColor}`} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white truncate">
              {entry.summary}
            </span>
          </div>
          
          <div className="flex items-center gap-2 mt-1 text-xs text-neutral-400">
            <span className="px-1.5 py-0.5 bg-neutral-800 rounded">
              {entry.integration}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span>{time.toLocaleDateString()}</span>
          </div>
        </div>
        
        <div className="shrink-0 text-neutral-500">
          {expanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </div>
      </button>
      
      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="border-t border-neutral-800"
          >
            <div className="p-3 space-y-2 text-xs">
              {/* Event ID */}
              <div className="flex items-center gap-2">
                <span className="text-neutral-500 w-20">Event ID</span>
                <code className="text-neutral-300 font-mono">{entry.id}</code>
              </div>
              
              {/* Event type */}
              <div className="flex items-center gap-2">
                <span className="text-neutral-500 w-20">Type</span>
                <code className="text-neutral-300 font-mono">{entry.event}</code>
              </div>
              
              {/* Timestamp */}
              <div className="flex items-center gap-2">
                <span className="text-neutral-500 w-20">Timestamp</span>
                <span className="text-neutral-300">{entry.timestamp}</span>
              </div>
              
              {/* Version */}
              {entry.version && (
                <div className="flex items-center gap-2">
                  <span className="text-neutral-500 w-20">Version</span>
                  <span className="text-neutral-300">{entry.version}</span>
                </div>
              )}
              
              {/* Packages */}
              {entry.packages && entry.packages.length > 0 && (
                <div className="flex items-start gap-2">
                  <span className="text-neutral-500 w-20">Packages</span>
                  <div className="flex-1 space-y-1">
                    {entry.packages.map((pkg) => (
                      <div key={pkg.name} className="flex items-center gap-2">
                        <Package className="w-3 h-3 text-neutral-500" />
                        <code className="text-neutral-300">{pkg.name}@{pkg.version}</code>
                        <span className="text-neutral-500">({pkg.category})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Governance */}
              {entry.governance && (
                <div className="flex items-start gap-2">
                  <span className="text-neutral-500 w-20">Governance</span>
                  <div className="flex-1 space-y-1">
                    {entry.governance.strategist && (
                      <div className="flex items-center gap-2">
                        <Shield className="w-3 h-3 text-blue-400" />
                        <span className="text-neutral-300">
                          Strategist: {entry.governance.strategist.verdict}
                        </span>
                        {entry.governance.strategist.reason && (
                          <span className="text-neutral-500">
                            – {entry.governance.strategist.reason}
                          </span>
                        )}
                      </div>
                    )}
                    {entry.governance.auditor && (
                      <div className="flex items-center gap-2">
                        <Eye className="w-3 h-3 text-purple-400" />
                        <span className="text-neutral-300">
                          Auditor: {entry.governance.auditor.verdict}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Consent */}
              {entry.consent && (
                <div className="flex items-center gap-2">
                  <span className="text-neutral-500 w-20">Consent</span>
                  <User className="w-3 h-3 text-neutral-400" />
                  <span className="text-neutral-300">
                    {entry.consent.granted ? 'Granted' : 'Denied'} ({entry.consent.method})
                  </span>
                </div>
              )}
              
              {/* Fix */}
              {entry.fix && (
                <div className="flex items-start gap-2">
                  <span className="text-neutral-500 w-20">Fix</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Wrench className="w-3 h-3 text-amber-400" />
                      <span className="text-neutral-300">{entry.fix.action}</span>
                      <span className="text-neutral-500">{entry.fix.packageName}</span>
                    </div>
                    <code className="block mt-1 p-2 bg-neutral-900 rounded text-neutral-400">
                      {entry.fix.command}
                    </code>
                  </div>
                </div>
              )}
              
              {/* Drift */}
              {entry.drift && entry.drift.length > 0 && (
                <div className="flex items-start gap-2">
                  <span className="text-neutral-500 w-20">Drift</span>
                  <div className="flex-1 space-y-1">
                    {entry.drift.map((d, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <AlertTriangle className={`w-3 h-3 ${
                          d.severity === 'critical' ? 'text-red-400' : 'text-amber-400'
                        }`} />
                        <span className="text-neutral-300">{d.packageName}</span>
                        <span className="text-neutral-500">{d.type}</span>
                        {d.expected && d.actual && (
                          <span className="text-neutral-500">
                            ({d.expected} → {d.actual})
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Session ID */}
              {entry.sessionId && (
                <div className="flex items-center gap-2">
                  <span className="text-neutral-500 w-20">Session</span>
                  <code className="text-neutral-400 font-mono text-[10px]">
                    {entry.sessionId}
                  </code>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

interface EventConfig {
  icon: typeof CheckCircle
  iconColor: string
  iconBg: string
  bgColor: string
  borderColor: string
}

function getEventConfig(event: LedgerEventType): EventConfig {
  // Success events
  if (event.includes('APPROVED') || event.includes('PASSED') || event.includes('COMPLETED') || event.includes('GRANTED')) {
    return {
      icon: CheckCircle,
      iconColor: 'text-emerald-400',
      iconBg: 'bg-emerald-500/10',
      bgColor: 'bg-neutral-900/50',
      borderColor: 'border-neutral-800',
    }
  }
  
  // Failure/block events
  if (event.includes('REJECTED') || event.includes('FAILED') || event.includes('BLOCKED') || event.includes('DENIED')) {
    return {
      icon: XCircle,
      iconColor: 'text-red-400',
      iconBg: 'bg-red-500/10',
      bgColor: 'bg-red-500/5',
      borderColor: 'border-red-500/20',
    }
  }
  
  // Drift/warning events
  if (event.includes('DRIFT') || event.includes('DEPRECATION') || event.includes('ORPHAN')) {
    return {
      icon: AlertTriangle,
      iconColor: 'text-amber-400',
      iconBg: 'bg-amber-500/10',
      bgColor: 'bg-amber-500/5',
      borderColor: 'border-amber-500/20',
    }
  }
  
  // Governance events
  if (event.includes('STRATEGIST') || event.includes('AUDITOR')) {
    return {
      icon: Shield,
      iconColor: 'text-blue-400',
      iconBg: 'bg-blue-500/10',
      bgColor: 'bg-neutral-900/50',
      borderColor: 'border-neutral-800',
    }
  }
  
  // Export/deploy events
  if (event.includes('EXPORT') || event.includes('DEPLOY')) {
    return {
      icon: event.includes('EXPORT') ? Download : Upload,
      iconColor: 'text-purple-400',
      iconBg: 'bg-purple-500/10',
      bgColor: 'bg-neutral-900/50',
      borderColor: 'border-neutral-800',
    }
  }
  
  // Fix events
  if (event.includes('FIX')) {
    return {
      icon: Wrench,
      iconColor: 'text-orange-400',
      iconBg: 'bg-orange-500/10',
      bgColor: 'bg-neutral-900/50',
      borderColor: 'border-neutral-800',
    }
  }
  
  // Default
  return {
    icon: History,
    iconColor: 'text-neutral-400',
    iconBg: 'bg-neutral-800',
    bgColor: 'bg-neutral-900/50',
    borderColor: 'border-neutral-800',
  }
}
