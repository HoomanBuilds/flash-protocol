import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { deliverToEndpoint } from '@/lib/webhooks'

function getWalletAddress(req: NextRequest): string | null {
  return req.headers.get('x-wallet-address') || null
}

export async function POST(
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

  if (!body.delivery_id) {
    return NextResponse.json({ error: 'delivery_id is required' }, { status: 400 })
  }

  const { id: endpointId } = await params
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServerClient() as any

  // Get merchant
  const { data: merchant } = await supabase
    .from('merchants')
    .select('id')
    .eq('wallet_address', walletAddress)
    .single()

  if (!merchant) {
    return NextResponse.json({ error: 'Merchant not found' }, { status: 404 })
  }

  // Verify endpoint ownership
  const { data: endpoint, error: epError } = await supabase
    .from('webhook_endpoints')
    .select('id, url, secret')
    .eq('id', endpointId)
    .eq('merchant_id', merchant.id)
    .single()

  if (epError || !endpoint) {
    return NextResponse.json({ error: 'Webhook endpoint not found' }, { status: 404 })
  }

  // Fetch original delivery
  const { data: delivery, error: dlError } = await supabase
    .from('webhook_deliveries')
    .select('id, event_type, payload, attempt')
    .eq('id', body.delivery_id)
    .eq('webhook_endpoint_id', endpointId)
    .single()

  if (dlError || !delivery) {
    return NextResponse.json({ error: 'Delivery not found' }, { status: 404 })
  }

  // Re-deliver using shared helper
  const result = await deliverToEndpoint(
    endpoint.url,
    endpoint.secret,
    delivery.event_type,
    delivery.payload,
  )

  // Log replay delivery
  const { data: newDelivery } = await supabase
    .from('webhook_deliveries')
    .insert({
      webhook_endpoint_id: endpointId,
      event_type: delivery.event_type,
      payload: delivery.payload,
      response_status: result.responseStatus,
      response_body: result.responseBody,
      error_message: result.errorMessage,
      attempt: (delivery.attempt || 1) + 1,
      delivered: result.delivered,
      duration_ms: result.durationMs,
    })
    .select('id, event_type, response_status, delivered, duration_ms, created_at')
    .single()

  return NextResponse.json({
    success: result.delivered,
    delivery: newDelivery,
  })
}
