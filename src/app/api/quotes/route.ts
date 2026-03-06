import { NextResponse } from 'next/server'
import { QuoteAggregator } from '@/services/quote-aggregator'
import { z } from 'zod'

const quoteSchema = z.object({
  fromChainId: z.union([z.number(), z.string()]),
  toChainId: z.union([z.number(), z.string()]),
  fromTokenAddress: z.string(),
  toTokenAddress: z.string(),
  fromAmount: z.string(),
  fromAddress: z.string().optional(),
  toAddress: z.string().optional(),
  fromTokenDecimals: z.number().optional(),
})

// Normalize common chain key aliases (e.g. 'sol' → 'solana', 'btc' → 'bitcoin')
const CHAIN_KEY_ALIASES: Record<string, string> = {
  sol: 'solana',
  btc: 'bitcoin',
}

function normalizeChainId(id: string | number): string | number {
  if (typeof id === 'string' && CHAIN_KEY_ALIASES[id]) return CHAIN_KEY_ALIASES[id]
  return id
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const params = quoteSchema.parse(body)

    // Using QuoteAggregator to fetch from all providers
    const result = await QuoteAggregator.getQuotes({
      fromChain: normalizeChainId(params.fromChainId),
      toChain: normalizeChainId(params.toChainId),
      fromToken: params.fromTokenAddress,
      toToken: params.toTokenAddress,
      fromAmount: params.fromAmount,
      fromAddress: params.fromAddress || '',
      toAddress: params.toAddress, 
      slippage: 0.5, // Default 0.5%
      fromTokenDecimals: params.fromTokenDecimals
    })

    return NextResponse.json({ 
      success: true, 
      routes: result.quotes,
      bestQuote: result.bestQuote,
      expiresAt: result.expiresAt,
      fetchedAt: result.fetchedAt,
      providerStats: result.providerStats,
    })
  } catch (error) {
    console.error('API Quote Error:', error)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

