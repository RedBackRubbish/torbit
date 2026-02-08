'use client'

import type { FormEvent, KeyboardEvent, RefObject } from 'react'
import { CapabilitySelector } from './CapabilitySelector'
import type { IntegrationCapability } from '@/lib/integrations/capabilities'

interface PromptInputProps {
  showContent: boolean
  prompt: string
  platform: 'web' | 'ios'
  displayPlaceholder: string
  isFocused: boolean
  inputRef: RefObject<HTMLInputElement | null>
  selectedCapabilities: string[]
  showMoreCapabilities: boolean
  setShowMoreCapabilities: (show: boolean) => void
  toggleCapability: (id: string) => void
  getCapabilityById: (id: string) => IntegrationCapability | undefined
  moreRef: RefObject<HTMLDivElement | null>
  onPromptChange: (value: string) => void
  onPlatformChange: (platform: 'web' | 'ios') => void
  onFocusChange: (focused: boolean) => void
  onSubmit: (event: FormEvent) => void
  onKeyDown: (event: KeyboardEvent) => void
}

export function PromptInput({
  showContent,
  prompt,
  platform,
  displayPlaceholder,
  isFocused,
  inputRef,
  selectedCapabilities,
  showMoreCapabilities,
  setShowMoreCapabilities,
  toggleCapability,
  getCapabilityById,
  moreRef,
  onPromptChange,
  onPlatformChange,
  onFocusChange,
  onSubmit,
  onKeyDown,
}: PromptInputProps) {
  return (
    <section
      className={`mb-6 transition-all duration-700 ${
        showContent ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      }`}
    >
      <div className="mb-4 flex justify-center">
        <div className="inline-flex rounded-xl border border-white/[0.08] bg-white/[0.03] p-1">
          <button
            type="button"
            onClick={() => onPlatformChange('web')}
            className={`rounded-lg px-5 py-2 text-sm font-medium transition-all ${
              platform === 'web' ? 'bg-white text-black' : 'text-white/50 hover:text-white/80'
            }`}
          >
            Web App
          </button>
          <button
            type="button"
            onClick={() => onPlatformChange('ios')}
            className={`rounded-lg px-5 py-2 text-sm font-medium transition-all ${
              platform === 'ios' ? 'bg-white text-black' : 'text-white/50 hover:text-white/80'
            }`}
          >
            iOS App
          </button>
        </div>
      </div>

      <form onSubmit={onSubmit}>
        <div
          className={`relative rounded-2xl border transition-all duration-300 ${
            isFocused
              ? 'border-white/20 bg-white/[0.04] shadow-[0_0_60px_rgba(255,255,255,0.08)]'
              : 'border-white/[0.08] bg-white/[0.02]'
          }`}
        >
          <input
            ref={inputRef}
            type="text"
            value={prompt}
            onChange={(event) => onPromptChange(event.target.value)}
            onKeyDown={onKeyDown}
            onFocus={() => onFocusChange(true)}
            onBlur={() => onFocusChange(false)}
            placeholder=""
            className="w-full bg-transparent py-5 pl-6 pr-32 text-lg font-light text-white focus:outline-none md:py-6 md:pl-8 md:pr-40 md:text-xl"
            aria-label="Describe the software you want Torbit to build"
          />

          {!prompt && (
            <div className="pointer-events-none absolute left-6 top-1/2 -translate-y-1/2 text-lg font-light text-white/25 md:left-8 md:text-xl">
              {displayPlaceholder}
              <span className="animate-pulse">|</span>
            </div>
          )}

          <button
            type="submit"
            disabled={!prompt.trim()}
            className={`absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-all duration-300 disabled:cursor-not-allowed md:right-4 md:px-6 md:py-3 ${
              prompt.trim()
                ? 'bg-white text-black hover:shadow-[0_0_30px_rgba(255,255,255,0.25)]'
                : 'bg-white/5 text-white/30'
            }`}
          >
            Build
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </button>
        </div>
      </form>

      <CapabilitySelector
        selectedCapabilities={selectedCapabilities}
        showMoreCapabilities={showMoreCapabilities}
        setShowMoreCapabilities={setShowMoreCapabilities}
        toggleCapability={toggleCapability}
        getCapabilityById={getCapabilityById}
        moreRef={moreRef}
      />

      <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs text-white/35 md:gap-5 md:text-sm">
        <span className="flex items-center gap-1.5">
          <svg className="h-3.5 w-3.5 text-emerald-400/70" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
          Auditor-verified
        </span>
        <span className="flex items-center gap-1.5">
          <svg className="h-3.5 w-3.5 text-emerald-400/70" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
              clipRule="evenodd"
            />
          </svg>
          Secrets never leaked
        </span>
        <span className="flex items-center gap-1.5">
          <svg className="h-3.5 w-3.5 text-emerald-400/70" fill="currentColor" viewBox="0 0 20 20">
            <path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" />
            <path
              fillRule="evenodd"
              d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"
              clipRule="evenodd"
            />
          </svg>
          Export includes compliance bundle
        </span>
      </div>
    </section>
  )
}
