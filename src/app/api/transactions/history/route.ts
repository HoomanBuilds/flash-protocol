import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { UserService } from '@/services/internal/user'

function getWalletAddress(req: NextRequest): string | null {
  return req.headers.get('x-wallet-address') || null
}

export async function GET(req: NextRequest) {
  try {
    const walletAddress = getWalletAddress(req)
    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet not connected' }, { status: 401 })
    }

    const user = await UserService.upsertUser(walletAddress)
    if (!user) {
      return NextResponse.json({ error: 'Failed to resolve user' }, { status: 500 })
    }

    const supabase = createServerClient()
    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)

    // 1. Fetch Sent Transactions (where customer_wallet = walletAddress)
    const { data: sentTransactions, error: sentError } = await supabase
      .from('transactions')
      .select('*, payment_links(title, merchant_id)') // Fetch link info if they paid via link
      .eq('customer_wallet', walletAddress)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (sentError) throw sentError

    // 2. Fetch Received Transactions via Payment Links
    const { data: receivedViaLinks, error: linksError } = await supabase
      .from('transactions')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .select('*, payment_links!inner(merchant_id, title)' as any)
      .eq('payment_links.merchant_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (linksError) throw linksError

    // 3. Fetch Received Transactions (receiver_wallet = walletAddress)
    const { data: receivedDirect, error: directError } = await supabase
      .from('transactions')
      .select('*')
      .eq('receiver_wallet', walletAddress)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (directError) throw directError

    // 4. Merge, tag, and deduplicate
    const unified = [
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(sentTransactions || []).map((tx: any) => ({ ...tx, type: 'sent' })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(receivedViaLinks || []).map((tx: any) => {
        const { payment_links, ...rest } = tx
        return { ...rest, type: 'received', title: payment_links?.title }
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(receivedDirect || []).map((tx: any) => ({ ...tx, type: 'received' }))
    ]

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const uniqueMap = new Map<string, any>()
    unified.forEach(tx => uniqueMap.set(tx.id, tx))
    const uniqueList = Array.from(uniqueMap.values())

    // Sort newest to oldest
    uniqueList.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    // Apply the limit after merging
    const finalFeed = uniqueList.slice(0, limit)

    return NextResponse.json({ data: finalFeed })

  } catch (error) {
    console.error('History API Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
