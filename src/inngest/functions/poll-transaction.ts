import { inngest } from '@/inngest/client'
import { lifiProvider } from '@/services/providers/lifi'
import { rangoProvider } from '@/services/providers/rango'
import { rubicProvider } from '@/services/providers/rubic'
import { symbiosisProvider } from '@/services/providers/symbiosis'
import { nearIntentsProvider } from '@/services/providers/near-intents'
import { cctpProvider } from '@/services/providers/cctp'
import { IProvider, StatusRequest } from '@/types/provider'
import { createServerClient } from '@/lib/supabase'

// Provider registry for dynamic lookup
const providerRegistry: Record<string, IProvider> = {
  lifi: lifiProvider,
  rango: rangoProvider,
  rubic: rubicProvider,
  symbiosis: symbiosisProvider,
  'near-intents': nearIntentsProvider,
  cctp: cctpProvider,
}

export const pollTransactionStatus = inngest.createFunction(
  { id: 'poll-transaction-status' },
  { event: 'transaction/poll' },
  async ({ event, step }) => {
    const { transactionId, txHash, fromChainId, toChainId, bridge, provider: providerName, requestId, depositAddress, attempt = 1 } = event.data

    // Skip if no txHash yet
    if (!txHash) {
      console.log(`[Poll] Transaction ${transactionId} has no txHash yet, skipping.`)
      return { success: false, reason: 'no_tx_hash' }
    }

    // Stop polling after 2880 attempts (~24 hours at 30s intervals)
    if (attempt > 2880) {
      console.log(`[Poll] Transaction ${transactionId} reached max retries. Marking as failed.`)
      
      const supabase = createServerClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('transactions') as any)
        .update({ 
          status: 'failed',
          updated_at: new Date().toISOString(),
          error_message: 'Polling timeout: max retries reached',
          failure_stage: 'bridge'
        })
        .eq('id', transactionId)

      return { success: false, reason: 'max_retries_reached' }
    }

    // Select the correct provider
    const provider = providerRegistry[providerName] || lifiProvider

    // 1. Check Status from the correct provider
    const statusResult = await step.run('check-provider-status', async () => {
      const request: StatusRequest = {
        txHash,
        fromChainId,
        toChainId,
        bridge,
        requestId, // For Rango
        depositAddress, // For Near Intents
      }
      return provider.getStatus(request)
    })

    // 2. Determine final status
    const finalStatus = statusResult?.status === 'DONE' ? 'completed' 
                      : statusResult?.status === 'FAILED' ? 'failed' 
                      : 'pending'

    // 3. Update Database
    await step.run('update-db', async () => {
      const supabase = createServerClient()
      
      const updateData: any = {
        status: finalStatus,
        updated_at: new Date().toISOString(),
      }

      if (statusResult?.txLink) {
        updateData.dest_tx_hash = statusResult.txLink
      }

      if (finalStatus === 'completed') {
        updateData.completed_at = new Date().toISOString()
      }

      if (finalStatus === 'failed' && statusResult?.subStatus) {
        updateData.error_message = statusResult.subStatus
        updateData.failure_stage = 'bridge'
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('transactions') as any)
        .update(updateData)
        .eq('id', transactionId)
    })

    // 4. If transaction completed, update payment link stats and merchant revenue
    if (finalStatus === 'completed') {
      await step.run('update-stats', async () => {
        const supabase = createServerClient()
        
        // Fetch transaction details to get payment_link_id and amount
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: tx } = await (supabase.from('transactions') as any)
          .select('payment_link_id, to_amount, amount:to_amount') // Select amount
          .eq('id', transactionId)
          .single()

        if (tx?.payment_link_id) {
          // 1. Increment Link Uses
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error: linkError } = await (supabase.rpc as any)('increment_payment_link_uses', { 
            link_id: tx.payment_link_id 
          })
          
          if (linkError) console.error('Failed to increment link uses', linkError)

          // 2. Update Merchant Revenue
          const { data: linkRes } = await supabase
            .from('payment_links')
            .select('merchant_id')
            .eq('id', tx.payment_link_id)
            .single()
            
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const link = linkRes as any

          if (link?.merchant_id && tx.to_amount) {
             // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const { error: revError } = await (supabase.rpc as any)('update_merchant_revenue', {
               merchant_uuid: link.merchant_id,
               amount: tx.to_amount 
             })
             if (revError) console.error('Failed to update revenue', revError)
          }
        }
      })
    }

    // 4. If still pending, schedule another check in 30 seconds
    if (finalStatus === 'pending') {
      await step.sleep('wait-before-retry', '30s')
      await inngest.send({
        name: 'transaction/poll',
        data: { 
          transactionId, 
          txHash, 
          fromChainId, 
          toChainId, 
          bridge, 
          provider: providerName, 
          requestId, 
          depositAddress,
          attempt: attempt + 1
        },
      })
    }

    return { success: true, status: finalStatus, provider: providerName }
  }
)
