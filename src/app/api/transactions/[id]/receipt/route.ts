import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const transactionId = (await params).id
    const supabase = createServerClient()

    try {
        
        const { data: transaction, error } = await supabase
            .from('transactions')
            .select(`
                *,
                payment_links (
                    id,
                    title,
                    description,
                    currency,
                    merchants (
                        id,
                        business_name,
                        email,
                        wallet_address,
                        branding_settings
                    )
                )
            `)
            .eq('id', transactionId)
            .single()

        if (error) {
            console.error('Error fetching receipt data:', error)
            return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
        }

        if (!transaction) {
            return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
        }

        return NextResponse.json(transaction)
    } catch (e) {
        console.error('Internal server error:', e)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
