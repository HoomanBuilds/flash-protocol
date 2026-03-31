import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { generateWebhookSecret, WEBHOOK_EVENTS } from '@/lib/webhooks'
import { z } from 'zod'

const MAX_ENDPOINTS_PER_MERCHANT = 5

function getWalletAddress(req: NextRequest): string | null {
  return req.headers.get('x-wallet-address') || null
}

const createWebhookSchema = z.object({
  url: z.string().url().refine((url) => url.startsWith('https://'), {
    message: 'Webhook URL must use HTTPS',
  }),
  events: z
    .array(z.enum(WEBHOOK_EVENTS as unknown as [string, ...string[]]))
    .min(1, 'At least one event is required'),
  description: z.string().max(255).optional(),
})

export async function POST(req: NextRequest) {
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

  const validation = createWebhookSchema.safeParse(body)

  if (!validation.success) {
    return NextResponse.json(
      { error: 'Validation error', details: validation.error.issues },
      { status: 400 },
    )
  }

  const data = validation.data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServerClient() as any

  // Get merchant
  const { data: merchant, error: merchantError } = await supabase
    .from('merchants')
    .select('id')
    .eq('wallet_address', walletAddress)
    .single()

  if (merchantError || !merchant) {
    return NextResponse.json({ error: 'Merchant not found' }, { status: 404 })
  }

  // Check endpoint limit
  const { count, error: countError } = await supabase
    .from('webhook_endpoints')
    .select('id', { count: 'exact', head: true })
    .eq('merchant_id', merchant.id)

  if (countError) {
    return NextResponse.json({ error: 'Failed to check endpoint limit' }, { status: 500 })
  }

  if (count !== null && count >= MAX_ENDPOINTS_PER_MERCHANT) {
    return NextResponse.json(
      { error: `Maximum ${MAX_ENDPOINTS_PER_MERCHANT} webhook endpoints allowed` },
      { status: 400 },
    )
  }

  const secret = generateWebhookSecret()

  const { data: endpoint, error: dbError } = await supabase
    .from('webhook_endpoints')
    .insert({
      merchant_id: merchant.id,
      url: data.url,
      events: data.events,
      description: data.description || null,
      secret,
    })
    .select('id, url, events, description, active, created_at')
    .single()

  if (dbError) {
    if (dbError.code === '23505') {
      return NextResponse.json(
        { error: 'A webhook endpoint with this URL already exists' },
        { status: 409 },
      )
    }
    console.error('Database error creating webhook endpoint:', dbError)
    return NextResponse.json({ error: 'Failed to create webhook endpoint' }, { status: 500 })
  }

  return NextResponse.json(
    {
      ...endpoint,
      secret,
      warning: "Save this secret securely. You won't see it again.",
    },
    { status: 201 },
  )
}

export async function GET(req: NextRequest) {
  const walletAddress = getWalletAddress(req)
  if (!walletAddress) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServerClient() as any

  const { data: merchant } = await supabase
    .from('merchants')
    .select('id')
    .eq('wallet_address', walletAddress)
    .single()

  if (!merchant) {
    return NextResponse.json({ error: 'Merchant not found' }, { status: 404 })
  }

  const { data: endpoints, error: dbError } = await supabase
    .from('webhook_endpoints')
    .select('id, url, events, description, active, created_at, updated_at')
    .eq('merchant_id', merchant.id)
    .order('created_at', { ascending: false })

  if (dbError) {
    return NextResponse.json({ error: 'Failed to fetch webhook endpoints' }, { status: 500 })
  }

  // Fetch delivery stats for all endpoints in one query
  const endpointIds = (endpoints || []).map((ep: { id: string }) => ep.id)

  let totalsByEndpoint: Record<string, number> = {}
  let successByEndpoint: Record<string, number> = {}

  if (endpointIds.length > 0) {
    const { data: allDeliveries } = await supabase
      .from('webhook_deliveries')
      .select('webhook_endpoint_id, delivered')
      .in('webhook_endpoint_id', endpointIds)

    for (const d of allDeliveries || []) {
      const epId = d.webhook_endpoint_id
      totalsByEndpoint[epId] = (totalsByEndpoint[epId] || 0) + 1
      if (d.delivered) {
        successByEndpoint[epId] = (successByEndpoint[epId] || 0) + 1
      }
    }
  }

  const enriched = (endpoints || []).map((ep: { id: string }) => {
    const total = totalsByEndpoint[ep.id] || 0
    const successful = successByEndpoint[ep.id] || 0
    return {
      ...ep,
      recent_deliveries: { total, successful, failed: total - successful },
    }
  })

  return NextResponse.json({ data: enriched })
}
