'use client'

import { INTEGRATION_MARQUEE } from './constants'

export function IntegrationMarquee() {
  const loopedIntegrations = [...INTEGRATION_MARQUEE, ...INTEGRATION_MARQUEE]

  return (
    <section className="overflow-hidden border-t border-white/[0.06] py-16 md:py-20">
      <div className="mb-8 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-white/25">
          Governed integrations with pinned versions
        </p>
      </div>

      <div className="relative">
        <div className="pointer-events-none absolute bottom-0 left-0 top-0 z-10 w-24 bg-gradient-to-r from-black to-transparent md:w-40" />
        <div className="pointer-events-none absolute bottom-0 right-0 top-0 z-10 w-24 bg-gradient-to-l from-black to-transparent md:w-40" />

        <div className="flex animate-scroll">
          {loopedIntegrations.map((integration, index) => (
            <div key={`${integration.name}-${index}`} className="flex shrink-0 items-center gap-3 px-6 py-3 md:px-8">
              <span
                className="flex h-6 w-6 items-center justify-center rounded-full border border-white/15 text-[10px] font-semibold"
                style={{ color: integration.color }}
                aria-hidden="true"
              >
                {integration.name.slice(0, 1)}
              </span>
              <span className="whitespace-nowrap text-sm font-medium text-white/40">{integration.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
