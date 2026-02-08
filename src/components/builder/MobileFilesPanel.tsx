'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { useBuilderStore } from '@/store/builder'
import { FileExplorerSkeleton } from '@/components/ui/skeletons'

const FileExplorer = dynamic(() => import('./FileExplorer'), {
  loading: () => <FileExplorerSkeleton rows={8} />,
})

const NeuralTimeline = dynamic(() => import('./NeuralTimeline'), {
  loading: () => <FileExplorerSkeleton rows={6} />,
})

const ProtectedPanel = dynamic(
  () => import('./ProtectedPanel').then((module) => module.ProtectedPanel),
  { loading: () => <FileExplorerSkeleton rows={6} /> }
)

const CapabilitiesPanel = dynamic(
  () => import('./CapabilitiesPanel').then((module) => module.CapabilitiesPanel),
  { loading: () => <FileExplorerSkeleton rows={4} /> }
)

type MobileFilesTab = 'files' | 'activity' | 'protected'

export default function MobileFilesPanel() {
  const [activeTab, setActiveTab] = useState<MobileFilesTab>('files')
  const { projectType } = useBuilderStore()

  return (
    <section className="flex h-full flex-col bg-[#000000]">
      <div
        className="flex h-10 items-center gap-1 border-b border-[#151515] bg-[#050505] px-2"
        role="tablist"
        aria-label="Builder files panel tabs"
      >
        <MobileTabButton
          active={activeTab === 'files'}
          onClick={() => setActiveTab('files')}
          label="Files"
        />
        <MobileTabButton
          active={activeTab === 'activity'}
          onClick={() => setActiveTab('activity')}
          label="Activity"
        />
        <MobileTabButton
          active={activeTab === 'protected'}
          onClick={() => setActiveTab('protected')}
          label="Protected"
        />
      </div>

      <div className="flex-1 overflow-hidden">
        {activeTab === 'files' && <FileExplorer />}
        {activeTab === 'activity' && <NeuralTimeline />}
        {activeTab === 'protected' && <ProtectedPanel />}
      </div>

      {projectType === 'mobile' && (
        <div className="border-t border-[#151515] bg-[#050505]">
          <CapabilitiesPanel />
        </div>
      )}
    </section>
  )
}

function MobileTabButton({
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
      className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
        active ? 'bg-[#0f0f0f] text-[#c0c0c0]' : 'text-[#636363] hover:text-[#a5a5a5]'
      }`}
    >
      {label}
    </button>
  )
}
