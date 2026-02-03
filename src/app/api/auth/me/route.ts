import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { SessionService } from '@/services/internal/session'
import { UserService } from '@/services/internal/user'
import { createServerClient } from '@/lib/supabase'

export async function GET() {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get('session_id')?.value

  if (!sessionId) {
    return NextResponse.json({ authenticated: false })
  }

  // Verify session
  const isValid = await SessionService.verifySession(sessionId)
  if (!isValid) {
    return NextResponse.json({ authenticated: false })
  }

  // Get User (via session join or direct fetch)
  const supabase = createServerClient()
  const { data: session } = await supabase
    .from('sessions')
    .select('wallet_address')
    .eq('id', sessionId)
    .single()
  
  if (!session) return NextResponse.json({ authenticated: false })

  const user = await UserService.findUserByWallet((session as any).wallet_address)
  
  return NextResponse.json({ authenticated: true, user })
}
