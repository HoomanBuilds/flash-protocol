import { NextResponse } from 'next/server'
import { AuthService } from '@/services/internal/auth'
import { cookies } from 'next/headers'

export async function GET() {
  const nonce = AuthService.generateNonce()
  
  // Store nonce in HTTP-only cookie to verify later
  ;(await cookies()).set('siwe-nonce', nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  })

  return NextResponse.json({ nonce })
}
