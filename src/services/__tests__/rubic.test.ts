import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { rubicProvider } from '../providers/rubic'
import type { QuoteRequest } from '@/types/provider'

const EVM_REQUEST: QuoteRequest = {
  fromChain: 1,
  toChain: 8453,
  fromToken: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  toToken: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  fromAmount: '1000000',
  fromAddress: '0x1111111111111111111111111111111111111111',
  toAddress: '0x2222222222222222222222222222222222222222',
  fromTokenDecimals: 6,
}

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response
}

function routeBy(url: string, handlers: Record<string, () => Response>): Response {
  for (const key of Object.keys(handlers)) {
    if (url.includes(key)) return handlers[key]()
  }
  throw new Error(`Unhandled fetch URL in test: ${url}`)
}

const QUOTE_BODY = {
  id: 'rubic-quote-1',
  type: 'across',
  estimate: { destinationTokenAmount: '0.99', destinationTokenMinAmount: '0.98', estimatedTime: 120 },
  tokens: { from: { symbol: 'USDC', decimals: 6 }, to: { symbol: 'USDC', decimals: 6 } },
}

describe('RubicProvider.getQuote — null transactionRequest hygiene', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('excludes an EVM quote when the swap call yields no transactionRequest', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(async (input: any) => {
      const url = String(input)
      return routeBy(url, {
        '/info/chains': () => jsonResponse({ status: 'fail' }, false, 500),
        '/routes/quoteBest': () => jsonResponse(QUOTE_BODY),
        // swap fails -> transactionRequest stays null
        '/routes/swap': () =>
          jsonResponse({ error: { code: 3003, reason: 'not enough balance' } }, false, 400),
      })
    })

    const quotes = await rubicProvider.getQuote(EVM_REQUEST)
    expect(quotes.every((q) => q.transactionRequest != null)).toBe(true)
    expect(quotes.length).toBe(0)
  })

  it('keeps an EVM quote when the swap call returns a transactionRequest', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(async (input: any) => {
      const url = String(input)
      return routeBy(url, {
        '/info/chains': () => jsonResponse({ status: 'fail' }, false, 500),
        '/routes/quoteBest': () => jsonResponse(QUOTE_BODY),
        '/routes/swap': () =>
          jsonResponse({
            transaction: {
              to: '0x3333333333333333333333333333333333333333',
              data: '0xabcdef',
              value: '0',
            },
          }),
      })
    })

    const quotes = await rubicProvider.getQuote(EVM_REQUEST)
    expect(quotes.length).toBe(1)
    expect(quotes[0].transactionRequest).toBeTruthy()
    expect((quotes[0].transactionRequest as { to?: string }).to).toBe(
      '0x3333333333333333333333333333333333333333'
    )
  })

  it('returns a deposit-trade quote for non-EVM source (Solana)', async () => {
    const captured: { swapRawBody: string | null } = { swapRawBody: null }

    vi.spyOn(global, 'fetch').mockImplementation(async (input: any, init: any) => {
      const url = String(input)
      if (url.includes('/info/chains')) {
        return jsonResponse([
          { id: 'solana', name: 'SOLANA' },
          { id: 8453, name: 'BASE' },
        ])
      }
      if (url.includes('/routes/quoteDepositTrades')) {
        return jsonResponse({
          routes: [
            {
              id: null,
              estimate: {
                destinationTokenAmount: '4.99',
                destinationTokenMinAmount: '4.93',
              },
              tokens: {
                from: { symbol: 'USDC', decimals: 6 },
                to: { symbol: 'USDC', decimals: 6 },
              },
              type: null,
              fees: {},
            },
          ],
        })
      }
      if (url.includes('/routes/swapDepositTrade')) {
        captured.swapRawBody = init?.body ? (init.body as string) : null
        return jsonResponse({
          transaction: { depositAddress: 'DEP_ADDR', exchangeId: 'EX1' },
        })
      }
      throw new Error(`Unhandled fetch URL in test: ${url}`)
    })

    const quotes = await rubicProvider.getQuote({
      fromChain: 'solana',
      toChain: 8453,
      fromToken: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      toToken: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      fromAmount: '5000000',
      fromAddress: '5tzFkiKscXHK5ZXCGbXZxdw7gTjjD1mBwuoFbhUvuAi9',
      toAddress: '0x2222222222222222222222222222222222222222',
      fromTokenDecimals: 6,
    })

    const swapBody = captured.swapRawBody
      ? (JSON.parse(captured.swapRawBody) as { refundAddress?: string })
      : null

    expect(quotes).toHaveLength(1)
    expect(quotes[0].metadata?.depositAddress).toBe('DEP_ADDR')
    expect(quotes[0].metadata?.isDepositTrade).toBe(true)
    expect(swapBody?.refundAddress).toBe('5tzFkiKscXHK5ZXCGbXZxdw7gTjjD1mBwuoFbhUvuAi9')
  })
})
