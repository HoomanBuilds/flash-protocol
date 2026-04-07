import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { verifyApiKey } from '@/lib/api/verify-api-key'
import { z } from 'zod'

const updateMerchantSchema = z.object({
  default_receive_chain: z
    .union([z.string(), z.number(), z.null()])
    .optional(),
  default_receive_token: z.string().nullable().optional(),
  business_name: z.string().max(255).nullable().optional(),
  email: z.string().email().nullable().optional(),
})

export async function GET(req: NextRequest) {
  const { merchant, error } = await verifyApiKey(req)

  if (error) {
    return NextResponse.json({ error }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServerClient() as any

  const { data: merchantData, error: dbError } = await supabase
    .from('merchants')
    .select(
      'wallet_address, business_name, email, default_receive_chain, default_receive_token, stealth_enabled, created_at',
    )
    .eq('id', merchant.id)
    .single()

  if (dbError || !merchantData) {
    return NextResponse.json({ error: 'Merchant not found' }, { status: 404 })
  }

  return NextResponse.json({
    wallet_address: merchantData.wallet_address,
    business_name: merchantData.business_name,
    email: merchantData.email,
    default_receive_chain: merchantData.default_receive_chain,
    default_receive_token: merchantData.default_receive_token,
    stealth_enabled: merchantData.stealth_enabled,
    created_at: merchantData.created_at,
  })
}

export async function PUT(req: NextRequest) {
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

  const validation = updateMerchantSchema.safeParse(body)

  if (!validation.success) {
    return NextResponse.json({
      error: 'Validation error',
      details: validation.error.issues,
    }, { status: 400 })
  }

  const data = validation.data

  // Build update object dynamically — only include provided fields
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateObj: Record<string, any> = {}

  if (data.default_receive_chain !== undefined) updateObj.default_receive_chain = data.default_receive_chain
  if (data.default_receive_token !== undefined) updateObj.default_receive_token = data.default_receive_token
  if (data.business_name !== undefined) updateObj.business_name = data.business_name
  if (data.email !== undefined) updateObj.email = data.email

  if (Object.keys(updateObj).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServerClient() as any

  const { data: updated, error: updateError } = await supabase
    .from('merchants')
    .update(updateObj)
    .eq('id', merchant.id)
    .select(
      'wallet_address, business_name, email, default_receive_chain, default_receive_token, stealth_enabled, created_at',
    )
    .single()

  if (updateError || !updated) {
    console.error('Update merchant error:', updateError)
    return NextResponse.json({ error: 'Failed to update merchant profile' }, { status: 500 })
  }

  return NextResponse.json({
    wallet_address: updated.wallet_address,
    business_name: updated.business_name,
    email: updated.email,
    default_receive_chain: updated.default_receive_chain,
    default_receive_token: updated.default_receive_token,
    stealth_enabled: updated.stealth_enabled,
    created_at: updated.created_at,
  })
}
