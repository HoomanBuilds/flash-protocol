import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
  const session = request.cookies.get('session_id')?.value

  // 1. Define Paths
  const isDashboard = path.startsWith('/dashboard')

  // 2. Protect /dashboard
  if (isDashboard && !session) {
    return NextResponse.redirect(new URL('/', request.url))
  }


  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
