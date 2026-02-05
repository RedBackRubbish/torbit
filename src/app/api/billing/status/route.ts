/**
 * TORBIT - Billing Status API
 * 
 * Returns user's current billing status including fuel balance,
 * subscription tier, and next refill time.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getBillingStatus, checkAndProcessDailyRefill } from '@/lib/billing/utils'

export async function GET(): Promise<NextResponse> {
  try {
    // 1. Authenticate user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 2. Check for daily refill eligibility (free tier)
    const refillResult = await checkAndProcessDailyRefill(user.id)

    // 3. Get full billing status
    const status = await getBillingStatus(user.id)

    return NextResponse.json({
      success: true,
      ...status,
      dailyRefill: refillResult.refilled ? {
        refilled: true,
        amount: refillResult.amount,
      } : refillResult.hoursUntilRefill ? {
        refilled: false,
        hoursUntilRefill: refillResult.hoursUntilRefill,
      } : null,
    })

  } catch (error) {
    console.error('Billing status error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get billing status' 
      },
      { status: 500 }
    )
  }
}
