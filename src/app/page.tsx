import { PremiumHero, PricingSection } from '@/components/landing'

export default function Home() {
  return (
    <div className="min-h-screen bg-black">
      {/* Gradient background */}
      <div className="fixed inset-0 bg-gradient-to-b from-black via-neutral-950 to-black pointer-events-none" />

      {/* Noise texture */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Content */}
      <main className="relative z-10">
        <PremiumHero />
        <PricingSection />
      </main>
    </div>
  )
}
