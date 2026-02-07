/**
 * TORBIT - Supabase Client (Browser)
 * 
 * Use this client for client-side operations.
 * For server-side, use server.ts instead.
 */

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './types'

/** Check if Supabase env vars are configured */
export function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.NEXT_PUBLIC_SUPABASE_URL !== '' &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== ''
  )
}

export function createClient() {
  if (!isSupabaseConfigured()) {
    return null
  }
  try {
    return createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  } catch (e) {
    console.warn('[Supabase] Failed to create client:', e)
    return null
  }
}

// Singleton for client-side usage
let client: ReturnType<typeof createClient> | undefined

export function getSupabase() {
  if (typeof window === 'undefined') {
    return null
  }
  
  if (client === undefined) {
    client = createClient()
  }
  
  return client
}
