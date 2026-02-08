import { NextRequest, NextResponse } from 'next/server'
import { strictRateLimiter, getClientIP, rateLimitResponse } from '@/lib/rate-limit'
import { createClient } from '@/lib/supabase/server'
import { MobileShipRequestSchema } from '@/lib/mobile/pipeline'
import {
  executeMobileShip,
  getMobilePipelineDiagnostics,
  MobileShipExecutionError,
} from '@/lib/mobile/ship-executor'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function GET(request: NextRequest) {
  const clientIP = getClientIP(request)
  const rateLimitResult = await strictRateLimiter.check(clientIP)

  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult)
  }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized. Please log in.' },
      { status: 401 }
    )
  }

  const diagnostics = getMobilePipelineDiagnostics()
  return NextResponse.json({
    success: true,
    diagnostics,
    checkedAt: new Date().toISOString(),
  })
}

export async function POST(request: NextRequest) {
  const clientIP = getClientIP(request)
  const rateLimitResult = await strictRateLimiter.check(clientIP)

  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult)
  }

  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized. Please log in.' },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()
    const parseResult = MobileShipRequestSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const result = await executeMobileShip(parseResult.data)
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof MobileShipExecutionError) {
      return NextResponse.json(
        { error: error.message, details: error.details },
        { status: error.status }
      )
    }

    console.error('Mobile ship error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Mobile pipeline failed' },
      { status: 500 }
    )
  }
}
