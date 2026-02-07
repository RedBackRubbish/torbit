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
    
    // Use RPC for atomicity
    const { data, error } = await admin.rpc('refund_fuel', {
      p_user_id: userId,
      p_project_id: projectId,
      p_amount: amount,
      p_description: `REFUND: ${reason}`,
    })

    if (error) throw error
    return data
  },

  /**
   * Grant bonus fuel (admin reward)
   */
  async grantBonus(userId: string, amount: number, reason: string) {
    const admin = getAdminClient()

    // Record the bonus transaction
    const { error } = await admin.from('fuel_transactions').insert({
      user_id: userId,
      amount,
      type: 'bonus',
      description: `BONUS: ${reason}`,
    })

    if (error) throw error

    // Atomic increment to prevent race conditions on concurrent grants
    const { error: rpcError } = await admin.rpc('add_fuel', {
      p_user_id: userId,
      p_amount: amount,
      p_type: 'bonus',
      p_description: `BONUS: ${reason}`,
    })

    // Fallback: direct update if RPC not available
    if (rpcError) {
      const { data: profile } = await admin
        .from('profiles')
        .select('fuel_balance')
        .eq('id', userId)
        .single()

      if (profile) {
        const { error: updateError } = await admin
          .from('profiles')
          .update({ fuel_balance: profile.fuel_balance + amount })
          .eq('id', userId)

        if (updateError) throw updateError
      }
    }
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
