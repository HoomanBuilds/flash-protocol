import { NextResponse } from 'next/server'
import { getTokenPrice } from '@/services/token-price'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const chainId = searchParams.get('chainId')
  const tokenAddress = searchParams.get('tokenAddress')
  const symbol = searchParams.get('symbol')

  if (!chainId || !tokenAddress || !symbol) {
    return NextResponse.json(
      { error: 'Missing required params: chainId, tokenAddress, symbol' },
      { status: 400 }
    )
  }

  try {
    const result = await getTokenPrice(
      parseInt(chainId),
      tokenAddress,
      symbol
    )

    return NextResponse.json({
      priceUSD: result.priceUSD,
      source: result.source,
      cachedAt: Date.now(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Price unavailable'
    return NextResponse.json({ error: message }, { status: 404 })
  }
}
