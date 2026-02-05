/**
 * TORBIT - Knowledge Review Panel
 * 
 * One-click review of project knowledge snapshot.
 * 
 * Shows:
 * - Frameworks detected
 * - Assumptions applied
 * - Sources consulted
 * - Freeze mode controls
 * 
 * No trends. No adoption suggestions.
 */

'use client'

import { useState } from 'react'
import type { KnowledgeSnapshot, FreezeMode } from '@/lib/knowledge/memory/types'
import { FREEZE_MODE_DESCRIPTIONS } from '@/lib/knowledge/memory/types'

interface KnowledgeReviewProps {
  snapshot: KnowledgeSnapshot
  onClose: () => void
  onModeChange?: (newMode: FreezeMode) => void
  canChangeModeToLive?: boolean
}

export function KnowledgeReview({
  snapshot,
  onClose,
  onModeChange,
  canChangeModeToLive = false,
}: KnowledgeReviewProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'frameworks' | 'assumptions'>('overview')
  
  return (
    <div className="bg-white rounded-lg shadow-lg border border-zinc-200 max-w-2xl w-full max-h-[80vh] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 bg-zinc-50">
        <div className="flex items-center gap-2">
          <span className="text-lg">📚</span>
          <h2 className="font-semibold text-zinc-900">Project Knowledge</h2>
          <span className="text-sm text-zinc-500">
            v{snapshot.version}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-zinc-400 hover:text-zinc-600 transition-colors"
        >
          ✕
        </button>
      </div>
      
      {/* Tabs */}
      <div className="flex border-b border-zinc-200">
        {(['overview', 'frameworks', 'assumptions'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`
              px-4 py-2 text-sm font-medium capitalize
              ${activeTab === tab
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-zinc-500 hover:text-zinc-700'}
            `}
          >
            {tab}
          </button>
        ))}
      </div>
      
      {/* Content */}
      <div className="p-4 overflow-y-auto max-h-96">
        {activeTab === 'overview' && (
          <OverviewTab
            snapshot={snapshot}
            onModeChange={onModeChange}
            canChangeModeToLive={canChangeModeToLive}
          />
        )}
        {activeTab === 'frameworks' && (
          <FrameworksTab snapshot={snapshot} />
        )}
        {activeTab === 'assumptions' && (
          <AssumptionsTab snapshot={snapshot} />
        )}
      </div>
      
      {/* Footer */}
      <div className="px-4 py-3 border-t border-zinc-200 bg-zinc-50 flex justify-between items-center">
        <span className="text-xs text-zinc-500">
          Snapshot: {snapshot.snapshotHash.slice(0, 12)}...
        </span>
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-zinc-700 bg-white border border-zinc-300 rounded hover:bg-zinc-50 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  )
}

// ============================================
// TAB COMPONENTS
// ============================================

function OverviewTab({
  snapshot,
  onModeChange,
  canChangeModeToLive,
}: {
  snapshot: KnowledgeSnapshot
  onModeChange?: (mode: FreezeMode) => void
  canChangeModeToLive: boolean
}) {
  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label="Confidence"
          value={`${Math.round(snapshot.confidence * 100)}%`}
        />
        <StatCard
          label="Frameworks"
          value={Object.keys(snapshot.frameworks).length.toString()}
        />
        <StatCard
          label="Assumptions"
          value={snapshot.assumptions.length.toString()}
        />
      </div>
      
      {/* Freeze Mode */}
      <div className="border border-zinc-200 rounded-lg p-4">
        <h3 className="font-medium text-zinc-900 mb-2">Freeze Mode</h3>
        <div className="space-y-2">
          {(['frozen', 'advisory', 'live'] as const).map(mode => (
            <label
              key={mode}
              className={`
                flex items-start gap-3 p-2 rounded cursor-pointer
                ${snapshot.freezeMode === mode
                  ? 'bg-blue-50 border border-blue-200'
                  : 'hover:bg-zinc-50'}
                ${mode === 'live' && !canChangeModeToLive ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <input
                type="radio"
                name="freezeMode"
                value={mode}
                checked={snapshot.freezeMode === mode}
                onChange={() => onModeChange?.(mode)}
                disabled={mode === 'live' && !canChangeModeToLive}
                className="mt-0.5"
              />
              <div>
                <span className="font-medium capitalize">{mode}</span>
                <p className="text-sm text-zinc-500">
                  {FREEZE_MODE_DESCRIPTIONS[mode]}
                </p>
              </div>
            </label>
          ))}
        </div>
      </div>
      
      {/* Created At */}
      <div className="text-sm text-zinc-500">
        Created: {new Date(snapshot.createdAt).toLocaleString()}
        {snapshot.frozenAt && (
          <span className="ml-2">
            | Frozen: {new Date(snapshot.frozenAt).toLocaleString()}
          </span>
        )}
      </div>
    </div>
  )
}

function FrameworksTab({ snapshot }: { snapshot: KnowledgeSnapshot }) {
  const frameworks = Object.entries(snapshot.frameworks)
  
  if (frameworks.length === 0) {
    return (
      <div className="text-center text-zinc-500 py-8">
        No frameworks detected
      </div>
    )
  }
  
  return (
    <div className="space-y-2">
      {frameworks.map(([name, version]) => (
        <div
          key={name}
          className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg"
        >
          <span className="font-medium text-zinc-900">{name}</span>
          <span className="text-sm text-zinc-600 font-mono">{version}</span>
        </div>
      ))}
    </div>
  )
}

function AssumptionsTab({ snapshot }: { snapshot: KnowledgeSnapshot }) {
  if (snapshot.assumptions.length === 0) {
    return (
      <div className="text-center text-zinc-500 py-8">
        No assumptions recorded
      </div>
    )
  }
  
  return (
    <div className="space-y-2">
      {snapshot.assumptions.map((assumption, i) => (
        <div
          key={i}
          className="p-3 border border-zinc-200 rounded-lg"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm text-zinc-900">{assumption.assumption}</p>
            <span className="text-xs text-zinc-500 whitespace-nowrap">
              {Math.round(assumption.confidence * 100)}%
            </span>
          </div>
          <div className="flex items-center gap-2 mt-2 text-xs text-zinc-500">
            <span>Source: {assumption.sourceId}</span>
            {assumption.strategistApproved && (
              <span className="text-green-600">✓ Approved</span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-zinc-50 rounded-lg p-3 text-center">
      <div className="text-2xl font-semibold text-zinc-900">{value}</div>
      <div className="text-xs text-zinc-500">{label}</div>
    </div>
  )
}
