import { serve } from 'inngest/next'
import { inngest } from '@/inngest/client'
import { helloWorld } from '@/inngest/functions'
import { pollTransactionStatus } from '@/inngest/functions/poll-transaction'
import { refreshChainsTokens } from '@/inngest/functions/refresh-chains-tokens'

// Create an API that serves zero functions (for now)
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    helloWorld,
    pollTransactionStatus,
    refreshChainsTokens,
  ],
})
