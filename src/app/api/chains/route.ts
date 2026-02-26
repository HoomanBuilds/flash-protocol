import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { ChainTokenService } from '@/services/chain-token-service'

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

    // Build query
    let query = supabase.from('cached_chains' as any).select('*')

    if (type !== 'all') {
      query = query.eq('type', type)
    }

    if (hasUSDC) {
      query = query.eq('has_usdc', true)
    }

    const { data, error } = await query.order('name')
    const chains = data as any[] | null

    // If cache has data, return it
    if (!error && chains && chains.length > 0) {
      // Map DB rows back to UnifiedChain shape
      const mapped = chains.map((c: any) => ({
        key: c.key,
        chainId: c.chain_id,
        name: c.name,
        type: c.type,
        symbol: c.symbol,
        logoUrl: c.logo_url,
        providers: c.providers,
        providerIds: c.provider_ids,
      }))

      return NextResponse.json({
        success: true,
        chains: mapped,
        total: mapped.length,
        cached: true,
      })
    }

    // Fallback: live fetch (first request before cron runs)
    console.log('Cache empty, falling back to live chain fetch...')
    const liveChains = await ChainTokenService.getChains()

    let filtered = type === 'all'
      ? liveChains
      : liveChains.filter((c) => c.type === type)

    // For hasUSDC on fallback, just use static map (no token fetching to avoid OOM)
    if (hasUSDC) {
      const { getUSDCAddress } = await import('@/lib/tokens')
      filtered = filtered.filter(chain => {
        const chainId = chain.chainId || chain.key
        return !!getUSDCAddress(chainId)
      })
    }

    return NextResponse.json({
      success: true,
      chains: filtered,
      total: filtered.length,
      cached: false,
    })
  } catch (error) {
    console.error('API Chains Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch chains' },
      { status: 500 }
    )
  }
}
