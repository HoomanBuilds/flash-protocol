import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { WEBHOOK_EVENTS } from '@/lib/webhooks'
import { z } from 'zod'

function getWalletAddress(req: NextRequest): string | null {
  return req.headers.get('x-wallet-address') || null
}

async function getMerchantId(supabase: any, walletAddress: string): Promise<string | null> {
  const { data } = await supabase
    .from('merchants')
    .select('id')
    .eq('wallet_address', walletAddress)
    .single()
  return data?.id || null
}

const updateWebhookSchema = z.object({
  url: z
    .string()
    .url()
    .refine((url) => url.startsWith('https://'), {
      message: 'Webhook URL must use HTTPS',
    })
    .optional(),
  events: z
    .array(z.enum(WEBHOOK_EVENTS as unknown as [string, ...string[]]))
    .min(1)
    .optional(),
  description: z.string().max(255).optional(),
  active: z.boolean().optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const walletAddress = getWalletAddress(req)
  if (!walletAddress) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServerClient() as any
  const merchantId = await getMerchantId(supabase, walletAddress)
  if (!merchantId) {
    return NextResponse.json({ error: 'Merchant not found' }, { status: 404 })
  }

  const { id } = await params

  const { data: endpoint, error: dbError } = await supabase
    .from('webhook_endpoints')
    .select('id, url, events, description, active, created_at, updated_at')
    .eq('id', id)
    .eq('merchant_id', merchantId)
    .single()

  if (dbError || !endpoint) {
    return NextResponse.json({ error: 'Webhook endpoint not found' }, { status: 404 })
  }

  // Fetch recent deliveries
  const { data: deliveries } = await supabase
    .from('webhook_deliveries')
    .select(
      'id, event_type, response_status, error_message, delivered, duration_ms, attempt, created_at',
    )
    .eq('webhook_endpoint_id', id)
    .order('created_at', { ascending: false })
    .limit(20)

  return NextResponse.json({
    ...endpoint,
    deliveries: deliveries || [],
  })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const walletAddress = getWalletAddress(req)
  if (!walletAddress) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 })
  }

  const validation = updateWebhookSchema.safeParse(body)

  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation error', details: validation.error.issues },
      { status: 400 },
    )
  }

  const data = validation.data
  const { id } = await params
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServerClient() as any
  const merchantId = await getMerchantId(supabase, walletAddress)
  if (!merchantId) {
    return NextResponse.json({ error: 'Merchant not found' }, { status: 404 })
  }

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (data.url !== undefined) updateData.url = data.url
  if (data.events !== undefined) updateData.events = data.events
  if (data.description !== undefined) updateData.description = data.description
  if (data.active !== undefined) updateData.active = data.active

  const { data: endpoint, error: dbError } = await supabase
    .from('webhook_endpoints')
    .update(updateData)
    .eq('id', id)
    .eq('merchant_id', merchantId)
    .select('id, url, events, description, active, updated_at')
    .single()

  if (dbError || !endpoint) {
    return NextResponse.json({ error: 'Webhook endpoint not found' }, { status: 404 })
  }

  return NextResponse.json(endpoint)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const walletAddress = getWalletAddress(req)
  if (!walletAddress) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServerClient() as any
  const merchantId = await getMerchantId(supabase, walletAddress)
  if (!merchantId) {
    return NextResponse.json({ error: 'Merchant not found' }, { status: 404 })
  }

  const { data: deleted, error: dbError } = await supabase
    .from('webhook_endpoints')
    .delete()
    .eq('id', id)
    .eq('merchant_id', merchantId)
    .select('id')

  if (dbError) {
    return NextResponse.json({ error: 'Failed to delete webhook endpoint' }, { status: 500 })
  }

  if (!deleted || deleted.length === 0) {
    return NextResponse.json({ error: 'Webhook endpoint not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true, message: 'Webhook endpoint deleted' })
}
