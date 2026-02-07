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
  const hasAuthCookies = request.cookies.getAll().some((c) =>
    c.name.startsWith('sb-') && c.name.includes('-auth-token')
  )

  // Enforce auth on protected routes
  if (isProtectedRoute && !hasAuthCookies) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Only refresh session if auth cookies exist (reduces auth traffic)
  let response = NextResponse.next({ request })

  if (hasAuthCookies) {
    response = await updateSession(request)
  }

  // Redirect authenticated users away from auth pages
  if (isAuthRoute && hasAuthCookies) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Add COOP/COEP headers for /builder route (required for WebContainers)
  if (pathname === '/builder' || pathname.startsWith('/builder/')) {
    response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp')
    response.headers.set('Cross-Origin-Opener-Policy', 'same-origin')
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
