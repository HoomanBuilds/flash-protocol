import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { UserService } from '@/services/internal/user'

function getWalletAddress(req: NextRequest): string | null {
  return req.headers.get('x-wallet-address') || null
}

// POST — Store viewing key node + enable stealth mode
export async function POST(req: NextRequest) {
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
    const { viewingKeyNode, stealthMetaAddress } = body

    if (!viewingKeyNode || !stealthMetaAddress) {
      return NextResponse.json(
        { error: 'viewingKeyNode and stealthMetaAddress are required' },
        { status: 400 },
      )
    }

    const supabase = createServerClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('merchants') as any)
      .update({
        stealth_enabled: true,
        stealth_viewing_key_node: viewingKeyNode,
        stealth_meta_address: stealthMetaAddress,
      })
      .eq('id', merchant.id)

    if (error) {
      console.error('Stealth enable error:', error)
      return NextResponse.json({ error: 'Failed to enable stealth mode' }, { status: 500 })
    }

    return NextResponse.json({ success: true, stealth_enabled: true })
  } catch (error) {
    console.error('Stealth POST error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// GET — Check stealth status
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
    const { data, error } = await (supabase.from('merchants') as any)
      .select('stealth_enabled, stealth_meta_address')
      .eq('id', merchant.id)
      .single()

    if (error) {
      console.error('Stealth GET error:', error)
      return NextResponse.json({ error: 'Failed to fetch stealth status' }, { status: 500 })
    }

    return NextResponse.json({
      stealth_enabled: data?.stealth_enabled || false,
      stealth_meta_address: data?.stealth_meta_address || null,
      has_keys: !!data?.stealth_meta_address,
    })
  } catch (error) {
    console.error('Stealth GET error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

// DELETE — Disable stealth mode and remove keys
export async function DELETE(req: NextRequest) {
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
    const { error } = await (supabase.from('merchants') as any)
      .update({
        stealth_enabled: false,
        stealth_viewing_key_node: null,
        stealth_meta_address: null,
      })
      .eq('id', merchant.id)

    if (error) {
      console.error('Stealth DELETE error:', error)
      return NextResponse.json({ error: 'Failed to disable stealth mode' }, { status: 500 })
    }

    return NextResponse.json({ success: true, stealth_enabled: false })
  } catch (error) {
    console.error('Stealth DELETE error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
