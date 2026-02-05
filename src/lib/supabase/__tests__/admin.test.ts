/**
 * Supabase Admin Module Tests
 * 
 * Tests security constraints and admin operations.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the entire module before import
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: vi.fn(() => ({ error: null })),
      update: vi.fn(() => ({ 
        eq: vi.fn(() => ({ error: null, data: null }))
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({ data: { fuel_balance: 100 }, error: null }))
        }))
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({ error: null }))
      })),
    })),
    rpc: vi.fn(() => ({ data: true, error: null })),
  })),
}))

describe('Supabase Admin Module', () => {
  beforeEach(() => {
    vi.resetModules()
    // Reset window to simulate server
    vi.stubGlobal('window', undefined)
    // Set required env vars
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
  })

  describe('Security Constraints', () => {
    it('should throw error if imported on client (window defined)', async () => {
      // Simulate browser environment
      vi.stubGlobal('window', {})
      
      await expect(async () => {
        await import('../admin')
      }).rejects.toThrow('SECURITY')
    })

    it('should not expose raw client', async () => {
      const adminModule = await import('../admin')
      
      // Should only export adminOps
      expect(adminModule.adminOps).toBeDefined()
      
      // Should not export createClient or getAdminClient
      expect((adminModule as Record<string, unknown>).createClient).toBeUndefined()
      expect((adminModule as Record<string, unknown>).getAdminClient).toBeUndefined()
    })
  })

  describe('adminOps', () => {
    describe('refundFuel', () => {
      it('should be a function', async () => {
        const { adminOps } = await import('../admin')
        expect(typeof adminOps.refundFuel).toBe('function')
      })

      it('should accept correct parameters', async () => {
        const { adminOps } = await import('../admin')
        
        // Should not throw with valid params
        await expect(
          adminOps.refundFuel('user-123', 'project-456', 100, 'test refund')
        ).resolves.not.toThrow()
      })
    })

    describe('grantBonus', () => {
      it('should be a function', async () => {
        const { adminOps } = await import('../admin')
        expect(typeof adminOps.grantBonus).toBe('function')
      })
    })

    describe('deleteUserData', () => {
      it('should be a function for GDPR compliance', async () => {
        const { adminOps } = await import('../admin')
        expect(typeof adminOps.deleteUserData).toBe('function')
      })
    })
  })

  describe('Type Safety', () => {
    it('should have typed operation methods', async () => {
      const { adminOps } = await import('../admin')
      
      const ops = Object.keys(adminOps)
      expect(ops).toContain('refundFuel')
      expect(ops).toContain('grantBonus')
      expect(ops).toContain('deleteUserData')
      expect(ops.length).toBe(3)
    })
  })
})
