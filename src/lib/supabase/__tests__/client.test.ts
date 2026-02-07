/**
 * Supabase Client Tests
 * 
 * Tests browser client creation and singleton pattern.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock Supabase SSR
vi.mock('@supabase/ssr', () => ({
  createBrowserClient: vi.fn(() => ({
    auth: {
      getSession: vi.fn(),
      getUser: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({ data: [], error: null })),
    })),
  })),
}))

describe('Supabase Client', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('createClient', () => {
    it('should create a browser client', async () => {
      vi.stubGlobal('window', {})
      
      const { createClient } = await import('../client')
      const client = createClient()
      
      expect(client).toBeDefined()
      expect(client.auth).toBeDefined()
      expect(client.from).toBeDefined()
    })
  })

  describe('getSupabase', () => {
    it('should return singleton on client side', async () => {
      vi.stubGlobal('window', {})
      
      const { getSupabase } = await import('../client')
      
      const client1 = getSupabase()
      const client2 = getSupabase()
      
      expect(client1).toBe(client2)
    })

    it('should throw error on server side', async () => {
      vi.stubGlobal('window', undefined)
      
      const clientModule = await import('../client')
      
      expect(() => clientModule.getSupabase()).toThrow('should only be called on the client')
    })
  })
})
