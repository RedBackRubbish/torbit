import type { User } from '@supabase/supabase-js'
import { createClient } from './server'
import { createE2EUser, isE2EAuthenticatedRequest } from '@/lib/e2e-auth'

function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.get('authorization') ?? req.headers.get('Authorization')
  if (!authHeader) return null

  const [scheme, token] = authHeader.split(' ')
  if (!scheme || !token) return null
  if (scheme.toLowerCase() !== 'bearer') return null
  return token
}

export async function getAuthenticatedUser(req: Request): Promise<User | null> {
  if (isE2EAuthenticatedRequest(req)) {
    return createE2EUser()
  }

  const supabase = await createClient()

  // First try cookie-based session (default SSR path)
  const { data: cookieData } = await supabase.auth.getUser()
  if (cookieData.user) {
    return cookieData.user
  }

  // Fallback to bearer token from client for environments where cookies do not propagate reliably
  const token = extractBearerToken(req)
  if (!token) return null

  const { data: tokenData } = await supabase.auth.getUser(token)
  return tokenData.user ?? null
}
