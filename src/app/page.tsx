import { PremiumHero, PricingSection } from '@/components/landing'

export default function Home() {
  return (
    <div className="min-h-screen bg-black">
      <div className="fixed inset-0 bg-gradient-to-b from-black via-neutral-950 to-black pointer-events-none" />

      <main className="relative z-10">
        <PremiumHero />
        <PricingSection />
      </main>
    </div>
  )
}

