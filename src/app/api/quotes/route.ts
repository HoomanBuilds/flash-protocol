import { NextResponse } from 'next/server'
import { QuoteAggregator } from '@/services/quote-aggregator'
import { z } from 'zod'

const quoteSchema = z.object({
  fromChainId: z.number(),
  toChainId: z.number(),
  fromTokenAddress: z.string(),
  toTokenAddress: z.string(),
  fromAmount: z.string(),
  fromAddress: z.string().optional(),
  toAddress: z.string().optional(), 
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const params = quoteSchema.parse(body)

    // Using QuoteAggregator to fetch from all providers
    const result = await QuoteAggregator.getQuotes({
      fromChain: params.fromChainId,
      toChain: params.toChainId,
      fromToken: params.fromTokenAddress,
      toToken: params.toTokenAddress,
      fromAmount: params.fromAmount,
      fromAddress: params.fromAddress || '',
      toAddress: params.toAddress, 
      slippage: 0.5 // Default 0.5%
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

