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
import {
  createE2EProfile,
  createE2EUser,
  hasE2EAuthCookieClient,
} from '@/lib/e2e-auth'

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
    let cancelled = false
    const SAFETY_TIMEOUT_MS = 8000
    const safetyTimer = setTimeout(() => {
      if (cancelled) return
      console.warn(`[useAuth] Session initialization timed out after ${SAFETY_TIMEOUT_MS}ms`)
      setState((s) => (s.loading ? { ...s, loading: false } : s))
    }, SAFETY_TIMEOUT_MS)
    const clearSafetyTimer = () => clearTimeout(safetyTimer)

    if (hasE2EAuthCookieClient()) {
      setState({
        user: createE2EUser(),
        profile: createE2EProfile(),
        session: null,
        loading: false,
        error: null,
      })
      clearSafetyTimer()
      return
    }

    const supabase = getSupabase()
    if (!supabase) {
      // Supabase not configured -- skip auth, just mark as loaded
      setState(s => ({ ...s, loading: false }))
      clearSafetyTimer()
      return
    }
    const sb = supabase // non-null binding for closures

    async function loadSession() {
      try {
        const { data: { session }, error } = await sb.auth.getSession()
        
        if (cancelled) return
        
        if (error) {
          // Ignore AbortError - happens during HMR or fast unmount
          if (error?.name === 'AbortError' || error?.message?.includes('aborted')) {
            console.debug('[useAuth] Session check aborted (expected during HMR)')
            return
          }
          console.error('[useAuth] getSession error:', error)
          setState(s => ({ ...s, loading: false, error }))
          clearSafetyTimer()
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
          clearSafetyTimer()
          
          // Fetch profile
          const { data: profile } = await sb
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
          clearSafetyTimer()
        }
      } catch (err: unknown) {
        // Ignore AbortError - happens during HMR or fast unmount
        const error = err instanceof Error ? err : new Error(String(err))
        if (error.name === 'AbortError' || error.message?.includes('aborted')) {
          console.debug('[useAuth] Request aborted (expected during HMR)')
          return
        }
        console.error('[useAuth] Error:', error)
        if (!cancelled) {
          setState(s => ({ ...s, loading: false, error }))
          clearSafetyTimer()
        }
      }
    }

    loadSession()

    // Listen for auth changes
    const { data: { subscription } } = sb.auth.onAuthStateChange(
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
          const { data: profile } = await sb
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
      clearSafetyTimer()
      subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const supabase = getSupabase()
    if (!supabase) throw new Error('Supabase not configured')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }, [])

  const signUp = useCallback(async (email: string, password: string, fullName?: string) => {
    const supabase = getSupabase()
    if (!supabase) throw new Error('Supabase not configured')
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
    if (!supabase) throw new Error('Supabase not configured')
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
    if (!supabase) throw new Error('Supabase not configured')
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
