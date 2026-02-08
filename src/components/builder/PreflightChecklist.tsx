/**
 * TORBIT Mobile - Pre-flight Checklist Component
 * Shows validation results before export
 */

'use client'

import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Info,
  ChevronRight,
  Wrench,
  Shield,
} from 'lucide-react'
import type { ValidationResult, ValidationIssue, ValidationSeverity } from '@/lib/mobile/validation'

interface PreflightChecklistProps {
  result: ValidationResult
  onProceed: () => void
  onCancel: () => void
  isExporting: boolean
  actionLabel?: string
  readyLabel?: string
}

const SEVERITY_CONFIG: Record<ValidationSeverity, {
  icon: typeof CheckCircle2
  color: string
  bg: string
  border: string
}> = {
  error: {
    icon: XCircle,
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
  },
  info: {
    icon: Info,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
  },
}

export function PreflightChecklist({ 
  result, 
  onProceed, 
  onCancel,
  isExporting,
  actionLabel = 'Export',
  readyLabel = 'Your project is configured correctly for mobile release.'
}: PreflightChecklistProps) {
  const { valid, canExport, issues, stats } = result
  
  // Group issues by severity
  const errors = issues.filter(i => i.severity === 'error')
  const warnings = issues.filter(i => i.severity === 'warning')
  const infos = issues.filter(i => i.severity === 'info')
  
  return (
    <div className="space-y-4">
      {/* Status Banner */}
      <div className={`flex items-center gap-3 p-4 rounded-xl border ${
        valid 
          ? 'bg-emerald-500/10 border-emerald-500/20' 
          : canExport 
            ? 'bg-amber-500/10 border-amber-500/20'
            : 'bg-red-500/10 border-red-500/20'
      }`}>
        {valid ? (
          <>
            <CheckCircle2 className="w-6 h-6 text-emerald-500 flex-shrink-0" />
            <div>
              <p className="text-emerald-400 font-medium">Ready to Export</p>
              <p className="text-emerald-500/60 text-sm mt-0.5">
                All checks passed. Your project is ready.
              </p>
            </div>
          </>
        ) : canExport ? (
          <>
            <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0" />
            <div>
              <p className="text-amber-400 font-medium">Export with Warnings</p>
              <p className="text-amber-500/60 text-sm mt-0.5">
                {stats.warnings} warning{stats.warnings !== 1 ? 's' : ''} found. You can still export.
              </p>
            </div>
          </>
        ) : (
          <>
            <XCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
            <div>
              <p className="text-red-400 font-medium">Cannot Export</p>
              <p className="text-red-500/60 text-sm mt-0.5">
                {stats.errors} error{stats.errors !== 1 ? 's' : ''} must be fixed before exporting.
              </p>
            </div>
          </>
        )}
      </div>
      
      {/* Issues List */}
      {issues.length > 0 && (
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {/* Errors First */}
          {errors.length > 0 && (
            <IssueGroup title="Errors" issues={errors} />
          )}
          
          {/* Then Warnings */}
          {warnings.length > 0 && (
            <IssueGroup title="Warnings" issues={warnings} />
          )}
          
          {/* Then Info */}
          {infos.length > 0 && (
            <IssueGroup title="Notes" issues={infos} />
          )}
        </div>
      )}
      
      {/* All Clear State */}
      {issues.length === 0 && (
        <div className="flex flex-col items-center py-6 text-center">
          <div className="p-3 bg-emerald-500/10 rounded-full mb-3">
            <Shield className="w-8 h-8 text-emerald-500" />
          </div>
          <p className="text-neutral-300 font-medium">All Checks Passed</p>
          <p className="text-neutral-500 text-sm mt-1">
            {readyLabel}
          </p>
        </div>
      )}
      
      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={onCancel}
          disabled={isExporting}
          className="flex-1 py-3 bg-neutral-900 hover:bg-neutral-800 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={onProceed}
          disabled={!canExport || isExporting}
          className={`flex-1 flex items-center justify-center gap-2 py-3 font-medium rounded-xl transition-colors ${
            canExport
              ? 'bg-[#c0c0c0] hover:bg-white text-black'
              : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
          }`}
        >
          {isExporting ? (
            <>
              <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              Processing...
            </>
          ) : (
            <>
              {canExport ? actionLabel : 'Fix Errors First'}
              {canExport && <ChevronRight className="w-4 h-4" />}
            </>
          )}
        </button>
      </div>
    </div>
  )
}

function IssueGroup({ title, issues }: { title: string; issues: ValidationIssue[] }) {
  return (
    <div className="space-y-2">
      <p className="text-neutral-500 text-xs uppercase tracking-wider px-1">{title}</p>
      {issues.map(issue => (
        <IssueCard key={issue.id} issue={issue} />
      ))}
    </div>
  )
}

function IssueCard({ issue }: { issue: ValidationIssue }) {
  const config = SEVERITY_CONFIG[issue.severity]
  const Icon = config.icon
  
  return (
    <div className={`p-3 rounded-lg border ${config.bg} ${config.border}`}>
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${config.color}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={`font-medium text-sm ${config.color}`}>{issue.title}</p>
            <span className="px-1.5 py-0.5 bg-neutral-800 text-neutral-400 text-[10px] rounded uppercase">
              {issue.category}
            </span>
          </div>
          <p className="text-neutral-400 text-sm mt-0.5">{issue.description}</p>
          {issue.fix && (
            <p className="text-neutral-500 text-xs mt-1.5 flex items-center gap-1">
              <Wrench className="w-3 h-3" />
              {issue.fix}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
