/**
 * Multi-source token price service
 * Primary: LiFi API -> Fallback: CoinGecko contract API -> Fallback: CoinGecko symbol API
 */

import { CHAINS } from '@/lib/chains'

// In-memory price cache (30s TTL)
const CACHE_TTL_MS = 30_000

interface CachedPrice {
  priceUSD: number
  source: 'lifi' | 'coingecko-contract' | 'coingecko'
  timestamp: number
}

const priceCache = new Map<string, CachedPrice>()

function getCacheKey(chainId: number | string, tokenAddress: string): string {
  return `${chainId}:${tokenAddress.toLowerCase()}`
}

// CoinGecko coin ID mapping for native/common tokens (free tier, no API key)
const COINGECKO_IDS: Record<string, string> = {
  'ETH': 'ethereum',
  'WETH': 'ethereum',
  'WETH.e': 'ethereum',
  'BNB': 'binancecoin',
  'WBNB': 'binancecoin',
  'POL': 'matic-network',
  'MATIC': 'matic-network',
  'AVAX': 'avalanche-2',
  'WAVAX': 'avalanche-2',
  'FTM': 'fantom',
  'WFTM': 'fantom',
  'SOL': 'solana',
  'BTC': 'bitcoin',
  'WBTC': 'wrapped-bitcoin',
  'BTCB': 'bitcoin',
  'USDC': 'usd-coin',
  'USDC.e': 'usd-coin',
  'USDbC': 'usd-coin',
  'USDT': 'tether',
  'fUSDT': 'tether',
  'DAI': 'dai',
  'TRX': 'tron',
  'NEAR': 'near',
  'ATOM': 'cosmos',
  'OSMO': 'osmosis',
  'CELO': 'celo',
  'GLMR': 'moonbeam',
  'MOVR': 'moonriver',
  'CRO': 'crypto-com-chain',
  'KAVA': 'kava',
  'MNT': 'mantle',
  'BERA': 'berachain-bera',
  'SUI': 'sui',
  'DOGE': 'dogecoin',
  'xDAI': 'xdai',
  'S': 'sonic-3',
  'METIS': 'metis-token',
  'MON': 'monad',
  'LSK': 'lisk',
}

// CoinGecko platform IDs for contract-address-based price lookups
const COINGECKO_PLATFORMS: Record<string | number, string> = {
  1: 'ethereum',
  137: 'polygon-pos',
  42161: 'arbitrum-one',
  10: 'optimistic-ethereum',
  8453: 'base',
  56: 'binance-smart-chain',
  43114: 'avalanche',
  324: 'zksync',
  59144: 'linea',
  534352: 'scroll',
  5000: 'mantle',
  250: 'fantom',
  100: 'xdai',
  42220: 'celo',
  1284: 'moonbeam',
  1285: 'moonriver',
  25: 'cronos',
  2222: 'kava',
  80094: 'berachain',
  146: 'sonic',
  1088: 'metis-andromeda',
  169: 'manta-pacific',
  1135: 'lisk',
  'solana': 'solana',
  'bitcoin': 'bitcoin',
  'tron': 'tron',
  'near': 'near-protocol',
  'sui': 'sui',
  'cosmos': 'cosmos',
  'osmosis': 'osmosis',
}

const NATIVE_ADDRESSES = new Set([
  '0x0000000000000000000000000000000000000000',
  '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
])

// Non-EVM chain key aliases where our key differs from CoinGecko's platform ID
const CHAIN_KEY_TO_CG_PLATFORM: Record<string, string> = {
  'near': 'near-protocol',
  'cosmos': 'cosmos',
  'osmosis': 'osmosis',
}

// Dynamic CoinGecko platform registry
let cgPlatforms: Map<string, { platformId: string; nativeCoinId: string | null }> | null = null
let cgPlatformsLoading: Promise<void> | null = null

