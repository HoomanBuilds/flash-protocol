/**
 * Multi-source token price service
 * Primary: LiFi API -> Fallback: CoinGecko free API
 */

// In-memory price cache (30s TTL)
const CACHE_TTL_MS = 30_000

interface CachedPrice {
  priceUSD: number
  source: 'lifi' | 'coingecko'
  timestamp: number
}

const priceCache = new Map<string, CachedPrice>()

function getCacheKey(chainId: number, tokenAddress: string): string {
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
}

// LiFi chain ID mapping
const LIFI_CHAIN_IDS: Record<number, number> = {
  1: 1, 10: 10, 56: 56, 137: 137, 250: 250,
  324: 324, 8453: 8453, 42161: 42161, 43114: 43114,
  59144: 59144, 534352: 534352,
}

/**
 * Fetch token price from LiFi API
 */
async function fetchFromLiFi(chainId: number, tokenAddress: string): Promise<number | null> {
  const lifiChainId = LIFI_CHAIN_IDS[chainId]
  if (!lifiChainId) return null

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
 * Fetch token price from CoinGecko free API (by coin ID)
 */
async function fetchFromCoinGecko(symbol: string): Promise<number | null> {
  const coinId = COINGECKO_IDS[symbol.toUpperCase()]
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
  chainId: number,
  tokenAddress: string,
  symbol: string
): Promise<{ priceUSD: number; source: 'lifi' | 'coingecko' }> {
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

  // Fallback: CoinGecko
  const geckoPrice = await fetchFromCoinGecko(symbol)
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
  slippagePct: number
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
}
