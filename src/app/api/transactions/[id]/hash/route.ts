import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { inngest } from '@/inngest/client'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { txHash, requestId } = body

    if (!txHash) {
      return NextResponse.json({ error: 'txHash is required' }, { status: 400 })
    }

    const supabase = createServerClient()

    // 1. Update transaction with tx hash
    const { data, error } = await (supabase
      .from('transactions') as any)
      .update({ 
        tx_hash: txHash,
        status: 'pending',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('DB Update Error:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    // 2. Now trigger Inngest polling with the actual tx hash
    await inngest.send({
      name: 'transaction/poll',
      data: {
        transactionId: id,
        txHash,
        fromChainId: (data as any).from_chain_id,
        toChainId: (data as any).to_chain_id,
        bridge: (data as any).provider,
        provider: (data as any).provider,
        requestId: requestId || (data as any).route_details?.requestId,
      }
    })

    return NextResponse.json({ success: true, transactionId: id, status: 'pending' })
  } catch (error) {
    console.error('Update Tx Hash Error:', error)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
