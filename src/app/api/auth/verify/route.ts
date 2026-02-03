import { NextResponse } from 'next/server'
import { z } from 'zod'
import { AuthService } from '@/services/internal/auth'
import { UserService } from '@/services/internal/user'
import { SessionService } from '@/services/internal/session'
import { cookies } from 'next/headers'

const verifySchema = z.object({
  message: z.string(),
  signature: z.string(),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { message, signature } = verifySchema.parse(body)

    // 1. Verify Nonce from Cookie
    const cookieStore = await cookies()
    const nonce = cookieStore.get('siwe-nonce')?.value

    if (!nonce) {
      return NextResponse.json({ error: 'Nonce not found' }, { status: 422 })
    }

    // 2. Verify Signature
    const verification = await AuthService.verifyMessage(message, signature)
    if (!verification.success || !verification.data) {
       return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const { data: fields } = verification

    // 3. Verify Nonce Match
    if (fields.nonce !== nonce) {
      return NextResponse.json({ error: 'Invalid nonce' }, { status: 401 })
    }

    // 4. Upsert User
    const user = await UserService.upsertUser(fields.address)
    if (!user) {
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }

    // 5. Create Session
    const session = await SessionService.createSession(
      fields.address,
      fields.nonce,
      signature,
      message
    )

    if (!session) {
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
    }

    // 6. Set Session Cookie
    cookieStore.set('session_id', session.id!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24, // 1 Day
    })

    // Clear nonce cookie
    cookieStore.delete('siwe-nonce')

    return NextResponse.json({ success: true, user })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }
    console.error('Verify login error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
