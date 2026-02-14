import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { verifyApiKey } from '@/lib/api/verify-api-key'

export async function GET(req: NextRequest) {
    const { merchant, error } = await verifyApiKey(req)
    
    if (error) {
        return NextResponse.json({ error }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')
    const status = searchParams.get('status')
    const paymentLinkId = searchParams.get('payment_link_id')
    
    const supabase = createServerClient() as any
    
    // Build query
    let query = supabase
        .from('transactions')
        .select(`
            *,
            payment_links!inner(merchant_id)
        `, { count: 'exact' })
        .eq('payment_links.merchant_id', merchant.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

    if (status) query = query.eq('status', status)
    if (paymentLinkId) query = query.eq('payment_link_id', paymentLinkId)

    const { data: transactions, count, error: dbError } = await query

    if (dbError) {
        return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
    }

    // Format for API response
    const formatted = transactions?.map((tx: any) => {
        const { payment_links, ...rest } = tx;
        return rest;
    });

    return NextResponse.json({
        data: formatted,
        count: count,
        limit,
        offset
    })
}