async function ensureCoinGeckoPlatforms(): Promise<void> {
  if (cgPlatforms) return
  if (cgPlatformsLoading) {
    await cgPlatformsLoading
    return
  }

  cgPlatformsLoading = (async () => {
    try {
      const res = await fetch('https://api.coingecko.com/api/v3/asset_platforms', {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(10000),
      })
      if (!res.ok) throw new Error(`CoinGecko platforms: ${res.status}`)
      const data: Array<{
        id: string
        chain_identifier: number | null
        native_coin_id: string | null
      }> = await res.json()

      cgPlatforms = new Map()
      for (const p of data) {
        if (!p.id) continue
        const entry = { platformId: p.id, nativeCoinId: p.native_coin_id }
        // Key by numeric chain_identifier (for EVM chains)
        if (p.chain_identifier !== null) {
          cgPlatforms.set(String(p.chain_identifier), entry)
        }
        // Key by platform id string (for non-EVM like 'solana', 'near-protocol', 'tron')
        cgPlatforms.set(p.id, entry)
      }
      console.log(`[TokenPrice] Loaded ${cgPlatforms.size} CoinGecko platform mappings`)
    } catch (error) {
      console.warn('[TokenPrice] CoinGecko platforms fetch failed, using fallback maps:', error)
      // fallback
      cgPlatforms = new Map()
      for (const [key, platformId] of Object.entries(COINGECKO_PLATFORMS)) {
        cgPlatforms.set(String(key), { platformId, nativeCoinId: null })
      }
    }
  })()

  await cgPlatformsLoading
  cgPlatformsLoading = null
}

function lookupPlatform(
  chainId: number | string,
): { platformId: string; nativeCoinId: string | null } | undefined {
  const key = String(chainId)
  // Try direct lookup (numeric chain ID or platform ID string)
  const entry = cgPlatforms?.get(key)
  if (entry) return entry
  // Try alias lookup for non-EVM chains ('near' -> 'near-protocol')
  const alias = CHAIN_KEY_TO_CG_PLATFORM[key]
  if (alias) return cgPlatforms?.get(alias)
  // fallback 
  const fallbackPlatform = COINGECKO_PLATFORMS[chainId]
  if (fallbackPlatform) return cgPlatforms?.get(fallbackPlatform)
  return undefined
}

/**
 * Fetch token price from LiFi API
 */
async function fetchFromLiFi(
  chainId: number | string,
  tokenAddress: string,
): Promise<number | null> {
  const chain = CHAINS.find(c => c.chainId === chainId)
  if (!chain?.providers.lifi) return null

  // Use provider-specific ID if available, otherwise use chainId
  const lifiChainId = chain.providerChainIds?.lifi || chainId

  try {
    const url = `https://li.quest/v1/token?chain=${lifiChainId}&token=${tokenAddress}`
    const res = await fetch(url, {
      headers: { 'accept': 'application/json' },
      signal: AbortSignal.timeout(5000),
    })

    if (!res.ok) return null

    const data = await res.json()
    const price = parseFloat(data.priceUSD)

    if (isNaN(price) || price <= 0) return null
    return price
  } catch (error) {
    console.warn(`[TokenPrice] LiFi fetch failed for ${chainId}:${tokenAddress}:`, error)
    return null
  }
}

/**
 * Fetch token price from CoinGecko by contract address
 * Works for any non-native token on any chain CoinGecko supports
 */
async function fetchFromCoinGeckoByContract(
  chainId: number | string,
  tokenAddress: string,
): Promise<number | null> {
  if (NATIVE_ADDRESSES.has(tokenAddress.toLowerCase())) return null

  await ensureCoinGeckoPlatforms()
  const entry = lookupPlatform(chainId)
  if (!entry) return null
  const platform = entry.platformId

  try {
    const address = tokenAddress.toLowerCase()
    const url = `https://api.coingecko.com/api/v3/simple/token_price/${platform}?contract_addresses=${address}&vs_currencies=usd`
    const res = await fetch(url, {
      headers: { 'accept': 'application/json' },
      signal: AbortSignal.timeout(5000),
    })

    if (!res.ok) return null

    const data = await res.json()
    const price = data[address]?.usd

    if (typeof price !== 'number' || price <= 0) return null
    return price
  } catch (error) {
    console.warn(`[TokenPrice] CoinGecko contract fetch failed for ${chainId}:${tokenAddress}:`, error)
    return null
  }
}

/**
 * Fetch token price from CoinGecko free API (by coin ID)
 * Tries dynamic native_coin_id first, then falls back to hardcoded COINGECKO_IDS
 */
