import { ChainTokenService } from '@/services/chain-token-service'
import type { ChainType } from '@/lib/chain-registry'

/**
 * Normalize stale cached chain keys/types at read time.
 * Fixes entries written before alias/type corrections were deployed.
 */
const KEY_ALIASES: Record<string, string> = {
  sol: 'solana',
  btc: 'bitcoin',
  doge: 'dogecoin',
  '-239': 'ton',
  '728126428': 'tron',
  '1151111081099710': 'solana',
  '23448594291968336': 'starknet',
}

const KEY_TYPES: Record<string, ChainType> = {
  solana: 'solana',
  bitcoin: 'bitcoin',
  dogecoin: 'bitcoin',
  near: 'near',
  tron: 'tron',
  sui: 'sui',
  ton: 'ton',
  starknet: 'starknet',
  aptos: 'aptos',
  bch: 'bitcoin',
  ltc: 'bitcoin',
}

const KEY_NAMES: Record<string, string> = {
  solana: 'Solana',
  bitcoin: 'Bitcoin',
  dogecoin: 'Dogecoin',
  ton: 'TON',
  starknet: 'StarkNet',
  tron: 'Tron',
}

interface GetChainsParams {
  type?: string
  hasUSDC?: boolean
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getChains(supabase: any, params: GetChainsParams = {}) {
  const { type = 'all', hasUSDC = false } = params

  // Build query — fetch all, then filter after normalization
  // (type filter can't be applied at DB level because stale rows have wrong types)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = supabase.from('cached_chains' as any).select('*')

  if (hasUSDC) {
    query = query.eq('has_usdc', true)
  }

  const { data, error } = await query.order('name')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chains = data as any[] | null

  // If cache has data, return it
  if (!error && chains && chains.length > 0) {
    // Map DB rows back to UnifiedChain shape, normalizing stale keys/types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chainMap = new Map<string, any>()

    for (const c of chains) {
      const canonicalKey = KEY_ALIASES[c.key] || c.key
      const correctType = KEY_TYPES[canonicalKey] || c.type
      const correctName =
        c.name === 'Sol' || c.name === 'Btc' || c.name === 'Doge'
          ? KEY_NAMES[canonicalKey] || c.name
          : c.name

      const existing = chainMap.get(canonicalKey)
      if (existing) {
        // Merge: prefer the entry with more provider support
        const existingCount = Object.values(existing.providers || {}).filter(Boolean).length
        const newCount = Object.values(c.providers || {}).filter(Boolean).length
        if (newCount > existingCount) {
          chainMap.set(canonicalKey, {
            key: canonicalKey,
            chainId: correctType !== 'evm' ? null : c.chain_id,
            name: correctName,
            type: correctType,
            symbol: c.symbol,
            logoUrl: existing.logoUrl || c.logo_url,
            providers: { ...existing.providers, ...c.providers },
            providerIds: { ...existing.providerIds, ...c.provider_ids },
          })
        } else {
          // Just merge provider flags into existing
          existing.providers = { ...c.providers, ...existing.providers }
          existing.providerIds = { ...c.provider_ids, ...existing.providerIds }
        }
      } else {
        chainMap.set(canonicalKey, {
          key: canonicalKey,
          chainId: correctType !== 'evm' ? null : c.chain_id,
          name: correctName,
          type: correctType,
          symbol: c.symbol,
          logoUrl: c.logo_url,
          providers: c.providers,
          providerIds: c.provider_ids,
        })
      }
    }

    let mapped = Array.from(chainMap.values())

    if (type !== 'all') {
      mapped = mapped.filter((c) => c.type === type)
    }

    return { chains: mapped, total: mapped.length, cached: true }
  }

  // Fallback: live fetch (first request before cron runs)
  console.log('Cache empty, falling back to live chain fetch...')
  const liveChains = await ChainTokenService.getChains()

  let filtered = type === 'all' ? liveChains : liveChains.filter((c) => c.type === type)

  // For hasUSDC on fallback, just use static map (no token fetching to avoid OOM)
  if (hasUSDC) {
    const { getUSDCAddress } = await import('@/lib/tokens')
    filtered = filtered.filter((chain) => {
      const chainId = chain.chainId || chain.key
      return !!getUSDCAddress(chainId)
    })
  }

  return { chains: filtered, total: filtered.length, cached: false }
}
