/**
 * TORBIT - Next.js Proxy (formerly Middleware)
 *
 * Handles Supabase session refresh, route protection, and security headers.
 *
 * RULES:
 * - Only refresh session when auth cookies are present
 * - Keep proxy lightweight (Edge runtime)
 * - No heavy logic here
 */

import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import {
  isE2EAuthenticatedRequest,
} from '@/lib/e2e-auth'

// Routes that require authentication
const protectedRoutes = ['/builder', '/dashboard']

// Routes that should redirect to dashboard if already authenticated
const authRoutes = ['/login', '/signup']

function matchesRoute(pathname: string, routes: string[]): boolean {
  return routes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isProtectedRoute = matchesRoute(pathname, protectedRoutes)
  const isAuthRoute = matchesRoute(pathname, authRoutes)

  // Check if user has any Supabase auth cookies
  const hasSupabaseAuthCookies = request.cookies.getAll().some((c) =>
    c.name.startsWith('sb-') && c.name.includes('-auth-token')
  )
  const hasE2EAuthCookie = isE2EAuthenticatedRequest(request)
  const hasAuthCookies = hasSupabaseAuthCookies || hasE2EAuthCookie

  // Enforce auth on protected routes
  if (isProtectedRoute && !hasAuthCookies) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Only refresh session if auth cookies exist (reduces auth traffic)
  let response = NextResponse.next({ request })

  if (hasSupabaseAuthCookies) {
    response = await updateSession(request)
  }

  // Redirect authenticated users away from auth pages
  if (isAuthRoute && hasAuthCookies) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes (they handle their own auth)
     */
    '/((?!_next/static|_next/image|favicon.ico|public|api).*)',
  ],
}
