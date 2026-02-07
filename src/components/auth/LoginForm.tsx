'use client'

/**
 * TORBIT - Login Form Component
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { Mail, Lock, Github, Chrome, ArrowRight } from 'lucide-react'
import { TorbitLogo, TorbitSpinner } from '@/components/ui/TorbitLogo'

type AuthMode = 'login' | 'signup'

export function LoginForm() {
  const router = useRouter()
  const { signIn, signUp, signInWithOAuth, loading } = useAuth()
  
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      if (mode === 'login') {
        await signIn(email, password)
      } else {
        await signUp(email, password)
      }
      const nextPath = typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('next')
        : null
      const safeRedirect = nextPath && nextPath.startsWith('/') && !nextPath.startsWith('//')
        ? nextPath
        : '/dashboard'
      router.push(safeRedirect)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOAuth = async (provider: 'google' | 'github') => {
    setError(null)
    try {
      await signInWithOAuth(provider)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OAuth failed')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="w-full"
    >
      {/* Logo */}
      <div className="text-center mb-8">
        <Link href="/" className="inline-flex items-center gap-2.5 group">
          <TorbitLogo size="lg" animated />
          <span className="text-3xl font-bold tracking-tight text-white">
            TORBIT
          </span>
        </Link>
        <p className="text-neutral-400 mt-2">
          {mode === 'login' ? 'Welcome back' : 'Create your account'}
        </p>
      </div>

      {/* Main Card */}
      <div className="bg-neutral-950/80 backdrop-blur-xl border border-neutral-800 rounded-2xl p-8 shadow-2xl">
        {/* OAuth Buttons */}
        <div className="space-y-3 mb-6">
          <button
            onClick={() => handleOAuth('google')}
            disabled={loading || isSubmitting}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white hover:bg-neutral-100 text-black font-medium rounded-xl transition-colors disabled:opacity-50"
          >
            <Chrome className="w-5 h-5" />
            Continue with Google
          </button>
          <button
            onClick={() => handleOAuth('github')}
            disabled={loading || isSubmitting}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-neutral-800 hover:bg-neutral-700 text-white font-medium rounded-xl border border-neutral-700 transition-colors disabled:opacity-50"
          >
            <Github className="w-5 h-5" />
            Continue with GitHub
          </button>
        </div>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-neutral-800" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-3 bg-neutral-950 text-neutral-500">or continue with email</span>
          </div>
        </div>

        {/* Email Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1.5">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full pl-11 pr-4 py-3 bg-neutral-900 border border-neutral-800 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-neutral-700 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full pl-11 pr-4 py-3 bg-neutral-900 border border-neutral-800 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-neutral-700 transition-all"
              />
            </div>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm"
            >
              {error}
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading || isSubmitting}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white hover:bg-neutral-200 text-black font-semibold rounded-xl transition-colors disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <TorbitSpinner size="xs" speed="fast" />
                {mode === 'login' ? 'Signing in...' : 'Creating account...'}
              </>
            ) : (
              <>
                {mode === 'login' ? 'Sign In' : 'Create Account'}
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        {/* Toggle Mode */}
        <div className="mt-6 text-center text-sm">
          <span className="text-neutral-500">
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          </span>
          <button
            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
            className="text-white hover:text-neutral-300 font-medium transition-colors"
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </div>
      </div>

      {/* Terms */}
      <p className="mt-6 text-center text-xs text-neutral-500">
        By continuing, you agree to our{' '}
        <Link href="/terms" className="text-neutral-400 hover:text-white transition-colors">
          Terms of Service
        </Link>
        {' '}and{' '}
        <Link href="/privacy" className="text-neutral-400 hover:text-white transition-colors">
          Privacy Policy
        </Link>
      </p>
    </motion.div>
  )
}
