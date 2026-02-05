/**
 * TORBIT - Next.js Middleware
 * 
 * Handles Supabase session refresh and route protection.
 * 
 * RULES:
 * - Only refresh session when auth cookies are present
 * - Keep middleware lightweight (Edge runtime)
 * - No heavy logic here
 */

import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Routes that require authentication
const protectedRoutes = ['/builder', '/dashboard']

// Routes that should redirect to dashboard if already authenticated
const authRoutes = ['/login', '/signup']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Check if user has any Supabase auth cookies
  const hasAuthCookies = request.cookies.getAll().some(c => 
    c.name.startsWith('sb-') && c.name.includes('-auth-token')
  )

  // Only refresh session if auth cookies exist (reduces auth traffic)
  let response = NextResponse.next({ request })
  
  if (hasAuthCookies) {
    response = await updateSession(request)
  }

  // Redirect authenticated users away from auth pages
  if (authRoutes.includes(pathname) && hasAuthCookies) {
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
