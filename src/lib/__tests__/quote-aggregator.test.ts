/**
 * Tests for the pure chain-alias normalization used by the quote aggregator.
 *
 * NOTE: quote RANKING is now tested in src/services/__tests__/ranking.test.ts
 * against the real `ranking.ts` module. This file previously re-implemented the
 * OLD raw-BigInt(toAmount) ranking inline; that logic was replaced (it ranked
 * mislabeled-decimals quotes as best) so those duplicated tests were removed to
 * avoid a maintenance trap. Only the still-valid normalizeChainId tests remain.
 */
import { describe, it, expect } from 'vitest'

// ─── Recreate the pure normalizeChainId from quote-aggregator ──────

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
