import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { ChainTokenService } from '@/services/chain-token-service'

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
        { status: 400 }
      )
    }

    const supabase = createServerClient()

    // Read from cache
    const { data, error } = await supabase
      .from('cached_tokens' as any)
      .select('*')
      .eq('chain_key', chainKey)
      .order('is_native', { ascending: false })
      .order('symbol')

    const tokens = data as any[] | null

    // If cache has data, return it
    if (!error && tokens && tokens.length > 0) {
      const mapped = tokens.map((t: any) => ({
        address: t.address,
        symbol: t.symbol,
        name: t.name,
        decimals: t.decimals,
        logoUrl: t.logo_url,
        isNative: t.is_native,
        chainKey: t.chain_key,
        providerIds: t.provider_ids,
      }))

      return NextResponse.json({
        success: true,
        tokens: mapped,
        chainKey,
        total: mapped.length,
        cached: true,
      })
    }

    // Fallback: live fetch
    console.log(`Token cache empty for ${chainKey}, falling back to live fetch...`)
    const liveTokens = await ChainTokenService.getTokens(chainKey)

    return NextResponse.json({
      success: true,
      tokens: liveTokens,
      chainKey,
      total: liveTokens.length,
      cached: false,
    })
  } catch (error) {
    console.error('API Tokens Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tokens' },
      { status: 500 }
    )
  }
}
