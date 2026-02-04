import { MatrixRain } from '@/components/effects'
import { PremiumHero } from '@/components/landing'

export default function Home() {
  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      {/* Cinematic Matrix Rain - Slow & Visible */}
      <MatrixRain 
        opacity={0.7} 
        speed={0.25} 
        density={0.35} 
        fontSize={20}
      />

      {/* Gradient overlays for depth */}
      <div className="fixed inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 pointer-events-none z-[1]" />
      <div className="fixed inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40 pointer-events-none z-[1]" />

      {/* Subtle vignette */}
      <div className="fixed inset-0 pointer-events-none z-[1]" style={{
        background: 'radial-gradient(ellipse at center, transparent 0%, transparent 40%, rgba(0,0,0,0.6) 100%)'
      }} />

      {/* Main Content */}
      <main className="relative z-10">
        <PremiumHero />
      </main>
    </div>
  )
}

