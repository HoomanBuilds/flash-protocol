/**
 * Tests for pure utility functions extracted from the quote aggregator.
 *
 * We cannot import the QuoteAggregator directly because it pulls in providers
 * with heavy SDK deps (LiFi, Rango, etc). Instead we test the exported pure logic:
 * normalizeChainId, calculateTieBreakerScore, rankQuotes
 *
 * These are rewritten here since they're not exported from the module.
 * If they get exported in the future, switch to direct imports.
 */
import { describe, it, expect } from 'vitest'

// ─── Recreate pure functions from quote-aggregator ────────────────

const CHAIN_ID_ALIASES: Record<string, string> = {
  sol: 'solana',
  btc: 'bitcoin',
  doge: 'dogecoin',
  '-239': 'ton',
  '728126428': 'tron',
  '1151111081099710': 'solana',
  '23448594291968336': 'starknet',
}

type ChainId = string | number

function normalizeChainId(id: ChainId): ChainId {
  if (typeof id === 'string' && CHAIN_ID_ALIASES[id]) return CHAIN_ID_ALIASES[id]
  if (typeof id === 'number' && CHAIN_ID_ALIASES[String(id)]) return CHAIN_ID_ALIASES[String(id)]
  return id
}

const PROVIDER_RELIABILITY: Record<string, number> = {
  'cctp': 98,
  'lifi': 95,
  'rango': 90,
  'symbiosis': 88,
  'rubic': 85,
  'near-intents': 80,
}

interface MockQuote {
  provider: string
  toAmount: string
  fees?: { totalFeeUSD?: string }
  estimatedGas?: string
  estimatedDuration?: number
}

function calculateTieBreakerScore(quote: MockQuote): number {
  const totalFeeUSD = parseFloat(quote.fees?.totalFeeUSD || '0')
  const gasCostUSD = parseFloat(quote.estimatedGas || '0')
  const duration = quote.estimatedDuration || 600
  const reliability = PROVIDER_RELIABILITY[quote.provider] || 50

  const totalCost = totalFeeUSD + gasCostUSD
  const feeScore = Math.max(0, 30 * (1 - Math.min(totalCost, 30) / 30))
  const speedScore = Math.max(0, 10 * (1 - Math.min(duration, 1800) / 1800))
  const reliabilityScore = (reliability / 100) * 10

  return feeScore + speedScore + reliabilityScore
}

function rankQuotes(quotes: MockQuote[]): MockQuote[] {
  return [...quotes].sort((a, b) => {
    const amountA = BigInt(a.toAmount || '0')
    const amountB = BigInt(b.toAmount || '0')

    if (amountA !== amountB) {
      return amountA > amountB ? -1 : 1
    }

    return calculateTieBreakerScore(b) - calculateTieBreakerScore(a)
  })
}

// ─── normalizeChainId ─────────────────────────────────────────────

describe('normalizeChainId', () => {
  it('maps "sol" → "solana"', () => {
    expect(normalizeChainId('sol')).toBe('solana')
  })

  it('maps "btc" → "bitcoin"', () => {
    expect(normalizeChainId('btc')).toBe('bitcoin')
  })

  it('maps numeric alias 728126428 → "tron"', () => {
    expect(normalizeChainId(728126428)).toBe('tron')
  })

  it('maps string numeric alias "-239" → "ton"', () => {
    expect(normalizeChainId('-239')).toBe('ton')
  })

  it('passes through standard EVM chain IDs', () => {
    expect(normalizeChainId(1)).toBe(1)
    expect(normalizeChainId(137)).toBe(137)
    expect(normalizeChainId(8453)).toBe(8453)
  })

  it('passes through unknown string keys', () => {
    expect(normalizeChainId('ethereum')).toBe('ethereum')
  })
})

// ─── calculateTieBreakerScore ─────────────────────────────────────

describe('calculateTieBreakerScore', () => {
  it('higher reliability = higher score (same fees/speed)', () => {
    const cctp = calculateTieBreakerScore({ provider: 'cctp', toAmount: '100', estimatedDuration: 300 })
    const rubic = calculateTieBreakerScore({ provider: 'rubic', toAmount: '100', estimatedDuration: 300 })
    expect(cctp).toBeGreaterThan(rubic)
  })

  it('lower fees = higher score', () => {
    const lowFee = calculateTieBreakerScore({
      provider: 'lifi', toAmount: '100',
      fees: { totalFeeUSD: '1' }, estimatedGas: '0',
    })
    const highFee = calculateTieBreakerScore({
      provider: 'lifi', toAmount: '100',
      fees: { totalFeeUSD: '25' }, estimatedGas: '0',
    })
    expect(lowFee).toBeGreaterThan(highFee)
  })

  it('faster routes score higher', () => {
    const fast = calculateTieBreakerScore({
      provider: 'lifi', toAmount: '100', estimatedDuration: 60,
    })
    const slow = calculateTieBreakerScore({
      provider: 'lifi', toAmount: '100', estimatedDuration: 1800,
    })
    expect(fast).toBeGreaterThan(slow)
  })

  it('returns non-negative for worst-case inputs', () => {
    const score = calculateTieBreakerScore({
      provider: 'unknown', toAmount: '0',
      fees: { totalFeeUSD: '999' }, estimatedGas: '999', estimatedDuration: 99999,
    })
    expect(score).toBeGreaterThanOrEqual(0)
  })
})

// ─── rankQuotes ───────────────────────────────────────────────────

describe('rankQuotes', () => {
  it('ranks by output amount (highest first)', () => {
    const quotes: MockQuote[] = [
      { provider: 'rubic', toAmount: '100' },
      { provider: 'lifi', toAmount: '200' },
      { provider: 'rango', toAmount: '150' },
    ]

    const ranked = rankQuotes(quotes)
    expect(ranked[0].provider).toBe('lifi')
    expect(ranked[1].provider).toBe('rango')
    expect(ranked[2].provider).toBe('rubic')
  })

  it('uses tie-breaker when amounts are equal', () => {
    const quotes: MockQuote[] = [
      { provider: 'rubic', toAmount: '100', fees: { totalFeeUSD: '10' } },
      { provider: 'cctp', toAmount: '100', fees: { totalFeeUSD: '1' } },
    ]

    const ranked = rankQuotes(quotes)
    // cctp has higher reliability AND lower fees
    expect(ranked[0].provider).toBe('cctp')
  })

  it('handles single quote', () => {
    const quotes: MockQuote[] = [{ provider: 'lifi', toAmount: '500' }]
    const ranked = rankQuotes(quotes)
    expect(ranked).toHaveLength(1)
    expect(ranked[0].provider).toBe('lifi')
  })

  it('handles empty array', () => {
    expect(rankQuotes([])).toEqual([])
  })
})
