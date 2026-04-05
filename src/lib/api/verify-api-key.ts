import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import bcrypt from 'bcryptjs'

export async function verifyApiKey(req: NextRequest) {
  // Extract API key from header
  const authHeader = req.headers.get('authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'Missing API key', status: 401 }
  }
  
  const apiKey = authHeader.replace('Bearer ', '')
  
  // Validate format
  if (!apiKey.startsWith('pg_live_') && !apiKey.startsWith('pg_test_')) {
    return { error: 'Invalid API key format', status: 401 }
  }
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createServerClient() as any
  
  const prefix = apiKey.substring(0, 16)

  // Get merchants with matching prefix and API enabled
  const { data: merchants } = await supabase
    .from('merchants')
    .select('id, wallet_address, api_key_hash, api_enabled, api_total_calls')
    .eq('api_enabled', true)
    .eq('api_key_prefix', prefix)
    
  if (!merchants || merchants.length === 0) {
    return { error: 'Invalid API key', status: 401 }
  }
  
  // Check if key matches any merchant
  // (Iterating to handle the extremely unlikely edge case of prefix collision)
  for (const merchant of merchants) {
    const isValid = await bcrypt.compare(apiKey, merchant.api_key_hash)
    
    if (isValid) {
      // Update last used timestamp (fire and forget)
      await supabase
        .from('merchants')
        .update({
          api_last_used_at: new Date().toISOString(),
          api_total_calls: (merchant.api_total_calls || 0) + 1
        })
        .eq('id', merchant.id)

      // Log API request (fire and forget)
      // Note: In Next.js middleware/edge, we should be careful with async/await blocking using waitUntil if available,
      // but here we are in a helper function called by route handlers.
      // We will do a fire-and-forget insert.
      const clientIp = req.headers.get('x-forwarded-for') || 'unknown'
      supabase.from('api_logs').insert({
        merchant_id: merchant.id,
        endpoint: req.nextUrl.pathname,
        method: req.method,
        status_code: 200, // Assumed success if we get here
        ip_address: clientIp.split(',')[0].trim(),
        user_agent: req.headers.get('user-agent') || 'unknown'
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }).then(({ error }: any) => {
        if (error) console.error('Failed to log API request:', error)
      })
      
      return { merchant, error: null }
    }
  }
  
  return { error: 'Invalid API key', status: 401 }
}
