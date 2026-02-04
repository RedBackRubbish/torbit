'use client'

import { memo } from 'react'
import { motion } from 'framer-motion'
import { MatrixCard } from '@/components/ui'

interface Feature {
  icon: string
  title: string
  description: string
  code?: string
}

const features: Feature[] = [
  {
    icon: '🧠',
    title: 'Planner Agent',
    description: 'Converts your "vibes" into structured product requirements. Ask vaguely, receive precisely.',
    code: '> planner.parse("crypto dashboard")\n{ features: [...], schema: {...} }',
  },
  {
    icon: '🎨',
    title: 'Designer Agent',
    description: 'Generates design tokens before any code. Consistent aesthetics, mathematically guaranteed.',
    code: '> designer.tokens()\ncolors: { primary: "#00ff41" }',
  },
  {
    icon: '🏗️',
    title: 'Architect Agent',
    description: 'Creates file structures, database schemas, and API signatures. The blueprint before the build.',
    code: '> architect.plan()\n/components/Dashboard.tsx\n/api/data/route.ts',
  },
  {
    icon: '📚',
    title: 'Librarian Agent',
    description: 'RAG-powered memory system. Fetches only relevant context, solving the token bottleneck.',
    code: '> librarian.fetch("add chart")\n[Dashboard.tsx, Chart.tsx]',
  },
  {
    icon: '⚡',
    title: 'Builder Agent',
    description: 'The heavy lifter. Writes production-ready code with zero placeholders. Ever.',
    code: '> builder.generate()\n✓ 47 files generated\n✓ 0 TODOs',
  },
  {
    icon: '🔍',
    title: 'Auditor Agent',
    description: 'Runs builds in sandboxed environments. Catches errors before you see them. Always.',
    code: '> auditor.check()\n✓ Build passed\n✓ No type errors',
  },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
}

/**
 * Features - Showcase of the 6-agent system
 */
const Features = memo(function Features() {
  return (
    <section
      id="features"
      data-testid="features-section"
      className="py-24 px-6"
    >
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="inline-block px-4 py-1 text-xs font-mono text-matrix-500 border border-matrix-700 uppercase tracking-widest mb-4"
          >
            The Orbit System
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-bold text-matrix-400 mb-6"
          >
            6 Agents. One Mind.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-matrix-600 font-mono max-w-2xl mx-auto"
          >
            Not a single AI assistant. A coordinated team that thinks, plans,
            builds, and audits—while you focus on the vision.
          </motion.p>
        </div>

        {/* Feature Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feature) => (
            <motion.div key={feature.title} variants={itemVariants}>
              <MatrixCard
                variant="terminal"
                className="h-full hover:translate-y-[-4px] transition-transform"
              >
                <div className="flex flex-col h-full">
                  {/* Icon */}
                  <div className="text-4xl mb-4">{feature.icon}</div>

                  {/* Title */}
                  <h3 className="text-xl font-bold text-matrix-400 mb-3">
                    {feature.title}
                  </h3>

                  {/* Description */}
                  <p className="text-matrix-600 text-sm mb-4 flex-grow">
                    {feature.description}
                  </p>

                  {/* Code snippet */}
                  {feature.code && (
                    <div className="bg-void-900 border border-matrix-800 p-3 font-mono text-xs text-matrix-500">
                      <pre>{feature.code}</pre>
                    </div>
                  )}
                </div>
              </MatrixCard>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
})

export default Features
