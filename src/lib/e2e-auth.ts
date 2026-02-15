import type { Profile } from '@/lib/supabase/types'
import type { User } from '@supabase/supabase-js'

export const E2E_AUTH_COOKIE_NAME = 'torbit_e2e_auth'
export const E2E_AUTH_COOKIE_VALUE = '1'
export const E2E_AUTH_EMAIL = 'e2e@torbit.local'
export const E2E_AUTH_USER_ID = '00000000-0000-4000-8000-000000000001'

const E2E_TIMESTAMP = '1970-01-01T00:00:00.000Z'

export function isE2EAuthEnabledServer(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.TORBIT_E2E_AUTH === 'true'
}

export function isE2EAuthEnabledClient(): boolean {
  if (process.env.NEXT_PUBLIC_E2E_AUTH === 'true') return true
  if (typeof window === 'undefined') return false
  return isLocalHost(window.location.hostname)
}

function isLocalHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '[::1]'
}

function getRequestHost(req: Pick<Request, 'headers'>): string {
  return (req.headers.get('host') || '').toLowerCase()
}

function isE2EAllowedForRequest(
  req: Pick<Request, 'headers'>,
  env: NodeJS.ProcessEnv = process.env
): boolean {
  if (isE2EAuthEnabledServer(env)) return true
  if (env.NODE_ENV !== 'development' && env.NODE_ENV !== 'test') return false

  const host = getRequestHost(req)
  const hostname = host.split(':')[0]
  return isLocalHost(hostname)
}

export function hasE2EAuthCookie(cookieHeader: string | null | undefined): boolean {
  if (!cookieHeader) return false

  return cookieHeader
    .split(';')
    .map((segment) => segment.trim())
    .some((segment) => segment === `${E2E_AUTH_COOKIE_NAME}=${E2E_AUTH_COOKIE_VALUE}`)
}

export function hasE2EAuthCookieClient(): boolean {
  if (typeof document === 'undefined') return false
  return hasE2EAuthCookie(document.cookie)
}

export function isE2EAuthenticatedRequest(
  req: Pick<Request, 'headers'>,
  env: NodeJS.ProcessEnv = process.env
): boolean {
  if (!isE2EAllowedForRequest(req, env)) return false
  return hasE2EAuthCookie(req.headers.get('cookie'))
}

export function createE2EUser(): User {
  return {
    id: E2E_AUTH_USER_ID,
    app_metadata: { provider: 'e2e', providers: ['e2e'] },
    user_metadata: { full_name: 'E2E Test User' },
    aud: 'authenticated',
    email: E2E_AUTH_EMAIL,
    phone: '',
    created_at: E2E_TIMESTAMP,
    last_sign_in_at: E2E_TIMESTAMP,
    role: 'authenticated',
    updated_at: E2E_TIMESTAMP,
    identities: [],
    factors: [],
    is_anonymous: false,
  } as unknown as User
}

export function createE2EProfile(): Profile {
  return {
    id: E2E_AUTH_USER_ID,
    email: E2E_AUTH_EMAIL,
    full_name: 'E2E Test User',
    avatar_url: null,
    tier: 'pro',
    fuel_balance: 5000,
    created_at: E2E_TIMESTAMP,
    updated_at: E2E_TIMESTAMP,
  }
}
