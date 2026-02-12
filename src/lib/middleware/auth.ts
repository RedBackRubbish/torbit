/**
 * TORBIT — Typed Authentication Middleware
 *
 * Eliminates the repeated `if (!user) return 401` pattern from every API
 * route by wrapping handlers with `withAuth`. The handler callback receives
 * a guaranteed non-nullable `UserSession` — no optional chaining required.
 *
 * @example Basic usage
 * ```ts
 * import { withAuth } from '@/lib/middleware/auth'
 *
 * export const POST = withAuth(async (req, { user }) => {
 *   // user.id is guaranteed — no null checks needed
 *   const data = await db.query('SELECT * FROM projects WHERE user_id = $1', [user.id])
 *   return Response.json(data)
 * })
 * ```
 *
 * @example With route params (dynamic segments like [runId])
 * ```ts
 * import { withAuth } from '@/lib/middleware/auth'
 *
 * export const GET = withAuth(async (req, { user, params }) => {
 *   const { runId } = params
 *   return Response.json({ runId, userId: user.id })
 * }, { params: ['runId'] })
 * ```
 *
 * @example Public route with optional auth
 * ```ts
 * import { withOptionalAuth } from '@/lib/middleware/auth'
 *
 * export const GET = withOptionalAuth(async (req, { user }) => {
 *   if (user) {
 *     return Response.json({ greeting: `Hello ${user.email}` })
 *   }
 *   return Response.json({ greeting: 'Hello anonymous' })
 * })
 * ```
 *
 * @module middleware/auth
 */

import type { User } from '@supabase/supabase-js'
import { getAuthenticatedUser } from '@/lib/supabase/auth'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Authenticated user session with guaranteed non-nullable fields.
 *
 * This is a narrower projection of the Supabase `User` type,
 * exposing only the fields that API routes actually need.
 * The full Supabase `User` is available via `raw` for edge cases.
 */
export interface UserSession {
  /** Supabase user UUID — always present for authenticated users. */
  id: string
  /** User's primary email — always present after Supabase email/OAuth signup. */
  email: string
  /** Full Supabase User object for advanced use cases (MFA, metadata, etc.). */
  raw: User
}

/**
 * Context passed to authenticated route handlers.
 * `user` is guaranteed non-nullable — the middleware has already
 * returned 401 if authentication failed.
 */
export interface AuthContext<P extends Record<string, string> = Record<string, string>> {
  /** Authenticated user session — guaranteed non-nullable. */
  user: UserSession
  /** Resolved dynamic route params (e.g. `{ runId: 'abc' }`). */
  params: P
}

/**
 * Context passed to optionally-authenticated route handlers.
 * `user` may be null if the request is unauthenticated.
 */
export interface OptionalAuthContext<P extends Record<string, string> = Record<string, string>> {
  /** User session, or null if unauthenticated. */
  user: UserSession | null
  /** Resolved dynamic route params. */
  params: P
}

/**
 * Handler function that requires authentication.
 * Receives the original request and a typed `AuthContext`.
 */
export type AuthHandler<P extends Record<string, string> = Record<string, string>> = (
  req: Request,
  ctx: AuthContext<P>
) => Promise<Response>

/**
 * Handler function with optional authentication.
 */
export type OptionalAuthHandler<P extends Record<string, string> = Record<string, string>> = (
  req: Request,
  ctx: OptionalAuthContext<P>
) => Promise<Response>

/** Configuration options for `withAuth`. */
export interface WithAuthOptions {
  /**
   * List of dynamic route param names to resolve from the
   * Next.js route segment data. When specified, `ctx.params`
   * will be typed with these keys.
   *
   * @example ['runId'] → ctx.params: { runId: string }
   */
  params?: string[]
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

/**
 * Standard 401 JSON response.
 * Intentionally uses the bare `Response` constructor (not `NextResponse`)
 * so this module has zero framework coupling beyond Supabase.
 */
function unauthorizedResponse(): Response {
  return Response.json(
    { error: 'Unauthorized. Please log in.' },
    { status: 401 }
  )
}

/**
 * Project a Supabase `User` into a `UserSession`.
 * Throws if the user somehow has no email — this shouldn't happen
 * after standard Supabase email/OAuth signup, but guards against it.
 */
function toSession(user: User): UserSession {
  if (!user.email) {
    throw new Error(
      `[auth middleware] User ${user.id} has no email. ` +
        'Anonymous or phone-only users are not supported.'
    )
  }
  return { id: user.id, email: user.email, raw: user }
}

/**
 * Resolve dynamic route params from Next.js route segment data.
 *
 * Next.js App Router passes `{ params: Promise<Record<string, string>> }`
 * as the second argument to route handlers. This function awaits it.
 */
async function resolveParams(
  segmentData: unknown
): Promise<Record<string, string>> {
  if (!segmentData || typeof segmentData !== 'object') return {}
  const candidate = segmentData as { params?: unknown }
  if (!candidate.params) return {}

  // Next.js 15+ wraps params in a Promise
  const resolved = await Promise.resolve(candidate.params)
  if (typeof resolved === 'object' && resolved !== null) {
    return resolved as Record<string, string>
  }
  return {}
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Wrap a route handler with mandatory authentication.
 *
 * If the request is unauthenticated, a 401 JSON response is returned
 * immediately — the handler is never called.
 *
 * The returned function matches the Next.js App Router handler signature:
 * `(req: Request, segmentData?: { params: Promise<...> }) => Promise<Response>`
 *
 * @param handler - The route handler to wrap.
 * @param _options - Reserved for future use (param typing hints, etc.).
 * @returns A Next.js-compatible route handler.
 */
export function withAuth<P extends Record<string, string> = Record<string, string>>(
  handler: AuthHandler<P>,
  _options?: WithAuthOptions
): (req: Request, segmentData?: unknown) => Promise<Response> {
  return async (req: Request, segmentData?: unknown): Promise<Response> => {
    const supabaseUser = await getAuthenticatedUser(req)
    if (!supabaseUser) {
      return unauthorizedResponse()
    }

    const session = toSession(supabaseUser)
    const params = (await resolveParams(segmentData)) as P

    return handler(req, { user: session, params })
  }
}

/**
 * Wrap a route handler with optional authentication.
 *
 * The handler always runs, but `ctx.user` may be `null`.
 * Useful for routes that serve both authenticated and anonymous traffic
 * (e.g. public pages with personalisation).
 */
export function withOptionalAuth<P extends Record<string, string> = Record<string, string>>(
  handler: OptionalAuthHandler<P>,
  _options?: WithAuthOptions
): (req: Request, segmentData?: unknown) => Promise<Response> {
  return async (req: Request, segmentData?: unknown): Promise<Response> => {
    const supabaseUser = await getAuthenticatedUser(req)
    const session = supabaseUser ? toSession(supabaseUser) : null
    const params = (await resolveParams(segmentData)) as P

    return handler(req, { user: session, params })
  }
}
