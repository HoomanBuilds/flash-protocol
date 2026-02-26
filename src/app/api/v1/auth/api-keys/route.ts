import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

// Get wallet address from x-wallet-address header
function getWalletAddress(req: NextRequest): string | null {
  return req.headers.get('x-wallet-address') || null
}

async function getAuthContext(req: NextRequest) {
  const walletAddress = getWalletAddress(req)
  if (!walletAddress) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServerClient() as any
  return { supabase, walletAddress }
}

export async function GET(req: NextRequest) {
  const auth = await getAuthContext(req)
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { supabase, walletAddress } = auth

  const { data: merchant, error } = await supabase
    .from('merchants')
    .select(
      'api_key_name, api_key_prefix, api_enabled, api_created_at, api_last_used_at, api_total_calls',
    )
    .eq('wallet_address', walletAddress)
    .single()

  if (error || !merchant) {
    return NextResponse.json({ error: 'Merchant not found' }, { status: 404 })
  }

  if (!merchant.api_enabled || !merchant.api_key_prefix) {
    return NextResponse.json({ active: false })
  }

  return NextResponse.json({
    active: true,
    name: merchant.api_key_name,
    prefix: merchant.api_key_prefix,
    created_at: merchant.api_created_at,
    last_used_at: merchant.api_last_used_at,
    total_calls: merchant.api_total_calls,
  })
}

export async function POST(req: NextRequest) {
  const auth = await getAuthContext(req)
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { supabase, walletAddress } = auth

  let name = 'Untitled Key'
  try {
    const body = await req.json()
    if (body.name && typeof body.name === 'string' && body.name.trim()) {
      name = body.name.trim().substring(0, 100)
    }
  } catch {
    // No body or invalid JSON
  }

  const rawKey = 'pg_live_' + crypto.randomBytes(32).toString('hex')
  const keyHash = await bcrypt.hash(rawKey, 10)
  const prefix = rawKey.substring(0, 16)

  const { error } = await supabase
    .from('merchants')
    .update({
      api_key_hash: keyHash,
      api_key_prefix: prefix,
      api_key_name: name,
      api_enabled: true,
      api_created_at: new Date().toISOString(),
      api_total_calls: 0,
    })
    .eq('wallet_address', walletAddress)

  if (error) {
    console.error('Database error generating API key:', error)
    return NextResponse.json({ error: 'Failed to generate API key' }, { status: 500 })
  }

  return NextResponse.json(
    {
      api_key: rawKey,
      prefix,
      name,
      created_at: new Date().toISOString(),
      warning: "Save this key securely. You won't see it again.",
    },
    { status: 201 },
  )
}

export async function DELETE(req: NextRequest) {
  const auth = await getAuthContext(req)
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { supabase, walletAddress } = auth

  const { error } = await supabase
    .from('merchants')
    .update({
      api_key_hash: null,
      api_key_prefix: null,
      api_key_name: null,
      api_enabled: false,
    })
    .eq('wallet_address', walletAddress)

  if (error) {
    return NextResponse.json({ error: 'Failed to revoke API key' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    message: 'API key revoked successfully',
  })
}
