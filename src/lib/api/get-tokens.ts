import { ChainTokenService } from '@/services/chain-token-service'
import { TOKENS } from '@/lib/tokens'
import { isSpamToken, buildCanonicalAddresses } from '@/lib/token-filter'

/** Shape of a row in the cached_tokens Supabase table */
interface CachedTokenRow {
  address: string
  symbol: string
  name: string
  decimals: number
  logo_url: string | null
  is_native: boolean
  chain_key: string
  provider_ids: Record<string, unknown> | null
}

/** Mapped token shape used for sorting and response */
interface MappedToken {
  address: string
  symbol: string
  name: string
  decimals: number
  logoUrl?: string
  isNative: boolean
  chainKey: string
  providerIds: Record<string, unknown> | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any

export async function getTokens(supabase: SupabaseClient, chainKey: string) {
  // Read from cache — cached_tokens is not in generated DB types, cast the table name
  const { data, error } = await supabase
    .from('cached_tokens' as 'merchants')
    .select('*')
    .eq('chain_key' as 'id', chainKey)

  const tokens = data as unknown as CachedTokenRow[] | null

  // If cache has data, return it
  if (!error && tokens && tokens.length > 0) {
    const STABLECOIN_SYMBOLS = new Set(['USDC', 'USDT', 'DAI', 'USDC.e', 'USDbC'])

    // Build canonical address set from static TOKENS map
    const canonicalAddresses = new Set<string>()
    const numKey = Number(chainKey)
    // TOKENS uses numeric keys for EVM chains and string keys for non-EVM
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const staticTokens = (!isNaN(numKey) ? (TOKENS as any)[numKey] : null) || (TOKENS as any)[chainKey]
    if (staticTokens) {
      for (const t of staticTokens) {
        canonicalAddresses.add(t.address.toLowerCase())
      }
    }

    const rawMapped: MappedToken[] = tokens.map((t) => ({
      address: t.address,
      symbol: t.symbol,
      name: t.name,
      decimals: t.decimals,
      logoUrl: t.logo_url || undefined,
      isNative: t.is_native,
      chainKey: t.chain_key,
      providerIds: t.provider_ids,
    }))

    // Filter spam from cached data (catches pre-existing unfiltered tokens)
    const spamCanonical = buildCanonicalAddresses(chainKey)
    const mapped = rawMapped.filter((t) => {
      const count =
        t.providerIds && typeof (t.providerIds as Record<string, unknown>)._count === 'number'
          ? ((t.providerIds as Record<string, unknown>)._count as number)
          : 1
      return !isSpamToken(t, count, spamCanonical)
    })

    // Inject canonical tokens that are missing from cache
    if (staticTokens) {
      const cachedAddresses = new Set(mapped.map((t) => t.address.toLowerCase()))
      for (const st of staticTokens) {
        if (!cachedAddresses.has(st.address.toLowerCase())) {
          mapped.push({
            address: st.address,
            symbol: st.symbol,
            name: st.name,
            decimals: st.decimals,
            logoUrl: st.logoUrl,
            isNative: st.isNative || false,
            chainKey,
            providerIds: null,
          })
        }
      }
    }

    // Provider count: stored as _count in providerIds by mergeTokens(), or count object keys
    const getProviderCount = (t: MappedToken) => {
      if (!t.providerIds || typeof t.providerIds !== 'object') return 0
      if (typeof t.providerIds._count === 'number') return t.providerIds._count
      return Object.keys(t.providerIds).filter((k) => k !== '_count').length
    }

    // Sort: native first, then canonical stablecoins, then multi-provider stablecoins,
    // then alphabetically
    mapped.sort((a, b) => {
      if (a.isNative && !b.isNative) return -1
      if (!a.isNative && b.isNative) return 1
      const aStable = STABLECOIN_SYMBOLS.has(a.symbol)
      const bStable = STABLECOIN_SYMBOLS.has(b.symbol)
      if (aStable && !bStable) return -1
      if (!aStable && bStable) return 1
      // Among stablecoins with the same symbol: canonical > provider count > alphabetical
      if (aStable && bStable && a.symbol === b.symbol) {
        const aCanonical = canonicalAddresses.has(a.address.toLowerCase())
        const bCanonical = canonicalAddresses.has(b.address.toLowerCase())
        if (aCanonical && !bCanonical) return -1
        if (!aCanonical && bCanonical) return 1
        const aCount = getProviderCount(a)
        const bCount = getProviderCount(b)
        if (aCount !== bCount) return bCount - aCount
      }
      return a.symbol.localeCompare(b.symbol)
    })

    return { tokens: mapped, chainKey, total: mapped.length, cached: true }
  }

  // Fallback: live fetch
  console.log(`Token cache empty for ${chainKey}, falling back to live fetch...`)
  const liveTokens = await ChainTokenService.getTokens(chainKey)

  return { tokens: liveTokens, chainKey, total: liveTokens.length, cached: false }
}
