/**
 * useAuth Hook Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

// Mock the Supabase client
const mockSupabase = {
  auth: {
    getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
    getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
    signInWithPassword: vi.fn(() => Promise.resolve({ data: {}, error: null })),
    signUp: vi.fn(() => Promise.resolve({ data: {}, error: null })),
    signInWithOAuth: vi.fn(() => Promise.resolve({ data: {}, error: null })),
    signOut: vi.fn(() => Promise.resolve({ error: null })),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
  })),
}

vi.mock('@/lib/supabase/client', () => ({
  getSupabase: () => mockSupabase,
}))

describe('useAuth Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Initial State', () => {
    it('should start with loading true', async () => {
      const { useAuth } = await import('../useAuth')
      const { result } = renderHook(() => useAuth())
      
      // Initial state should have loading true
      expect(result.current.loading).toBe(true)
    })

    it('should have null user initially', async () => {
      const { useAuth } = await import('../useAuth')
      const { result } = renderHook(() => useAuth())
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      expect(result.current.user).toBeNull()
    })
  })

  describe('Authentication Methods', () => {
    it('should expose signIn method', async () => {
      const { useAuth } = await import('../useAuth')
      const { result } = renderHook(() => useAuth())
      
      expect(typeof result.current.signIn).toBe('function')
    })

    it('should expose signUp method', async () => {
      const { useAuth } = await import('../useAuth')
      const { result } = renderHook(() => useAuth())
      
      expect(typeof result.current.signUp).toBe('function')
    })

    it('should expose signInWithOAuth method', async () => {
      const { useAuth } = await import('../useAuth')
      const { result } = renderHook(() => useAuth())
      
      expect(typeof result.current.signInWithOAuth).toBe('function')
    })

    it('should expose signOut method', async () => {
      const { useAuth } = await import('../useAuth')
      const { result } = renderHook(() => useAuth())
      
      expect(typeof result.current.signOut).toBe('function')
    })
  })

  describe('isAuthenticated', () => {
    it('should return false when no user', async () => {
      const { useAuth } = await import('../useAuth')
      const { result } = renderHook(() => useAuth())
      
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
      
      expect(result.current.isAuthenticated).toBe(false)
    })
  })

  describe('Error Handling', () => {
    it('should handle sign in errors', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
        data: {},
        error: new Error('Invalid credentials'),
      })

      const { useAuth } = await import('../useAuth')
      const { result } = renderHook(() => useAuth())
      
      await expect(
        result.current.signIn('test@example.com', 'wrong-password')
      ).rejects.toThrow()
    })
  })

  describe('OAuth Providers', () => {
    it('should support google provider', async () => {
      const { useAuth } = await import('../useAuth')
      const { result } = renderHook(() => useAuth())
      
      await result.current.signInWithOAuth('google')
      
      expect(mockSupabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: expect.objectContaining({
          redirectTo: expect.stringContaining('/auth/callback'),
        }),
      })
    })

    it('should support github provider', async () => {
      const { useAuth } = await import('../useAuth')
      const { result } = renderHook(() => useAuth())
      
      await result.current.signInWithOAuth('github')
      
      expect(mockSupabase.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'github',
        options: expect.objectContaining({
          redirectTo: expect.stringContaining('/auth/callback'),
        }),
      })
    })
  })
})
