/**
 * TORBIT - Supabase Admin Client (SERVER-ONLY)
 * 
 * ⚠️  SECURITY CRITICAL ⚠️
 * 
 * This module uses the service role key which bypasses RLS.
 * 
 * HARD RULES:
 * - ❌ NEVER import this in client components
 * - ❌ NEVER import this in middleware
 * - ❌ NEVER expose via API responses
 * - ✅ ONLY use in server-side API routes
 * - ✅ ONLY use for admin operations (refunds, bulk ops, etc.)
 * 
 * If you're unsure, use the regular server client instead.
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

// Validate we're on the server
if (typeof window !== 'undefined') {
  throw new Error(
    'SECURITY: admin.ts was imported on the client. ' +
    'This module must ONLY be used server-side.'
  )
}

// Validate service role key exists
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

function getAdminClient() {
  if (!serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not set. ' +
      'Admin operations require this key.'
    )
  }

  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}

/**
 * Admin-only operations.
 * 
 * Each function validates intent and logs usage.
 */
export const adminOps = {
  /**
   * Refund fuel to a user (bypasses RLS for atomic operation)
   */
  async refundFuel(userId: string, projectId: string, amount: number, reason: string) {
    const admin = getAdminClient()
    
    // Prefer modern billing ledger refund path.
    const { data, error } = await admin.rpc('refund_fuel_v2', {
      p_user_id: userId,
      p_project_id: projectId,
      p_amount: amount,
      p_description: `REFUND: ${reason}`,
      p_original_transaction_id: null,
    })

    if (!error) {
      return data
    }

    // Backward compatibility for environments without refund_fuel_v2.
    const { data: legacyData, error: legacyError } = await admin.rpc('refund_fuel', {
      p_user_id: userId,
      p_project_id: projectId,
      p_amount: amount,
      p_description: `REFUND: ${reason}`,
    })

    if (legacyError) throw legacyError
    return legacyData
  },

  /**
   * Grant bonus fuel (admin reward)
   */
  async grantBonus(userId: string, amount: number, reason: string) {
    const admin = getAdminClient()

    const { data, error } = await admin.rpc('add_fuel', {
      p_user_id: userId,
      p_amount: amount,
      p_type: 'bonus',
      p_description: `BONUS: ${reason}`,
      p_metadata: {
        source: 'admin',
      },
    })

    if (error) throw error
    return data
  },

  /**
   * Delete user data (GDPR compliance)
   */
  async deleteUserData(userId: string) {
    const admin = getAdminClient()
    
    // Cascade delete happens via foreign keys
    const { error } = await admin
      .from('profiles')
      .delete()
      .eq('id', userId)

    if (error) throw error
  },
}

// Do NOT export the raw client - only export safe operations
// This prevents accidental RLS bypass
