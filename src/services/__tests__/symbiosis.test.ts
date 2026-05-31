import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { symbiosisProvider, computeSymbiosisFeeUSD } from '@/services/providers/symbiosis'
import { ChainTokenService } from '@/services/chain-token-service'

/**
 * Symbiosis Phase 5 tests (S2 / decimals / S3).
 *
 * Grounded in a REAL /v1/swap response (Arb-USDC -> Base-USDC, 10 USDC):
 *   tokenAmountOut: { amount:"9492719", decimals:18 (echoed hint!), priceUsd:0.999576 }
 *   fee: { amount:"250000", decimals:6, priceUsd:0.9996597 }  // ~$0.25
 * The token is 6-decimal USDC; decimals:18 is the echoed request hint, NOT real.
 */

type FetchResponse = {
  ok: boolean
  status?: number
  json: () => Promise<unknown>
  text: () => Promise<string>
}

function mockResponse(body: unknown, ok = true, status = 200): FetchResponse {
  return {
    ok,
    status,
    json: async () => body,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  }
}

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
  // Default: registry resolves USDC-Base to 6 decimals.
  vi.spyOn(ChainTokenService, 'getTokens').mockResolvedValue([
    {
      address: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
      chainId: 8453,
      symbol: 'USDC',
      decimals: 6,
    },
  ] as never)
})

afterEach(() => {
  vi.restoreAllMocks()
})

const REAL_SWAP = {
  id: 'sym-real-1',
  tokenAmountIn: {
    symbol: 'USDC',
    address: '0xaf88',
    amount: '10000000',
    chainId: 42161,
    decimals: 6,
  },
  tokenAmountOut: {
    symbol: 'tokenOut',
    address: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
    amount: '9492719',
    chainId: 8453,
    decimals: 18, // echoed hint — NOT the real token decimals
    priceUsd: 0.999576,
  },
  priceImpact: 0.28,
  fee: {
    symbol: 'USDbC',
    address: '0xd9aAEc86',
    amount: '250000',
    chainId: 8453,
    decimals: 6,
    priceUsd: 0.9996597,
  },
  estimatedTime: 15,
  tx: { to: '0xrouter', data: '0xdead', value: '0', chainId: 8453 },
}

const ARB_TO_BASE = {
  fromChain: 42161,
  toChain: 8453,
  fromToken: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  toToken: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
  fromAmount: '10000000',
  fromAddress: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
  fromTokenDecimals: 6,
}

describe('computeSymbiosisFeeUSD', () => {
  it('computes real USD fee from {amount, decimals, priceUsd}', () => {
    // 250000 / 10^6 * 0.9996597 = 0.2499...  -> "0.25"
    expect(computeSymbiosisFeeUSD({ amount: '250000', decimals: 6, priceUsd: 0.9996597 })).toBe(
      '0.25',
    )
  })
  it('defaults priceUsd to 1 when missing', () => {
    expect(computeSymbiosisFeeUSD({ amount: '250000', decimals: 6 })).toBe('0.25')
  })
  it('returns undefined when fee is absent or malformed', () => {
    expect(computeSymbiosisFeeUSD(undefined)).toBeUndefined()
    expect(computeSymbiosisFeeUSD({})).toBeUndefined()
    expect(computeSymbiosisFeeUSD({ amount: '250000' })).toBeUndefined()
  })
})

describe('symbiosis getQuote — S2 (real fee) + decimals', () => {
  it('reports the REAL fee (~$0.25), NOT the implied-fee heuristic, and not in estimatedGas', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(REAL_SWAP))
    const [quote] = await symbiosisProvider.getQuote(ARB_TO_BASE as never)
    expect(quote).toBeDefined()
    // Real fee ~0.25 (NOT the implied heuristic which would be |10 - 9.49| = 0.51 at 6 dec).
    expect(quote.fees?.totalFeeUSD).toBe('0.25')
    expect(quote.fees?.bridgeFee).toBe('0.25')
    // estimatedGas must NOT carry the fee anymore (no gas in response -> '0').
    expect(quote.estimatedGas).toBe('0')
    // feeCosts amountUSD reflects the real fee.
    const feeCost = quote.routes[0].estimate.feeCosts?.[0]
    expect(feeCost?.amountUSD).toBe('0.25')
  })

  it('resolves REAL dest decimals (6) from request.toTokenDecimals, ignoring the echoed 18', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(REAL_SWAP))
    const [quote] = await symbiosisProvider.getQuote(ARB_TO_BASE as never)
    expect(quote.toTokenDecimals).toBe(6)
    expect(quote.routes[0].action.toToken.decimals).toBe(6)
    // CRITICAL: the raw amount itself is unchanged (only the decimals label is corrected).
    expect(quote.toAmount).toBe('9492719')
  })

  it('falls back to the token registry for decimals when request omits toTokenDecimals', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(REAL_SWAP))
    const { fromTokenDecimals, ...noDecimals } = ARB_TO_BASE
    void fromTokenDecimals
    const [quote] = await symbiosisProvider.getQuote({ ...noDecimals } as never)
    // Registry mock returns USDC-Base at 6 decimals.
    expect(quote.toTokenDecimals).toBe(6)
  })

  it('falls back to implied-fee heuristic only when data.fee is absent', async () => {
    const noFee = { ...REAL_SWAP, fee: undefined }
    fetchMock.mockResolvedValueOnce(mockResponse(noFee))
    const [quote] = await symbiosisProvider.getQuote(ARB_TO_BASE as never)
    // input 10 USDC, output 9.492719 USDC (in=6dec, out resolved to 6dec) -> implied ~0.51
    expect(parseFloat(quote.fees?.totalFeeUSD || '0')).toBeCloseTo(0.51, 2)
  })
})
