/**
 * TORBIT - OAuth Callback Handler
 * 
 * Handles the redirect from OAuth providers (Google, GitHub).
 * Syncs user metadata (avatar, name) to profiles table.
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin
  const next = requestUrl.searchParams.get('next') ?? '/dashboard'

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
