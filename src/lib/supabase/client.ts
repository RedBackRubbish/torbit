/**
 * TORBIT - Supabase Client (Browser)
 * 
 * Use this client for client-side operations.
 * For server-side, use server.ts instead.
 * 
 * Returns null when Supabase is not configured (env vars missing).
 * All consumers MUST handle the null case gracefully.
 */

import type { Database } from './types'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

/** Check if Supabase env vars are configured */
export function isSupabaseConfigured(): boolean {
  return SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0
}

// Singleton for client-side usage
let client: ReturnType<typeof import('@supabase/ssr').createBrowserClient<Database>> | null = null
let clientInitAttempted = false

export function getSupabase() {
  if (typeof window === 'undefined') return null
  if (!isSupabaseConfigured()) return null
  if (clientInitAttempted) return client

  clientInitAttempted = true
  try {
    // Dynamic require to avoid throwing at module-load time
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createBrowserClient } = require('@supabase/ssr')
    client = createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY)
  } catch (e) {
    console.warn('[Supabase] Failed to create client:', e)
    client = null
  }
  return client
}

/** @deprecated Use getSupabase() instead */
export function createClient() {
  return getSupabase()
}
