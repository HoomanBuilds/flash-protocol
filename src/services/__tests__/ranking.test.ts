import { describe, it, expect } from 'vitest'
import { rankQuotes, netOutput, consensusDecimals } from '../ranking'
import type { QuoteResponse } from '@/types/provider'

/**
 * Minimal quote builder. Decimals are declared via top-level `toTokenDecimals`
 * (preferred) falling back to routes[0].action.toToken.decimals.
 */
function q(over: Partial<QuoteResponse> & { provider: string; toAmount: string }): QuoteResponse {
  return {
    id: over.provider + '-' + over.toAmount,
    fromAmount: '0',
    toAmountMin: over.toAmount,
    estimatedGas: '0',
    estimatedDuration: 60,
    routes: [],
    ...over,
  } as QuoteResponse
}

describe('consensusDecimals', () => {
  it('returns the most common declared decimals across quotes', () => {
    const quotes = [
      q({ provider: 'a', toAmount: '1', toTokenDecimals: 6 }),
      q({ provider: 'b', toAmount: '1', toTokenDecimals: 6 }),
      q({ provider: 'c', toAmount: '1', toTokenDecimals: 18 }),
    ]
    expect(consensusDecimals(quotes)).toBe(6)
  })
})

describe('netOutput', () => {
  it('normalizes toAmount by the destination decimals', () => {
    // 10_000_000 at 6 decimals = 10.0 human units
    expect(netOutput(q({ provider: 'a', toAmount: '10000000', toTokenDecimals: 6 }), 6)).toBeCloseTo(10, 6)
  })

  it('converts on-top USD fee to destination-token units when toTokenPriceUSD is known', () => {
    // Dest token worth $2000 (e.g. WETH). 1.0 token out, $20 on-top fee = 0.01 token.
    const quote = q({
      provider: 'a',
      toAmount: '1000000000000000000', // 1.0 at 18 dec
      toTokenDecimals: 18,
      toTokenPriceUSD: 2000,
      routes: [
        {
          type: 'swap', tool: 't',
          action: {
            fromToken: { address: '0x', chainId: 1, symbol: 'X', decimals: 18 },
            toToken: { address: '0x', chainId: 1, symbol: 'WETH', decimals: 18 },
            fromAmount: '0', toAmount: '1000000000000000000',
          },
          estimate: { feeCosts: [{ type: 'GAS', name: 'gas', amount: '0', amountUSD: '20', included: false }] },
        },
      ],
    })
    // 1.0 WETH - ($20 / $2000) = 1.0 - 0.01 = 0.99 (NOT 1.0 - 20 = -19)
    expect(netOutput(quote, 18)).toBeCloseTo(0.99, 6)
  })

  it('subtracts on-top (included:false) fee costs in USD', () => {
    const quote = q({
      provider: 'a',
      toAmount: '10000000',
      toTokenDecimals: 6,
      routes: [
        {
          type: 'swap',
          tool: 't',
          action: {
            fromToken: { address: '0x', chainId: 1, symbol: 'X', decimals: 6 },
            toToken: { address: '0x', chainId: 1, symbol: 'USDC', decimals: 6 },
            fromAmount: '10000000',
            toAmount: '10000000',
          },
          estimate: {
            feeCosts: [
              { type: 'PROTOCOL', name: 'on-top', amount: '0', amountUSD: '0.50', included: false },
              { type: 'BRIDGE', name: 'deducted', amount: '0', amountUSD: '0.20', included: true },
            ],
          },
        },
      ],
    })
    // 10.0 - 0.50 (only the included:false fee) = 9.5
    expect(netOutput(quote, 6)).toBeCloseTo(9.5, 6)
  })
})

