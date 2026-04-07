import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { verifyApiKey } from '@/lib/api/verify-api-key'
import { getTokens } from '@/lib/api/get-tokens'

/**
 * GET /api/v1/tokens?chainKey=42161
 */
export async function GET(req: NextRequest) {
  const { error } = await verifyApiKey(req)

  if (error) {
    return NextResponse.json({ error }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const chainKey = searchParams.get('chainKey')

    if (!chainKey) {
      return NextResponse.json(
        { error: 'chainKey query parameter is required' },
        { status: 400 },
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createServerClient() as any

    const result = await getTokens(supabase, chainKey)

    return NextResponse.json({
      data: result.tokens,
      chainKey: result.chainKey,
      total: result.total,
    })
  } catch (err) {
    console.error('V1 Tokens Error:', err)
    return NextResponse.json({ error: 'Failed to fetch tokens' }, { status: 500 })
  }
}
