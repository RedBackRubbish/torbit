'use client'

import { memo, useState } from 'react'
import { motion } from 'framer-motion'
import { MatrixButton, MatrixInput } from '@/components/ui'
import { GlitchText } from '@/components/effects'

/**
 * CTA - Final call-to-action section
 */
const CTA = memo(function CTA() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle waitlist signup
    console.log('Waitlist signup:', email)
    setSubmitted(true)
  }

  return (
    <section
      data-testid="cta-section"
      className="py-32 px-6 relative overflow-hidden"
    >
      {/* Background glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[800px] h-[800px] bg-matrix-400/10 rounded-full blur-[150px]" />
      </div>

      <div className="max-w-4xl mx-auto text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {/* Pre-title */}
          <span className="inline-block px-4 py-1 text-xs font-mono text-matrix-500 border border-matrix-700 uppercase tracking-widest mb-6">
            Ready to Take the Red Pill?
          </span>

          {/* Title */}
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            <GlitchText
              text="The Matrix is Calling"
              as="span"
              className="text-matrix-400"
            />
          </h2>

          {/* Description */}
          <p className="text-xl text-matrix-600 font-mono mb-12 max-w-2xl mx-auto">
            Join the waitlist and be among the first to experience the future
            of app development. No more fighting the code—become one with it.
          </p>

          {/* Form or Success */}
          {!submitted ? (
            <motion.form
              onSubmit={handleSubmit}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-lg mx-auto"
            >
              <MatrixInput
                type="email"
                placeholder="neo@matrix.io"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="flex-1"
                aria-label="Email address"
              />
              <MatrixButton
                type="submit"
                size="lg"
                className="w-full sm:w-auto whitespace-nowrap"
              >
                Join Waitlist
              </MatrixButton>
            </motion.form>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div className="inline-block p-8 border border-matrix-400 bg-matrix-400/10">
                <div className="text-4xl mb-4">✓</div>
                <h3 className="text-2xl font-bold text-matrix-400 mb-2">
                  You&apos;re In
                </h3>
                <p className="text-matrix-600 font-mono">
                  Welcome to the resistance. We&apos;ll be in touch.
                </p>
              </div>
            </motion.div>
          )}

          {/* Bottom text */}
          <p className="mt-8 text-sm text-matrix-700 font-mono">
            Free during beta • No credit card required • Cancel anytime
          </p>
        </motion.div>
      </div>
    </section>
  )
})

export default CTA
