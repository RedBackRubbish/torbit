/**
 * TORBIT - useAuth Hook
 * 
 * Simple auth state management using useState and useEffect.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { getSupabase } from '@/lib/supabase/client'
import type { User, Session } from '@supabase/supabase-js'
import type { Profile } from '@/lib/supabase/types'

interface AuthState {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  error: Error | null
}

const initialState: AuthState = {
  user: null,
  profile: null,
  session: null,
  loading: true,
  error: null,
}

export function useAuth() {
  const [state, setState] = useState<AuthState>(initialState)

  useEffect(() => {
    const supabase = getSupabase()
    let cancelled = false

    async function loadSession() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (cancelled) return
        
        if (error) {
          console.error('[useAuth] getSession error:', error)
          setState(s => ({ ...s, loading: false, error }))
          return
        }

        if (session?.user) {
          console.log('[useAuth] Session found:', session.user.email)
          setState(s => ({ 
            ...s, 
            user: session.user, 
            session, 
            loading: false 
          }))
          
          // Fetch profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
          
          if (!cancelled) {
            setState(s => ({ ...s, profile: profile as Profile | null }))
          }
        } else {
          console.log('[useAuth] No session')
          setState(s => ({ ...s, loading: false }))
        }
      } catch (err) {
        console.error('[useAuth] Error:', err)
        if (!cancelled) {
          setState(s => ({ ...s, loading: false, error: err as Error }))
        }
      }
    }

    loadSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (cancelled) return
        
        console.log('[useAuth] Auth changed:', event, session?.user?.email)
        
        if (session?.user) {
          setState(s => ({ 
            ...s, 
            user: session.user, 
            session, 
            loading: false 
          }))
          
          // Fetch profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
          
          if (!cancelled) {
            setState(s => ({ ...s, profile: profile as Profile | null }))
          }
        } else {
          setState({ 
            user: null, 
            profile: null, 
            session: null, 
            loading: false, 
            error: null 
          })
        }
      }
    )

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const supabase = getSupabase()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }, [])

  const signUp = useCallback(async (email: string, password: string, fullName?: string) => {
    const supabase = getSupabase()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    })
    if (error) throw error
  }, [])

  const signInWithOAuth = useCallback(async (provider: 'google' | 'github') => {
    const supabase = getSupabase()
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) throw error
  }, [])

  const signOut = useCallback(async () => {
    const supabase = getSupabase()
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }, [])

  // Compute avatar URL with fallback to user_metadata
  const avatarUrl = state.profile?.avatar_url 
    || state.user?.user_metadata?.avatar_url 
    || state.user?.user_metadata?.picture 
    || null

  return {
    user: state.user,
    session: state.session,
    loading: state.loading,
    error: state.error,
    profile: state.profile ? {
      ...state.profile,
      avatar_url: avatarUrl,
    } : null,
    signIn,
    signUp,
    signInWithOAuth,
    signOut,
    isAuthenticated: !!state.user,
  }
}
