import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import ErrorBoundary from '../ErrorBoundary'

const ThrowError = ({ throwError }: { throwError: boolean }) => {
  if (throwError) {
    throw new Error('Something went wrong in this component!')
  }
  return <div className="p-4 bg-green-50 text-green-700 rounded">Component working normally</div>
}

interface ErrorBoundaryStoryProps {
  throwError?: boolean
  level?: 'error' | 'warning'
  resetKeysValue?: number
}

const ErrorBoundaryStory = ({
  throwError = false,
  level = 'error',
  resetKeysValue = 1,
}: ErrorBoundaryStoryProps) => {
  const [hasError, setHasError] = useState(throwError)

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <button
          onClick={() => setHasError(!hasError)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {hasError ? 'Fix Error' : 'Trigger Error'}
        </button>
      </div>

      <ErrorBoundary
        level={level}
        resetKeys={[resetKeysValue]}
        fallback={({ error, reset }) => (
          <div className="p-4 bg-red-50 border border-red-200 rounded">
            <h3 className="font-semibold text-red-900 mb-2">Error Caught</h3>
            <p className="text-red-700 text-sm mb-3">{error?.message}</p>
            <button
              onClick={reset}
              className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        )}
      >
        <ThrowError throwError={hasError} />
      </ErrorBoundary>
    </div>
  )
}

const meta: Meta<typeof ErrorBoundaryStory> = {
  title: 'Components/ErrorBoundary',
  component: ErrorBoundaryStory,
  parameters: {
    layout: 'padded',
    backgrounds: {
      default: 'light',
    },
  },
  argTypes: {
    throwError: { control: 'boolean' },
    level: { control: 'select', options: ['error', 'warning'] },
    resetKeysValue: { control: 'number' },
  },
}

export default meta
type Story = StoryObj<typeof ErrorBoundaryStory>

/**
 * Normal state - no errors
 */
export const NoError: Story = {
  args: {
    throwError: false,
    level: 'error',
    resetKeysValue: 1,
  },
}

/**
 * Error state - component threw
 */
export const WithError: Story = {
  args: {
    throwError: true,
    level: 'error',
    resetKeysValue: 1,
  },
}

/**
 * Warning level
 */
export const WarningLevel: Story = {
  args: {
    throwError: true,
    level: 'warning',
    resetKeysValue: 1,
  },
}

/**
 * Reset keys can trigger recovery
 */
export const ResetKeysDemo: Story = {
  args: {
    throwError: true,
    level: 'error',
    resetKeysValue: 1,
  },
  play: async ({ canvasElement, args }) => {
    // Simulate resetKeys changing
    await new Promise((resolve) => setTimeout(resolve, 500))
    // In real scenario, resetKeysValue would change which triggers reset
  },
}

/**
 * Interactive - can toggle error state
 */
export const Interactive: Story = {
  args: {
    throwError: false,
    level: 'error',
    resetKeysValue: 1,
  },
}

/**
 * Multiple resets allowed
 */
export const MultipleRecoveries: Story = {
  args: {
    throwError: false,
    level: 'error',
    resetKeysValue: 1,
  },
}
