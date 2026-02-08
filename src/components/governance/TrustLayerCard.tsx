'use client'

import { useMemo } from 'react'
import { useGovernanceStore, useLatestSignedBundle } from '@/store/governance'

interface TrustLayerCardProps {
  action: string
  summary: string
  requestId?: string | null
  requireApproval?: boolean
  onRequestIdChange?: (requestId: string) => void
  className?: string
}

function truncate(value: string, max = 16): string {
  if (value.length <= max) return value
  return `${value.slice(0, max)}…`
}

export function TrustLayerCard({
  action,
  summary,
  requestId,
  requireApproval = true,
  onRequestIdChange,
  className,
}: TrustLayerCardProps) {
  const approvals = useGovernanceStore((state) => state.approvals)
  const projectId = useGovernanceStore((state) => state.projectId)
  const requestApproval = useGovernanceStore((state) => state.requestApproval)
  const resolveApproval = useGovernanceStore((state) => state.resolveApproval)
  const latestBundle = useLatestSignedBundle()

  const currentApproval = useMemo(() => {
    if (!requestId) return null
    return approvals.find((approval) => approval.id === requestId) || null
  }, [approvals, requestId])

  const pendingApprovals = useMemo(() => (
    approvals
      .filter((approval) => approval.projectId === projectId && approval.status === 'pending')
      .slice(0, 3)
  ), [approvals, projectId])

  const handleRequest = () => {
    const id = requestApproval({
      action,
      summary,
      requestedBy: 'torbit',
    })
    onRequestIdChange?.(id)
  }

  const handleResolve = (status: 'approved' | 'rejected') => {
    if (!currentApproval) return
    resolveApproval({
      requestId: currentApproval.id,
      status,
      resolvedBy: 'project-owner',
      decisionNote: status === 'approved' ? 'Approved in trust layer panel' : 'Rejected in trust layer panel',
    })
  }

  return (
    <div className={`rounded-xl border border-neutral-800 bg-neutral-900/70 p-3 space-y-3 ${className || ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-neutral-100">Trust Layer</p>
          <p className="text-xs text-neutral-500 mt-1">Approval flow + signed audit proof for this release action.</p>
        </div>
        <span className="px-2 py-0.5 rounded border border-neutral-700 text-[10px] uppercase tracking-wide text-neutral-400">
          Governance
        </span>
      </div>

      {requireApproval && !currentApproval && (
        <div className="rounded-lg border border-neutral-700 bg-neutral-950 p-3 space-y-2">
          <p className="text-xs text-neutral-300">No approval requested yet for <span className="text-neutral-100">{action}</span>.</p>
          <button
            type="button"
            onClick={handleRequest}
            className="px-3 py-1.5 rounded bg-neutral-100 text-black text-xs font-medium hover:bg-white transition-colors"
          >
            Request Approval
          </button>
        </div>
      )}

      {requireApproval && currentApproval && (
        <div className="rounded-lg border border-neutral-700 bg-neutral-950 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-neutral-300">Approval Status</p>
            <span className={`text-[11px] uppercase tracking-wide ${
              currentApproval.status === 'approved'
                ? 'text-emerald-400'
                : currentApproval.status === 'rejected'
                  ? 'text-red-400'
                  : 'text-amber-400'
            }`}>
              {currentApproval.status}
            </span>
          </div>
          <p className="text-xs text-neutral-500">{currentApproval.summary}</p>

          {currentApproval.status === 'pending' && (
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleResolve('approved')}
                className="px-3 py-1.5 rounded bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-medium"
              >
                Approve
              </button>
              <button
                type="button"
                onClick={() => handleResolve('rejected')}
                className="px-3 py-1.5 rounded bg-red-500/20 border border-red-500/30 text-red-300 text-xs font-medium"
              >
                Reject
              </button>
            </div>
          )}

          {currentApproval.resolvedAt && (
            <p className="text-[11px] text-neutral-500">
              Resolved {new Date(currentApproval.resolvedAt).toLocaleString()} by {currentApproval.resolvedBy || 'unknown'}
            </p>
          )}
        </div>
      )}

      {pendingApprovals.length > 0 && (!currentApproval || currentApproval.status !== 'pending') && (
        <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-3">
          <p className="text-xs text-neutral-400 mb-2">Pending approvals</p>
          <div className="space-y-1.5">
            {pendingApprovals.map((approval) => (
              <div key={approval.id} className="text-[11px] text-neutral-500">
                <span className="text-neutral-300">{approval.action}</span>
                {' '}
                <span>• {new Date(approval.requestedAt).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {latestBundle && (
        <div className="rounded-lg border border-neutral-700 bg-neutral-950 p-3 space-y-1.5">
          <p className="text-xs text-neutral-300">Latest Signed Audit Bundle</p>
          <div className="text-[11px] text-neutral-500 space-y-1">
            <p><span className="text-neutral-400">Action:</span> {latestBundle.action}</p>
            <p><span className="text-neutral-400">Key:</span> {latestBundle.keyId}</p>
            <p><span className="text-neutral-400">Bundle Hash:</span> {truncate(latestBundle.bundleHash, 24)}</p>
            <p><span className="text-neutral-400">Signature:</span> {truncate(latestBundle.signature, 24)}</p>
            <p><span className="text-neutral-400">Signed At:</span> {new Date(latestBundle.createdAt).toLocaleString()}</p>
          </div>
        </div>
      )}
    </div>
  )
}
