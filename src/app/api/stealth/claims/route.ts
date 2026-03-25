import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { UserService } from '@/services/internal/user'

function getWalletAddress(req: NextRequest): string | null {
  return req.headers.get('x-wallet-address') || null
}

// GET — Fetch unclaimed stealth addresses for the merchant
export async function GET(req: NextRequest) {
  try {
    const walletAddress = getWalletAddress(req)
    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet not connected' }, { status: 401 })
    }

    const merchant = await UserService.upsertUser(walletAddress)
    if (!merchant) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 })
    }

    const supabase = createServerClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: claims, error } = await (supabase.from('stealth_addresses') as any)
      .select('id, stealth_safe_address, chain_id, nonce, ephemeral_public_key, amount_received, claimed, claimed_at, claim_tx_hash, created_at')
      .eq('merchant_id', merchant.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Claims GET error:', error)
      return NextResponse.json({ error: 'Failed to fetch claims' }, { status: 500 })
    }

    const unclaimed = claims?.filter((c: any) => !c.claimed && c.amount_received > 0) || []
    const claimed = claims?.filter((c: any) => c.claimed) || []

    return NextResponse.json({
      unclaimed,
      claimed,
      total_unclaimed: unclaimed.length,
      total_claimable: unclaimed.reduce((sum: number, c: any) => sum + (c.amount_received || 0), 0),
    })
  } catch (error) {
    console.error('Claims GET error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// PATCH — Mark a stealth address as claimed
export async function PATCH(req: NextRequest) {
  try {
    const walletAddress = getWalletAddress(req)
    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet not connected' }, { status: 401 })
    }

    const merchant = await UserService.upsertUser(walletAddress)
    if (!merchant) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 })
    }

    const body = await req.json()
    const { stealthAddressId, claimTxHash } = body

    if (!stealthAddressId || !claimTxHash) {
      return NextResponse.json(
        { error: 'stealthAddressId and claimTxHash are required' },
        { status: 400 },
      )
    }

    const supabase = createServerClient()

    // Verify ownership
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: sa, error: fetchErr } = await (supabase.from('stealth_addresses') as any)
      .select('id, merchant_id')
      .eq('id', stealthAddressId)
      .eq('merchant_id', merchant.id)
      .single()

    if (fetchErr || !sa) {
      return NextResponse.json({ error: 'Stealth address not found or unauthorized' }, { status: 404 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateErr } = await (supabase.from('stealth_addresses') as any)
      .update({
        claimed: true,
        claimed_at: new Date().toISOString(),
        claim_tx_hash: claimTxHash,
      })
      .eq('id', stealthAddressId)

    if (updateErr) {
      console.error('Claims PATCH error:', updateErr)
      return NextResponse.json({ error: 'Failed to update claim' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Claims PATCH error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
