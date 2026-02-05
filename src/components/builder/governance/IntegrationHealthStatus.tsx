'use client'

/**
 * TORBIT - Integration Health Status
 * 
 * Quiet status indicator. Only shows when something is wrong.
 * Appears in status bar or inline in export/deploy panels.
 * 
 * Philosophy: Invisible when healthy. Clear when not.
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Wrench,
  ExternalLink,
} from 'lucide-react'
import type { HealthReport, HealthFix, HealthIssue } from '@/lib/integrations/health/types'

interface IntegrationHealthStatusProps {
  report: HealthReport | null
  fixes?: HealthFix[]
  onFix?: (fix: HealthFix) => void
  onDismiss?: () => void
  compact?: boolean
}

export function IntegrationHealthStatus({
  report,
  fixes = [],
  onFix,
  onDismiss,
  compact = false,
}: IntegrationHealthStatusProps) {
  const [expanded, setExpanded] = useState(false)
  
  // Invisible when healthy or no report
  if (!report || report.status === 'healthy') {
    return null
  }
  
  const statusConfig = {
    warning: {
      icon: AlertTriangle,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      label: 'Integration warnings',
    },
    critical: {
      icon: XCircle,
      color: 'text-red-400',
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
      label: 'Integration issues',
    },
    healthy: {
      icon: CheckCircle,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      label: 'Integrations healthy',
    },
  }
  
  const config = statusConfig[report.status]
  const Icon = config.icon
  
  // Compact mode: just an icon with tooltip
  if (compact) {
    return (
      <button
        onClick={() => setExpanded(!expanded)}
        className={`p-1.5 rounded-md ${config.bg} ${config.color} hover:opacity-80 transition-opacity`}
        title={`${config.label}: ${report.summary.critical} critical, ${report.summary.warnings} warnings`}
      >
        <Icon className="w-4 h-4" />
      </button>
    )
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`rounded-lg border ${config.border} ${config.bg} overflow-hidden`}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Icon className={`w-5 h-5 ${config.color}`} />
          <div>
            <span className="text-sm font-medium text-white">
              {config.label}
            </span>
            <span className="ml-2 text-xs text-neutral-400">
              {report.summary.critical > 0 && `${report.summary.critical} critical`}
              {report.summary.critical > 0 && report.summary.warnings > 0 && ', '}
              {report.summary.warnings > 0 && `${report.summary.warnings} warnings`}
            </span>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-neutral-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-neutral-400" />
        )}
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
            <div className="px-4 py-3 space-y-3 max-h-64 overflow-y-auto">
              {report.issues.map((issue, index) => (
                <IssueCard
                  key={`${issue.type}-${index}`}
                  issue={issue}
                  fix={fixes.find((f) => f.packageName === ('packageName' in issue ? issue.packageName : ''))}
                  onFix={onFix}
                />
              ))}
            </div>
            
            {/* Actions */}
            {fixes.length > 0 && (
              <div className="px-4 py-3 border-t border-neutral-800 flex items-center justify-between">
                <span className="text-xs text-neutral-400">
                  {fixes.length} fix{fixes.length > 1 ? 'es' : ''} available
                </span>
                <button
                  onClick={() => fixes.forEach((fix) => onFix?.(fix))}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white bg-white/10 hover:bg-white/20 rounded-md transition-colors"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  Fix all
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

interface IssueCardProps {
  issue: HealthIssue
  fix?: HealthFix
  onFix?: (fix: HealthFix) => void
}

function IssueCard({ issue, fix, onFix }: IssueCardProps) {
  const isCritical = issue.severity === 'critical'
  
  const getIssueDescription = (): { title: string; detail: string } => {
    switch (issue.type) {
      case 'version-drift':
        return {
          title: `${issue.packageName} version mismatch`,
          detail: `Expected ${issue.manifestVersion}, found ${issue.installedVersion}`,
        }
      case 'missing-package':
        return {
          title: `${issue.packageName} not installed`,
          detail: `Required version: ${issue.requiredVersion}`,
        }
      case 'orphan-package':
        return {
          title: `${issue.packageName} not in manifest`,
          detail: issue.suggestion || 'Consider adding to integration or removing',
        }
      case 'deprecated-sdk':
        return {
          title: `${issue.packageName} is deprecated`,
          detail: issue.replacement 
            ? `Replace with ${issue.replacement}` 
            : 'Update to latest version',
        }
      case 'security-advisory':
        return {
          title: `${issue.packageName} has security issue`,
          detail: `CVE: ${issue.cveId}${issue.fixVersion ? ` • Fix: ${issue.fixVersion}` : ''}`,
        }
      case 'peer-mismatch':
        return {
          title: `${issue.packageName} peer dependency conflict`,
          detail: `${issue.peerPackage}: expected ${issue.requiredPeerVersion}, found ${issue.installedPeerVersion}`,
        }
      default:
        return {
          title: 'Unknown issue',
          detail: '',
        }
    }
  }
  
  const { title, detail } = getIssueDescription()
  
  return (
    <div className={`p-3 rounded-md ${isCritical ? 'bg-red-500/10' : 'bg-neutral-800/50'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{title}</p>
          <p className="text-xs text-neutral-400 mt-0.5">{detail}</p>
          
          {/* Migration guide link for deprecated packages */}
          {issue.type === 'deprecated-sdk' && issue.migrationGuide && (
            <a
              href={issue.migrationGuide}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-2 text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              Migration guide
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
        
        {fix && onFix && (
          <button
            onClick={() => onFix(fix)}
            className="shrink-0 px-2 py-1 text-xs font-medium text-white bg-white/10 hover:bg-white/20 rounded transition-colors"
          >
            Fix
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * Minimal status badge for status bar
 */
export function IntegrationHealthBadge({
  report,
  onClick,
}: {
  report: HealthReport | null
  onClick?: () => void
}) {
  if (!report || report.status === 'healthy') {
    return null
  }
  
  const isCritical = report.status === 'critical'
  
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors ${
        isCritical
          ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
          : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
      }`}
    >
      {isCritical ? (
        <XCircle className="w-3.5 h-3.5" />
      ) : (
        <AlertTriangle className="w-3.5 h-3.5" />
      )}
      {report.issues.length} issue{report.issues.length > 1 ? 's' : ''}
    </button>
  )
}
