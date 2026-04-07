import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getChains } from '@/lib/api/get-chains'

/**
 * GET /api/chains?type=all|evm|solana|bitcoin&hasUSDC=true
 * Reads from Supabase cache. Falls back to live fetch if cache is empty.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'all'
    const hasUSDC = searchParams.get('hasUSDC') === 'true'

    const supabase = createServerClient()

    const result = await getChains(supabase, { type, hasUSDC })

    return NextResponse.json({
      success: true,
      chains: result.chains,
      total: result.total,
      cached: result.cached,
    })
  } catch (error) {
    console.error('API Chains Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch chains' },
      { status: 500 },
    )
  }
}
