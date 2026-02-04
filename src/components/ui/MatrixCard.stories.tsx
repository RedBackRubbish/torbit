import type { Meta, StoryObj } from '@storybook/react';
import MatrixCard from './MatrixCard';

const meta = {
  title: 'UI/MatrixCard',
  component: MatrixCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'terminal', 'highlight'],
    },
    glow: {
      control: 'boolean',
    },
    title: {
      control: 'text',
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: '400px' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MatrixCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: (
      <div className="text-matrix-400 font-mono">
        <p>System Status: Online</p>
        <p className="text-matrix-600 text-sm mt-2">All modules operational</p>
      </div>
    ),
  },
};

export const WithTitle: Story = {
  args: {
    title: 'system.status',
    children: (
      <div className="text-matrix-400 font-mono text-sm">
        <div className="flex justify-between mb-2">
          <span className="text-matrix-600">CPU:</span>
          <span>47%</span>
        </div>
        <div className="flex justify-between mb-2">
          <span className="text-matrix-600">Memory:</span>
          <span>2.4 GB</span>
        </div>
        <div className="flex justify-between">
          <span className="text-matrix-600">Network:</span>
          <span>Connected</span>
        </div>
      </div>
    ),
  },
};

export const Terminal: Story = {
  args: {
    variant: 'terminal',
    title: 'terminal.log',
    children: (
      <div className="font-mono text-sm space-y-1">
        <p className="text-matrix-600">[00:00:01] Initializing...</p>
        <p className="text-matrix-400">[00:00:02] Loading modules...</p>
        <p className="text-matrix-400">[00:00:03] Connecting to network...</p>
        <p className="text-green-400">[00:00:04] Ready.</p>
      </div>
    ),
  },
};

export const Highlight: Story = {
  args: {
    variant: 'highlight',
    title: 'alert.critical',
    children: (
      <div className="text-matrix-300 font-mono">
        <p className="text-lg font-bold">⚠️ New Mission Available</p>
        <p className="text-matrix-500 text-sm mt-2">
          A new project has been assigned to your queue.
        </p>
      </div>
    ),
  },
};

export const NoGlow: Story = {
  args: {
    glow: false,
    children: (
      <div className="text-matrix-400 font-mono">
        <p>Stealth mode enabled</p>
      </div>
    ),
  },
};

export const AllVariants: Story = {
  args: {
    children: <p className="text-matrix-400">Variants</p>,
  },
  render: () => (
    <div className="flex flex-col gap-6">
      <MatrixCard variant="default" title="default.card">
        <p className="text-matrix-400 font-mono text-sm">Default variant</p>
      </MatrixCard>
      <MatrixCard variant="terminal" title="terminal.card">
        <p className="text-matrix-400 font-mono text-sm">Terminal variant</p>
      </MatrixCard>
      <MatrixCard variant="highlight" title="highlight.card">
        <p className="text-matrix-400 font-mono text-sm">Highlight variant</p>
      </MatrixCard>
    </div>
  ),
};
