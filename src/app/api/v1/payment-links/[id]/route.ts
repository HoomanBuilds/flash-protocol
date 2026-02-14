import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { verifyApiKey } from '@/lib/api/verify-api-key'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { merchant, error } = await verifyApiKey(req)
  
  if (error) {
    return NextResponse.json({ error }, { status: 401 })
  }
  
  const { id } = await params
  const supabase = createServerClient() as any
  
  // Fetch payment link
  const { data: link, error: dbError } = await supabase
    .from('payment_links')
    .select('*')
    .eq('id', id)
    .single()
    
  if (dbError || !link) {
    return NextResponse.json({ error: 'Payment link not found' }, { status: 404 })
  }
  
  // Verify ownership
  if (link.merchant_id !== merchant.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }
  
  // Fetch recent transactions (optional, limit 5)
  const { data: transactions } = await supabase
    .from('transactions')
    .select('id, status, actual_output, customer_wallet, source_tx_hash, completed_at, created_at')
    .eq('payment_link_id', id)
    .order('created_at', { ascending: false })
    .limit(5)
    
  return NextResponse.json({
    id: link.id,
    url: `${process.env.NEXT_PUBLIC_BASE_URL}/pay/${link.id}`,
    amount: link.amount,
    currency: link.currency,
    status: link.status,
    current_uses: link.current_uses,
    max_uses: link.max_uses,
    metadata: link.api_metadata,
    created_at: link.created_at,
    transactions: transactions || []
  })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { merchant, error } = await verifyApiKey(req)
  
  if (error) {
    return NextResponse.json({ error }, { status: 401 })
  }
  
  const { id } = await params
  const body = await req.json()
  
  // Only allow updating status for now
  if (!body.status || !['active', 'paused', 'archived'].includes(body.status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }
  
  const supabase = createServerClient() as any
  
  const { data: link, error: updateError } = await supabase
    .from('payment_links')
    .update({ status: body.status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('merchant_id', merchant.id)
    .select()
    .single()
    
  if (updateError || !link) {
    return NextResponse.json({ error: 'Failed to update payment link' }, { status: 500 })
  }
  
  return NextResponse.json({
    id: link.id,
    status: link.status,
    updated_at: link.updated_at
  })
}
