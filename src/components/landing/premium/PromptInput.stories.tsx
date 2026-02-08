import { useRef, useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { PromptInput } from './PromptInput'
import { useCapabilitySelection } from './useCapabilitySelection'

const meta: Meta<typeof PromptInput> = {
  title: 'Landing/Premium/PromptInput',
  component: PromptInput,
  parameters: {
    layout: 'padded',
    backgrounds: {
      default: 'dark',
      values: [{ name: 'dark', value: '#000000' }],
    },
  },
}

export default meta

type Story = StoryObj<typeof PromptInput>

function PromptInputPreview() {
  const [prompt, setPrompt] = useState('Build a collaborative analytics dashboard')
  const [platform, setPlatform] = useState<'web' | 'ios'>('web')
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const {
    selectedCapabilities,
    showMoreCapabilities,
    setShowMoreCapabilities,
    toggleCapability,
    getCapabilityById,
    moreRef,
  } = useCapabilitySelection(['payments', 'auth'])

  return (
    <div className="mx-auto max-w-3xl py-8">
      <PromptInput
        showContent
        prompt={prompt}
        platform={platform}
        displayPlaceholder="A SaaS dashboard with user analytics..."
        isFocused={isFocused}
        inputRef={inputRef}
        selectedCapabilities={selectedCapabilities}
        showMoreCapabilities={showMoreCapabilities}
        setShowMoreCapabilities={setShowMoreCapabilities}
        toggleCapability={toggleCapability}
        getCapabilityById={getCapabilityById}
        moreRef={moreRef}
        onPromptChange={setPrompt}
        onPlatformChange={setPlatform}
        onFocusChange={setIsFocused}
        onSubmit={(event) => event.preventDefault()}
        onKeyDown={() => {}}
      />
    </div>
  )
}

export const Default: Story = {
  render: () => <PromptInputPreview />,
}
