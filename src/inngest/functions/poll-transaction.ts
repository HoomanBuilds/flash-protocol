import { inngest } from '@/inngest/client'
import { LifiService } from '@/services/lifi'
import { createServerClient } from '@/lib/supabase'

export const pollTransactionStatus = inngest.createFunction(
  { id: 'poll-transaction-status' },
  { event: 'transaction/poll' },
  async ({ event, step }) => {
    const { transactionId, txHash, fromChainId, toChainId, bridge } = event.data

    // 1. Check Status from LI.FI
    const statusResult = await step.run('check-lifi-status', async () => {
      const result = await LifiService.getTransactionStatus({
        txHash,
        fromChain: fromChainId,
        toChain: toChainId,
        bridge,
      })
      return result
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
          tx_hash: statusResult?.sending?.txHash || txHash,
          updated_at: new Date().toISOString(),
        })
        .eq('id', transactionId)
    })

    // 4. If still pending, schedule another check in 30 seconds
    if (finalStatus === 'pending') {
      await step.sleep('wait-before-retry', '30s')
      await inngest.send({
        name: 'transaction/poll',
        data: { transactionId, txHash, fromChainId, toChainId, bridge },
      })
    }

    return { success: true, status: finalStatus }
  }
)
