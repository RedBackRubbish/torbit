'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'
import { TorbitLogo } from '@/components/ui/TorbitLogo'
import { 
  CreditCard, Shield, Database, Mail, Sparkles, HardDrive, MapPin, BarChart3, Plus, X, ChevronDown
} from 'lucide-react'
import { 
  INTEGRATION_CAPABILITIES, 
  PRIMARY_CAPABILITIES, 
  SECONDARY_CAPABILITIES,
  getCapabilityContext,
  type IntegrationCapability 
} from '@/lib/integrations/capabilities'
import { CapabilityPreview } from './CapabilityPreview'

// Icon mapping
const CAPABILITY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  CreditCard, Shield, Database, Mail, Sparkles, HardDrive, MapPin, BarChart3
}

const PLACEHOLDER_EXAMPLES = [
  "A SaaS dashboard with user analytics...",
  "An enterprise CRM with role-based access...",
  "A marketplace with payments and search...",
  "A project management tool like Linear...",
  "An iOS app for fitness tracking...",
  "A mobile banking app with biometric auth...",
]

/**
 * PremiumHero - Enterprise-grade landing with governance positioning
 */
export default function PremiumHero() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [prompt, setPrompt] = useState('')
  const [platform, setPlatform] = useState<'web' | 'ios'>('web')
  const [isFocused, setIsFocused] = useState(false)
  const [showContent, setShowContent] = useState(false)
  const [placeholderIndex, setPlaceholderIndex] = useState(0)
  const [displayPlaceholder, setDisplayPlaceholder] = useState('')
  const [isTypingPlaceholder, setIsTypingPlaceholder] = useState(true)
  const [selectedCapabilities, setSelectedCapabilities] = useState<string[]>([])
  const [showMoreCapabilities, setShowMoreCapabilities] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const moreRef = useRef<HTMLDivElement>(null)
  
  const isLoggedIn = !authLoading && !!user
  const builderEntryPath = isLoggedIn ? '/builder' : '/login?next=/builder'

  // Close "More" dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(event.target as Node)) {
        setShowMoreCapabilities(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleCapability = (id: string) => {
    setSelectedCapabilities(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    )
  }

  const getCapabilityById = (id: string): IntegrationCapability | undefined => 
    INTEGRATION_CAPABILITIES.find(c => c.id === id)

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 400)
    return () => clearTimeout(timer)
  }, [])

  // Cycling placeholder with typewriter effect
  useEffect(() => {
    if (prompt) return
    
    const currentExample = PLACEHOLDER_EXAMPLES[placeholderIndex]
    
    if (isTypingPlaceholder) {
      if (displayPlaceholder.length < currentExample.length) {
        const timer = setTimeout(() => {
          setDisplayPlaceholder(currentExample.slice(0, displayPlaceholder.length + 1))
        }, 50)
        return () => clearTimeout(timer)
      } else {
        const timer = setTimeout(() => setIsTypingPlaceholder(false), 2000)
        return () => clearTimeout(timer)
      }
    } else {
      if (displayPlaceholder.length > 0) {
        const timer = setTimeout(() => {
          setDisplayPlaceholder(displayPlaceholder.slice(0, -1))
        }, 30)
        return () => clearTimeout(timer)
      } else {
        const timer = setTimeout(() => {
          setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDER_EXAMPLES.length)
          setIsTypingPlaceholder(true)
        }, 0)
        return () => clearTimeout(timer)
      }
    }
  }, [displayPlaceholder, isTypingPlaceholder, placeholderIndex, prompt])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Submit on Enter (not just Cmd+Enter)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (prompt.trim()) {
        sessionStorage.setItem('torbit_prompt', prompt)
        sessionStorage.setItem('torbit_platform', platform)
        sessionStorage.setItem('torbit_capabilities', JSON.stringify(selectedCapabilities))
        sessionStorage.setItem('torbit_capability_context', getCapabilityContext(selectedCapabilities))
        router.push(builderEntryPath)
      }
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (prompt.trim()) {
      sessionStorage.setItem('torbit_prompt', prompt)
      sessionStorage.setItem('torbit_platform', platform)
      sessionStorage.setItem('torbit_capabilities', JSON.stringify(selectedCapabilities))
      sessionStorage.setItem('torbit_capability_context', getCapabilityContext(selectedCapabilities))
      router.push(builderEntryPath)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 md:px-8 py-4 md:py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: showContent ? 1 : 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="flex items-center gap-2.5"
          >
            <TorbitLogo size="sm" animated />
            <span className="text-white font-medium tracking-tight">TORBIT</span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: showContent ? 1 : 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="flex items-center gap-4 md:gap-6"
          >
            <a href="#guarantee" className="text-white/40 text-sm hover:text-white/70 transition-colors hidden sm:block">
              Guarantee
            </a>
            <a href="#pricing" className="text-white/40 text-sm hover:text-white/70 transition-colors hidden sm:block">
              Governance Docs
            </a>
            <div className="w-px h-4 bg-white/10 hidden sm:block" />
            {isLoggedIn ? (
              <a 
                href="/dashboard"
                className="px-4 py-2 text-sm font-medium text-black bg-white hover:bg-white/90 rounded-lg transition-all"
              >
                Dashboard
              </a>
            ) : (
              <>
                <a href="/login" className="text-white/50 text-sm hover:text-white transition-colors">
                  Sign In
                </a>
                <a 
                  href="/login"
                  className="px-4 py-2 text-sm font-medium text-black bg-white hover:bg-white/90 rounded-lg transition-all"
                >
                  Build with Guarantees
                </a>
              </>
            )}
          </motion.div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="flex-1 flex flex-col justify-center px-6 md:px-8 pt-24 pb-8">
        <div className="max-w-3xl mx-auto w-full">
          
          {/* Main Headline */}
          <AnimatePresence>
            {showContent && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.25, 0.4, 0.25, 1] }}
                className="text-center mb-8 md:mb-12"
              >
                <h1 className="text-[3rem] sm:text-[4.5rem] md:text-[5.5rem] font-extralight tracking-[-0.02em] leading-[0.95] mb-4">
                  <span className="bg-gradient-to-b from-white via-white to-white/50 bg-clip-text text-transparent">
                    TORBIT
                  </span>
                </h1>
                
                <p className="text-white/60 text-lg md:text-2xl font-light tracking-wide mb-3">
                  Production software, with proof.
                </p>
                
                <p className="text-white/30 text-sm md:text-base font-light">
                  Build with AI. Export with confidence.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input Section */}
          <AnimatePresence>
            {showContent && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="mb-6"
              >
                {/* Platform Toggle */}
                <div className="flex justify-center mb-4">
                  <div className="inline-flex bg-white/[0.03] border border-white/[0.08] rounded-xl p-1">
                    <button
                      type="button"
                      onClick={() => setPlatform('web')}
                      className={`px-5 py-2 text-sm font-medium rounded-lg transition-all ${
                        platform === 'web'
                          ? 'bg-white text-black'
                          : 'text-white/50 hover:text-white/80'
                      }`}
                    >
                      Web App
                    </button>
                    <button
                      type="button"
                      onClick={() => setPlatform('ios')}
                      className={`px-5 py-2 text-sm font-medium rounded-lg transition-all ${
                        platform === 'ios'
                          ? 'bg-white text-black'
                          : 'text-white/50 hover:text-white/80'
                      }`}
                    >
                      iOS App
                    </button>
                  </div>
                </div>

                {/* Input Bar */}
                <form onSubmit={handleSubmit}>
                  <div 
                    className={`relative border rounded-2xl transition-all duration-300 ${
                      isFocused 
                        ? 'bg-white/[0.04] border-white/20 shadow-[0_0_60px_rgba(255,255,255,0.08)]' 
                        : 'bg-white/[0.02] border-white/[0.08]'
                    }`}
                  >
                    <input
                      ref={inputRef}
                      type="text"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onFocus={() => setIsFocused(true)}
                      onBlur={() => setIsFocused(false)}
                      placeholder=""
                      className="w-full bg-transparent text-white text-lg md:text-xl font-light 
                        pl-6 md:pl-8 pr-32 md:pr-40 py-5 md:py-6 focus:outline-none"
                    />
                    
                    {!prompt && (
                      <div className="absolute left-6 md:left-8 top-1/2 -translate-y-1/2 text-white/25 text-lg md:text-xl font-light pointer-events-none">
                        {displayPlaceholder}
                        <span className="animate-pulse">|</span>
                      </div>
                    )}
                    
                    <button
                      type="submit"
                      disabled={!prompt.trim()}
                      className={`absolute right-3 md:right-4 top-1/2 -translate-y-1/2
                        px-5 md:px-6 py-2.5 md:py-3 rounded-xl font-medium text-sm
                        transition-all duration-300 disabled:cursor-not-allowed flex items-center gap-2
                        ${prompt.trim() 
                          ? 'bg-white text-black hover:shadow-[0_0_30px_rgba(255,255,255,0.25)]' 
                          : 'bg-white/5 text-white/30'
                        }`}
                    >
                      Build
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                      </svg>
                    </button>
                  </div>
                </form>

                {/* Capability Chips */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.35 }}
                  className="mt-4"
                >
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {/* Primary capabilities */}
                    {PRIMARY_CAPABILITIES.map(id => {
                      const cap = getCapabilityById(id)
                      if (!cap) return null
                      const Icon = CAPABILITY_ICONS[cap.icon]
                      const isSelected = selectedCapabilities.includes(id)
                      
                      return (
                        <CapabilityPreview key={id} capability={cap}>
                          <button
                            type="button"
                            onClick={() => toggleCapability(id)}
                            className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                              isSelected
                                ? 'bg-white/10 text-white border border-white/20'
                                : 'bg-white/[0.03] text-white/40 border border-white/[0.06] hover:bg-white/[0.06] hover:text-white/60 hover:border-white/10'
                            }`}
                          >
                            {isSelected ? (
                              <X className="w-3 h-3" />
                            ) : (
                              <Plus className="w-3 h-3 opacity-50 group-hover:opacity-100" />
                            )}
                            {Icon && <Icon className="w-3.5 h-3.5" />}
                            {cap.label}
                          </button>
                        </CapabilityPreview>
                      )
                    })}
                    
                    {/* More dropdown */}
                    <div ref={moreRef} className="relative">
                      <button
                        type="button"
                        onClick={() => setShowMoreCapabilities(!showMoreCapabilities)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium 
                          bg-white/[0.03] text-white/40 border border-white/[0.06] 
                          hover:bg-white/[0.06] hover:text-white/60 hover:border-white/10 transition-all"
                      >
                        More
                        <ChevronDown className={`w-3 h-3 transition-transform ${showMoreCapabilities ? 'rotate-180' : ''}`} />
                      </button>
                      
                      <AnimatePresence>
                        {showMoreCapabilities && (
                          <motion.div
                            initial={{ opacity: 0, y: -8, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                            className="absolute top-full mt-2 right-0 z-50 min-w-[160px] 
                              bg-neutral-900 border border-white/10 rounded-xl p-1.5 shadow-xl"
                          >
                            {SECONDARY_CAPABILITIES.map(id => {
                              const cap = getCapabilityById(id)
                              if (!cap) return null
                              const Icon = CAPABILITY_ICONS[cap.icon]
                              const isSelected = selectedCapabilities.includes(id)
                              
                              return (
                                <button
                                  key={id}
                                  type="button"
                                  onClick={() => toggleCapability(id)}
                                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                                    isSelected
                                      ? 'bg-white/10 text-white'
                                      : 'text-white/50 hover:bg-white/[0.06] hover:text-white/80'
                                  }`}
                                >
                                  {Icon && <Icon className="w-3.5 h-3.5" />}
                                  {cap.label}
                                  {isSelected && (
                                    <svg className="w-3.5 h-3.5 ml-auto text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  )}
                                </button>
                              )
                            })}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                  
                  {/* Selected capabilities indicator */}
                  <AnimatePresence>
                    {selectedCapabilities.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex flex-col items-center gap-1 mt-3 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-white/30">Capabilities:</span>
                          <span className="text-white/60">
                            {selectedCapabilities.map(id => getCapabilityById(id)?.label).join(' · ')}
                          </span>
                        </div>
                        <span className="text-white/25 text-[11px]">Simulated during build</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* Trust Indicators Below Input */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                  className="flex flex-wrap items-center justify-center gap-3 md:gap-5 mt-4 text-white/35 text-xs md:text-sm"
                >
                  <span className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-emerald-400/70" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Auditor-verified
                  </span>
                  <span className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-emerald-400/70" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                    Secrets never leaked
                  </span>
                  <span className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-emerald-400/70" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" />
                      <path fillRule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" />
                    </svg>
                    Export includes compliance bundle
                  </span>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Process Strip */}
          <AnimatePresence>
            {showContent && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="mt-12 md:mt-16"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                  {[
                    { step: '01', title: 'Describe', desc: 'Plain English intent. No config.' },
                    { step: '02', title: 'Build', desc: 'AI executes with pinned dependencies.' },
                    { step: '03', title: 'Verify', desc: 'Independent Auditor checks correctness.' },
                    { step: '04', title: 'Export', desc: platform === 'ios' ? 'Xcode bundle + audit ledger.' : 'Vercel bundle + audit ledger.' },
                  ].map((item, i) => (
                    <motion.div
                      key={item.step}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.6 + i * 0.1 }}
                      className="text-center p-4 md:p-6 rounded-xl bg-white/[0.02] border border-white/[0.06]"
                    >
                      <div className="text-white/20 text-xs font-mono mb-2">{item.step}</div>
                      <div className="text-white/80 font-medium mb-1">{item.title}</div>
                      <div className="text-white/30 text-xs leading-relaxed">{item.desc}</div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Integration Logos - Infinite Scroll */}
      <section className="py-16 md:py-20 border-t border-white/[0.06] overflow-hidden">
        <div className="text-center mb-8">
          <p className="text-white/25 text-xs uppercase tracking-[0.2em]">
            Governed integrations with pinned versions
          </p>
        </div>
        
        <div className="relative">
          {/* Fade edges */}
          <div className="absolute left-0 top-0 bottom-0 w-24 md:w-40 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-24 md:w-40 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none" />
          
          {/* Scrolling track */}
          <div className="flex animate-scroll">
            {/* First set */}
            {[
              { name: 'React', color: '#61DAFB', logo: <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor"><path d="M14.23 12.004a2.236 2.236 0 0 1-2.235 2.236 2.236 2.236 0 0 1-2.236-2.236 2.236 2.236 0 0 1 2.235-2.236 2.236 2.236 0 0 1 2.236 2.236zm2.648-10.69c-1.346 0-3.107.96-4.888 2.622-1.78-1.653-3.542-2.602-4.887-2.602-.41 0-.783.093-1.106.278-1.375.793-1.683 3.264-.973 6.365C1.98 8.917 0 10.42 0 12.004c0 1.59 1.99 3.097 5.043 4.03-.704 3.113-.39 5.588.988 6.38.32.187.69.275 1.102.275 1.345 0 3.107-.96 4.888-2.624 1.78 1.654 3.542 2.603 4.887 2.603.41 0 .783-.09 1.106-.275 1.374-.792 1.683-3.263.973-6.365C22.02 15.096 24 13.59 24 12.004c0-1.59-1.99-3.097-5.043-4.032.704-3.11.39-5.587-.988-6.38-.318-.184-.688-.277-1.092-.278zm-.005 1.09v.006c.225 0 .406.044.558.127.666.382.955 1.835.73 3.704-.054.46-.142.945-.25 1.44-.96-.236-2.006-.417-3.107-.534-.66-.905-1.345-1.727-2.035-2.447 1.592-1.48 3.087-2.292 4.105-2.295zm-9.77.02c1.012 0 2.514.808 4.11 2.28-.686.72-1.37 1.537-2.02 2.442-1.107.117-2.154.298-3.113.538-.112-.49-.195-.964-.254-1.42-.23-1.868.054-3.32.714-3.707.19-.09.4-.127.563-.132zm4.882 3.05c.455.468.91.992 1.36 1.564-.44-.02-.89-.034-1.345-.034-.46 0-.915.01-1.36.034.44-.572.895-1.096 1.345-1.565zM12 8.1c.74 0 1.477.034 2.202.093.406.582.802 1.203 1.183 1.86.372.64.71 1.29 1.018 1.946-.308.655-.646 1.31-1.013 1.95-.38.66-.773 1.288-1.18 1.87-.728.063-1.466.098-2.21.098-.74 0-1.477-.035-2.202-.093-.406-.582-.802-1.204-1.183-1.86-.372-.64-.71-1.29-1.018-1.946.303-.657.646-1.313 1.013-1.954.38-.66.773-1.286 1.18-1.868.728-.064 1.466-.098 2.21-.098zm-3.635.254c-.24.377-.48.763-.704 1.16-.225.39-.435.782-.635 1.174-.265-.656-.49-1.31-.676-1.947.64-.15 1.315-.283 2.015-.386zm7.26 0c.695.103 1.365.23 2.006.387-.18.632-.405 1.282-.66 1.933-.2-.39-.41-.783-.64-1.174-.225-.392-.465-.774-.705-1.146zm3.063.675c.484.15.944.317 1.375.498 1.732.74 2.852 1.708 2.852 2.476-.005.768-1.125 1.74-2.857 2.475-.42.18-.88.342-1.355.493-.28-.958-.646-1.956-1.1-2.98.45-1.017.81-2.01 1.085-2.964zm-13.395.004c.278.96.645 1.957 1.1 2.98-.45 1.017-.812 2.01-1.086 2.964-.484-.15-.944-.318-1.37-.5-1.732-.737-2.852-1.706-2.852-2.474 0-.768 1.12-1.742 2.852-2.476.42-.18.88-.342 1.356-.494zm11.678 4.28c.265.657.49 1.312.676 1.948-.64.157-1.316.29-2.016.39.24-.375.48-.762.705-1.158.225-.39.435-.788.636-1.18zm-9.945.02c.2.392.41.783.64 1.175.23.39.465.772.705 1.143-.695-.102-1.365-.23-2.006-.386.18-.63.406-1.282.66-1.933zM17.92 16.32c.112.493.2.968.254 1.423.23 1.868-.054 3.32-.714 3.708-.147.09-.338.128-.563.128-1.012 0-2.514-.807-4.11-2.28.686-.72 1.37-1.536 2.02-2.44 1.107-.118 2.154-.3 3.113-.54zm-11.83.01c.96.234 2.006.415 3.107.532.66.905 1.345 1.727 2.035 2.446-1.595 1.483-3.092 2.295-4.11 2.295-.22-.005-.406-.05-.553-.132-.666-.38-.955-1.834-.73-3.703.054-.46.142-.944.25-1.438zm4.56.64c.44.02.89.034 1.345.034.46 0 .915-.01 1.36-.034-.44.572-.895 1.095-1.345 1.565-.455-.47-.91-.993-1.36-1.565z"/></svg> },
              { name: 'Next.js', color: '#ffffff', logo: <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor"><path d="M11.572 0c-.176 0-.31.001-.358.007a19.76 19.76 0 0 1-.364.033C7.443.346 4.25 2.185 2.228 5.012a11.875 11.875 0 0 0-2.119 5.243c-.096.659-.108.854-.108 1.747s.012 1.089.108 1.748c.652 4.506 3.86 8.292 8.209 9.695.779.25 1.6.422 2.534.525.363.04 1.935.04 2.299 0 1.611-.178 2.977-.577 4.323-1.264.207-.106.247-.134.219-.158-.02-.013-.9-1.193-1.955-2.62l-1.919-2.592-2.404-3.558a338.739 338.739 0 0 0-2.422-3.556c-.009-.002-.018 1.579-.023 3.51-.007 3.38-.01 3.515-.052 3.595a.426.426 0 0 1-.206.214c-.075.037-.14.044-.495.044H7.81l-.108-.068a.438.438 0 0 1-.157-.171l-.05-.106.006-4.703.007-4.705.072-.092a.645.645 0 0 1 .174-.143c.096-.047.134-.051.54-.051.478 0 .558.018.682.154.035.038 1.337 1.999 2.895 4.361a10760.433 10760.433 0 0 0 4.735 7.17l1.9 2.879.096-.063a12.317 12.317 0 0 0 2.466-2.163 11.944 11.944 0 0 0 2.824-6.134c.096-.66.108-.854.108-1.748 0-.893-.012-1.088-.108-1.747-.652-4.506-3.859-8.292-8.208-9.695a12.597 12.597 0 0 0-2.499-.523A33.119 33.119 0 0 0 11.572 0zm4.069 7.217c.347 0 .408.005.486.047a.473.473 0 0 1 .237.277c.018.06.023 1.365.018 4.304l-.006 4.218-.744-1.14-.746-1.14v-3.066c0-1.982.01-3.097.023-3.15a.478.478 0 0 1 .233-.296c.096-.05.13-.054.5-.054z"/></svg> },
              { name: 'TypeScript', color: '#3178C6', logo: <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor"><path d="M1.125 0C.502 0 0 .502 0 1.125v21.75C0 23.498.502 24 1.125 24h21.75c.623 0 1.125-.502 1.125-1.125V1.125C24 .502 23.498 0 22.875 0zm17.363 9.75c.612 0 1.154.037 1.627.111a6.38 6.38 0 0 1 1.306.34v2.458a3.95 3.95 0 0 0-.643-.361 5.093 5.093 0 0 0-.717-.26 5.453 5.453 0 0 0-1.426-.2c-.3 0-.573.028-.819.086a2.1 2.1 0 0 0-.623.242c-.17.104-.3.229-.393.374a.888.888 0 0 0-.14.49c0 .196.053.373.156.529.104.156.252.304.443.444s.423.276.696.41c.273.135.582.274.926.416.47.197.892.407 1.266.628.374.222.695.473.963.753.268.279.472.598.614.957.142.359.214.776.214 1.253 0 .657-.125 1.21-.373 1.656a3.033 3.033 0 0 1-1.012 1.085 4.38 4.38 0 0 1-1.487.596c-.566.12-1.163.18-1.79.18a9.916 9.916 0 0 1-1.84-.164 5.544 5.544 0 0 1-1.512-.493v-2.63a5.033 5.033 0 0 0 3.237 1.2c.333 0 .624-.03.872-.09.249-.06.456-.144.623-.25.166-.108.29-.234.373-.38a1.023 1.023 0 0 0-.074-1.089 2.12 2.12 0 0 0-.537-.5 5.597 5.597 0 0 0-.807-.444 27.72 27.72 0 0 0-1.007-.436c-.918-.383-1.602-.852-2.053-1.405-.45-.553-.676-1.222-.676-2.005 0-.614.123-1.141.369-1.582.246-.441.58-.804 1.004-1.089a4.494 4.494 0 0 1 1.47-.629 7.536 7.536 0 0 1 1.77-.201zm-15.113.188h9.563v2.166H9.506v9.646H6.789v-9.646H3.375z"/></svg> },
              { name: 'Tailwind', color: '#06B6D4', logo: <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor"><path d="M12.001 4.8c-3.2 0-5.2 1.6-6 4.8 1.2-1.6 2.6-2.2 4.2-1.8.913.228 1.565.89 2.288 1.624C13.666 10.618 15.027 12 18.001 12c3.2 0 5.2-1.6 6-4.8-1.2 1.6-2.6 2.2-4.2 1.8-.913-.228-1.565-.89-2.288-1.624C16.337 6.182 14.976 4.8 12.001 4.8zm-6 7.2c-3.2 0-5.2 1.6-6 4.8 1.2-1.6 2.6-2.2 4.2-1.8.913.228 1.565.89 2.288 1.624 1.177 1.194 2.538 2.576 5.512 2.576 3.2 0 5.2-1.6 6-4.8-1.2 1.6-2.6 2.2-4.2 1.8-.913-.228-1.565-.89-2.288-1.624C10.337 13.382 8.976 12 6.001 12z"/></svg> },
              { name: 'Claude', color: '#D97757', logo: <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor"><path d="M4.603 15.457c-.547.96-.29 2.206.34 3.165.63.96 1.467 1.748 2.358 2.393.908.646 1.906 1.167 2.941 1.545 1.204.436 2.478.644 3.752.644 1.435.018 2.888-.257 4.198-.842a9.25 9.25 0 0 0 3.289-2.339c.423-.476.768-.994 1.037-1.545.072-.145.162-.29.234-.436a9.92 9.92 0 0 0 .521-1.454 9.473 9.473 0 0 0-.108-5.762c-.756-2.248-2.3-4.087-4.305-5.255a9.16 9.16 0 0 0-2.013-.897c-1.472-.474-3.062-.626-4.59-.403a9.018 9.018 0 0 0-4.09 1.655A9.546 9.546 0 0 0 5.12 9.314c-.225.403-.414.824-.584 1.256-.162.419-.298.841-.404 1.274-.09.37-.126.754-.162 1.129-.018.19-.018.38-.036.57a9.26 9.26 0 0 0 .162 2.374c.054.25.127.505.197.77.126.423.278.842.45 1.243.146.336.328.653.495.967l-.635-.44z"/></svg> },
              { name: 'OpenAI', color: '#ffffff', logo: <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor"><path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"/></svg> },
              { name: 'Google', color: '#4285F4', logo: <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor"><path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/></svg> },
              { name: 'Gemini', color: '#8E75B2', logo: <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor"><path d="M12 0C5.352 0 0 5.352 0 12s5.352 12 12 12 12-5.352 12-12S18.648 0 12 0zm0 2.4c5.28 0 9.6 4.32 9.6 9.6s-4.32 9.6-9.6 9.6S2.4 17.28 2.4 12 6.72 2.4 12 2.4zm0 1.92a7.68 7.68 0 1 0 0 15.36 7.68 7.68 0 0 0 0-15.36zm0 2.16a5.52 5.52 0 1 1 0 11.04 5.52 5.52 0 0 1 0-11.04z"/></svg> },
              { name: 'Supabase', color: '#3FCF8E', logo: <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor"><path d="M11.9 1.036c-.015-.986-1.26-1.41-1.874-.637L.764 12.05C-.33 13.427.65 15.455 2.409 15.455h9.579l.113 7.51c.014.985 1.259 1.408 1.873.636l9.262-11.653c1.093-1.375.113-3.403-1.645-3.403h-9.642z"/></svg> },
              { name: 'Stripe', color: '#635BFF', logo: <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor"><path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/></svg> },
              { name: 'Vercel', color: '#ffffff', logo: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M24 22.525H0l12-21.05 12 21.05z"/></svg> },
              { name: 'AWS', color: '#FF9900', logo: <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor"><path d="M6.763 10.036c0 .296.032.535.088.71.064.176.144.368.256.576.04.063.056.127.056.183 0 .08-.048.16-.152.24l-.503.335a.383.383 0 0 1-.208.072c-.08 0-.16-.04-.239-.112a2.47 2.47 0 0 1-.287-.375 6.18 6.18 0 0 1-.248-.471c-.622.734-1.405 1.101-2.347 1.101-.67 0-1.205-.191-1.596-.574-.391-.384-.59-.894-.59-1.533 0-.678.239-1.23.726-1.644.487-.415 1.133-.623 1.955-.623.272 0 .551.024.846.064.296.04.6.104.918.176v-.583c0-.607-.127-1.03-.375-1.277-.255-.248-.686-.367-1.3-.367-.28 0-.568.031-.863.103-.295.072-.583.16-.862.272a2.287 2.287 0 0 1-.28.104.488.488 0 0 1-.127.023c-.112 0-.168-.08-.168-.247v-.391c0-.128.016-.224.056-.28a.597.597 0 0 1 .224-.167c.279-.144.614-.264 1.005-.36a4.84 4.84 0 0 1 1.246-.151c.95 0 1.644.216 2.091.647.439.43.662 1.085.662 1.963v2.586zm-3.24 1.214c.263 0 .534-.048.822-.144.287-.096.543-.271.758-.51.128-.152.224-.32.272-.512.047-.191.08-.423.08-.694v-.335a6.66 6.66 0 0 0-.735-.136 6.02 6.02 0 0 0-.75-.048c-.535 0-.926.104-1.19.32-.263.215-.39.518-.39.917 0 .375.095.655.295.846.191.2.47.296.838.296zm6.41.862c-.144 0-.24-.024-.304-.08-.064-.048-.12-.16-.168-.311L7.586 5.55a1.398 1.398 0 0 1-.072-.32c0-.128.064-.2.191-.2h.783c.151 0 .255.025.31.08.065.048.113.16.16.312l1.342 5.284 1.245-5.284c.04-.16.088-.264.151-.312a.549.549 0 0 1 .32-.08h.638c.152 0 .256.025.32.08.063.048.12.16.151.312l1.261 5.348 1.381-5.348c.048-.16.104-.264.16-.312a.52.52 0 0 1 .311-.08h.743c.127 0 .2.065.2.2 0 .04-.009.08-.017.128a1.137 1.137 0 0 1-.056.2l-1.923 6.17c-.048.16-.104.264-.168.312a.51.51 0 0 1-.303.08h-.687c-.151 0-.255-.024-.32-.08-.063-.056-.119-.16-.15-.32l-1.238-5.148-1.23 5.14c-.04.16-.087.264-.15.32-.065.056-.177.08-.32.08zm10.256.215c-.415 0-.83-.048-1.229-.143-.399-.096-.71-.2-.918-.32-.128-.071-.215-.151-.247-.223a.563.563 0 0 1-.048-.224v-.407c0-.167.064-.247.183-.247.048 0 .096.008.144.024.048.016.12.048.2.08.271.12.566.215.878.279.319.064.63.096.95.096.502 0 .894-.088 1.165-.264a.86.86 0 0 0 .415-.758.777.777 0 0 0-.215-.559c-.144-.151-.416-.287-.807-.414l-1.157-.36c-.583-.183-1.014-.454-1.277-.813a1.902 1.902 0 0 1-.4-1.158c0-.335.073-.63.216-.886.144-.255.335-.479.575-.654.24-.184.51-.32.83-.415.32-.096.655-.136 1.006-.136.175 0 .359.008.535.032.183.024.35.056.518.088.16.04.312.08.455.127.144.048.256.096.336.144a.69.69 0 0 1 .24.2.43.43 0 0 1 .071.263v.375c0 .168-.064.256-.184.256a.83.83 0 0 1-.303-.096 3.652 3.652 0 0 0-1.532-.311c-.455 0-.815.071-1.062.223-.248.152-.375.383-.375.71 0 .224.08.416.24.567.159.152.454.304.877.44l1.134.358c.574.184.99.44 1.237.767.247.327.367.702.367 1.117 0 .343-.072.655-.207.926-.144.272-.336.511-.583.703-.248.2-.543.343-.886.447-.36.111-.734.167-1.142.167zM21.698 16.207c-2.626 1.94-6.442 2.969-9.722 2.969-4.598 0-8.74-1.7-11.87-4.526-.247-.223-.024-.527.27-.351 3.384 1.963 7.559 3.153 11.877 3.153 2.914 0 6.114-.607 9.06-1.852.439-.2.814.287.385.607zM22.792 14.961c-.336-.43-2.22-.207-3.074-.103-.255.032-.295-.192-.063-.36 1.5-1.053 3.967-.75 4.254-.399.287.36-.08 2.826-1.485 4.007-.215.184-.423.088-.327-.151.32-.79 1.03-2.57.695-2.994z"/></svg> },
              { name: 'Firebase', color: '#FFCA28', logo: <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor"><path d="M3.89 15.672L6.255.461A.542.542 0 0 1 7.27.288l2.543 4.771zm16.794 3.692l-2.25-14a.54.54 0 0 0-.919-.295L3.316 19.365l7.856 4.427a1.621 1.621 0 0 0 1.588 0zM14.3 7.147l-1.82-3.482a.542.542 0 0 0-.96 0L3.53 17.984z"/></svg> },
              { name: 'MongoDB', color: '#47A248', logo: <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor"><path d="M17.193 9.555c-1.264-5.58-4.252-7.414-4.573-8.115-.28-.394-.53-.954-.735-1.44-.036.495-.055.685-.523 1.184-.723.566-4.438 3.682-4.74 10.02-.282 5.912 4.27 9.435 4.888 9.884l.07.05A73.49 73.49 0 0 1 11.91 24h.481c.114-1.032.284-2.056.51-3.07.417-.296.604-.463.85-.693a11.342 11.342 0 0 0 3.639-8.464c.01-.814-.103-1.662-.197-2.218zm-5.336 8.195s0-8.291.275-8.29c.213 0 .49 10.695.49 10.695-.381-.045-.765-1.76-.765-2.405z"/></svg> },
              { name: 'PostgreSQL', color: '#4169E1', logo: <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor"><path d="M23.5594 14.7228a.5269.5269 0 0 0-.0563-.1191c-.139-.2632-.4768-.3418-1.0074-.2321-1.6533.3418-2.2139-.0879-2.3237-.1758.9082-1.7432 1.6445-3.7026 2.0996-5.6972.1172-.5098.1953-1.0371.2344-1.582.0381-.5765.0225-.9551-.0479-1.1699-.3496-1.0664-1.3203-1.1621-2.1299-.2461-.0479.0527-.0947.1094-.1406.1679-.5312.6855-1.1182 1.5137-1.6992 2.3828-.793-1.0273-1.6572-1.9805-2.5801-2.8516-1.0195-.9609-2.1426-1.8047-3.3418-2.5156C10.6865.5508 8.6699.0039 6.9531.0039c-.3359 0-.6621.0234-.9746.0703C2.5459.5752.3965 3.2617.0527 6.9258c-.0391.4043-.0566.7949-.0566 1.1699 0 3.5449 1.1523 7.4023 3.1641 10.5938.0234.0371.0488.0742.0742.1113.0254.0371.0527.0723.0801.1055.1191.1426.25.2754.3906.3984.8359.7383 1.7715 1.4121 2.7773 2.0059.5273.3125 1.1133.5664 1.7402.7578.6973.2129 1.4473.3223 2.2227.3223 1.2383 0 2.4316-.2754 3.5371-.8164.4961-.2422.9492-.5156 1.3496-.8125.4023.4707.8496.8906 1.3301 1.2617l.0156.0117c.0488.0371.0977.0742.1465.1094.0488.0371.0996.0723.1504.1055.0234.0156.0469.0293.0703.043.0234.0156.0488.0293.0742.0439.0254.0137.0508.0273.0762.041.0254.0137.0508.0264.0762.0391l.0742.0371c.0254.0117.0508.0234.0762.0352.0254.0117.0508.0234.0762.0342l.0781.0332c.0254.0098.0508.0195.0762.0283.0264.0098.0527.0186.0791.0273l.0781.0254c.0264.0078.0537.0156.0811.0234.0264.0068.0527.0137.08.0205l.0801.0186c.0273.0059.0547.0117.082.0166l.0801.0146c.0273.0049.0547.0088.082.0127l.0801.0107c.0283.0039.0566.0068.0849.0098l.0781.0068c.0293.0029.0576.0049.0869.0059l.0791.0029c.0293 0 .0576 0 .0869-.001l.0781-.0039c.0293-.002.0586-.0049.0879-.0078l.0762-.0088c.0293-.0039.0576-.0088.0869-.0137l.0732-.0127a.5075.5075 0 0 0 .0879-.0176l.0693-.0156c.0293-.0068.0586-.0146.0869-.0234l.0654-.0195c.0293-.0088.0576-.0186.0859-.0293l.0615-.0234c.0283-.0107.0566-.0225.0849-.0352l.0566-.0273a.651.651 0 0 0 .084-.0449l.0488-.0303c.0273-.0166.0537-.0342.0801-.0527l.041-.0293c.0254-.0195.0498-.0391.0742-.0586l.0283-.0244c.0234-.0205.0459-.042.0684-.0635l.0195-.0195c.0215-.0225.042-.0449.0625-.0674l.0107-.0127c.0195-.0234.0381-.0469.0566-.0703l.0039-.0059a.5268.5268 0 0 0 .0479-.0703c.4082-.6465.2988-1.7139-.2461-2.4102z"/></svg> },
              { name: 'Mapbox', color: '#4264FB', logo: <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor"><path d="M12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0zm5.696 14.943c-4.103 4.103-11.433 2.794-11.433 2.794S4.954 10.407 9.057 6.304C11.6 3.761 15.391 3.236 17.26 5.106c.225.225.41.47.564.727l-5.177 2.644 2.644-5.177a4.925 4.925 0 0 1 .727.564c1.87 1.87 1.345 5.66-1.198 8.203.001 0-1.48 1.52-2.876 2.876z"/></svg> },
              { name: 'Prisma', color: '#2D3748', logo: <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor"><path d="M21.8068 18.2848L13.5528.7565c-.207-.4382-.639-.7273-1.1286-.7541-.5765-.0303-1.0877.2126-1.3884.6504L.7607 16.8256c-.304.443-.3348.9958-.0804 1.464l3.5844 6.5867c.2427.4452.703.7323 1.2148.7539a1.4286 1.4286 0 0 0 .1345-.0034l15.2015-.7148c.5677-.0267.9938-.3575 1.1248-.8729.1324-.5207-.0716-1.0857-.5385-1.4523zm-4.9107-2.8155l-6.4323 6.6606a.3138.3138 0 0 1-.4436.0107.3118.3118 0 0 1-.1007-.2826l1.8683-12.0585c.0467-.3007.3508-.4963.6432-.4138l5.8368 1.6513c.2942.0831.4472.4003.334.6918l-1.7057 4.3605z" fillRule="evenodd"/></svg> },
              { name: 'Node.js', color: '#339933', logo: <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor"><path d="M11.998 24c-.321 0-.641-.084-.922-.247L8.14 22.016c-.438-.245-.224-.332-.08-.383.579-.202.696-.247 1.313-.598.065-.037.15-.024.218.015l2.256 1.339c.082.045.198.045.274 0l8.795-5.076c.082-.047.134-.141.134-.238V6.921c0-.099-.053-.193-.137-.242l-8.791-5.072c-.081-.047-.189-.047-.271 0L3.075 6.68c-.085.049-.139.143-.139.242v10.154c0 .097.054.189.139.235l2.409 1.392c1.307.654 2.108-.116 2.108-.891V7.787c0-.142.114-.253.256-.253h1.115c.139 0 .255.111.255.253v10.021c0 1.745-.95 2.745-2.604 2.745-.508 0-.909 0-2.026-.551L2.28 18.675c-.569-.329-.922-.943-.922-1.604V6.917c0-.66.353-1.273.922-1.602l8.795-5.082c.557-.315 1.296-.315 1.848 0l8.794 5.082c.57.329.924.943.924 1.602v10.154c0 .66-.354 1.273-.924 1.604l-8.794 5.078c-.28.163-.6.247-.925.247zm2.715-6.979c-3.857 0-4.664-1.771-4.664-3.257 0-.14.114-.254.256-.254h1.134c.127 0 .233.093.253.218.172 1.161.684 1.746 3.021 1.746 1.858 0 2.648-.42 2.648-1.404 0-.567-.224-.988-3.112-1.271-2.415-.238-3.909-.772-3.909-2.702 0-1.781 1.501-2.842 4.017-2.842 2.824 0 4.223.98 4.398 3.082.006.074-.022.147-.073.202-.051.055-.121.086-.196.086h-1.139c-.12 0-.226-.085-.251-.199-.279-1.24-.958-1.637-2.739-1.637-2.017 0-2.251.702-2.251 1.229 0 .638.277.823 3.015 1.183 2.711.355 4.006.858 4.006 2.775 0 1.924-1.603 3.025-4.4 3.025z"/></svg> },
              { name: 'Redis', color: '#DC382D', logo: <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor"><path d="M10.5 2.661l.54.997-1.797.644 2.409.166.54.996-1.797.645 2.409.166.002.002.54.994-1.798.645 2.41.165.54.997L9.955 9.42l2.409.167.54.995-4.14 1.52L24 17.721l-12 6.318-12-6.318 2.872-5.273.54.996L1.614 14.8l1.2-.44L.345 9.742l10.155-7.08zM8.678 17.042l-4.756-1.746-.53 1.96 5.286 1.94v-2.154zm6.644 0v2.154l5.287-1.94-.53-1.96-4.757 1.746zM12 12.088l-4.608 1.69 4.608 2.428 4.608-2.427-4.608-1.691z"/></svg> },
              { name: 'Swift', color: '#F05138', logo: <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor"><path d="M7.508 0c-.287 0-.573 0-.86.002-.241.002-.483.003-.724.01-.132.003-.263.009-.395.015A9.154 9.154 0 0 0 4.348.15 5.492 5.492 0 0 0 2.85.645 5.04 5.04 0 0 0 .645 2.848c-.245.48-.4 1-.475 1.498a9.2 9.2 0 0 0-.127 1.18c-.007.134-.011.268-.015.402-.006.24-.007.481-.009.722C.016 6.935.015 7.221.015 7.508v8.984c0 .287.001.573.004.86.002.24.003.481.009.722.004.134.008.268.015.402.019.399.058.796.127 1.18.076.498.23 1.017.475 1.498.244.48.573.919.987 1.289.372.332.792.598 1.218.787.498.222 1.017.377 1.498.453.399.069.796.107 1.18.127.134.006.268.011.402.015.24.006.481.007.722.009.286.002.573.002.86.002h8.984c.287 0 .573 0 .86-.002.241-.002.483-.003.724-.01.132-.003.263-.009.395-.015a9.154 9.154 0 0 0 1.18-.126 5.492 5.492 0 0 0 1.498-.453 5.04 5.04 0 0 0 2.205-2.203c.245-.48.4-1 .475-1.498.069-.399.108-.796.127-1.18.007-.134.011-.268.015-.402.006-.24.007-.481.009-.722.003-.286.003-.573.003-.86V7.509c0-.287-.001-.573-.003-.86a33.574 33.574 0 0 0-.01-.723 7.153 7.153 0 0 0-.014-.402 9.154 9.154 0 0 0-.127-1.18 5.492 5.492 0 0 0-.475-1.498 5.04 5.04 0 0 0-2.205-2.203 5.492 5.492 0 0 0-1.498-.453 9.2 9.2 0 0 0-1.18-.127 7.332 7.332 0 0 0-.395-.015c-.241-.006-.483-.007-.724-.009A66.468 66.468 0 0 0 16.493 0H7.508z"/></svg> },
            ].map((integration, i) => (
              <div
                key={`a-${i}`}
                className="flex items-center gap-3 px-6 md:px-8 py-3 shrink-0"
              >
                <span style={{ color: integration.color }}>{integration.logo}</span>
                <span className="text-white/40 text-sm font-medium whitespace-nowrap">
                  {integration.name}
                </span>
              </div>
            ))}
            {/* Duplicate for seamless loop */}
            {[
              { name: 'React', color: '#61DAFB', logo: <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor"><path d="M14.23 12.004a2.236 2.236 0 0 1-2.235 2.236 2.236 2.236 0 0 1-2.236-2.236 2.236 2.236 0 0 1 2.235-2.236 2.236 2.236 0 0 1 2.236 2.236zm2.648-10.69c-1.346 0-3.107.96-4.888 2.622-1.78-1.653-3.542-2.602-4.887-2.602-.41 0-.783.093-1.106.278-1.375.793-1.683 3.264-.973 6.365C1.98 8.917 0 10.42 0 12.004c0 1.59 1.99 3.097 5.043 4.03-.704 3.113-.39 5.588.988 6.38.32.187.69.275 1.102.275 1.345 0 3.107-.96 4.888-2.624 1.78 1.654 3.542 2.603 4.887 2.603.41 0 .783-.09 1.106-.275 1.374-.792 1.683-3.263.973-6.365C22.02 15.096 24 13.59 24 12.004c0-1.59-1.99-3.097-5.043-4.032.704-3.11.39-5.587-.988-6.38-.318-.184-.688-.277-1.092-.278zm-.005 1.09v.006c.225 0 .406.044.558.127.666.382.955 1.835.73 3.704-.054.46-.142.945-.25 1.44-.96-.236-2.006-.417-3.107-.534-.66-.905-1.345-1.727-2.035-2.447 1.592-1.48 3.087-2.292 4.105-2.295zm-9.77.02c1.012 0 2.514.808 4.11 2.28-.686.72-1.37 1.537-2.02 2.442-1.107.117-2.154.298-3.113.538-.112-.49-.195-.964-.254-1.42-.23-1.868.054-3.32.714-3.707.19-.09.4-.127.563-.132zm4.882 3.05c.455.468.91.992 1.36 1.564-.44-.02-.89-.034-1.345-.034-.46 0-.915.01-1.36.034.44-.572.895-1.096 1.345-1.565zM12 8.1c.74 0 1.477.034 2.202.093.406.582.802 1.203 1.183 1.86.372.64.71 1.29 1.018 1.946-.308.655-.646 1.31-1.013 1.95-.38.66-.773 1.288-1.18 1.87-.728.063-1.466.098-2.21.098-.74 0-1.477-.035-2.202-.093-.406-.582-.802-1.204-1.183-1.86-.372-.64-.71-1.29-1.018-1.946.303-.657.646-1.313 1.013-1.954.38-.66.773-1.286 1.18-1.868.728-.064 1.466-.098 2.21-.098zm-3.635.254c-.24.377-.48.763-.704 1.16-.225.39-.435.782-.635 1.174-.265-.656-.49-1.31-.676-1.947.64-.15 1.315-.283 2.015-.386zm7.26 0c.695.103 1.365.23 2.006.387-.18.632-.405 1.282-.66 1.933-.2-.39-.41-.783-.64-1.174-.225-.392-.465-.774-.705-1.146zm3.063.675c.484.15.944.317 1.375.498 1.732.74 2.852 1.708 2.852 2.476-.005.768-1.125 1.74-2.857 2.475-.42.18-.88.342-1.355.493-.28-.958-.646-1.956-1.1-2.98.45-1.017.81-2.01 1.085-2.964zm-13.395.004c.278.96.645 1.957 1.1 2.98-.45 1.017-.812 2.01-1.086 2.964-.484-.15-.944-.318-1.37-.5-1.732-.737-2.852-1.706-2.852-2.474 0-.768 1.12-1.742 2.852-2.476.42-.18.88-.342 1.356-.494zm11.678 4.28c.265.657.49 1.312.676 1.948-.64.157-1.316.29-2.016.39.24-.375.48-.762.705-1.158.225-.39.435-.788.636-1.18zm-9.945.02c.2.392.41.783.64 1.175.23.39.465.772.705 1.143-.695-.102-1.365-.23-2.006-.386.18-.63.406-1.282.66-1.933zM17.92 16.32c.112.493.2.968.254 1.423.23 1.868-.054 3.32-.714 3.708-.147.09-.338.128-.563.128-1.012 0-2.514-.807-4.11-2.28.686-.72 1.37-1.536 2.02-2.44 1.107-.118 2.154-.3 3.113-.54zm-11.83.01c.96.234 2.006.415 3.107.532.66.905 1.345 1.727 2.035 2.446-1.595 1.483-3.092 2.295-4.11 2.295-.22-.005-.406-.05-.553-.132-.666-.38-.955-1.834-.73-3.703.054-.46.142-.944.25-1.438zm4.56.64c.44.02.89.034 1.345.034.46 0 .915-.01 1.36-.034-.44.572-.895 1.095-1.345 1.565-.455-.47-.91-.993-1.36-1.565z"/></svg> },
              { name: 'Next.js', color: '#ffffff', logo: <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor"><path d="M11.572 0c-.176 0-.31.001-.358.007a19.76 19.76 0 0 1-.364.033C7.443.346 4.25 2.185 2.228 5.012a11.875 11.875 0 0 0-2.119 5.243c-.096.659-.108.854-.108 1.747s.012 1.089.108 1.748c.652 4.506 3.86 8.292 8.209 9.695.779.25 1.6.422 2.534.525.363.04 1.935.04 2.299 0 1.611-.178 2.977-.577 4.323-1.264.207-.106.247-.134.219-.158-.02-.013-.9-1.193-1.955-2.62l-1.919-2.592-2.404-3.558a338.739 338.739 0 0 0-2.422-3.556c-.009-.002-.018 1.579-.023 3.51-.007 3.38-.01 3.515-.052 3.595a.426.426 0 0 1-.206.214c-.075.037-.14.044-.495.044H7.81l-.108-.068a.438.438 0 0 1-.157-.171l-.05-.106.006-4.703.007-4.705.072-.092a.645.645 0 0 1 .174-.143c.096-.047.134-.051.54-.051.478 0 .558.018.682.154.035.038 1.337 1.999 2.895 4.361a10760.433 10760.433 0 0 0 4.735 7.17l1.9 2.879.096-.063a12.317 12.317 0 0 0 2.466-2.163 11.944 11.944 0 0 0 2.824-6.134c.096-.66.108-.854.108-1.748 0-.893-.012-1.088-.108-1.747-.652-4.506-3.859-8.292-8.208-9.695a12.597 12.597 0 0 0-2.499-.523A33.119 33.119 0 0 0 11.572 0zm4.069 7.217c.347 0 .408.005.486.047a.473.473 0 0 1 .237.277c.018.06.023 1.365.018 4.304l-.006 4.218-.744-1.14-.746-1.14v-3.066c0-1.982.01-3.097.023-3.15a.478.478 0 0 1 .233-.296c.096-.05.13-.054.5-.054z"/></svg> },
              { name: 'TypeScript', color: '#3178C6', logo: <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor"><path d="M1.125 0C.502 0 0 .502 0 1.125v21.75C0 23.498.502 24 1.125 24h21.75c.623 0 1.125-.502 1.125-1.125V1.125C24 .502 23.498 0 22.875 0zm17.363 9.75c.612 0 1.154.037 1.627.111a6.38 6.38 0 0 1 1.306.34v2.458a3.95 3.95 0 0 0-.643-.361 5.093 5.093 0 0 0-.717-.26 5.453 5.453 0 0 0-1.426-.2c-.3 0-.573.028-.819.086a2.1 2.1 0 0 0-.623.242c-.17.104-.3.229-.393.374a.888.888 0 0 0-.14.49c0 .196.053.373.156.529.104.156.252.304.443.444s.423.276.696.41c.273.135.582.274.926.416.47.197.892.407 1.266.628.374.222.695.473.963.753.268.279.472.598.614.957.142.359.214.776.214 1.253 0 .657-.125 1.21-.373 1.656a3.033 3.033 0 0 1-1.012 1.085 4.38 4.38 0 0 1-1.487.596c-.566.12-1.163.18-1.79.18a9.916 9.916 0 0 1-1.84-.164 5.544 5.544 0 0 1-1.512-.493v-2.63a5.033 5.033 0 0 0 3.237 1.2c.333 0 .624-.03.872-.09.249-.06.456-.144.623-.25.166-.108.29-.234.373-.38a1.023 1.023 0 0 0-.074-1.089 2.12 2.12 0 0 0-.537-.5 5.597 5.597 0 0 0-.807-.444 27.72 27.72 0 0 0-1.007-.436c-.918-.383-1.602-.852-2.053-1.405-.45-.553-.676-1.222-.676-2.005 0-.614.123-1.141.369-1.582.246-.441.58-.804 1.004-1.089a4.494 4.494 0 0 1 1.47-.629 7.536 7.536 0 0 1 1.77-.201zm-15.113.188h9.563v2.166H9.506v9.646H6.789v-9.646H3.375z"/></svg> },
              { name: 'Tailwind', color: '#06B6D4', logo: <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor"><path d="M12.001 4.8c-3.2 0-5.2 1.6-6 4.8 1.2-1.6 2.6-2.2 4.2-1.8.913.228 1.565.89 2.288 1.624C13.666 10.618 15.027 12 18.001 12c3.2 0 5.2-1.6 6-4.8-1.2 1.6-2.6 2.2-4.2 1.8-.913-.228-1.565-.89-2.288-1.624C16.337 6.182 14.976 4.8 12.001 4.8zm-6 7.2c-3.2 0-5.2 1.6-6 4.8 1.2-1.6 2.6-2.2 4.2-1.8.913.228 1.565.89 2.288 1.624 1.177 1.194 2.538 2.576 5.512 2.576 3.2 0 5.2-1.6 6-4.8-1.2 1.6-2.6 2.2-4.2 1.8-.913-.228-1.565-.89-2.288-1.624C10.337 13.382 8.976 12 6.001 12z"/></svg> },
              { name: 'Claude', color: '#D97757', logo: <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor"><path d="M4.603 15.457c-.547.96-.29 2.206.34 3.165.63.96 1.467 1.748 2.358 2.393.908.646 1.906 1.167 2.941 1.545 1.204.436 2.478.644 3.752.644 1.435.018 2.888-.257 4.198-.842a9.25 9.25 0 0 0 3.289-2.339c.423-.476.768-.994 1.037-1.545.072-.145.162-.29.234-.436a9.92 9.92 0 0 0 .521-1.454 9.473 9.473 0 0 0-.108-5.762c-.756-2.248-2.3-4.087-4.305-5.255a9.16 9.16 0 0 0-2.013-.897c-1.472-.474-3.062-.626-4.59-.403a9.018 9.018 0 0 0-4.09 1.655A9.546 9.546 0 0 0 5.12 9.314c-.225.403-.414.824-.584 1.256-.162.419-.298.841-.404 1.274-.09.37-.126.754-.162 1.129-.018.19-.018.38-.036.57a9.26 9.26 0 0 0 .162 2.374c.054.25.127.505.197.77.126.423.278.842.45 1.243.146.336.328.653.495.967l-.635-.44z"/></svg> },
              { name: 'OpenAI', color: '#ffffff', logo: <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor"><path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"/></svg> },
              { name: 'Google', color: '#4285F4', logo: <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor"><path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/></svg> },
              { name: 'Gemini', color: '#8E75B2', logo: <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor"><path d="M12 0C5.352 0 0 5.352 0 12s5.352 12 12 12 12-5.352 12-12S18.648 0 12 0zm0 2.4c5.28 0 9.6 4.32 9.6 9.6s-4.32 9.6-9.6 9.6S2.4 17.28 2.4 12 6.72 2.4 12 2.4zm0 1.92a7.68 7.68 0 1 0 0 15.36 7.68 7.68 0 0 0 0-15.36zm0 2.16a5.52 5.52 0 1 1 0 11.04 5.52 5.52 0 0 1 0-11.04z"/></svg> },
              { name: 'Supabase', color: '#3FCF8E', logo: <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor"><path d="M11.9 1.036c-.015-.986-1.26-1.41-1.874-.637L.764 12.05C-.33 13.427.65 15.455 2.409 15.455h9.579l.113 7.51c.014.985 1.259 1.408 1.873.636l9.262-11.653c1.093-1.375.113-3.403-1.645-3.403h-9.642z"/></svg> },
              { name: 'Stripe', color: '#635BFF', logo: <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor"><path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/></svg> },
              { name: 'Vercel', color: '#ffffff', logo: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M24 22.525H0l12-21.05 12 21.05z"/></svg> },
              { name: 'AWS', color: '#FF9900', logo: <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor"><path d="M6.763 10.036c0 .296.032.535.088.71.064.176.144.368.256.576.04.063.056.127.056.183 0 .08-.048.16-.152.24l-.503.335a.383.383 0 0 1-.208.072c-.08 0-.16-.04-.239-.112a2.47 2.47 0 0 1-.287-.375 6.18 6.18 0 0 1-.248-.471c-.622.734-1.405 1.101-2.347 1.101-.67 0-1.205-.191-1.596-.574-.391-.384-.59-.894-.59-1.533 0-.678.239-1.23.726-1.644.487-.415 1.133-.623 1.955-.623.272 0 .551.024.846.064.296.04.6.104.918.176v-.583c0-.607-.127-1.03-.375-1.277-.255-.248-.686-.367-1.3-.367-.28 0-.568.031-.863.103-.295.072-.583.16-.862.272a2.287 2.287 0 0 1-.28.104.488.488 0 0 1-.127.023c-.112 0-.168-.08-.168-.247v-.391c0-.128.016-.224.056-.28a.597.597 0 0 1 .224-.167c.279-.144.614-.264 1.005-.36a4.84 4.84 0 0 1 1.246-.151c.95 0 1.644.216 2.091.647.439.43.662 1.085.662 1.963v2.586zm-3.24 1.214c.263 0 .534-.048.822-.144.287-.096.543-.271.758-.51.128-.152.224-.32.272-.512.047-.191.08-.423.08-.694v-.335a6.66 6.66 0 0 0-.735-.136 6.02 6.02 0 0 0-.75-.048c-.535 0-.926.104-1.19.32-.263.215-.39.518-.39.917 0 .375.095.655.295.846.191.2.47.296.838.296zm6.41.862c-.144 0-.24-.024-.304-.08-.064-.048-.12-.16-.168-.311L7.586 5.55a1.398 1.398 0 0 1-.072-.32c0-.128.064-.2.191-.2h.783c.151 0 .255.025.31.08.065.048.113.16.16.312l1.342 5.284 1.245-5.284c.04-.16.088-.264.151-.312a.549.549 0 0 1 .32-.08h.638c.152 0 .256.025.32.08.063.048.12.16.151.312l1.261 5.348 1.381-5.348c.048-.16.104-.264.16-.312a.52.52 0 0 1 .311-.08h.743c.127 0 .2.065.2.2 0 .04-.009.08-.017.128a1.137 1.137 0 0 1-.056.2l-1.923 6.17c-.048.16-.104.264-.168.312a.51.51 0 0 1-.303.08h-.687c-.151 0-.255-.024-.32-.08-.063-.056-.119-.16-.15-.32l-1.238-5.148-1.23 5.14c-.04.16-.087.264-.15.32-.065.056-.177.08-.32.08zm10.256.215c-.415 0-.83-.048-1.229-.143-.399-.096-.71-.2-.918-.32-.128-.071-.215-.151-.247-.223a.563.563 0 0 1-.048-.224v-.407c0-.167.064-.247.183-.247.048 0 .096.008.144.024.048.016.12.048.2.08.271.12.566.215.878.279.319.064.63.096.95.096.502 0 .894-.088 1.165-.264a.86.86 0 0 0 .415-.758.777.777 0 0 0-.215-.559c-.144-.151-.416-.287-.807-.414l-1.157-.36c-.583-.183-1.014-.454-1.277-.813a1.902 1.902 0 0 1-.4-1.158c0-.335.073-.63.216-.886.144-.255.335-.479.575-.654.24-.184.51-.32.83-.415.32-.096.655-.136 1.006-.136.175 0 .359.008.535.032.183.024.35.056.518.088.16.04.312.08.455.127.144.048.256.096.336.144a.69.69 0 0 1 .24.2.43.43 0 0 1 .071.263v.375c0 .168-.064.256-.184.256a.83.83 0 0 1-.303-.096 3.652 3.652 0 0 0-1.532-.311c-.455 0-.815.071-1.062.223-.248.152-.375.383-.375.71 0 .224.08.416.24.567.159.152.454.304.877.44l1.134.358c.574.184.99.44 1.237.767.247.327.367.702.367 1.117 0 .343-.072.655-.207.926-.144.272-.336.511-.583.703-.248.2-.543.343-.886.447-.36.111-.734.167-1.142.167zM21.698 16.207c-2.626 1.94-6.442 2.969-9.722 2.969-4.598 0-8.74-1.7-11.87-4.526-.247-.223-.024-.527.27-.351 3.384 1.963 7.559 3.153 11.877 3.153 2.914 0 6.114-.607 9.06-1.852.439-.2.814.287.385.607zM22.792 14.961c-.336-.43-2.22-.207-3.074-.103-.255.032-.295-.192-.063-.36 1.5-1.053 3.967-.75 4.254-.399.287.36-.08 2.826-1.485 4.007-.215.184-.423.088-.327-.151.32-.79 1.03-2.57.695-2.994z"/></svg> },
              { name: 'Firebase', color: '#FFCA28', logo: <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor"><path d="M3.89 15.672L6.255.461A.542.542 0 0 1 7.27.288l2.543 4.771zm16.794 3.692l-2.25-14a.54.54 0 0 0-.919-.295L3.316 19.365l7.856 4.427a1.621 1.621 0 0 0 1.588 0zM14.3 7.147l-1.82-3.482a.542.542 0 0 0-.96 0L3.53 17.984z"/></svg> },
              { name: 'MongoDB', color: '#47A248', logo: <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor"><path d="M17.193 9.555c-1.264-5.58-4.252-7.414-4.573-8.115-.28-.394-.53-.954-.735-1.44-.036.495-.055.685-.523 1.184-.723.566-4.438 3.682-4.74 10.02-.282 5.912 4.27 9.435 4.888 9.884l.07.05A73.49 73.49 0 0 1 11.91 24h.481c.114-1.032.284-2.056.51-3.07.417-.296.604-.463.85-.693a11.342 11.342 0 0 0 3.639-8.464c.01-.814-.103-1.662-.197-2.218zm-5.336 8.195s0-8.291.275-8.29c.213 0 .49 10.695.49 10.695-.381-.045-.765-1.76-.765-2.405z"/></svg> },
              { name: 'PostgreSQL', color: '#4169E1', logo: <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor"><path d="M23.5594 14.7228a.5269.5269 0 0 0-.0563-.1191c-.139-.2632-.4768-.3418-1.0074-.2321-1.6533.3418-2.2139-.0879-2.3237-.1758.9082-1.7432 1.6445-3.7026 2.0996-5.6972.1172-.5098.1953-1.0371.2344-1.582.0381-.5765.0225-.9551-.0479-1.1699-.3496-1.0664-1.3203-1.1621-2.1299-.2461-.0479.0527-.0947.1094-.1406.1679-.5312.6855-1.1182 1.5137-1.6992 2.3828-.793-1.0273-1.6572-1.9805-2.5801-2.8516-1.0195-.9609-2.1426-1.8047-3.3418-2.5156C10.6865.5508 8.6699.0039 6.9531.0039c-.3359 0-.6621.0234-.9746.0703C2.5459.5752.3965 3.2617.0527 6.9258c-.0391.4043-.0566.7949-.0566 1.1699 0 3.5449 1.1523 7.4023 3.1641 10.5938.0234.0371.0488.0742.0742.1113.0254.0371.0527.0723.0801.1055.1191.1426.25.2754.3906.3984.8359.7383 1.7715 1.4121 2.7773 2.0059.5273.3125 1.1133.5664 1.7402.7578.6973.2129 1.4473.3223 2.2227.3223 1.2383 0 2.4316-.2754 3.5371-.8164.4961-.2422.9492-.5156 1.3496-.8125.4023.4707.8496.8906 1.3301 1.2617l.0156.0117c.0488.0371.0977.0742.1465.1094.0488.0371.0996.0723.1504.1055.0234.0156.0469.0293.0703.043.0234.0156.0488.0293.0742.0439.0254.0137.0508.0273.0762.041.0254.0137.0508.0264.0762.0391l.0742.0371c.0254.0117.0508.0234.0762.0352.0254.0117.0508.0234.0762.0342l.0781.0332c.0254.0098.0508.0195.0762.0283.0264.0098.0527.0186.0791.0273l.0781.0254c.0264.0078.0537.0156.0811.0234.0264.0068.0527.0137.08.0205l.0801.0186c.0273.0059.0547.0117.082.0166l.0801.0146c.0273.0049.0547.0088.082.0127l.0801.0107c.0283.0039.0566.0068.0849.0098l.0781.0068c.0293.0029.0576.0049.0869.0059l.0791.0029c.0293 0 .0576 0 .0869-.001l.0781-.0039c.0293-.002.0586-.0049.0879-.0078l.0762-.0088c.0293-.0039.0576-.0088.0869-.0137l.0732-.0127a.5075.5075 0 0 0 .0879-.0176l.0693-.0156c.0293-.0068.0586-.0146.0869-.0234l.0654-.0195c.0293-.0088.0576-.0186.0859-.0293l.0615-.0234c.0283-.0107.0566-.0225.0849-.0352l.0566-.0273a.651.651 0 0 0 .084-.0449l.0488-.0303c.0273-.0166.0537-.0342.0801-.0527l.041-.0293c.0254-.0195.0498-.0391.0742-.0586l.0283-.0244c.0234-.0205.0459-.042.0684-.0635l.0195-.0195c.0215-.0225.042-.0449.0625-.0674l.0107-.0127c.0195-.0234.0381-.0469.0566-.0703l.0039-.0059a.5268.5268 0 0 0 .0479-.0703c.4082-.6465.2988-1.7139-.2461-2.4102z"/></svg> },
              { name: 'Mapbox', color: '#4264FB', logo: <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor"><path d="M12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0zm5.696 14.943c-4.103 4.103-11.433 2.794-11.433 2.794S4.954 10.407 9.057 6.304C11.6 3.761 15.391 3.236 17.26 5.106c.225.225.41.47.564.727l-5.177 2.644 2.644-5.177a4.925 4.925 0 0 1 .727.564c1.87 1.87 1.345 5.66-1.198 8.203.001 0-1.48 1.52-2.876 2.876z"/></svg> },
              { name: 'Prisma', color: '#2D3748', logo: <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor"><path d="M21.8068 18.2848L13.5528.7565c-.207-.4382-.639-.7273-1.1286-.7541-.5765-.0303-1.0877.2126-1.3884.6504L.7607 16.8256c-.304.443-.3348.9958-.0804 1.464l3.5844 6.5867c.2427.4452.703.7323 1.2148.7539a1.4286 1.4286 0 0 0 .1345-.0034l15.2015-.7148c.5677-.0267.9938-.3575 1.1248-.8729.1324-.5207-.0716-1.0857-.5385-1.4523zm-4.9107-2.8155l-6.4323 6.6606a.3138.3138 0 0 1-.4436.0107.3118.3118 0 0 1-.1007-.2826l1.8683-12.0585c.0467-.3007.3508-.4963.6432-.4138l5.8368 1.6513c.2942.0831.4472.4003.334.6918l-1.7057 4.3605z" fillRule="evenodd"/></svg> },
              { name: 'Node.js', color: '#339933', logo: <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor"><path d="M11.998 24c-.321 0-.641-.084-.922-.247L8.14 22.016c-.438-.245-.224-.332-.08-.383.579-.202.696-.247 1.313-.598.065-.037.15-.024.218.015l2.256 1.339c.082.045.198.045.274 0l8.795-5.076c.082-.047.134-.141.134-.238V6.921c0-.099-.053-.193-.137-.242l-8.791-5.072c-.081-.047-.189-.047-.271 0L3.075 6.68c-.085.049-.139.143-.139.242v10.154c0 .097.054.189.139.235l2.409 1.392c1.307.654 2.108-.116 2.108-.891V7.787c0-.142.114-.253.256-.253h1.115c.139 0 .255.111.255.253v10.021c0 1.745-.95 2.745-2.604 2.745-.508 0-.909 0-2.026-.551L2.28 18.675c-.569-.329-.922-.943-.922-1.604V6.917c0-.66.353-1.273.922-1.602l8.795-5.082c.557-.315 1.296-.315 1.848 0l8.794 5.082c.57.329.924.943.924 1.602v10.154c0 .66-.354 1.273-.924 1.604l-8.794 5.078c-.28.163-.6.247-.925.247zm2.715-6.979c-3.857 0-4.664-1.771-4.664-3.257 0-.14.114-.254.256-.254h1.134c.127 0 .233.093.253.218.172 1.161.684 1.746 3.021 1.746 1.858 0 2.648-.42 2.648-1.404 0-.567-.224-.988-3.112-1.271-2.415-.238-3.909-.772-3.909-2.702 0-1.781 1.501-2.842 4.017-2.842 2.824 0 4.223.98 4.398 3.082.006.074-.022.147-.073.202-.051.055-.121.086-.196.086h-1.139c-.12 0-.226-.085-.251-.199-.279-1.24-.958-1.637-2.739-1.637-2.017 0-2.251.702-2.251 1.229 0 .638.277.823 3.015 1.183 2.711.355 4.006.858 4.006 2.775 0 1.924-1.603 3.025-4.4 3.025z"/></svg> },
              { name: 'Redis', color: '#DC382D', logo: <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor"><path d="M10.5 2.661l.54.997-1.797.644 2.409.166.54.996-1.797.645 2.409.166.002.002.54.994-1.798.645 2.41.165.54.997L9.955 9.42l2.409.167.54.995-4.14 1.52L24 17.721l-12 6.318-12-6.318 2.872-5.273.54.996L1.614 14.8l1.2-.44L.345 9.742l10.155-7.08zM8.678 17.042l-4.756-1.746-.53 1.96 5.286 1.94v-2.154zm6.644 0v2.154l5.287-1.94-.53-1.96-4.757 1.746zM12 12.088l-4.608 1.69 4.608 2.428 4.608-2.427-4.608-1.691z"/></svg> },
              { name: 'Swift', color: '#F05138', logo: <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor"><path d="M7.508 0c-.287 0-.573 0-.86.002-.241.002-.483.003-.724.01-.132.003-.263.009-.395.015A9.154 9.154 0 0 0 4.348.15 5.492 5.492 0 0 0 2.85.645 5.04 5.04 0 0 0 .645 2.848c-.245.48-.4 1-.475 1.498a9.2 9.2 0 0 0-.127 1.18c-.007.134-.011.268-.015.402-.006.24-.007.481-.009.722C.016 6.935.015 7.221.015 7.508v8.984c0 .287.001.573.004.86.002.24.003.481.009.722.004.134.008.268.015.402.019.399.058.796.127 1.18.076.498.23 1.017.475 1.498.244.48.573.919.987 1.289.372.332.792.598 1.218.787.498.222 1.017.377 1.498.453.399.069.796.107 1.18.127.134.006.268.011.402.015.24.006.481.007.722.009.286.002.573.002.86.002h8.984c.287 0 .573 0 .86-.002.241-.002.483-.003.724-.01.132-.003.263-.009.395-.015a9.154 9.154 0 0 0 1.18-.126 5.492 5.492 0 0 0 1.498-.453 5.04 5.04 0 0 0 2.205-2.203c.245-.48.4-1 .475-1.498.069-.399.108-.796.127-1.18.007-.134.011-.268.015-.402.006-.24.007-.481.009-.722.003-.286.003-.573.003-.86V7.509c0-.287-.001-.573-.003-.86a33.574 33.574 0 0 0-.01-.723 7.153 7.153 0 0 0-.014-.402 9.154 9.154 0 0 0-.127-1.18 5.492 5.492 0 0 0-.475-1.498 5.04 5.04 0 0 0-2.205-2.203 5.492 5.492 0 0 0-1.498-.453 9.2 9.2 0 0 0-1.18-.127 7.332 7.332 0 0 0-.395-.015c-.241-.006-.483-.007-.724-.009A66.468 66.468 0 0 0 16.493 0H7.508z"/></svg> },
            ].map((integration, i) => (
              <div
                key={`b-${i}`}
                className="flex items-center gap-3 px-6 md:px-8 py-3 shrink-0"
              >
                <span style={{ color: integration.color }}>{integration.logo}</span>
                <span className="text-white/40 text-sm font-medium whitespace-nowrap">
                  {integration.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The TORBIT Guarantee Section */}
      <section id="guarantee" className="px-6 md:px-8 py-16 md:py-24 border-t border-white/[0.06]">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-2xl md:text-3xl font-light text-white mb-4">
              The TORBIT Guarantee
            </h2>
            <p className="text-xl md:text-2xl text-white/60 font-light mb-3">
              You only pay for code that passes audit.
            </p>
            <p className="text-white/40 text-base">
              If it fails, your fuel is refunded automatically.
            </p>
            <p className="text-white/25 text-sm mt-6">
              Other tools charge per token. TORBIT charges per success.
            </p>
          </motion.div>

          {/* Why TORBIT Is Different - 3 Cards */}
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: 'Built-in Governance',
                items: ['Strategist review', 'Auditor verification', 'Organization policies', 'Environment enforcement']
              },
              {
                title: "Projects Don't Rot",
                items: ['Drift detection', 'Pinned integrations', 'Knowledge freezing', 'Deterministic rebuilds']
              },
              {
                title: 'You Own the Output',
                items: [
                  platform === 'ios' ? 'Xcode-ready iOS apps' : 'Vercel-ready web apps', 
                  'Audit ledger included', 
                  'No lock-in runtime',
                  'Full source export'
                ]
              },
            ].map((card, i) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className="p-6 md:p-8 rounded-2xl bg-white/[0.02] border border-white/[0.08] hover:border-white/[0.15] transition-colors"
              >
                <h3 className="text-white font-medium text-lg mb-4">{card.title}</h3>
                <ul className="space-y-2.5">
                  {card.items.map((item) => (
                    <li key={item} className="flex items-center gap-2.5 text-white/40 text-sm">
                      <div className="w-1 h-1 rounded-full bg-white/30" />
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Proof Metrics Section */}
      <section className="px-6 md:px-8 py-16 md:py-20 border-t border-white/[0.06]">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            {[
              { value: '452', label: 'Automated tests passing' },
              { value: '19', label: 'Governed integrations' },
              { value: '0', label: 'Secrets written to disk' },
              { value: '100%', label: 'Auditor-verified builds' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="text-center"
              >
                <div className="text-3xl md:text-4xl font-light text-white/70 mb-1">
                  {stat.value}
                </div>
                <div className="text-xs md:text-sm text-white/30 uppercase tracking-wide">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 md:px-8 py-16 md:py-24 border-t border-white/[0.06]">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-2xl md:text-3xl font-light text-white/80 mb-4">
              Ship something you can defend.
            </h2>
            <p className="text-white/40 mb-8">
              You don&apos;t need to trust AI anymore. TORBIT proves itself.
            </p>
            <a
              href={isLoggedIn ? '/dashboard' : '/login'}
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-black font-medium rounded-xl hover:shadow-[0_0_40px_rgba(255,255,255,0.2)] transition-all"
            >
              {isLoggedIn ? 'Go to Dashboard' : 'Build with Guarantees'}
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </a>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 md:px-8 py-8 border-t border-white/[0.06]">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-white/20 text-xs">© 2026 TORBIT. All rights reserved.</span>
          <div className="flex items-center gap-6 text-white/20 text-xs">
            <Link href="/privacy" className="hover:text-white/50 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-white/50 transition-colors">Terms</Link>
            <Link href="/contact" className="hover:text-white/50 transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
