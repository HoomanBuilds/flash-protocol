import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { UserService } from '@/services/internal/user'

// Get wallet address from x-wallet-address header
function getWalletAddress(req: NextRequest): string | null {
  return req.headers.get('x-wallet-address') || null
}

// Internal endpoint for dashboard
export async function GET(req: NextRequest) {
  try {
    const walletAddress = getWalletAddress(req)
    if (!walletAddress) return NextResponse.json({ error: 'Wallet not connected' }, { status: 401 })

    const merchant = await UserService.upsertUser(walletAddress)
    if (!merchant) return NextResponse.json({ error: 'Failed to resolve merchant' }, { status: 500 })

    const supabase = createServerClient()
    const { searchParams } = new URL(req.url)
    const paymentLinkId = searchParams.get('payment_link_id')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase.from('transactions') as any)
      .select(`
        *,
        payment_links!inner(merchant_id)
      `)
      .eq('payment_links.merchant_id', merchant.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (paymentLinkId) {
      query = query.eq('payment_link_id', paymentLinkId)
    }

    const { data: transactions, error } = await query

    if (error) {
      console.error('Fetch Transactions Error:', error)
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
    }

    // Clean response — remove the joined payment_links data
    const cleaned = transactions?.map((tx: any) => {
      const { payment_links, ...rest } = tx
      return rest
    }) || []

    return NextResponse.json({ data: cleaned })
  } catch (error) {
    console.error('Transactions API Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
