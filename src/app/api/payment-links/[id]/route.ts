import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    if (!id) {
      return NextResponse.json({ error: 'Link ID required' }, { status: 400 })
    }

    const supabase = createServerClient()

    // Public fetch - no auth check required
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: link, error } = await (supabase.from('payment_links') as any)
      .select(`
        *,
        merchants:merchant_id (
          business_name,
          email,
          wallet_address,
          branding:branding_settings
        )
      `)
      .eq('id', id)
      .single()

    if (error || !link) {
      return NextResponse.json({ error: 'Payment link not found' }, { status: 404 })
    }

    // Check status
    if (link.status === 'archived') {
      return NextResponse.json({ error: 'This payment link has been archived' }, { status: 410 })
    }

    if (link.status === 'expired' || (link.expires_at && new Date(link.expires_at) < new Date())) {
      return NextResponse.json({ error: 'This payment link has expired' }, { status: 410 })
    }

    if (link.max_uses && link.current_uses >= link.max_uses) {
      return NextResponse.json({ error: 'This payment link has reached its maximum uses' }, { status: 410 })
    }

    return NextResponse.json(link)

  } catch (error) {
    console.error('Fetch Public Link Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
