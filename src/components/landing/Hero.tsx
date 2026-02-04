'use client'

import { memo, useState } from 'react'
import { motion } from 'framer-motion'
import { GlitchText, Typewriter } from '@/components/effects'
import { MatrixButton, MatrixInput } from '@/components/ui'

/**
 * Hero - Main landing page hero section
 * 
 * "What if I told you... you could build apps with just your thoughts?"
 */
const Hero = memo(function Hero() {
  const [email, setEmail] = useState('')
  const [showSubtitle, setShowSubtitle] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Implement waitlist signup API call
  }

  return (
    <section
      data-testid="hero-section"
      className="relative min-h-screen flex items-center justify-center px-6 pt-20"
    >
      <div className="max-w-5xl mx-auto text-center z-10">
        {/* Pre-title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6"
        >
          <span className="inline-block px-4 py-1 text-xs font-mono text-matrix-500 border border-matrix-700 uppercase tracking-widest">
            The Future of Coding is Here
          </span>
        </motion.div>

        {/* Main Title */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-5xl md:text-7xl lg:text-8xl font-bold mb-8"
        >
          <GlitchText
            text="TORBIT"
            as="span"
            className="text-matrix-400 drop-shadow-[0_0_30px_rgba(0,255,65,0.5)]"
          />
        </motion.h1>

        {/* Typewriter Subtitle */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="text-xl md:text-2xl lg:text-3xl font-mono text-matrix-300 mb-6 h-12"
        >
          <Typewriter
            text="Describe your vision. We build your reality."
            speed={40}
            delay={1000}
            onComplete={() => setShowSubtitle(true)}
          />
        </motion.div>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: showSubtitle ? 1 : 0 }}
          transition={{ duration: 0.5 }}
          className="text-lg text-matrix-600 max-w-2xl mx-auto mb-12 font-mono"
        >
          The first multi-agent AI system that thinks, plans, and codes like a
          senior engineering team. Zero config. Zero friction. Pure creation.
        </motion.p>

        {/* CTA Form */}
        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: showSubtitle ? 1 : 0, y: showSubtitle ? 0 : 20 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-lg mx-auto"
        >
          <MatrixInput
            type="email"
            placeholder="neo@matrix.io"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1"
            aria-label="Email address"
          />
          <MatrixButton
            type="submit"
            size="lg"
            className="w-full sm:w-auto whitespace-nowrap"
          >
            Enter the Matrix
          </MatrixButton>
        </motion.form>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: showSubtitle ? 1 : 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-16 grid grid-cols-3 gap-8 max-w-2xl mx-auto"
        >
          {[
            { value: '<15s', label: 'Time to First Render' },
            { value: '6', label: 'AI Agents Working' },
            { value: '∞', label: 'Possibilities' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-matrix-400 font-mono">
                {stat.value}
              </div>
              <div className="text-xs text-matrix-600 uppercase tracking-wider mt-2">
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <div className="flex flex-col items-center gap-2 text-matrix-600">
            <span className="text-xs font-mono uppercase tracking-widest">
              Scroll to Explore
            </span>
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-2xl"
            >
              ⌄
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  )
})

export default Hero
