import type { Meta, StoryObj } from '@storybook/react'
import { HeroHeader } from './HeroHeader'

const meta: Meta<typeof HeroHeader> = {
  title: 'Landing/Premium/HeroHeader',
  component: HeroHeader,
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'dark',
      values: [{ name: 'dark', value: '#000000' }],
    },
  },
  args: {
    showContent: true,
    isLoggedIn: false,
  },
}

export default meta

type Story = StoryObj<typeof HeroHeader>

export const LoggedOut: Story = {}

export const LoggedIn: Story = {
  args: {
    isLoggedIn: true,
  },
}
