import { NextRequest, NextResponse } from 'next/server'
import { UserService } from '@/services/internal/user'

function getWalletAddress(req: NextRequest) {
  return req.headers.get('x-wallet-address')
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ walletAddress: string }> }
) {
  try {
    // 1. Verify the caller is authenticated
    const callerAddress = getWalletAddress(req)
    if (!callerAddress) {
      return NextResponse.json({ error: 'Wallet not connected' }, { status: 401 })
    }

    const { walletAddress } = await params
    if (!walletAddress) {
      return NextResponse.json({ error: 'Target wallet address required' }, { status: 400 })
    }

    // 2. Fetch the target receiver's profile
    const targetAddress = walletAddress
    const user = await UserService.findUserByWallet(targetAddress)

    if (!user) {
      return NextResponse.json({
        default_receive_chain: null,
        default_receive_token: null,
        business_name: null
      })
    }

    return NextResponse.json({
      default_receive_chain: user.default_receive_chain,
      default_receive_token: user.default_receive_token,
      business_name: user.business_name
    })

  } catch (error) {
    console.error('Profile Lookup Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
