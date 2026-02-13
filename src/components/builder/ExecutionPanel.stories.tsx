import type { Meta, StoryObj } from '@storybook/react'
import ExecutionPanel from './ExecutionPanel'

const meta: Meta<typeof ExecutionPanel> = {
  title: 'Builder/ExecutionPanel',
  component: ExecutionPanel,
  parameters: {
    layout: 'padded',
    backgrounds: {
      default: 'dark',
      values: [{ name: 'dark', value: '#000000' }],
    },
  },
  argTypes: {
    projectId: { control: 'text', defaultValue: 'project-123' },
    userId: { control: 'text', defaultValue: 'user-123' },
    intent: { control: 'text', defaultValue: 'Deploy service' },
  },
}

export default meta
type Story = StoryObj<typeof ExecutionPanel>

/**
 * Default state - ready to execute
 */
export const Ready: Story = {
  args: {
    projectId: 'project-demo',
    userId: 'user-demo',
    intent: 'Deploy new microservice',
    input: { service: 'api', region: 'us-west-2', replicas: 3 },
  },
}

/**
 * Execution in progress
 */
export const Executing: Story = {
  args: {
    projectId: 'project-demo',
    userId: 'user-demo',
    intent: 'Deploy new microservice',
    input: { service: 'api', region: 'us-west-2', replicas: 3 },
  },
  play: async ({ canvasElement }) => {
    // Simulate start button click
    const startButton = canvasElement.querySelector('[data-testid="start-button"]') as HTMLButtonElement
    if (startButton) {
      startButton.click()
    }
  },
}

/**
 * Streaming with progress
 */
export const Streaming: Story = {
  args: {
    projectId: 'project-demo',
    userId: 'user-demo',
    intent: 'Validate configuration',
    input: { config: 'production', validate: true },
  },
}

/**
 * Completed successfully
 */
export const Success: Story = {
  args: {
    projectId: 'project-demo',
    userId: 'user-demo',
    intent: 'Deploy new microservice',
    input: { service: 'api', region: 'us-west-2', replicas: 3 },
  },
  play: async ({ canvasElement }) => {
    const statusElement = canvasElement.querySelector('[data-testid="status"]')
    if (statusElement) {
      statusElement.textContent = 'Status: success'
    }
  },
}

/**
 * Error state
 */
export const ErrorState: Story = {
  args: {
    projectId: 'project-demo',
    userId: 'user-demo',
    intent: 'Deploy new microservice',
    input: { service: 'api', region: 'us-west-2', replicas: 3 },
  },
  play: async ({ canvasElement }) => {
    const errorElement = canvasElement.querySelector('[data-testid="error-message"]')
    if (errorElement) {
      errorElement.textContent = 'Connection timeout: Failed to reach deployment service'
    }
  },
}

/**
 * With metrics displayed
 */
export const WithMetrics: Story = {
  args: {
    projectId: 'project-demo',
    userId: 'user-demo',
    intent: 'Complex operation',
    input: { complexity: 'high', retries: 3 },
  },
}

/**
 * Long-running execution
 */
export const LongRunning: Story = {
  args: {
    projectId: 'project-demo',
    userId: 'user-demo',
    intent: 'Data migration and validation',
    input: { batchSize: 1000, validateAll: true },
  },
}
