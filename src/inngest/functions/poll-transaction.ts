import { inngest } from '@/inngest/client'
import { lifiProvider } from '@/services/providers/lifi'
import { rangoProvider } from '@/services/providers/rango'
import { rubicProvider } from '@/services/providers/rubic'
import { symbiosisProvider } from '@/services/providers/symbiosis'
import { nearIntentsProvider } from '@/services/providers/near-intents'
import { IProvider, StatusRequest } from '@/types/provider'
import { createServerClient } from '@/lib/supabase'

// Provider registry for dynamic lookup
const providerRegistry: Record<string, IProvider> = {
  lifi: lifiProvider,
  rango: rangoProvider,
  rubic: rubicProvider,
  symbiosis: symbiosisProvider,
  'near-intents': nearIntentsProvider,
}

export const pollTransactionStatus = inngest.createFunction(
  { id: 'poll-transaction-status' },
  { event: 'transaction/poll' },
  async ({ event, step }) => {
    const { transactionId, txHash, fromChainId, toChainId, bridge, provider: providerName, requestId } = event.data

    // Skip if no txHash yet
    if (!txHash) {
      console.log(`[Poll] Transaction ${transactionId} has no txHash yet, skipping.`)
      return { success: false, reason: 'no_tx_hash' }
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
      await (supabase.from('transactions') as any)
        .update({ 
          status: finalStatus,
          tx_hash: txHash,
          updated_at: new Date().toISOString(),
        })
        .eq('id', transactionId)
    })

    // 4. If still pending, schedule another check in 30 seconds
    if (finalStatus === 'pending') {
      await step.sleep('wait-before-retry', '30s')
      await inngest.send({
        name: 'transaction/poll',
        data: { transactionId, txHash, fromChainId, toChainId, bridge, provider: providerName, requestId },
      })
    }

    return { success: true, status: finalStatus, provider: providerName }
  }
)
