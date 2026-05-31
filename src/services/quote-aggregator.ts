import { providers } from './providers'
import { QuoteRequest, QuoteResponse, ChainId } from '@/types/provider'
import { rankQuotes } from './ranking'
import { validateQuoteRequest } from '@/lib/chain-address'
import { ChainTokenService } from './chain-token-service'

const PROVIDER_TIMEOUT_MS = 30000
const QUOTE_VALIDITY_MS = 60000

/**
 * Normalize chain identifiers before they reach providers.
 * Maps common aliases (e.g. 'sol' → 'solana') so providers
 * don't silently fail on non-canonical keys.
 */
const CHAIN_ID_ALIASES: Record<string, string> = {
  sol: 'solana',
  btc: 'bitcoin',
  doge: 'dogecoin',
  '-239': 'ton',
  '728126428': 'tron',
  '1151111081099710': 'solana',
  '23448594291968336': 'starknet',
}

function normalizeChainId(id: ChainId): ChainId {
  if (typeof id === 'string' && CHAIN_ID_ALIASES[id]) return CHAIN_ID_ALIASES[id]
  if (typeof id === 'number' && CHAIN_ID_ALIASES[String(id)]) return CHAIN_ID_ALIASES[String(id)]
  return id
}

export interface AggregatedQuoteResponse {
  quotes: QuoteResponse[]
  bestQuote: QuoteResponse | null
  expiresAt: number
  fetchedAt: number
  /** True when the request was rejected before fan-out (e.g. unsupported chain). */
  unsupported?: boolean
  /** Human-readable reason when the request can't be quoted (unsupported chain
   *  or an address that doesn't match the chain's address space). */
  reason?: string
  providerStats: {
    succeeded: string[]
    failed: string[]
    timedOut: string[]
    errors?: Record<string, string>
  }
}

/**
 * Best-effort resolve the source token's decimals when the caller omitted them.
 * Rubic falls back to 18 (rubic.ts) which over/under-scales the input amount by
 * 10^(realDecimals-18) → wildly wrong quotes. Resolving from the cached token
 * list (ChainTokenService, 5-min cache) avoids that footgun. Returns undefined
 * if it can't resolve, leaving providers on their own fallback.
 */
async function resolveFromTokenDecimals(
  fromChain: ChainId,
  fromToken: string
): Promise<number | undefined> {
  try {
    const tokens = await ChainTokenService.getTokens(String(fromChain))
    const target = fromToken.toLowerCase()
    const match = tokens.find((t) => t.address.toLowerCase() === target)
    return match?.decimals
  } catch (e) {
    console.warn('[QuoteAggregator] Could not resolve fromTokenDecimals:', String(e))
    return undefined
  }
}

// Wrap provider call with timeout
async function withTimeout<T>(
  promise: Promise<T>, 
  timeoutMs: number,
  providerName: string
): Promise<{ result: T | null; timedOut: boolean; error?: string }> {
  let timeoutId: NodeJS.Timeout

  const timeoutPromise = new Promise<{ result: null; timedOut: true }>((resolve) => {
    timeoutId = setTimeout(() => {
      resolve({ result: null, timedOut: true })
    }, timeoutMs)
  })

  try {
    const result = await Promise.race([
      promise.then(r => ({ result: r, timedOut: false as const })),
      timeoutPromise
    ])
    clearTimeout(timeoutId!)
    return result
  } catch (error) {
    clearTimeout(timeoutId!)
    return { result: null, timedOut: false, error: String(error) }
  }
}

