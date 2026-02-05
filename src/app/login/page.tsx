/**
 * TORBIT - Login Page
 */

import { LoginForm } from '@/components/auth/LoginForm'
import { MatrixRain } from '@/components/effects'

export default function LoginPage() {
  return (
    <div className="relative min-h-screen bg-black overflow-hidden flex items-center justify-center">
      {/* Background Matrix Rain */}
      <MatrixRain 
        opacity={0.4} 
        speed={0.2} 
        density={0.25} 
        fontSize={16}
      />
      
      {/* Gradient overlays */}
      <div className="fixed inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/80 pointer-events-none z-[1]" />
      <div className="fixed inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/60 pointer-events-none z-[1]" />
      
      {/* Vignette */}
      <div className="fixed inset-0 pointer-events-none z-[1]" style={{
        background: 'radial-gradient(ellipse at center, transparent 0%, transparent 40%, rgba(0,0,0,0.8) 100%)'
      }} />

      {/* Login Form */}
      <div className="relative z-10 w-full max-w-md px-4">
        <LoginForm />
      </div>
    </div>
  )
}
