import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { verifyApiKey } from '@/lib/api/verify-api-key'
import { getChains } from '@/lib/api/get-chains'

/**
 * GET /api/v1/chains?type=all|evm|solana&hasUSDC=true
 */
export async function GET(req: NextRequest) {
  const { error } = await verifyApiKey(req)

  if (error) {
    return NextResponse.json({ error }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const rawType = searchParams.get('type') || 'all'
    const type = ['all', 'evm', 'solana', 'bitcoin', 'near', 'tron', 'sui', 'ton', 'starknet', 'aptos'].includes(rawType) ? rawType : 'all'
    const hasUSDC = searchParams.get('hasUSDC') === 'true'

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createServerClient() as any

    const result = await getChains(supabase, { type, hasUSDC })

    return NextResponse.json({
      data: result.chains,
      total: result.total,
    })
  } catch (err) {
    console.error('V1 Chains Error:', err)
    return NextResponse.json({ error: 'Failed to fetch chains' }, { status: 500 })
  }
}
