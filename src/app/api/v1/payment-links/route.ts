import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { verifyApiKey } from '@/lib/api/verify-api-key'
import { ChainTokenService } from '@/services/chain-token-service'
import { z } from 'zod'

// Validation schema
const createPaymentLinkSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().default('USD'),
  receive_token: z.string().optional(),
  receive_chain: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  success_url: z.string().url(),
  cancel_url: z.string().url().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  max_uses: z.number().int().positive().optional(),
  expires_at: z.string().datetime().optional(),
  use_stealth: z.boolean().optional(),
})

const CHAIN_ID_MAP: Record<string, string> = {
  'ethereum': '1',
  'polygon': '137',
  'arbitrum': '42161',
  'optimism': '10',
  'base': '8453',
  'avalanche': '43114',
  'bsc': '56',
  'solana': 'solana',
}

export async function POST(req: NextRequest) {
  // 1. Verify API key
  const { merchant, error } = await verifyApiKey(req)

  if (error) {
    return NextResponse.json({ error }, { status: 401 })
  }

  // 2. Parse and validate request body
  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 })
  }

  const validation = createPaymentLinkSchema.safeParse(body)

  if (!validation.success) {
    return NextResponse.json({
      error: 'Validation error',
      details: validation.error.issues,
    }, { status: 400 })
  }

  const data = validation.data

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServerClient() as any

  // 3. Get merchant defaults
  const { data: merchantData } = await supabase
    .from('merchants')
    .select('default_receive_chain, default_receive_token, wallet_address, stealth_enabled')
    .eq('id', merchant.id)
    .single()

  let receiveChainId: string | undefined = merchantData?.default_receive_chain
    ? String(merchantData.default_receive_chain)
    : undefined

  // Handle string chain names if provided
  if (data.receive_chain) {
    const chainLower = data.receive_chain.toLowerCase()
    if (CHAIN_ID_MAP[chainLower]) {
      receiveChainId = CHAIN_ID_MAP[chainLower]
    } else {
      // Pass through as-is (supports numeric IDs and non-numeric keys like 'solana')
      receiveChainId = data.receive_chain
    }
  }

  // 4. Stealth enforcement — replicate logic from internal payment-links POST
  let receiveToken = data.receive_token || merchantData?.default_receive_token
  let receiveTokenSymbol: string | undefined
  let useStealth = data.use_stealth || false

  if (useStealth) {
    if (merchantData?.stealth_enabled) {
      const chainKey = receiveChainId || '1'
      const chains = await ChainTokenService.getChains()
      const chainConfig = chains.find((c) => c.key === chainKey)
      receiveToken = '0x0000000000000000000000000000000000000000'
      receiveTokenSymbol = chainConfig?.symbol || 'ETH'
    } else {
      // Merchant doesn't have stealth enabled, ignore the flag
      useStealth = false
    }
  }

  // Resolve receive_token_symbol for non-stealth links
  if (!receiveTokenSymbol) {
    receiveTokenSymbol = receiveToken || undefined
  }

  // 5. Create payment link
  const insertData = {
    merchant_id: merchant.id,
    amount: data.amount,
    currency: data.currency,
    receive_token: receiveToken,
    receive_token_symbol: receiveTokenSymbol,
    receive_chain_id: receiveChainId,
    recipient_address: merchantData?.wallet_address,
    title: data.title,
    description: data.description,
    max_uses: data.max_uses,
    expires_at: data.expires_at,
    use_stealth: useStealth,
    created_via: 'api',
    success_url: data.success_url,
    cancel_url: data.cancel_url,
    api_metadata: data.metadata || {},
  }

  const { data: paymentLink, error: dbError } = await supabase
    .from('payment_links')
    .insert(insertData)
    .select()
    .single()

  if (dbError) {
    console.error('Database error creating payment link:', dbError)
    return NextResponse.json({
      error: 'Failed to create payment link',
    }, { status: 500 })
  }

  // 6. Log API call (optional/async)
  const clientIp = req.headers.get('x-forwarded-for') || 'unknown'
  supabase.from('api_logs').insert({
    merchant_id: merchant.id,
    endpoint: '/api/v1/payment-links',
    method: 'POST',
    status_code: 201,
    request_body: body,
    ip_address: clientIp.split(',')[0],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }).then(({ error }: any) => {
    if (error) console.error('Failed to log API call', error)
  })

  // 7. Return enriched response
  return NextResponse.json({
    id: paymentLink.id,
    url: `${process.env.NEXT_PUBLIC_BASE_URL}/pay/${paymentLink.id}`,
    amount: paymentLink.amount,
    currency: paymentLink.currency,
    status: paymentLink.status,
    title: paymentLink.title,
    description: paymentLink.description,
    receive_token: paymentLink.receive_token,
    receive_chain_id: paymentLink.receive_chain_id,
    receive_token_symbol: paymentLink.receive_token_symbol,
    use_stealth: paymentLink.use_stealth,
    max_uses: paymentLink.max_uses,
    expires_at: paymentLink.expires_at,
    success_url: paymentLink.success_url,
    cancel_url: paymentLink.cancel_url,
    created_at: paymentLink.created_at,
    metadata: paymentLink.api_metadata,
  }, { status: 201 })
}

export async function GET(req: NextRequest) {
    const { merchant, error } = await verifyApiKey(req)

    if (error) {
        return NextResponse.json({ error }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createServerClient() as any

    const { data: links, count, error: dbError } = await supabase
        .from('payment_links')
        .select('*', { count: 'exact' })
        .eq('merchant_id', merchant.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

    if (dbError) {
        return NextResponse.json({ error: 'Failed to fetch payment links' }, { status: 500 })
    }

    return NextResponse.json({
        data: links,
        count: count,
        limit,
        offset,
    })
}
