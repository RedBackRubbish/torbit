import type { Meta, StoryObj } from '@storybook/react'
import MobileBuilderShell from './MobileBuilderShell'

const meta: Meta<typeof MobileBuilderShell> = {
  title: 'Builder/MobileBuilderShell',
  component: MobileBuilderShell,
  parameters: {
    layout: 'fullscreen',
    viewport: {
      defaultViewport: 'mobile1',
    },
    backgrounds: {
      default: 'dark',
      values: [{ name: 'dark', value: '#000000' }],
    },
  },
}

export default meta

type Story = StoryObj<typeof MobileBuilderShell>

export const Default: Story = {
  args: {
    chatPanel: (
      <div className="h-full border-r border-[#151515] bg-[#000000] p-4 text-sm text-white/60">
        Chat panel placeholder
      </div>
    ),
    previewPanel: (
      <div className="h-full bg-[#000000] p-4 text-sm text-white/60">Preview panel placeholder</div>
    ),
    filesPanel: (
      <div className="h-full bg-[#000000] p-4 text-sm text-white/60">Files panel placeholder</div>
    ),
    previewTab: 'preview',
    onPreviewTabChange: () => {},
    isWorking: true,
    workspaceTitle: 'Build a premium workflow app with collaboration and analytics',
    activeAgentLabel: 'Frontend',
    onlineCollaboratorCount: 2,
    headerActions: (
      <button className="rounded bg-white/10 px-2 py-1 text-[11px] text-white/80">Action</button>
    ),
  },
}
