'use client'

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuthContext } from '@/providers/AuthProvider'
import { getCapabilityContext } from '@/lib/integrations/capabilities'
import { HeroHeader } from './premium/HeroHeader'
import { IntegrationMarquee } from './premium/IntegrationMarquee'
import { PLACEHOLDER_EXAMPLES } from './premium/constants'
import { PromptInput } from './premium/PromptInput'
import { useCapabilitySelection } from './premium/useCapabilitySelection'

/**
 * PremiumHero - Enterprise landing with governed build positioning.
 */
export default function PremiumHero() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuthContext()

  const [prompt, setPrompt] = useState('')
  const [platform, setPlatform] = useState<'web' | 'ios'>('web')
  const [isFocused, setIsFocused] = useState(false)
  const [showContent, setShowContent] = useState(false)
  const [placeholderIndex, setPlaceholderIndex] = useState(0)
  const [displayPlaceholder, setDisplayPlaceholder] = useState('')
  const [isTypingPlaceholder, setIsTypingPlaceholder] = useState(true)

  const inputRef = useRef<HTMLInputElement>(null)

  const {
    selectedCapabilities,
    showMoreCapabilities,
    setShowMoreCapabilities,
    toggleCapability,
    getCapabilityById,
    moreRef,
  } = useCapabilitySelection()

  const isLoggedIn = !authLoading && !!user

  useEffect(() => {
    const timer = window.setTimeout(() => setShowContent(true), 400)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (prompt) return

    const currentExample = PLACEHOLDER_EXAMPLES[placeholderIndex]

    if (isTypingPlaceholder) {
      if (displayPlaceholder.length < currentExample.length) {
        const timer = window.setTimeout(() => {
          setDisplayPlaceholder(currentExample.slice(0, displayPlaceholder.length + 1))
        }, 50)
        return () => window.clearTimeout(timer)
      }

      const timer = window.setTimeout(() => setIsTypingPlaceholder(false), 2000)
      return () => window.clearTimeout(timer)
    }

    if (displayPlaceholder.length > 0) {
      const timer = window.setTimeout(() => {
        setDisplayPlaceholder(displayPlaceholder.slice(0, -1))
      }, 30)
      return () => window.clearTimeout(timer)
    }

    const timer = window.setTimeout(() => {
      setPlaceholderIndex((previous) => (previous + 1) % PLACEHOLDER_EXAMPLES.length)
      setIsTypingPlaceholder(true)
    }, 0)

    return () => window.clearTimeout(timer)
  }, [displayPlaceholder, isTypingPlaceholder, placeholderIndex, prompt])

  const launchBuilder = () => {
    const trimmedPrompt = prompt.trim()
    if (!trimmedPrompt) return

    sessionStorage.setItem('torbit_prompt', trimmedPrompt)
    sessionStorage.setItem('torbit_platform', platform)
    sessionStorage.setItem('torbit_capabilities', JSON.stringify(selectedCapabilities))
    sessionStorage.setItem('torbit_capability_context', getCapabilityContext(selectedCapabilities))

    router.push('/builder')
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Enter' || event.shiftKey) return
    event.preventDefault()
    launchBuilder()
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    launchBuilder()
  }

  return (
    <div className="flex min-h-screen flex-col">
      <HeroHeader showContent={showContent} isLoggedIn={isLoggedIn} />

      <div className="flex flex-1 flex-col justify-center px-6 pb-8 pt-24 md:px-8">
        <div className="mx-auto w-full max-w-3xl">
          <AnimatePresence>
            {showContent && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.25, 0.4, 0.25, 1] }}
                className="mb-8 text-center md:mb-12"
              >
                <h1 className="mb-4 text-[3rem] leading-[0.95] tracking-[-0.02em] sm:text-[4.5rem] md:text-[5.5rem]">
                  <span className="bg-gradient-to-b from-white via-white to-white/50 bg-clip-text font-extralight text-transparent">
                    TORBIT
                  </span>
                </h1>

                <p className="mb-3 text-lg font-light tracking-wide text-white/60 md:text-2xl">
                  Production software, with proof.
                </p>

                <p className="text-sm font-light text-white/30 md:text-base">
                  Build with AI. Export with confidence.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <PromptInput
            showContent={showContent}
            prompt={prompt}
            platform={platform}
            displayPlaceholder={displayPlaceholder}
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
            onSubmit={handleSubmit}
            onKeyDown={handleKeyDown}
          />

          <AnimatePresence>
            {showContent && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="mt-12 md:mt-16"
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4 md:gap-6">
                  {[
                    { step: '01', title: 'Describe', desc: 'Plain English intent. No config.' },
                    { step: '02', title: 'Build', desc: 'AI executes with pinned dependencies.' },
                    { step: '03', title: 'Verify', desc: 'Independent Auditor checks correctness.' },
                    {
                      step: '04',
                      title: 'Export',
                      desc:
                        platform === 'ios'
                          ? 'Xcode bundle + audit ledger.'
                          : 'Vercel bundle + audit ledger.',
                    },
                  ].map((item, index) => (
                    <motion.div
                      key={item.step}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
                      className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-center md:p-6"
                    >
                      <div className="mb-2 font-mono text-xs text-white/20">{item.step}</div>
                      <div className="mb-1 font-medium text-white/80">{item.title}</div>
                      <div className="text-xs leading-relaxed text-white/30">{item.desc}</div>
                    </motion.div>
                  ))}
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </div>
      </div>

      <IntegrationMarquee />

      <section id="guarantee" className="border-t border-white/[0.06] px-6 py-16 md:px-8 md:py-24">
        <div className="mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="mb-16 text-center"
          >
            <h2 className="mb-4 text-2xl font-light text-white md:text-3xl">The TORBIT Guarantee</h2>
            <p className="mb-3 text-xl font-light text-white/60 md:text-2xl">
              You only pay for code that passes audit.
            </p>
            <p className="text-base text-white/40">If it fails, your fuel is refunded automatically.</p>
            <p className="mt-6 text-sm text-white/25">
              Other tools charge per token. TORBIT charges per success.
            </p>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                title: 'Built-in Governance',
                items: ['Strategist review', 'Auditor verification', 'Organization policies', 'Environment enforcement'],
              },
              {
                title: "Projects Don't Rot",
                items: ['Drift detection', 'Pinned integrations', 'Knowledge freezing', 'Deterministic rebuilds'],
              },
              {
                title: 'You Own the Output',
                items: [
                  platform === 'ios' ? 'Xcode-ready iOS apps' : 'Vercel-ready web apps',
                  'Audit ledger included',
                  'No lock-in runtime',
                  'Full source export',
                ],
              },
            ].map((card, index) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 transition-colors hover:border-white/[0.15] md:p-8"
              >
                <h3 className="mb-4 text-lg font-medium text-white">{card.title}</h3>
                <ul className="space-y-2.5">
                  {card.items.map((item) => (
                    <li key={item} className="flex items-center gap-2.5 text-sm text-white/40">
                      <div className="h-1 w-1 rounded-full bg-white/30" />
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/[0.06] px-6 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-4xl">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4 md:gap-12">
            {[
              { value: '452', label: 'Automated tests passing' },
              { value: '19', label: 'Governed integrations' },
              { value: '0', label: 'Secrets written to disk' },
              { value: '100%', label: 'Auditor-verified builds' },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="mb-1 text-3xl font-light text-white/70 md:text-4xl">{stat.value}</div>
                <div className="text-xs uppercase tracking-wide text-white/30 md:text-sm">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/[0.06] px-6 py-16 md:px-8 md:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="mb-4 text-2xl font-light text-white/80 md:text-3xl">Ship something you can defend.</h2>
            <p className="mb-8 text-white/40">You don&apos;t need to trust AI anymore. TORBIT proves itself.</p>
            <a
              href={isLoggedIn ? '/builder' : '/login'}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 font-medium text-black transition-all hover:shadow-[0_0_40px_rgba(255,255,255,0.2)]"
            >
              {isLoggedIn ? 'Start Building' : 'Build with Guarantees'}
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </a>
          </motion.div>
        </div>
      </section>

      <footer className="border-t border-white/[0.06] px-6 py-8 md:px-8">
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-4 md:flex-row">
          <span className="text-xs text-white/20">© 2026 TORBIT. All rights reserved.</span>
          <div className="flex items-center gap-6 text-xs text-white/20">
            <Link href="/privacy" className="transition-colors hover:text-white/50">
              Privacy
            </Link>
            <Link href="/terms" className="transition-colors hover:text-white/50">
              Terms
            </Link>
            <Link href="/contact" className="transition-colors hover:text-white/50">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
