import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { cctpProvider } from '@/services/providers/cctp'
import type { QuoteRequest } from '@/types/provider'

/**
 * CCTP Phase 5 tests (C1).
 *
 * Grounded in REAL captured Iris fee responses (provider-logs/quote-cctp-*.json):
 *   Eth-USDC -> Arb-USDC, 10 USDC in: toAmount 9999000 (fee 1000 raw = $0.001)
 *   Arb-USDC -> Base-USDC, 10 USDC in: toAmount 9998700 (fee 1300 raw = $0.0013)
 * The fee is DEDUCTED from output (output < input), so it is a BRIDGE fee that is
 * included, NOT an on-top GAS fee. And the Iris fee fetch must fail CLOSED.
 */

const ARB_TO_BASE: QuoteRequest = {
  fromChain: 42161,
  toChain: 8453,
  fromToken: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  toToken: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  fromAmount: '10000000',
  fromAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
  fromTokenDecimals: 6,
}

function feeResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response
}

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('cctp getQuote — C1 (fee label + fail-closed + duration)', () => {
  it('labels the deducted fee as BRIDGE and included (not on-top GAS)', async () => {
    // Real Iris fee: minimumFee in 1/100 bps. 1 -> 0.0001 fraction of 10000000 = 1000 raw.
    fetchMock.mockResolvedValueOnce(feeResponse([{ minimumFee: 1 }]))
    const [quote] = await cctpProvider.getQuote(ARB_TO_BASE)
    expect(quote).toBeDefined()
    const fee = quote.routes[0].estimate.feeCosts?.[0]
    expect(fee?.type).toBe('BRIDGE')
    expect(fee?.included).toBe(true)
    // Output is reduced by the fee (deducted, not on-top).
    expect(Number(quote.toAmount)).toBeLessThan(Number(quote.fromAmount))
  })

  it('uses a realistic CCTP settlement duration (>= 900s), not ~20s', async () => {
    fetchMock.mockResolvedValueOnce(feeResponse([{ minimumFee: 1 }]))
    const [quote] = await cctpProvider.getQuote(ARB_TO_BASE)
    expect(quote.estimatedDuration).toBeGreaterThanOrEqual(900)
  })

  it('fails CLOSED (no quote) when the Iris fee endpoint is down', async () => {
    fetchMock.mockResolvedValueOnce(feeResponse({ error: 'down' }, false, 503))
    const quotes = await cctpProvider.getQuote(ARB_TO_BASE)
    // A fee=0 quote could falsely win ranking — must not be returned.
    expect(quotes).toEqual([])
  })

  it('fails CLOSED (no quote) when the Iris fetch throws', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network'))
    const quotes = await cctpProvider.getQuote(ARB_TO_BASE)
    expect(quotes).toEqual([])
  })

  it('fails CLOSED when Iris returns an empty fee array', async () => {
    fetchMock.mockResolvedValueOnce(feeResponse([]))
    const quotes = await cctpProvider.getQuote(ARB_TO_BASE)
    expect(quotes).toEqual([])
  })
})
