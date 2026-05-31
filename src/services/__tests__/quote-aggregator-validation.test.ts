import { describe, it, expect } from 'vitest'
import { QuoteAggregator } from '@/services/quote-aggregator'

/**
 * These exercise the central request validation that runs BEFORE provider
 * fan-out, so they make no network calls — an unsupported chain or a bad
 * address returns early.
 */
describe('QuoteAggregator.getQuotes — request validation (no fan-out)', () => {
  it('returns unsupported with a reason for an exotic source chain', async () => {
    const result = await QuoteAggregator.getQuotes({
      fromChain: 'stellar',
      toChain: 8453,
      fromToken: 'native',
      toToken: '0xUSDC',
      fromAmount: '10',
      fromAddress: '',
    })

    expect(result.unsupported).toBe(true)
    expect(result.reason).toMatch(/not supported/i)
    expect(result.quotes).toEqual([])
    expect(result.bestQuote).toBeNull()
    expect(result.providerStats.succeeded).toEqual([])
    expect(result.providerStats.failed).toEqual([])
  })

  it('returns unsupported for an exotic destination chain', async () => {
    const result = await QuoteAggregator.getQuotes({
      fromChain: 1,
      toChain: 'xrp',
      fromToken: '0xToken',
      toToken: 'native',
      fromAmount: '10',
      fromAddress: '',
    })

    expect(result.unsupported).toBe(true)
    expect(result.reason).toMatch(/not supported/i)
    expect(result.quotes).toEqual([])
  })

  it('returns an address-mismatch reason (not unsupported) for a bad fromAddress', async () => {
    const result = await QuoteAggregator.getQuotes({
      fromChain: 1,
      toChain: 1,
      fromToken: '0xToken',
      toToken: '0xOther',
      fromAmount: '1000000',
      fromAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    })

    expect(result.unsupported).toBeFalsy()
    expect(result.reason).toMatch(/source address/i)
    expect(result.quotes).toEqual([])
    expect(result.bestQuote).toBeNull()
  })
})
