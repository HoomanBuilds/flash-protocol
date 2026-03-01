import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { UserService } from '@/services/internal/user'

function getWalletAddress(req: NextRequest) {
  return req.headers.get('x-wallet-address')
}

export async function GET(req: NextRequest) {
  try {
    const walletAddress = getWalletAddress(req)
    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet not connected' }, { status: 401 })
    }

    const user = await UserService.upsertUser(walletAddress)
    if (!user) {
      return NextResponse.json({ error: 'Failed to resolve user profile' }, { status: 500 })
    }

    return NextResponse.json({
      default_receive_chain: user.default_receive_chain,
      default_receive_token: user.default_receive_token,
      business_name: user.business_name
    })

  } catch (error) {
    console.error('Profile GET Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const walletAddress = getWalletAddress(req)
    if (!walletAddress) {
      return NextResponse.json({ error: 'Wallet not connected' }, { status: 401 })
    }

    const body = await req.json()
    const { default_receive_chain, default_receive_token } = body

    if (default_receive_chain !== undefined && typeof default_receive_chain !== 'number' && default_receive_chain !== null) {
      return NextResponse.json({ error: 'Invalid default_receive_chain provided' }, { status: 400 })
    }
    if (default_receive_token !== undefined && typeof default_receive_token !== 'string' && default_receive_token !== null) {
      return NextResponse.json({ error: 'Invalid default_receive_token provided' }, { status: 400 })
    }

    const user = await UserService.upsertUser(walletAddress)
    if (!user) {
      return NextResponse.json({ error: 'Failed to resolve user profile' }, { status: 500 })
    }

    const updatePayload: Record<string, string | number> = {}
    if (default_receive_chain !== undefined) updatePayload.default_receive_chain = default_receive_chain
    if (default_receive_token !== undefined) updatePayload.default_receive_token = default_receive_token

    if (Object.keys(updatePayload).length === 0) {
       return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const supabase = createServerClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('merchants')
      .update(updatePayload)
      .eq('id', user.id)

    if (error) {
      console.error('Update Profile Error:', error)
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      default_receive_chain: default_receive_chain !== undefined ? default_receive_chain : user.default_receive_chain,
      default_receive_token: default_receive_token !== undefined ? default_receive_token : user.default_receive_token
    })

  } catch (error) {
    console.error('Profile PUT Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
