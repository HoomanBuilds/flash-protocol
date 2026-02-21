import { NextResponse } from 'next/server'
import { ChainTokenService } from '@/services/chain-token-service'

/**
 * GET /api/tokens?chainKey=42161
 * 
 * Returns all tokens for a specific chain
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

    const tokens = await ChainTokenService.getTokens(chainKey)

    return NextResponse.json({
      success: true,
      tokens,
      chainKey,
      total: tokens.length,
    })
  } catch (error) {
    console.error('API Tokens Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tokens' },
      { status: 500 }
    )
  }
}
