import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { verifyApiKey } from '@/lib/api/verify-api-key'
import { generateWebhookSecret, WEBHOOK_EVENTS } from '@/lib/webhooks'
import { z } from 'zod'

const MAX_ENDPOINTS_PER_MERCHANT = 5

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
  const { merchant, error } = await verifyApiKey(req)

  if (error) {
    return NextResponse.json({ error }, { status: 401 })
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
  const { merchant, error } = await verifyApiKey(req)

  if (error) {
    return NextResponse.json({ error }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServerClient() as any

  const { data: endpoints, error: dbError } = await supabase
    .from('webhook_endpoints')
    .select('id, url, events, description, active, created_at, updated_at')
    .eq('merchant_id', merchant.id)
    .order('created_at', { ascending: false })

  if (dbError) {
    return NextResponse.json({ error: 'Failed to fetch webhook endpoints' }, { status: 500 })
  }

  // Fetch delivery stats per endpoint using count queries (not full row fetches)
  const enriched = await Promise.all(
    (endpoints || []).map(async (ep: { id: string }) => {
      const [{ count: total }, { count: successful }] = await Promise.all([
        supabase
          .from('webhook_deliveries')
          .select('id', { count: 'exact', head: true })
          .eq('webhook_endpoint_id', ep.id),
        supabase
          .from('webhook_deliveries')
          .select('id', { count: 'exact', head: true })
          .eq('webhook_endpoint_id', ep.id)
          .eq('delivered', true),
      ])
      return {
        ...ep,
        recent_deliveries: {
          total: total || 0,
          successful: successful || 0,
          failed: (total || 0) - (successful || 0),
        },
      }
    }),
  )

  return NextResponse.json({ data: enriched })
}
