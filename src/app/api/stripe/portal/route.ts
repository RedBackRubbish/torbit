/**
 * TORBIT - Stripe Customer Portal API
 * 
 * Creates a session for the Stripe Customer Portal where users can:
 * - Update payment method
 * - View invoices
 * - Cancel/modify subscription
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/billing/stripe'

export async function POST(request: NextRequest): Promise<NextResponse> {
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

    // 2. Get Stripe customer ID
    const { data: customerRecord } = await supabase
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single()

    if (!customerRecord?.stripe_customer_id) {
      return NextResponse.json(
        { success: false, error: 'No billing account found. Subscribe first.' },
        { status: 400 }
      )
    }

    // 3. Create portal session
    const stripe = getStripe()
    const origin = request.headers.get('origin') || 'http://localhost:3000'

    const session = await stripe.billingPortal.sessions.create({
      customer: customerRecord.stripe_customer_id,
      return_url: `${origin}/dashboard`,
    })

    return NextResponse.json({
      success: true,
      url: session.url,
    })

  } catch (error) {
    console.error('Portal error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create portal session' 
      },
      { status: 500 }
    )
  }
}
