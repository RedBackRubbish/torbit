/**
 * Middleware Tests
 * 
 * Tests session refresh logic and route protection.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// Mock the updateSession function
vi.mock('@/lib/supabase/middleware', () => ({
  updateSession: vi.fn(() => NextResponse.next()),
}))

describe('Middleware', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  describe('Session Refresh Logic', () => {
    it('should only refresh session when auth cookies exist', async () => {
      const { updateSession } = await import('@/lib/supabase/middleware')
      
      // Request without auth cookies
      const requestWithoutCookies = new NextRequest('http://localhost:3000/')
      
      // Import and call middleware
      const { proxy } = await import('../proxy')
      await proxy(requestWithoutCookies)
      
      // Should NOT call updateSession when no auth cookies
      expect(updateSession).not.toHaveBeenCalled()
    })

    it('should refresh session when auth cookies are present', async () => {
      const { updateSession } = await import('@/lib/supabase/middleware')
      
      // Request with auth cookies
      const requestWithCookies = new NextRequest('http://localhost:3000/', {
        headers: {
          cookie: 'sb-test-auth-token=test-value',
        },
      })
      
      const { proxy } = await import('../proxy')
      await proxy(requestWithCookies)
      
      // Should call updateSession when auth cookies present
      expect(updateSession).toHaveBeenCalled()
    })
  })

  describe('Auth Route Redirects', () => {
    it('should redirect authenticated users away from /login', async () => {
      // Request with auth cookies to /login
      const request = new NextRequest('http://localhost:3000/login', {
        headers: {
          cookie: 'sb-test-auth-token=test-value',
        },
      })
      
      const { proxy } = await import('../proxy')
      const response = await proxy(request)
      
      // Should redirect to dashboard
      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/dashboard')
    })

    it('should allow unauthenticated users to access /login', async () => {
      const request = new NextRequest('http://localhost:3000/login')
      
      const { proxy } = await import('../proxy')
      const response = await proxy(request)
      
      // Should not redirect
      expect(response.status).not.toBe(307)
    })
  })

  describe('Protected Route Redirects', () => {
    it('should redirect unauthenticated users away from /builder', async () => {
      const request = new NextRequest('http://localhost:3000/builder')

      const { proxy } = await import('../proxy')
      const response = await proxy(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/login')
      expect(response.headers.get('location')).toContain('next=%2Fbuilder')
    })

    it('should allow authenticated users to access /builder', async () => {
      const request = new NextRequest('http://localhost:3000/builder', {
        headers: {
          cookie: 'sb-test-auth-token=test-value',
        },
      })

      const { proxy } = await import('../proxy')
      const response = await proxy(request)

      expect(response.status).not.toBe(307)
    })
  })

  describe('Cookie Detection', () => {
    it('should detect sb-*-auth-token cookies', async () => {
      // This tests the cookie pattern matching logic
      const cookies = [
        'sb-projectid-auth-token=value',
        'sb-abc123-auth-token=value',
        'sb-test-auth-token=value',
      ]
      
      for (const cookie of cookies) {
        const request = new NextRequest('http://localhost:3000/login', {
          headers: { cookie },
        })
        
        const { proxy } = await import('../proxy')
        const response = await proxy(request)
        
        // Should redirect (cookie detected)
        expect(response.status).toBe(307)
      }
    })

    it('should not detect non-auth cookies', async () => {
      const cookies = [
        'sb-analytics=value',
        'some-other-cookie=value',
        '_ga=value',
      ]
      
      for (const cookie of cookies) {
        vi.resetModules()
        
        const request = new NextRequest('http://localhost:3000/login', {
          headers: { cookie },
        })
        
        const { proxy } = await import('../proxy')
        const response = await proxy(request)
        
        // Should not redirect (no auth cookie)
        expect(response.status).not.toBe(307)
      }
    })
  })
})
