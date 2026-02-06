'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'

// ============================================================================
// VERIFICATION DETAIL DRAWER
// 
// A read-only proof surface. No logs. No raw output. Just facts.
// 
// For:
// - Senior engineers who want to verify
// - Compliance requirements
// - Self-reassurance
// 
// UX RULES:
// - Click "✓ Verified" → slide-in panel
// - Immutable data: hashes, timestamps, versions
// - No explanations. Data speaks.
// ============================================================================

export interface VerificationData {
  // Runtime
  environmentVerifiedAt: number | null
  runtimeVersion: string | null
  sandboxId: string | null
  
  // Dependencies
  dependenciesLockedAt: number | null
  dependencyCount: number
  lockfileHash: string | null
  
  // Build
  buildCompletedAt: number | null
  artifactCount: number
  
  // Auditor (placeholder for future)
  auditorVerdict: 'passed' | 'pending' | null
  auditorTimestamp: number | null
}

interface VerificationDetailDrawerProps {
  isOpen: boolean
  onClose: () => void
  data: VerificationData
}

function formatHash(hash: string | null): string {
  if (!hash) return '—'
  return hash.slice(0, 8) + '...' + hash.slice(-6)
}

function formatTimestamp(ts: number | null): string {
  if (!ts) return '—'
  return formatDistanceToNow(ts, { addSuffix: true })
}

function formatExactTime(ts: number | null): string {
  if (!ts) return '—'
  return new Date(ts).toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
}

export function VerificationDetailDrawer({
  isOpen,
  onClose,
  data,
}: VerificationDetailDrawerProps) {
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
          
          {/* Panel - slides from right */}
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="fixed right-0 top-0 h-full w-[380px] bg-[#0a0a0a] border-l border-[#1a1a1a] z-50 flex flex-col"
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-[#1a1a1a]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-white/[0.05] border border-white/[0.1] flex items-center justify-center">
                    <svg className="w-3 h-3 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="text-[13px] font-medium text-[#888]">Verification Details</h2>
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
            </div>
            
            {/* Body - Structured data sections */}
            <div className="flex-1 overflow-y-auto">
              {/* Runtime Section */}
              <div className="px-5 py-4 border-b border-[#151515]">
                <h3 className="text-[11px] text-[#505050] uppercase tracking-wider mb-3">Runtime</h3>
                <div className="space-y-3">
                  <DataRow 
                    label="Environment verified" 
                    value={formatTimestamp(data.environmentVerifiedAt)}
                    subvalue={formatExactTime(data.environmentVerifiedAt)}
                  />
                  <DataRow 
                    label="Runtime version" 
                    value={data.runtimeVersion || 'E2B Sandbox'}
                    mono
                  />
                  <DataRow 
                    label="Sandbox ID" 
                    value={formatHash(data.sandboxId)}
                    mono
                  />
                </div>
              </div>
              
              {/* Dependencies Section */}
              <div className="px-5 py-4 border-b border-[#151515]">
                <h3 className="text-[11px] text-[#505050] uppercase tracking-wider mb-3">Dependencies</h3>
                <div className="space-y-3">
                  <DataRow 
                    label="Locked at" 
                    value={formatTimestamp(data.dependenciesLockedAt)}
                    subvalue={formatExactTime(data.dependenciesLockedAt)}
                  />
                  <DataRow 
                    label="Package count" 
                    value={data.dependencyCount > 0 ? `${data.dependencyCount} packages` : '—'}
                  />
                  <DataRow 
                    label="Lockfile hash" 
                    value={formatHash(data.lockfileHash)}
                    mono
                  />
                </div>
              </div>
              
              {/* Build Section */}
              <div className="px-5 py-4 border-b border-[#151515]">
                <h3 className="text-[11px] text-[#505050] uppercase tracking-wider mb-3">Build</h3>
                <div className="space-y-3">
                  <DataRow 
                    label="Completed at" 
                    value={formatTimestamp(data.buildCompletedAt)}
                    subvalue={formatExactTime(data.buildCompletedAt)}
                  />
                  <DataRow 
                    label="Artifact count" 
                    value={data.artifactCount > 0 ? `${data.artifactCount} files` : '—'}
                  />
                </div>
              </div>
              
              {/* Auditor Section */}
              <div className="px-5 py-4">
                <h3 className="text-[11px] text-[#505050] uppercase tracking-wider mb-3">Auditor</h3>
                <div className="space-y-3">
                  <DataRow 
                    label="Verdict" 
                    value={data.auditorVerdict === 'passed' ? 'Passed' : data.auditorVerdict === 'pending' ? 'Pending' : '—'}
                    valueClass={data.auditorVerdict === 'passed' ? 'text-emerald-400/70' : undefined}
                  />
                  <DataRow 
                    label="Verified at" 
                    value={formatTimestamp(data.auditorTimestamp)}
                    subvalue={formatExactTime(data.auditorTimestamp)}
                  />
                </div>
              </div>
            </div>
            
            {/* Footer - Info */}
            <div className="px-5 py-3 border-t border-[#1a1a1a]">
              <p className="text-[11px] text-[#404040]">
                Immutable verification record. Generated at build time.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ============================================================================
// Data Row Component
// ============================================================================

interface DataRowProps {
  label: string
  value: string
  subvalue?: string
  mono?: boolean
  valueClass?: string
}

function DataRow({ label, value, subvalue, mono, valueClass }: DataRowProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-[12px] text-[#606060] flex-shrink-0">{label}</span>
      <div className="text-right">
        <span className={`text-[12px] ${valueClass || 'text-[#999]'} ${mono ? 'font-mono' : ''}`}>
          {value}
        </span>
        {subvalue && (
          <p className="text-[10px] text-[#404040] mt-0.5 font-mono">{subvalue}</p>
        )}
      </div>
    </div>
  )
}