describe('rankQuotes', () => {
  it('A1 (catastrophic): a quote that MISLABELS decimals as 18 with a huge raw toAmount cannot beat a correct 6-decimal quote', () => {
    const good = q({ provider: 'lifi', toAmount: '10000000', toTokenDecimals: 6 }) // 10.0 USDC
    const bad = q({ provider: 'evil', toAmount: '9000000000000000000', toTokenDecimals: 18 }) // declares 18 → 9.0
    const ranked = rankQuotes([bad, good])
    // Old BigInt(toAmount) logic ranked `bad` first (9e18 > 1e7). Correct logic: good wins (10.0 > 9.0).
    expect(ranked[0].provider).toBe('lifi')
  })

  it('A1 (guard): a quote whose decimals disagree with the consensus is ranked below all trusted quotes', () => {
    const trustedA = q({ provider: 'lifi', toAmount: '9986386', toTokenDecimals: 6 }) // 9.986
    const trustedB = q({ provider: 'near-intents', toAmount: '9952218', toTokenDecimals: 6 }) // 9.952
    const mislabeled = q({ provider: 'symbiosis', toAmount: '10010197', toTokenDecimals: 18 }) // claims 18 (really 6); untrusted
    const ranked = rankQuotes([mislabeled, trustedA, trustedB])
    // Symbiosis declares decimals that disagree with consensus(6) → untrusted → must NOT be best.
    expect(ranked[0].provider).not.toBe('symbiosis')
    expect(ranked[ranked.length - 1].provider).toBe('symbiosis')
  })

  it('A1 (majority-mislabel): when MOST providers mislabel decimals, the authoritative refDecimals still wins', () => {
    // Real dest token is 6-dec USDC. Two providers mislabel as 18, one correct at 6.
    // Majority-vote consensus would pick 18 and demote the correct quote — the bug.
    const correct = q({ provider: 'lifi', toAmount: '10000000', toTokenDecimals: 6 }) // 10.0 USDC
    const wrong1 = q({ provider: 'symbiosis', toAmount: '9000000000000000000', toTokenDecimals: 18 }) // claims 18 → 9.0
    const wrong2 = q({ provider: 'rubic', toAmount: '9500000000000000000', toTokenDecimals: 18 }) // claims 18 → 9.5
    // refDecimals=6 is the authoritative destination-token decimals from the request.
    const ranked = rankQuotes([wrong1, wrong2, correct], 6)
    expect(ranked[0].provider).toBe('lifi') // correct 6-dec quote wins despite being the minority
  })

  it('refDecimals: quotes matching the authoritative decimals are trusted; mismatches demoted', () => {
    const good = q({ provider: 'lifi', toAmount: '10000000', toTokenDecimals: 6 })
    const bad = q({ provider: 'symbiosis', toAmount: '99999999999999999999', toTokenDecimals: 18 })
    const ranked = rankQuotes([bad, good], 6)
    expect(ranked[0].provider).toBe('lifi')
    expect(ranked[ranked.length - 1].provider).toBe('symbiosis')
  })

  it('A2 (fees): a lower-gross quote with no on-top fee beats a higher-gross quote with a large on-top fee', () => {
    const grossHighFee = q({
      provider: 'rubic',
      toAmount: '10000000', // 10.0 gross
      toTokenDecimals: 6,
      routes: [
        {
          type: 'swap', tool: 't',
          action: {
            fromToken: { address: '0x', chainId: 1, symbol: 'X', decimals: 6 },
            toToken: { address: '0x', chainId: 1, symbol: 'USDC', decimals: 6 },
            fromAmount: '0', toAmount: '10000000',
          },
          estimate: { feeCosts: [{ type: 'PROTOCOL', name: 'fee', amount: '0', amountUSD: '0.65', included: false }] },
        },
      ],
    }) // net 9.35
    const lowerNoFee = q({ provider: 'lifi', toAmount: '9900000', toTokenDecimals: 6 }) // net 9.9
    const ranked = rankQuotes([grossHighFee, lowerNoFee])
    expect(ranked[0].provider).toBe('lifi')
  })

  it('no regression: same decimals, no fees → higher output wins', () => {
    const ranked = rankQuotes([
      q({ provider: 'a', toAmount: '9000000', toTokenDecimals: 6 }),
      q({ provider: 'b', toAmount: '9500000', toTokenDecimals: 6 }),
    ])
    expect(ranked[0].provider).toBe('b')
  })

  it('A3 (tie-break reachable): near-equal net outputs are broken by reliability', () => {
    // Same net output, different reliability (lifi 95 > rubic 85)
    const r = q({ provider: 'rubic', toAmount: '10000000', toTokenDecimals: 6, estimatedDuration: 60 })
    const l = q({ provider: 'lifi', toAmount: '10000000', toTokenDecimals: 6, estimatedDuration: 60 })
    const ranked = rankQuotes([r, l])
    expect(ranked[0].provider).toBe('lifi')
  })
})
