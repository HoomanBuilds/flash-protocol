import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getTokens } from '@/lib/api/get-tokens'

/**
 * GET /api/tokens?chainKey=42161
 *
 * Reads from Supabase cache. Falls back to live fetch if cache is empty.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const chainKey = searchParams.get('chainKey')

    if (!chainKey) {
      return NextResponse.json(
        { success: false, error: 'chainKey parameter is required' },
        { status: 400 },
      )
    }

    const supabase = createServerClient()

    const result = await getTokens(supabase, chainKey)

    return NextResponse.json({
      success: true,
      tokens: result.tokens,
      chainKey: result.chainKey,
      total: result.total,
      cached: result.cached,
    })
  } catch (error) {
    console.error('API Tokens Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tokens' },
      { status: 500 },
    )
  }
}
