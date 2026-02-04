'use client'

import { memo } from 'react'
import { motion } from 'framer-motion'

interface Step {
  number: string
  title: string
  description: string
  visual: string
}

const steps: Step[] = [
  {
    number: '01',
    title: 'Describe Your Vision',
    description: 'Tell TORBIT what you want in plain English. "Build me a Spotify clone for classical music." That\'s it.',
    visual: `┌─────────────────────────────────────┐
│ > Build me a habit tracker with     │
│   streaks and social features       │
│                                     │
│ ▌                                   │
└─────────────────────────────────────┘`,
  },
  {
    number: '02',
    title: 'Watch the Agents Work',
    description: 'See your app materialize in real-time. Components stream as they\'re built. No waiting for the whole thing.',
    visual: `┌─ PLANNER ──────────────────────────┐
│ ✓ Parsed requirements              │
│ ✓ Generated 8 user stories         │
├─ ARCHITECT ────────────────────────┤
│ ✓ Designed schema                  │
│ ⟳ Creating file structure...       │
└─────────────────────────────────────┘`,
  },
  {
    number: '03',
    title: 'Iterate & Deploy',
    description: 'Say "Add dark mode" and watch it happen. One click deploys to production. No config required.',
    visual: `┌─────────────────────────────────────┐
│ ✓ All 47 files generated           │
│ ✓ Build passed                     │
│ ✓ No type errors                   │
│                                     │
│ [Deploy to Vercel] [Edit in IDE]   │
└─────────────────────────────────────┘`,
  },
]

/**
 * HowItWorks - Step-by-step flow visualization
 */
const HowItWorks = memo(function HowItWorks() {
  return (
    <section
      id="how-it-works"
      data-testid="how-it-works-section"
      className="py-24 px-6 bg-gradient-to-b from-transparent via-matrix-400/5 to-transparent"
    >
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-20">
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="inline-block px-4 py-1 text-xs font-mono text-matrix-500 border border-matrix-700 uppercase tracking-widest mb-4"
          >
            The Process
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-bold text-matrix-400 mb-6"
          >
            From Vibe to Deploy
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-matrix-600 font-mono max-w-2xl mx-auto"
          >
            Three steps. Under 60 seconds. No configuration, no boilerplate,
            no friction.
          </motion.p>
        </div>

        {/* Steps */}
        <div className="space-y-24">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.6 }}
              className={`flex flex-col ${
                index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
              } items-center gap-12`}
            >
              {/* Text content */}
              <div className="flex-1 text-center md:text-left">
                <div className="inline-block text-6xl font-bold text-matrix-800 font-mono mb-4">
                  {step.number}
                </div>
                <h3 className="text-2xl md:text-3xl font-bold text-matrix-400 mb-4">
                  {step.title}
                </h3>
                <p className="text-matrix-600 font-mono text-lg">
                  {step.description}
                </p>
              </div>

              {/* Visual */}
              <div className="flex-1 w-full">
                <div className="relative">
                  {/* Terminal window */}
                  <div className="bg-void-900 border border-matrix-700 rounded-lg overflow-hidden">
                    {/* Terminal header */}
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-matrix-800">
                      <span className="w-3 h-3 rounded-full bg-glitch-400" />
                      <span className="w-3 h-3 rounded-full bg-warning" />
                      <span className="w-3 h-3 rounded-full bg-matrix-400" />
                      <span className="ml-4 text-xs font-mono text-matrix-600">
                        torbit://step-{step.number}
                      </span>
                    </div>
                    {/* Terminal content */}
                    <pre className="p-6 text-sm font-mono text-matrix-400 overflow-x-auto">
                      {step.visual}
                    </pre>
                  </div>

                  {/* Glow effect */}
                  <div className="absolute inset-0 -z-10 bg-matrix-400/10 blur-3xl rounded-full" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
})

export default HowItWorks
