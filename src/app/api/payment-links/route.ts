import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@/lib/supabase'
import { SessionService } from '@/services/internal/session'
import { UserService } from '@/services/internal/user'
import { createPaymentLinkSchema } from '@/lib/validations/payment-link'

export async function POST(req: NextRequest) {
  try {
    // 1. Auth Check
    const cookieStore = await cookies()
    const sessionId = cookieStore.get('session_id')?.value
    if (!sessionId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const isValid = await SessionService.verifySession(sessionId)
    if (!isValid) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

    const supabase = createServerClient()
    
    // Get wallet from session
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: session } = await (supabase.from('sessions') as any)
      .select('wallet_address')
      .eq('id', sessionId)
      .single()
      
    if (!session?.wallet_address) return NextResponse.json({ error: 'Session user not found' }, { status: 401 })

    // Get Merchant ID from wallet
    const merchant = await UserService.findUserByWallet(session.wallet_address)
    if (!merchant) return NextResponse.json({ error: 'Merchant profile not found' }, { status: 404 })

    // 2. Input Validation
    const body = await req.json()
    const validation = createPaymentLinkSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', details: validation.error.format() }, { status: 400 })
    }

    const data = validation.data

    // 3. Database Insert
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
        customization: data.config, // Map config -> customization
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

export async function GET(_req: NextRequest) {
  try {
    // 1. Auth Check
    const cookieStore = await cookies()
    const sessionId = cookieStore.get('session_id')?.value
    if (!sessionId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const isValid = await SessionService.verifySession(sessionId)
    if (!isValid) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

    const supabase = createServerClient()

    // Get wallet from session
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: session } = await (supabase.from('sessions') as any)
        .select('wallet_address')
        .eq('id', sessionId)
        .single()

    if (!session?.wallet_address) return NextResponse.json({ error: 'Session user not found' }, { status: 401 })

    // Get Merchant
    const merchant = await UserService.findUserByWallet(session.wallet_address)
    if (!merchant) return NextResponse.json({ error: 'Merchant not found' }, { status: 404 })

    // 2. Fetch Links
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
