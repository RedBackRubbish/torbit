/**
 * TORBIT - Supabase Client (Browser)
 * 
 * Use this client for client-side operations.
 * For server-side, use server.ts instead.
 */

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './types'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Singleton for client-side usage
let client: ReturnType<typeof createClient> | null = null

export function getSupabase() {
  if (typeof window === 'undefined') {
    throw new Error('getSupabase() should only be called on the client. Use createServerClient() on the server.')
  }
  
  if (!client) {
    client = createClient()
  }
  
  return client
}
