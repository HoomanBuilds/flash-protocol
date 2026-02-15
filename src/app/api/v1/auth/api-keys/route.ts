import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  // 1. Verify Session (Auth check via httpOnly cookie)
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get('session_id')?.value
  
  if (!sessionToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const supabase = createServerClient() as any
  
  // Get merchant from session
  const { data: session } = await supabase
    .from('sessions')
    .select('wallet_address')
    .eq('id', sessionToken)
    .single()
    
  if (!session) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
  }
  
  // 2. Generate secure API key
  const rawKey = 'pg_live_' + crypto.randomBytes(32).toString('hex')
  const keyHash = await bcrypt.hash(rawKey, 10)
  const prefix = rawKey.substring(0, 16) // "pg_live_..."
  
  // 3. Update merchant record
  const { error } = await supabase
    .from('merchants')
    .update({
      api_key_hash: keyHash,
      api_key_prefix: prefix,
      api_enabled: true,
      api_created_at: new Date().toISOString(),
      api_total_calls: 0
    })
    .eq('wallet_address', session.wallet_address)
    
  if (error) {
    console.error('Database error generating API key:', error)
    return NextResponse.json({ error: 'Failed to generate API key' }, { status: 500 })
  }
  
  // 4. Return raw key (ONLY TIME IT'S VISIBLE)
  return NextResponse.json({
    api_key: rawKey,
    prefix: prefix,
    created_at: new Date().toISOString(),
    warning: 'Save this key securely. You won\'t see it again.'
  }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get('session_id')?.value
  
  if (!sessionToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const supabase = createServerClient() as any
  
  const { data: session } = await supabase
    .from('sessions')
    .select('wallet_address')
    .eq('id', sessionToken)
    .single()
    
  if (!session) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
  }
  
  // Revoke API key
  const { error } = await supabase
    .from('merchants')
    .update({
      api_key_hash: null,
      api_key_prefix: null,
      api_enabled: false
    })
    .eq('wallet_address', session.wallet_address)
    
  if (error) {
    return NextResponse.json({ error: 'Failed to revoke API key' }, { status: 500 })
  }
  
  return NextResponse.json({
    success: true,
    message: 'API key revoked successfully'
  })
}
