import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { UserService } from '@/services/internal/user'

// Get wallet address from x-wallet-address header
function getWalletAddress(req: NextRequest): string | null {
  return req.headers.get('x-wallet-address') || null
}

// Internal endpoint for dashboard — fetch single transaction by ID
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const walletAddress = getWalletAddress(req)
    if (!walletAddress) return NextResponse.json({ error: 'Wallet not connected' }, { status: 401 })

    const merchant = await UserService.upsertUser(walletAddress)
    if (!merchant) return NextResponse.json({ error: 'Failed to resolve merchant' }, { status: 500 })

    const supabase = createServerClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: transaction, error } = await (supabase.from('transactions') as any)
      .select(`
        *,
        payment_links!inner(merchant_id)
      `)
      .eq('id', id)
      .single()

    if (error || !transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    // Verify ownership via payment link
    if (transaction.payment_links?.merchant_id !== merchant.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Clean response
    const { payment_links, ...cleaned } = transaction
    return NextResponse.json(cleaned)
  } catch (error) {
    console.error('Transaction Detail Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
