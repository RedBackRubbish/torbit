/**
 * TORBIT - OAuth Callback Handler
 * 
 * Handles the redirect from OAuth providers (Google, GitHub).
 * Syncs user metadata (avatar, name) to profiles table.
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Whitelist of allowed redirect paths to prevent open redirect attacks
const ALLOWED_REDIRECTS = ['/dashboard', '/builder', '/settings', '/']

function getSafeRedirectPath(next: string | null): string {
  if (!next) return '/dashboard'
  // Only allow paths that start with / and are in the whitelist
  // Also check for path prefixes to allow /dashboard/billing etc.
  const isAllowed = ALLOWED_REDIRECTS.some(
    allowed => next === allowed || next.startsWith(`${allowed}/`)
  )
  // Prevent protocol-relative URLs (//evil.com) and absolute URLs
  const isSafe = next.startsWith('/') && !next.startsWith('//')
  return isAllowed && isSafe ? next : '/dashboard'
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin
  const next = getSafeRedirectPath(requestUrl.searchParams.get('next'))

  if (code) {
    const supabase = await createClient()
    const { error, data } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data.user) {
      // Sync user metadata to profiles table
      const user = data.user
      const metadata = user.user_metadata || {}
      
      // Extract avatar and name from OAuth provider
      const avatarUrl = metadata.avatar_url || metadata.picture || null
      const fullName = metadata.full_name || metadata.name || null
      
      // Update profile with OAuth data (upsert in case profile doesn't exist yet)
      await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email || '',
          avatar_url: avatarUrl,
          full_name: fullName,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'id',
          ignoreDuplicates: false,
        })
      
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Return to homepage with error
  return NextResponse.redirect(`${origin}/?error=auth_callback_failed`)
}
