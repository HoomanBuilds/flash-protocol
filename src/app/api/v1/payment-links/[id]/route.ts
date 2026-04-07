import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { verifyApiKey } from '@/lib/api/verify-api-key'
import { z } from 'zod'

const updatePaymentLinkSchema = z.object({
  status: z.enum(['active', 'paused', 'archived']).optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  max_uses: z.number().int().positive().optional(),
  expires_at: z.string().datetime().optional().nullable(),
  success_url: z.string().url().optional(),
  cancel_url: z.string().url().optional().nullable(),
  metadata: z.record(z.string(), z.any()).optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { merchant, error } = await verifyApiKey(req)

  if (error) {
    return NextResponse.json({ error }, { status: 401 })
  }

  const { id } = await params
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    title: link.title,
    description: link.description,
    receive_token: link.receive_token,
    receive_chain_id: link.receive_chain_id,
    receive_token_symbol: link.receive_token_symbol,
    use_stealth: link.use_stealth,
    current_uses: link.current_uses,
    max_uses: link.max_uses,
    expires_at: link.expires_at,
    success_url: link.success_url,
    cancel_url: link.cancel_url,
    metadata: link.api_metadata,
    created_at: link.created_at,
    updated_at: link.updated_at,
    transactions: transactions || [],
  })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { merchant, error } = await verifyApiKey(req)

  if (error) {
    return NextResponse.json({ error }, { status: 401 })
  }

  const { id } = await params

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 })
  }

  const validation = updatePaymentLinkSchema.safeParse(body)

  if (!validation.success) {
    return NextResponse.json({
      error: 'Validation error',
      details: validation.error.issues,
    }, { status: 400 })
  }

  const data = validation.data

  // Build update object dynamically — only include provided fields
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateObj: Record<string, any> = {
    updated_at: new Date().toISOString(),
  }

  if (data.status !== undefined) updateObj.status = data.status
  if (data.title !== undefined) updateObj.title = data.title
  if (data.description !== undefined) updateObj.description = data.description
  if (data.max_uses !== undefined) updateObj.max_uses = data.max_uses
  if (data.expires_at !== undefined) updateObj.expires_at = data.expires_at
  if (data.success_url !== undefined) updateObj.success_url = data.success_url
  if (data.cancel_url !== undefined) updateObj.cancel_url = data.cancel_url
  if (data.metadata !== undefined) updateObj.api_metadata = data.metadata

  if (Object.keys(updateObj).length === 1) {
    // Only updated_at — no actual fields provided
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServerClient() as any

  const { data: link, error: updateError } = await supabase
    .from('payment_links')
    .update(updateObj)
    .eq('id', id)
    .eq('merchant_id', merchant.id)
    .select()
    .single()

  if (updateError || !link) {
    return NextResponse.json({ error: 'Failed to update payment link' }, { status: 500 })
  }

  return NextResponse.json({
    id: link.id,
    url: `${process.env.NEXT_PUBLIC_BASE_URL}/pay/${link.id}`,
    amount: link.amount,
    currency: link.currency,
    status: link.status,
    title: link.title,
    description: link.description,
    receive_token: link.receive_token,
    receive_chain_id: link.receive_chain_id,
    receive_token_symbol: link.receive_token_symbol,
    use_stealth: link.use_stealth,
    current_uses: link.current_uses,
    max_uses: link.max_uses,
    expires_at: link.expires_at,
    success_url: link.success_url,
    cancel_url: link.cancel_url,
    metadata: link.api_metadata,
    created_at: link.created_at,
    updated_at: link.updated_at,
  })
}
