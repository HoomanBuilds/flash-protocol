import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { z } from 'zod'
import { inngest } from '@/inngest/client'

const initiateSchema = z.object({
  paymentLinkId: z.string().optional(), // Optional for now (direct swap test)
  walletAddress: z.string(),
  fromChainId: z.number(),
  toChainId: z.number(),
  fromToken: z.string(),
  toToken: z.string(),
  fromAmount: z.string(),
  toAmount: z.string(),
  route: z.any(), // Store LIFI route JSON
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
        provider: 'lifi',
        route_details: params.route,
        payment_link_id: params.paymentLinkId || null // Allow null for testing
      } as any)
      .select()
      .single()

    if (error) {
      console.error('DB Error:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    // 2. Trigger Inngest Job for status monitoring
    await inngest.send({ 
        name: 'transaction/poll', 
        data: { 
            transactionId: (data as any).id,
            txHash: params.route?.transactionRequest?.hash || null,
            fromChainId: params.fromChainId,
            toChainId: params.toChainId,
            bridge: params.route?.steps?.[0]?.tool || 'lifi',
        } 
    })

    return NextResponse.json({ success: true, transactionId: (data as any).id })
  } catch (error) {
    console.error('Init Tx Error:', error)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