export const QuoteAggregator = {
  async getQuotes(request: QuoteRequest): Promise<AggregatedQuoteResponse> {
    const fetchedAt = Date.now()
    const expiresAt = fetchedAt + QUOTE_VALIDITY_MS

    // Normalize chain keys so providers don't choke on aliases like 'sol'
    const normalizedRequest: QuoteRequest = {
      ...request,
      fromChain: normalizeChainId(request.fromChain),
      toChain: normalizeChainId(request.toChain),
    }

    const providerStats = {
      succeeded: [] as string[],
      failed: [] as string[],
      timedOut: [] as string[],
      errors: {} as Record<string, string>,
    }

    // Central request validation BEFORE fan-out: reject unsupported chains
    // (A5 — 'other' family has no executable signing path) and addresses that
    // don't match the chain's address space (A4). Returning early surfaces an
    // honest reason instead of silently fanning out → "no routes".
    const validation = validateQuoteRequest(normalizedRequest)
    if (!validation.ok) {
      console.warn(`[QuoteAggregator] Request rejected: ${validation.reason}`)
      return {
        quotes: [],
        bestQuote: null,
        unsupported: !!validation.unsupported,
        reason: validation.reason,
        expiresAt,
        fetchedAt,
        providerStats,
      }
    }

    // U3: ensure fromTokenDecimals so Rubic (rubic.ts: || 18) can't mis-scale
    // the input amount. Best-effort, cached; leaves it undefined if unresolved.
    if (normalizedRequest.fromTokenDecimals === undefined) {
      const resolved = await resolveFromTokenDecimals(
        normalizedRequest.fromChain,
        normalizedRequest.fromToken
      )
      if (resolved !== undefined) {
        normalizedRequest.fromTokenDecimals = resolved
        console.log(`[QuoteAggregator] Resolved fromTokenDecimals=${resolved}`)
      } else {
        console.warn(
          '[QuoteAggregator] fromTokenDecimals missing and unresolved; providers will use their fallback'
        )
      }
    }

    console.log('=== QUOTE AGGREGATOR START ===')
    console.log(`Querying ${providers.length} providers:`, providers.map(p => p.name))
    console.log('Request:', JSON.stringify(normalizedRequest, null, 2))

    // Query all providers in parallel with individual timeouts
    const quotePromises = providers.map(async provider => {
      console.log(`[${provider.name}] Starting query...`)
      const startTime = Date.now()

      const result = await withTimeout(
        provider.getQuote(normalizedRequest),
        PROVIDER_TIMEOUT_MS,
        provider.name
      )

      const elapsed = Date.now() - startTime

      if (result.timedOut) {
        providerStats.timedOut.push(provider.name)
        console.warn(`[${provider.name}] ⏱️ TIMED OUT after ${elapsed}ms`)
        return []
      }

      if (result.error || !result.result) {
        providerStats.failed.push(provider.name)
        if (result.error) {
           providerStats.errors[provider.name] = result.error
        }
        console.error(`[${provider.name}] ❌ FAILED after ${elapsed}ms:`, result.error)
        return []
      }

      if (result.result.length > 0) {
        providerStats.succeeded.push(provider.name)
        console.log(`[${provider.name}] ✅ SUCCESS after ${elapsed}ms - ${result.result.length} quote(s)`)
      } else {
        providerStats.failed.push(provider.name) // No routes found
        console.log(`[${provider.name}] ⚠️ NO ROUTES after ${elapsed}ms`)
      }

      return result.result
    })

    const results = await Promise.all(quotePromises)
    const allQuotes = results.flat()

    console.log('=== QUOTE AGGREGATOR SUMMARY ===')
    console.log('Succeeded:', providerStats.succeeded)
    console.log('Failed/No Routes:', providerStats.failed)
    console.log('Timed Out:', providerStats.timedOut)
    console.log('Total Quotes:', allQuotes.length)

    // Rank quotes with tie-breakers
    // Pass the authoritative destination-token decimals so a provider that
    // mislabels them (e.g. reports 6-dec USDC as 18) can't win the ranking,
    // even if it's the majority. Falls back to consensus when not supplied.
    const rankedQuotes = rankQuotes(allQuotes, request.toTokenDecimals)

    return {
      quotes: rankedQuotes,
      bestQuote: rankedQuotes[0] || null,
      expiresAt,
      fetchedAt,
      providerStats,
    }
  },

  // Check if quotes are still valid
  isExpired(expiresAt: number): boolean {
    return Date.now() > expiresAt
  },

  // Get time remaining in seconds
  getTimeRemaining(expiresAt: number): number {
    return Math.max(0, Math.floor((expiresAt - Date.now()) / 1000))
  }
}
