import { providers } from './providers'
import { QuoteRequest, QuoteResponse } from '@/types/provider'

const PROVIDER_TIMEOUT_MS = 20000 
const QUOTE_VALIDITY_MS = 60000

// Provider reliability scores
const PROVIDER_RELIABILITY: Record<string, number> = {
  'cctp': 98,           
  'lifi': 95,
  'rango': 90,
  'symbiosis': 88,
  'rubic': 85,
  'near-intents': 80,
}

export interface AggregatedQuoteResponse {
  quotes: QuoteResponse[]
  bestQuote: QuoteResponse | null
  expiresAt: number
  fetchedAt: number
  providerStats: {
    succeeded: string[]
    failed: string[]
    timedOut: string[]
    errors?: Record<string, string>
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

/**
 * Calculate a secondary score for tie-breaking when output amounts are equal.
 * Factors in: total fees (USD), gas cost, speed, and provider reliability.
 * Higher score = better route.
 */
function calculateTieBreakerScore(quote: QuoteResponse): number {
  const totalFeeUSD = parseFloat(quote.fees?.totalFeeUSD || '0')
  const gasCostUSD = parseFloat(quote.estimatedGas || '0')
  const duration = quote.estimatedDuration || 600
  const reliability = PROVIDER_RELIABILITY[quote.provider] || 50

  // Fee score: 0-30 points, lower fees = higher score
  const totalCost = totalFeeUSD + gasCostUSD
  const feeScore = Math.max(0, 30 * (1 - Math.min(totalCost, 30) / 30))

  // Speed score: 0-10 points, faster = higher score
  const speedScore = Math.max(0, 10 * (1 - Math.min(duration, 1800) / 1800))

  // Reliability score: 0-10 points
  const reliabilityScore = (reliability / 100) * 10

  return feeScore + speedScore + reliabilityScore
}

function rankQuotes(quotes: QuoteResponse[]): QuoteResponse[] {
  return quotes.sort((a, b) => {
    const amountA = BigInt(a.toAmount || '0')
    const amountB = BigInt(b.toAmount || '0')

    // Primary: Output amount (higher = better)
    if (amountA !== amountB) {
      return amountA > amountB ? -1 : 1
    }

    // Equal output: use fee-aware tie-breaker score (higher = better)
    return calculateTieBreakerScore(b) - calculateTieBreakerScore(a)
  })
}

export const QuoteAggregator = {
  async getQuotes(request: QuoteRequest): Promise<AggregatedQuoteResponse> {
    const fetchedAt = Date.now()
    const expiresAt = fetchedAt + QUOTE_VALIDITY_MS

    const providerStats = {
      succeeded: [] as string[],
      failed: [] as string[],
      timedOut: [] as string[],
      errors: {} as Record<string, string>,
    }

    console.log('=== QUOTE AGGREGATOR START ===')
    console.log(`Querying ${providers.length} providers:`, providers.map(p => p.name))
    console.log('Request:', JSON.stringify(request, null, 2))

    // Query all providers in parallel with individual timeouts
    const quotePromises = providers.map(async provider => {
      console.log(`[${provider.name}] Starting query...`)
      const startTime = Date.now()
      
      const result = await withTimeout(
        provider.getQuote(request),
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
    const rankedQuotes = rankQuotes(allQuotes)

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
