import type { Meta, StoryObj } from '@storybook/react';
import MatrixButton from './MatrixButton';

const meta = {
  title: 'UI/MatrixButton',
  component: MatrixButton,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost', 'danger'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    glow: {
      control: 'boolean',
    },
    loading: {
      control: 'boolean',
    },
    disabled: {
      control: 'boolean',
    },
  },
} satisfies Meta<typeof MatrixButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    children: 'Initialize System',
    variant: 'primary',
  },
};

export const Secondary: Story = {
  args: {
    children: 'Run Diagnostics',
    variant: 'secondary',
  },
};

export const Ghost: Story = {
  args: {
    children: 'Cancel',
    variant: 'ghost',
  },
};

export const Danger: Story = {
  args: {
    children: 'Terminate Process',
    variant: 'danger',
  },
};

export const Small: Story = {
  args: {
    children: 'Small',
    size: 'sm',
  },
};

export const Large: Story = {
  args: {
    children: 'Large Button',
    size: 'lg',
  },
};

export const Loading: Story = {
  args: {
    children: 'Processing...',
    loading: true,
  },
};

export const Disabled: Story = {
  args: {
    children: 'Offline',
    disabled: true,
  },
};

export const NoGlow: Story = {
  args: {
    children: 'Stealth Mode',
    glow: false,
  },
};

export const AllVariants: Story = {
  args: {
    children: 'Variants',
  },
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex gap-4">
        <MatrixButton variant="primary">Primary</MatrixButton>
        <MatrixButton variant="secondary">Secondary</MatrixButton>
        <MatrixButton variant="ghost">Ghost</MatrixButton>
        <MatrixButton variant="danger">Danger</MatrixButton>
      </div>
      <div className="flex gap-4 items-center">
        <MatrixButton size="sm">Small</MatrixButton>
        <MatrixButton size="md">Medium</MatrixButton>
        <MatrixButton size="lg">Large</MatrixButton>
      </div>
    </div>
  ),
};
