import { NextResponse } from 'next/server'
import { ChainTokenService } from '@/services/chain-token-service'
import { getUSDCAddress } from '@/lib/tokens'

/**
 * GET /api/chains?type=all|evm|solana|bitcoin|cosmos|near|tron|sui&hasUSDC=true
 * 
 * Returns all supported chains across all providers
 * When hasUSDC=true, only returns chains that have USDC available
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'all'
    const hasUSDC = searchParams.get('hasUSDC') === 'true'

    const chains = await ChainTokenService.getChains()

    let filtered = type === 'all'
      ? chains
      : chains.filter((c) => c.type === type)

    // Filter to only chains that have USDC
    if (hasUSDC) {
      const chainsWithUSDC = await Promise.all(
        filtered.map(async (chain) => {
          // Quick check: static USDC map (instant)
          const chainId = chain.chainId || chain.key
          if (getUSDCAddress(chainId)) return chain

          // Dynamic check: fetch tokens from providers and look for USDC
          try {
            const tokens = await ChainTokenService.getTokens(chain.key)
            const usdc = tokens.find(t => t.symbol?.toUpperCase() === 'USDC')
            if (usdc) return chain
          } catch {
            // If dynamic check fails, skip this chain
          }

          return null
        })
      )
      filtered = chainsWithUSDC.filter(Boolean) as typeof filtered
    }

    return NextResponse.json({
      success: true,
      chains: filtered,
      total: filtered.length,
    })
  } catch (error) {
    console.error('API Chains Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch chains' },
      { status: 500 }
    )
  }
}
