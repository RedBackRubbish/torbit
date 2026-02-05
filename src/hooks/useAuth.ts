/**
 * TORBIT - useAuth Hook
 * 
 * Easy access to auth state and user profile.
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

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    session: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    const supabase = getSupabase()

    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        setState(s => ({ ...s, loading: false, error }))
        return
      }
      
      if (session?.user) {
        // Fetch profile
        supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
          .then(({ data: profile }) => {
            setState({
              user: session.user,
              profile: profile as Profile | null,
              session,
              loading: false,
              error: null,
            })
          })
      } else {
        setState({ user: null, profile: null, session: null, loading: false, error: null })
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
          
          setState({
            user: session.user,
            profile: profile as Profile | null,
            session,
            loading: false,
            error: null,
          })
        } else {
          setState({ user: null, profile: null, session: null, loading: false, error: null })
        }
      }
    )

    return () => {
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

  return {
    ...state,
    signIn,
    signUp,
    signInWithOAuth,
    signOut,
    isAuthenticated: !!state.user,
  }
}
