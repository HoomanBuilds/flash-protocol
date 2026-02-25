import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { UserService } from '@/services/internal/user'
import { createPaymentLinkSchema } from '@/lib/validations/payment-link'


function getWalletAddress(req: NextRequest): string | null {
  return req.headers.get('x-wallet-address') || null
}

export async function POST(req: NextRequest) {
  try {
    const walletAddress = getWalletAddress(req)
    if (!walletAddress) return NextResponse.json({ error: 'Wallet not connected' }, { status: 401 })

    const merchant = await UserService.upsertUser(walletAddress)
    if (!merchant) return NextResponse.json({ error: 'Failed to create merchant profile' }, { status: 500 })

    const body = await req.json()
    const validation = createPaymentLinkSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', details: validation.error.format() }, { status: 400 })
    }

    const data = validation.data
    const supabase = createServerClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: link, error } = await (supabase.from('payment_links') as any)
      .insert({
        merchant_id: merchant.id,
        title: data.title,
        description: data.description,
        amount: data.amount,
        currency: data.currency,
        receive_token: data.receive_token,
        receive_token_symbol: data.receive_token_symbol,
        receive_chain_id: data.receive_chain_id,
        recipient_address: data.recipient_address,
        receive_mode: data.receive_mode,
        customization: data.config,
        max_uses: data.max_uses,
        expires_at: data.expires_at,
        status: 'active'
      })
      .select()
      .single()

    if (error) {
      console.error('Create Link Error:', error)
      return NextResponse.json({ error: 'Failed to create payment link' }, { status: 500 })
    }

    return NextResponse.json(link)

  } catch (error) {
    console.error('Payment Link API Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const walletAddress = getWalletAddress(req)
    if (!walletAddress) return NextResponse.json({ error: 'Wallet not connected' }, { status: 401 })

    const merchant = await UserService.findUserByWallet(walletAddress)
    if (!merchant) return NextResponse.json({ error: 'Merchant not found' }, { status: 404 })

    const supabase = createServerClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: links, error } = await (supabase.from('payment_links') as any)
      .select('*')
      .eq('merchant_id', merchant.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Fetch Links Error:', error)
      return NextResponse.json({ error: 'Failed to fetch links' }, { status: 500 })
    }

    return NextResponse.json(links)

  } catch (error) {
    console.error('Payment Link GET Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
