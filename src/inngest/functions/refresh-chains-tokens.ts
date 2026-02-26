import { inngest } from '@/inngest/client'
import { ChainTokenService } from '@/services/chain-token-service'
import { createServerClient } from '@/lib/supabase'

const BATCH_SIZE = 10

/**
 * Inngest cron job: Refresh cached_chains + cached_tokens in Supabase
 * Runs every 15 minutes. Processes chains in batches to avoid OOM.
 */
export const refreshChainsTokens = inngest.createFunction(
  {
    id: 'refresh-chains-tokens',
    retries: 2,
  },
  { cron: '*/15 * * * *' },
  async ({ step, logger }) => {
    // Step 1: Fetch all chains
    const chains = await step.run('fetch-chains', async () => {
      const chains = await ChainTokenService.getChains()
      logger.info(`Fetched ${chains.length} chains from providers`)
      return chains
    })

    // Step 2: Process chains in batches (fetch tokens + upsert to Supabase)
    const batches = []
    for (let i = 0; i < chains.length; i += BATCH_SIZE) {
      batches.push(chains.slice(i, i + BATCH_SIZE))
    }

    let totalTokens = 0
    let chainsWithUSDC = 0

    for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
      const batch = batches[batchIdx]

      const result = await step.run(`process-batch-${batchIdx}`, async () => {
        const supabase = createServerClient()
        let batchTokenCount = 0
        let batchUsdcCount = 0

        for (const chain of batch) {
          try {
            // Fetch tokens for this chain
            const tokens = await ChainTokenService.getTokens(chain.key)
            const hasUSDC = tokens.some(t => t.symbol?.toUpperCase() === 'USDC')

            if (hasUSDC) batchUsdcCount++

            // Upsert chain
            await (supabase.from as any)('cached_chains').upsert({
              key: chain.key,
              chain_id: chain.chainId,
              name: chain.name,
              type: chain.type,
              symbol: chain.symbol,
              logo_url: chain.logoUrl || null,
              has_usdc: hasUSDC,
              providers: chain.providers,
              provider_ids: chain.providerIds,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'key' })

            // Upsert tokens (batch insert)
            if (tokens.length > 0) {
              const tokenRows = tokens.map(t => ({
                id: `${chain.key}:${t.address}`,
                chain_key: chain.key,
                address: t.address,
                symbol: t.symbol,
                name: t.name,
                decimals: t.decimals,
                logo_url: t.logoUrl || null,
                is_native: t.isNative || false,
                provider_ids: t.providerIds || null,
                updated_at: new Date().toISOString(),
              }))

              // Supabase has a row limit per insert — chunk to 500
              for (let j = 0; j < tokenRows.length; j += 500) {
                await (supabase.from as any)('cached_tokens').upsert(
                  tokenRows.slice(j, j + 500),
                  { onConflict: 'id' }
                )
              }
              batchTokenCount += tokens.length
            }
          } catch (err) {
            logger.warn(`Failed to process chain ${chain.key}: ${err}`)
          }
        }

        return { tokens: batchTokenCount, usdc: batchUsdcCount }
      })

      totalTokens += result.tokens
      chainsWithUSDC += result.usdc
    }

    // Step 3: Clean up stale data (chains not updated in last 30 min)
    await step.run('cleanup-stale', async () => {
      const supabase = createServerClient()
      const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString()

      // Delete tokens for stale chains first
      await (supabase.from as any)('cached_tokens')
        .delete()
        .lt('updated_at', cutoff)

      // Then delete stale chains
      await (supabase.from as any)('cached_chains')
        .delete()
        .lt('updated_at', cutoff)

      logger.info('Cleaned up stale cache entries')
    })

    logger.info(
      `Cache refresh complete: ${chains.length} chains, ${totalTokens} tokens, ${chainsWithUSDC} chains with USDC`
    )

    return {
      chains: chains.length,
      tokens: totalTokens,
      chainsWithUSDC,
    }
  }
)
