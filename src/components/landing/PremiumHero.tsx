'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion'

const PLACEHOLDER_EXAMPLES = [
  "A real-time crypto trading dashboard...",
  "An AI-powered customer support platform...",
  "A marketplace for vintage collectibles...",
  "A project management tool with AI insights...",
  "A social network for music producers...",
  "An analytics dashboard for e-commerce...",
]

const COMPANIES = [
  { name: "ACME Corp", delay: 0 },
  { name: "TechFlow", delay: 0.1 },
  { name: "NovaSoft", delay: 0.2 },
  { name: "Quantum AI", delay: 0.3 },
  { name: "CloudScale", delay: 0.4 },
]

/**
 * PremiumHero - Enterprise-grade hero with premium interactions
 */
export default function PremiumHero() {
  const router = useRouter()
  const [prompt, setPrompt] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [showContent, setShowContent] = useState(false)
  const [placeholderIndex, setPlaceholderIndex] = useState(0)
  const [displayPlaceholder, setDisplayPlaceholder] = useState('')
  const [isTypingPlaceholder, setIsTypingPlaceholder] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)
  
  // Pre-generate random values for particles (up to 20) - generated once on mount
  const [particleRandoms] = useState(() => 
    Array.from({ length: 20 }, () => ({
      xOffset: Math.random() * 100,
      durationOffset: Math.random(),
    }))
  )
  
  // Mouse tracking for logo glow
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const smoothMouseX = useSpring(mouseX, { stiffness: 300, damping: 30 })
  const smoothMouseY = useSpring(mouseY, { stiffness: 300, damping: 30 })

  // Input energy level based on typing
  const [energyLevel, setEnergyLevel] = useState(0)
  const energySpring = useSpring(energyLevel, { stiffness: 100, damping: 20 })

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 600)
    return () => clearTimeout(timer)
  }, [])

  // Cycling placeholder with typewriter effect
  useEffect(() => {
    if (prompt) return // Don't animate if user is typing
    
    const currentExample = PLACEHOLDER_EXAMPLES[placeholderIndex]
    
    if (isTypingPlaceholder) {
      if (displayPlaceholder.length < currentExample.length) {
        const timer = setTimeout(() => {
          setDisplayPlaceholder(currentExample.slice(0, displayPlaceholder.length + 1))
        }, 50)
        return () => clearTimeout(timer)
      } else {
        // Pause at full text
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
        // Move to next example - defer to next frame to avoid synchronous setState in effect
        const timer = setTimeout(() => {
          setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDER_EXAMPLES.length)
          setIsTypingPlaceholder(true)
        }, 0)
        return () => clearTimeout(timer)
      }
    }
  }, [displayPlaceholder, isTypingPlaceholder, placeholderIndex, prompt])

  // Track mouse for logo glow effect
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    mouseX.set(e.clientX - rect.left - rect.width / 2)
    mouseY.set(e.clientY - rect.top - rect.height / 2)
  }, [mouseX, mouseY])

  // Update energy based on input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPrompt(e.target.value)
    setEnergyLevel(Math.min(e.target.value.length / 30, 1))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (prompt.trim()) {
      // Store prompt and navigate to builder
      sessionStorage.setItem('torbit_prompt', prompt)
      router.push('/builder')
    }
  }

  return (
    <div className="min-h-screen flex flex-col" onMouseMove={handleMouseMove}>
      {/* Transparent Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 md:px-8 py-4 md:py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: showContent ? 1 : 0 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="flex items-center gap-3"
          >
            <div className="relative w-2 h-2">
              <div className="absolute inset-0 bg-[#00ff41] rounded-full" />
              <div className="absolute inset-0 bg-[#00ff41] rounded-full animate-ping opacity-75" />
            </div>
            <span className="text-white/40 text-xs font-light tracking-[0.3em] uppercase hidden sm:block">
              System Online
            </span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: showContent ? 1 : 0 }}
            transition={{ duration: 1, delay: 0.7 }}
            className="flex items-center gap-4 md:gap-6"
          >
            <a href="#" className="text-white/40 text-sm font-light hover:text-white/80 transition-colors duration-300">
              Docs
            </a>
            <a href="#" className="text-white/40 text-sm font-light hover:text-white/80 transition-colors duration-300 hidden sm:block">
              Pricing
            </a>
            <button className="px-3 md:px-4 py-2 text-sm text-white/60 border border-white/10 hover:border-white/30 hover:text-white transition-all duration-300 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]">
              Sign In
            </button>
          </motion.div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 md:px-6 pt-20">
        <div className="w-full max-w-4xl mx-auto text-center">
          {/* TORBIT Logo */}
          <AnimatePresence>
            {showContent && (
              <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 1.2, ease: [0.25, 0.4, 0.25, 1] }}
                className="mb-12 md:mb-16 relative"
              >
                {/* Dynamic glow that follows mouse */}
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: `radial-gradient(600px circle at calc(50% + ${smoothMouseX.get()}px) calc(50% + ${smoothMouseY.get()}px), rgba(0, 255, 65, 0.07), transparent 40%)`,
                  }}
                />
                
                <h1 className="text-[4.5rem] sm:text-[7rem] md:text-[10rem] lg:text-[12rem] font-light tracking-[-0.03em] leading-none select-none relative">
                  {/* Main text with gradient */}
                  <span 
                    className="relative inline-block"
                    style={{ 
                      fontFamily: "'Space Grotesk', sans-serif",
                      background: 'linear-gradient(180deg, #ffffff 0%, #ffffff 50%, rgba(255,255,255,0.7) 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      filter: 'drop-shadow(0 0 60px rgba(0, 255, 65, 0.15))',
                    }}
                  >
                    T
                  </span>
                  
                  {/* The O with orbit ring */}
                  <span className="relative inline-block">
                    <span 
                      style={{ 
                        fontFamily: "'Space Grotesk', sans-serif",
                        background: 'linear-gradient(180deg, #ffffff 0%, #ffffff 50%, rgba(255,255,255,0.7) 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                      }}
                    >
                      O
                    </span>
                    {/* Orbit ring */}
                    <motion.div
                      className="absolute inset-0 flex items-center justify-center pointer-events-none"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    >
                      <div 
                        className="w-[80%] h-[80%] border border-[#00ff41]/30 rounded-full"
                        style={{ transform: 'rotateX(70deg)' }}
                      />
                    </motion.div>
                    {/* Orbiting dot */}
                    <motion.div
                      className="absolute inset-0 flex items-center justify-center pointer-events-none"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                    >
                      <div 
                        className="w-[80%] h-[80%] relative"
                        style={{ transform: 'rotateX(70deg)' }}
                      >
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-[#00ff41] rounded-full shadow-[0_0_10px_#00ff41]" />
                      </div>
                    </motion.div>
                  </span>
                  
                  <span 
                    style={{ 
                      fontFamily: "'Space Grotesk', sans-serif",
                      background: 'linear-gradient(180deg, #ffffff 0%, #ffffff 50%, rgba(255,255,255,0.7) 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    RBIT
                  </span>
                </h1>
                
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 1, delay: 0.8 }}
                  className="text-white/30 text-base md:text-lg font-light tracking-wide mt-4"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  Ship production software in minutes, not months
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Premium Input Bar */}
          <AnimatePresence>
            {showContent && (
              <motion.form
                onSubmit={handleSubmit}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 1 }}
                className="relative"
              >
                <motion.div 
                  className="relative overflow-hidden rounded-2xl transition-all duration-500"
                  style={{
                    boxShadow: isFocused 
                      ? `0 0 ${40 + energySpring.get() * 40}px rgba(0,255,65,${0.1 + energySpring.get() * 0.15})`
                      : '0 0 40px rgba(0,0,0,0.5)',
                  }}
                >
                  {/* Energy particles based on input */}
                  {prompt.length > 0 && (
                    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
                      {[...Array(Math.min(prompt.length, 20))].map((_, i) => (
                        <motion.div
                          key={i}
                          className="absolute w-1 h-1 bg-[#00ff41] rounded-full"
                          initial={{ 
                            x: particleRandoms[i].xOffset + '%', 
                            y: '100%',
                            opacity: 0 
                          }}
                          animate={{ 
                            y: '-20%',
                            opacity: [0, 1, 0],
                          }}
                          transition={{
                            duration: 2 + particleRandoms[i].durationOffset,
                            repeat: Infinity,
                            delay: i * 0.1,
                            ease: "easeOut"
                          }}
                          style={{
                            left: `${5 + (i * 4.5)}%`,
                            filter: 'blur(0.5px)',
                          }}
                        />
                      ))}
                    </div>
                  )}
                  
                  {/* Animated border glow */}
                  <motion.div 
                    className="absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500"
                    style={{
                      opacity: isFocused ? 0.5 + energySpring.get() * 0.5 : 0,
                      background: `linear-gradient(90deg, transparent, rgba(0,255,65,${0.2 + energySpring.get() * 0.3}), transparent)`,
                    }}
                    animate={isFocused ? { x: ['-100%', '100%'] } : {}}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  />
                  
                  {/* Input container */}
                  <div 
                    className="relative backdrop-blur-xl border rounded-2xl transition-all duration-300"
                    style={{
                      background: `rgba(255,255,255,${0.02 + energySpring.get() * 0.02})`,
                      borderColor: isFocused 
                        ? `rgba(0,255,65,${0.2 + energySpring.get() * 0.3})` 
                        : 'rgba(255,255,255,0.08)',
                    }}
                  >
                    <input
                      ref={inputRef}
                      type="text"
                      value={prompt}
                      onChange={handleInputChange}
                      onFocus={() => setIsFocused(true)}
                      onBlur={() => setIsFocused(false)}
                      placeholder=""
                      className="w-full bg-transparent text-white text-lg md:text-2xl font-light 
                        pl-6 md:pl-8 pr-24 md:pr-32 py-5 md:py-6 focus:outline-none tracking-wide"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    />
                    
                    {/* Animated placeholder */}
                    {!prompt && (
                      <div 
                        className="absolute left-6 md:left-8 top-1/2 -translate-y-1/2 text-white/20 text-lg md:text-2xl font-light pointer-events-none tracking-wide"
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                      >
                        {displayPlaceholder}
                        <span className="animate-pulse">|</span>
                      </div>
                    )}
                    
                    {/* Submit button */}
                    <motion.button
                      type="submit"
                      disabled={!prompt.trim()}
                      className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2
                        px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-medium text-sm tracking-wide
                        transition-all duration-300 disabled:cursor-not-allowed"
                      style={{ 
                        fontFamily: "'Space Grotesk', sans-serif",
                        background: prompt.trim() ? '#00ff41' : 'rgba(255,255,255,0.05)',
                        color: prompt.trim() ? '#000' : 'rgba(255,255,255,0.3)',
                      }}
                      whileHover={prompt.trim() ? { scale: 1.02, boxShadow: '0 0 30px rgba(0,255,65,0.5)' } : {}}
                      whileTap={prompt.trim() ? { scale: 0.98 } : {}}
                    >
                      Build →
                    </motion.button>
                  </div>
                </motion.div>

                {/* Hint */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 1.5 }}
                  className="text-white/20 text-sm mt-4 md:mt-6 font-light"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  Describe your vision in plain English. Our AI agents handle the rest.
                </motion.p>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Social Proof */}
          <AnimatePresence>
            {showContent && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 1.8 }}
                className="mt-16 md:mt-24"
              >
                <p className="text-white/20 text-xs uppercase tracking-[0.2em] mb-6 font-light">
                  Trusted by teams building the future
                </p>
                <div className="flex flex-wrap justify-center items-center gap-6 md:gap-10">
                  {COMPANIES.map((company) => (
                    <motion.div
                      key={company.name}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 2 + company.delay }}
                      className="text-white/15 text-sm md:text-base font-light tracking-wider hover:text-white/30 transition-colors duration-300"
                      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                    >
                      {company.name}
                    </motion.div>
                  ))}
                </div>
                
                {/* Stats */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.8, delay: 2.5 }}
                  className="flex justify-center items-center gap-8 md:gap-16 mt-10 md:mt-12"
                >
                  {[
                    { value: '2,400+', label: 'Apps Built' },
                    { value: '<60s', label: 'Avg Deploy Time' },
                    { value: '99.9%', label: 'Uptime' },
                  ].map((stat) => (
                    <div key={stat.label} className="text-center">
                      <div 
                        className="text-xl md:text-2xl font-light text-white/40"
                        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                      >
                        {stat.value}
                      </div>
                      <div className="text-[10px] md:text-xs text-white/20 uppercase tracking-wider mt-1">
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom branding */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: showContent ? 1 : 0 }}
        transition={{ duration: 1, delay: 3 }}
        className="absolute bottom-6 md:bottom-8 left-0 right-0 text-center"
      >
        <p className="text-white/10 text-[10px] md:text-xs tracking-[0.2em] uppercase font-light">
          Powered by 6 Autonomous AI Agents
        </p>
      </motion.div>
    </div>
  )
}
