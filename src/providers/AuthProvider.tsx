'use client'

/**
 * TORBIT - Auth Provider
 * 
 * Provides auth context throughout the app.
 */

import { createContext, useContext, useEffect, useState, useRef, useCallback, type ReactNode } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import type { User, Session, SupabaseClient } from '@supabase/supabase-js'
import type { Profile, Database } from '@/lib/supabase/types'
import { isSupabaseConfigured } from '@/lib/supabase/client'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signInWithOAuth: (provider: 'google' | 'github') => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const supabaseRef = useRef<SupabaseClient<Database> | null>(null)

  // Get or create supabase client (returns null if not configured)
  const getClient = useCallback(() => {
    if (!isSupabaseConfigured()) return null
    if (!supabaseRef.current) {
      try {
        supabaseRef.current = createBrowserClient<Database>(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
      } catch (e) {
        console.warn('[AuthProvider] Failed to create Supabase client:', e)
        return null
      }
    }
    return supabaseRef.current
  }, [])

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const supabase = getClient()
      if (!supabase) return null
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      
      return data as Profile | null
    } catch (err) {
      console.error('[AuthProvider] fetchProfile error:', err)
      return null
    }
  }, [getClient])

  const refreshProfile = async () => {
    if (user) {
      const profile = await fetchProfile(user.id)
      setProfile(profile)
    }
  }

  // Mark as mounted
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    
    const supabase = getClient()
    if (!supabase) {
      // Supabase not configured -- skip auth, just mark as loaded
      setLoading(false)
      return
    }
    let active = true

    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (!active) return
      
      if (error) {
        console.error('[AuthProvider] getSession error:', error)
        setLoading(false)
        return
      }
      
      console.log('[AuthProvider] Session loaded:', session?.user?.email ?? 'no user')
      setSession(session)
      setUser(session?.user ?? null)
      
      if (session?.user) {
        const profile = await fetchProfile(session.user.id)
        if (active) setProfile(profile)
      }
      
      if (active) setLoading(false)
    }).catch((err) => {
      // Ignore AbortError - happens during HMR or fast unmount, not a real error
      if (err?.name === 'AbortError' || err?.message?.includes('aborted')) {
        console.debug('[AuthProvider] Session check aborted (expected during HMR)')
        return
      }
      console.error('[AuthProvider] getSession exception:', err)
      if (active) setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!active) return
        
        console.log('[AuthProvider] Auth state changed:', event, session?.user?.email)
        setSession(session)
        setUser(session?.user ?? null)
        
        if (session?.user) {
          const profile = await fetchProfile(session.user.id)
          if (active) setProfile(profile)
        } else {
          setProfile(null)
        }
      }
    )

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [mounted, fetchProfile, getClient])

  const signIn = async (email: string, password: string) => {
    const supabase = getClient()
    if (!supabase) throw new Error('Supabase not configured')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signUp = async (email: string, password: string) => {
    const supabase = getClient()
    if (!supabase) throw new Error('Supabase not configured')
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
  }

  const signInWithOAuth = async (provider: 'google' | 'github') => {
    const supabase = getClient()
    if (!supabase) throw new Error('Supabase not configured')
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) throw error
  }

  const signOut = async () => {
    const supabase = getClient()
    if (!supabase) throw new Error('Supabase not configured')
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setUser(null)
    setProfile(null)
    setSession(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        signIn,
        signUp,
        signInWithOAuth,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}
