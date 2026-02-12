import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { z } from 'zod'

const initiateSchema = z.object({
  paymentLinkId: z.string().nullable().optional(), // Accept null or undefined
  walletAddress: z.string(),
  fromChainId: z.number(),
  toChainId: z.number(),
  fromToken: z.string(),
  toToken: z.string(),
  fromAmount: z.string(),
  toAmount: z.string(),
  provider: z.string().default('lifi'),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  route: z.any(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const params = initiateSchema.parse(body)
    const supabase = createServerClient()

    // 1. Create Transaction Record
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        customer_wallet: params.walletAddress,
        from_chain_id: params.fromChainId,
        to_chain_id: params.toChainId,
        from_token: params.fromToken,
        to_token: params.toToken,
        from_amount: params.fromAmount,
        to_amount: params.toAmount,
        status: 'initiated',
        provider: params.provider,
        route_details: params.route,
        payment_link_id: params.paymentLinkId || null // Allow null for testing
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
      .select()
      .single()

    if (error) {
      console.error('DB Error:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    // 2. Record created - polling will be triggered when user submits tx hash via PATCH /api/transactions/[id]/hash
    // We don't start polling yet because we don't have a tx hash until user signs

    return NextResponse.json({ success: true, transactionId: (data as { id: string }).id })
  } catch (error) {
    console.error('Init Tx Error:', error)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
