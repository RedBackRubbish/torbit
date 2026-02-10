'use client'

import { useState, type ReactNode } from 'react'

type MobileBuilderTab = 'chat' | 'preview' | 'files'

interface MobileBuilderShellProps {
  chatPanel: ReactNode
  previewPanel: ReactNode
  filesPanel: ReactNode
  previewTab: 'preview' | 'code'
  onPreviewTabChange: (tab: 'preview' | 'code') => void
  isWorking: boolean
  onlineCollaboratorCount: number
  headerActions?: ReactNode
}

export default function MobileBuilderShell({
  chatPanel,
  previewPanel,
  filesPanel,
  previewTab,
  onPreviewTabChange,
  isWorking,
  onlineCollaboratorCount,
  headerActions,
}: MobileBuilderShellProps) {
  const [activeTab, setActiveTab] = useState<MobileBuilderTab>('chat')

  return (
    <div className="flex h-full w-full flex-col bg-[#000000]">
      <header className="border-b border-[#1f1f1f] bg-[#0a0a0a] px-3 py-2">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[11px] text-[#6b6b6b]">
            <span className={`h-1.5 w-1.5 rounded-full ${isWorking ? 'bg-emerald-400' : 'bg-[#333]'}`} />
            <span>{isWorking ? 'Working' : 'Ready'}</span>
            <span className="text-[#444]">•</span>
            <span>{onlineCollaboratorCount > 0 ? `${onlineCollaboratorCount + 1} online` : 'Solo session'}</span>
          </div>
          <div className="flex items-center gap-1">{headerActions}</div>
        </div>

        <div className="flex items-center rounded-lg border border-[#1f1f1f] bg-[#141414] p-0.5" role="tablist" aria-label="Builder main tabs">
          <MainTabButton
            active={activeTab === 'chat'}
            onClick={() => setActiveTab('chat')}
            label="Chat"
          />
          <MainTabButton
            active={activeTab === 'preview'}
            onClick={() => setActiveTab('preview')}
            label="Preview"
          />
          <MainTabButton
            active={activeTab === 'files'}
            onClick={() => setActiveTab('files')}
            label="Files"
          />
        </div>
      </header>

      {activeTab === 'preview' && (
        <div className="flex h-10 items-center gap-1 border-b border-[#1f1f1f] bg-[#0a0a0a] px-3">
          <PreviewTabButton
            active={previewTab === 'preview'}
            onClick={() => onPreviewTabChange('preview')}
            label="Preview"
          />
          <PreviewTabButton
            active={previewTab === 'code'}
            onClick={() => onPreviewTabChange('code')}
            label="Code"
          />
        </div>
      )}

      <main className="min-h-0 flex-1 overflow-hidden">
        {activeTab === 'chat' && <div className="h-full">{chatPanel}</div>}
        {activeTab === 'preview' && <div className="h-full">{previewPanel}</div>}
        {activeTab === 'files' && <div className="h-full">{filesPanel}</div>}
      </main>
    </div>
  )
}

function MainTabButton({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
        active ? 'bg-[#1f1f1f] text-[#fafafa]' : 'text-[#6f6f6f] hover:text-[#bcbcbc]'
      }`}
    >
      {label}
    </button>
  )
}

function PreviewTabButton({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
        active ? 'bg-[#1f1f1f] text-[#fafafa]' : 'text-[#636363] hover:text-[#a7a7a7]'
      }`}
    >
      {label}
    </button>
  )
}
