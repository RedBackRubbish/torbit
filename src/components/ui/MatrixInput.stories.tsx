import type { Meta, StoryObj } from '@storybook/react';
import MatrixInput from './MatrixInput';

const meta = {
  title: 'UI/MatrixInput',
  component: MatrixInput,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    label: {
      control: 'text',
    },
    error: {
      control: 'text',
    },
    placeholder: {
      control: 'text',
    },
    glow: {
      control: 'boolean',
    },
    disabled: {
      control: 'boolean',
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: '320px' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MatrixInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: 'Enter access code...',
  },
};

export const WithLabel: Story = {
  args: {
    label: 'Access Code',
    placeholder: 'Enter your code...',
  },
};

export const WithError: Story = {
  args: {
    label: 'Password',
    placeholder: 'Enter password...',
    error: 'Authentication failed',
    defaultValue: 'incorrect',
  },
};

export const NoGlow: Story = {
  args: {
    placeholder: 'Stealth mode input...',
    glow: false,
  },
};

export const Disabled: Story = {
  args: {
    label: 'System Locked',
    placeholder: 'Access denied',
    disabled: true,
  },
};

export const Email: Story = {
  args: {
    label: 'Neural Link',
    type: 'email',
    placeholder: 'operator@matrix.net',
  },
};

export const FormExample: Story = {
  args: {
    placeholder: 'Form example',
  },
  render: () => (
    <div className="flex flex-col gap-4">
      <MatrixInput label="Username" placeholder="Enter username..." />
      <MatrixInput label="Password" type="password" placeholder="Enter password..." />
      <MatrixInput 
        label="Confirm" 
        type="password" 
        placeholder="Confirm password..." 
        error="Passwords do not match"
      />
    </div>
  ),
};
