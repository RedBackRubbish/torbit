'use client'

/**
 * TORBIT - Compliance Export Options
 * 
 * Toggle for including compliance evidence in exports.
 * Default ON for production environment.
 */

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  getActiveEnvironment,
  type EnvironmentName,
  ENVIRONMENT_INFO,
} from '@/lib/integrations/environments'

// ============================================
// COMPLIANCE EXPORT TOGGLE
// ============================================

interface ComplianceExportToggleProps {
  value: boolean
  onChange: (value: boolean) => void
  className?: string
}

export function ComplianceExportToggle({ 
  value, 
  onChange, 
  className 
}: ComplianceExportToggleProps) {
  const [environment, setEnvironment] = useState<EnvironmentName>('local')
  
  useEffect(() => {
    const env = getActiveEnvironment()
    setEnvironment(env)
    
    // Default ON for production
    if (env === 'production' && !value) {
      onChange(true)
    }
  }, [onChange, value])

  const isProduction = environment === 'production'
  
  return (
    <div className={`flex items-center justify-between ${className || ''}`}>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-200">Include Compliance Evidence</span>
          {isProduction && (
            <span className="px-1.5 py-0.5 text-xs bg-purple-500/20 text-purple-300 rounded">
              Recommended
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-500 mt-0.5">
          Exports audit report, attestation, and ledger for security review.
        </p>
      </div>
      
      <button
        onClick={() => onChange(!value)}
        className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
          value ? 'bg-purple-500' : 'bg-zinc-700'
        }`}
      >
        <motion.div
          animate={{ x: value ? 20 : 2 }}
          transition={{ duration: 0.2 }}
          className="absolute top-1 w-4 h-4 bg-white rounded-full shadow"
        />
      </button>
    </div>
  )
}

// ============================================
// COMPLIANCE BUNDLE PREVIEW
// ============================================

interface ComplianceBundlePreviewProps {
  className?: string
}

export function ComplianceBundlePreview({ className }: ComplianceBundlePreviewProps) {
  const files = [
    { name: 'AUDIT_REPORT.md', description: 'Compliance audit report' },
    { name: 'ATTESTATION.txt', description: 'Signed attestation' },
    { name: 'INTEGRATIONS_LEDGER.json', description: 'Action history' },
    { name: 'POLICY_SNAPSHOT.json', description: 'Policy at export' },
    { name: 'ENVIRONMENT_PROFILE.json', description: 'Environment rules' },
    { name: 'HEALTH_STATUS.json', description: 'Health status' },
    { name: 'SIGNED_AUDIT_BUNDLE.json', description: 'Signed bundle proof' },
    { name: 'MANIFEST.json', description: 'File inventory' },
  ]
  
  return (
    <div className={`bg-zinc-900 rounded-lg border border-zinc-800 ${className || ''}`}>
      <div className="px-3 py-2 border-b border-zinc-800">
        <h4 className="text-xs font-medium text-zinc-400">
          📁 /compliance/
        </h4>
      </div>
      <div className="p-2 space-y-1">
        {files.map(file => (
          <div 
            key={file.name}
            className="flex items-center justify-between px-2 py-1.5 rounded bg-zinc-800/50"
          >
            <span className="text-xs text-zinc-300 font-mono">{file.name}</span>
            <span className="text-xs text-zinc-600">{file.description}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================
// EXPORT WITH COMPLIANCE CARD
// ============================================

interface ExportComplianceCardProps {
  projectName: string
  target: string
  includeCompliance: boolean
  onIncludeComplianceChange: (value: boolean) => void
  onExport: () => void
  isExporting?: boolean
  className?: string
}

export function ExportComplianceCard({
  projectName,
  target,
  includeCompliance,
  onIncludeComplianceChange,
  onExport,
  isExporting = false,
  className,
}: ExportComplianceCardProps) {
  const [environment, setEnvironment] = useState<EnvironmentName>('local')
  
  useEffect(() => {
    setEnvironment(getActiveEnvironment())
  }, [])
  
  const info = ENVIRONMENT_INFO[environment]
  
  return (
    <div className={`bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden ${className || ''}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-800">
        <h3 className="text-sm font-medium text-zinc-100">Export Project</h3>
        <p className="text-xs text-zinc-500 mt-0.5">
          {projectName} → {target}
        </p>
      </div>
      
      {/* Environment Badge */}
      <div className="px-4 py-2 bg-zinc-800/30 border-b border-zinc-800 flex items-center gap-2">
        <span className="text-sm">{info.icon}</span>
        <span className={`text-xs font-medium ${info.color}`}>{info.label} Environment</span>
      </div>
      
      {/* Compliance Toggle */}
      <div className="p-4 border-b border-zinc-800">
        <ComplianceExportToggle
          value={includeCompliance}
          onChange={onIncludeComplianceChange}
        />
      </div>
      
      {/* Bundle Preview */}
      {includeCompliance && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className="border-b border-zinc-800"
        >
          <div className="p-4">
            <p className="text-xs text-zinc-500 mb-2">
              The following files will be included:
            </p>
            <ComplianceBundlePreview />
          </div>
        </motion.div>
      )}
      
      {/* Export Button */}
      <div className="p-4">
        <button
          onClick={onExport}
          disabled={isExporting}
          className={`w-full py-2.5 rounded-lg font-medium text-sm transition-colors duration-200 ${
            isExporting
              ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
              : 'bg-purple-500 hover:bg-purple-600 text-white'
          }`}
        >
          {isExporting ? (
            <span className="flex items-center justify-center gap-2">
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                ⏳
              </motion.span>
              Exporting...
            </span>
          ) : (
            `Export${includeCompliance ? ' with Compliance' : ''}`
          )}
        </button>
      </div>
    </div>
  )
}

// ============================================
// COMPLIANCE STATUS BADGE
// ============================================

interface ComplianceStatusBadgeProps {
  status: 'compliant' | 'warnings' | 'non-compliant'
  className?: string
}

export function ComplianceStatusBadge({ status, className }: ComplianceStatusBadgeProps) {
  const config = {
    compliant: {
      icon: '✓',
      label: 'Compliant',
      color: 'bg-green-500/10 text-green-400 border-green-500/20',
    },
    warnings: {
      icon: '⚠',
      label: 'Warnings',
      color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    },
    'non-compliant': {
      icon: '✗',
      label: 'Non-Compliant',
      color: 'bg-red-500/10 text-red-400 border-red-500/20',
    },
  }
  
  const { icon, label, color } = config[status]
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded border ${color} ${className || ''}`}>
      <span>{icon}</span>
      <span>{label}</span>
    </span>
  )
}