async function fetchFromCoinGecko(
  chainId: number | string,
  symbol: string,
): Promise<number | null> {
  await ensureCoinGeckoPlatforms()
  const entry = lookupPlatform(chainId)
  const coinId =
    entry?.nativeCoinId || COINGECKO_IDS[symbol] || COINGECKO_IDS[symbol.toUpperCase()]
  if (!coinId) return null

  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`
    const res = await fetch(url, {
      headers: { 'accept': 'application/json' },
      signal: AbortSignal.timeout(5000),
    })

    if (!res.ok) return null

    const data = await res.json()
    const price = data[coinId]?.usd

    if (typeof price !== 'number' || price <= 0) return null
    return price
  } catch (error) {
    console.warn(`[TokenPrice] CoinGecko fetch failed for ${symbol}:`, error)
    return null
  }
}

/**
 * Get token price in USD with caching and multi-source fallback
 */
export async function getTokenPrice(
  chainId: number | string,
  tokenAddress: string,
  symbol: string,
): Promise<{ priceUSD: number; source: 'lifi' | 'coingecko-contract' | 'coingecko' }> {
  const cacheKey = getCacheKey(chainId, tokenAddress)

  // Check cache
  const cached = priceCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return { priceUSD: cached.priceUSD, source: cached.source }
  }

  // Primary: LiFi
  const lifiPrice = await fetchFromLiFi(chainId, tokenAddress)
  if (lifiPrice !== null) {
    const entry: CachedPrice = { priceUSD: lifiPrice, source: 'lifi', timestamp: Date.now() }
    priceCache.set(cacheKey, entry)
    return { priceUSD: lifiPrice, source: 'lifi' }
  }

  // Fallback 1: CoinGecko by contract address
  const contractPrice = await fetchFromCoinGeckoByContract(chainId, tokenAddress)
  if (contractPrice !== null) {
    const entry: CachedPrice = {
      priceUSD: contractPrice,
      source: 'coingecko-contract',
      timestamp: Date.now(),
    }
    priceCache.set(cacheKey, entry)
    return { priceUSD: contractPrice, source: 'coingecko-contract' }
  }

  // Fallback 2: CoinGecko by symbol (uses dynamic native_coin_id, then hardcoded COINGECKO_IDS)
  const geckoPrice = await fetchFromCoinGecko(chainId, symbol)
  if (geckoPrice !== null) {
    const entry: CachedPrice = { priceUSD: geckoPrice, source: 'coingecko', timestamp: Date.now() }
    priceCache.set(cacheKey, entry)
    return { priceUSD: geckoPrice, source: 'coingecko' }
  }

  throw new Error(`Price unavailable for ${symbol} on chain ${chainId}`)
}

/**
 * Determine slippage buffer based on token types
 * Cross-chain: 1%, Stablecoin-to-stablecoin: 0.5%
 */
const STABLECOINS = new Set(['USDC', 'USDC.e', 'USDbC', 'USDT', 'fUSDT', 'DAI', 'BUSD'])

export function getSlippageBuffer(fromSymbol: string, toSymbol: string): number {
  if (STABLECOINS.has(fromSymbol) && STABLECOINS.has(toSymbol)) {
    return 0.5
  }
  return 1.0
}

/**
 * Calculate the "from" token amount needed to cover a USD-denominated payment
 * Returns the amount in human-readable form (not wei)
 */
export function calculateFromAmount(
  amountUSD: number,
  tokenPriceUSD: number,
  slippagePct: number,
): string {
  if (tokenPriceUSD <= 0) throw new Error('Invalid token price')

  const rawAmount = amountUSD / tokenPriceUSD
  const withSlippage = rawAmount * (1 + slippagePct / 100)

  // Use enough precision based on the token price magnitude
  if (tokenPriceUSD > 100) {
    return withSlippage.toFixed(8) // BTC, ETH — need more decimal places
  } else if (tokenPriceUSD > 1) {
    return withSlippage.toFixed(6) // Mid-range tokens
  } else if (tokenPriceUSD > 0.01) {
    return withSlippage.toFixed(4) // Low-price tokens
  } else {
    return withSlippage.toFixed(2) // Very low price — large quantities
  }
}

/**
 * Clear all cached prices (useful for testing)
 */
export function clearPriceCache(): void {
  priceCache.clear()
  cgPlatforms = null
}
