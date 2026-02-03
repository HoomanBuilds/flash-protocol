import { NextResponse } from 'next/server'
import { LifiService } from '@/services/lifi'
import { z } from 'zod'

const quoteSchema = z.object({
  fromChainId: z.number(),
  toChainId: z.number(),
  fromTokenAddress: z.string(),
  toTokenAddress: z.string(),
  fromAmount: z.string(),
  fromAddress: z.string().optional(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const params = quoteSchema.parse(body)

    const result = await LifiService.getQuote({
      fromChainId: params.fromChainId,
      toChainId: params.toChainId,
      fromTokenAddress: params.fromTokenAddress,
      toTokenAddress: params.toTokenAddress,
      fromAmount: params.fromAmount,
      fromAddress: params.fromAddress,
      options: {
        slippage: 0.005, // 0.5%
        order: 'RECOMMENDED',
      },
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ routes: result.routes })
  } catch (error) {
    console.error('API Quote Error:', error)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
