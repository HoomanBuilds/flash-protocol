import { describe, it, expect } from 'vitest'
import {
  isSpamToken,
  filterSpamTokens,
  STABLECOIN_SYMBOLS,
  MAX_SYMBOL_LENGTH,
} from '../token-filter'

// ─── Helpers ───────────────────────────────────────────────────────

function makeToken(overrides: Partial<{
  address: string
  symbol: string
  name: string
  isNative: boolean
  logoUrl: string
}> = {}) {
  return {
    address: overrides.address ?? '0xaaaa000000000000000000000000000000000001',
    symbol: overrides.symbol ?? 'TEST',
    name: overrides.name ?? 'Test Token',
    isNative: overrides.isNative ?? false,
    logoUrl: overrides.logoUrl,
  }
}

const EMPTY_CANONICAL = new Set<string>()

// ─── isSpamToken ───────────────────────────────────────────────────

describe('isSpamToken', () => {
  describe('allowlist bypasses', () => {
    it('native tokens always pass', () => {
      const token = makeToken({ isNative: true, symbol: 'SCAM', name: 'Visit scam.com' })
      expect(isSpamToken(token, 0, EMPTY_CANONICAL)).toBe(false)
    })

    it('canonical address tokens always pass', () => {
      const addr = '0xCanonical00000000000000000000000000000001'
      const canonical = new Set([addr.toLowerCase()])
      const token = makeToken({ address: addr, symbol: 'SCAM' })
      expect(isSpamToken(token, 0, canonical)).toBe(false)
    })

    it('multi-provider stablecoins always pass', () => {
      for (const symbol of STABLECOIN_SYMBOLS) {
        const token = makeToken({ symbol })
        expect(isSpamToken(token, 2, EMPTY_CANONICAL)).toBe(false)
      }
    })

    it('single-provider stablecoins are NOT bypassed', () => {
      const token = makeToken({ symbol: 'USDC' })
      // providerCount=1 + no logo → should be spam
      expect(isSpamToken(token, 1, EMPTY_CANONICAL)).toBe(true)
    })
  })

  describe('heuristic: invalid characters', () => {
    it('flags symbols with emoji', () => {
      const token = makeToken({ symbol: '🚀MOON' })
      expect(isSpamToken(token, 2, EMPTY_CANONICAL)).toBe(true)
    })

    it('allows symbols with dots, hyphens, parens', () => {
      const token = makeToken({ symbol: 'USDC.e', logoUrl: 'https://img.com/usdc.png' })
      expect(isSpamToken(token, 2, EMPTY_CANONICAL)).toBe(false)
    })
  })

  describe('heuristic: symbol length', () => {
    it('flags symbols longer than MAX_SYMBOL_LENGTH', () => {
      const token = makeToken({
        symbol: 'A'.repeat(MAX_SYMBOL_LENGTH + 1),
        logoUrl: 'https://img.com/a.png',
      })
      expect(isSpamToken(token, 2, EMPTY_CANONICAL)).toBe(true)
    })

    it('allows symbols at exactly MAX_SYMBOL_LENGTH', () => {
      const token = makeToken({
        symbol: 'A'.repeat(MAX_SYMBOL_LENGTH),
        logoUrl: 'https://img.com/a.png',
      })
      expect(isSpamToken(token, 2, EMPTY_CANONICAL)).toBe(false)
    })
  })

  describe('heuristic: scam patterns', () => {
    const scamCases = [
      { symbol: 'visit-scam.com', desc: 'URL in symbol' },
      { name: 'Free Airdrop Claim Now', desc: 'lure words in name' },
      { symbol: 'https://scam.io', desc: 'full URL in symbol' },
      { name: 'Visit www.phishing.xyz', desc: 'www + .xyz in name' },
    ]

    for (const tc of scamCases) {
      it(`flags: ${tc.desc}`, () => {
        const token = makeToken({
          symbol: tc.symbol ?? 'LEGIT',
          name: tc.name ?? 'Legit Token',
          logoUrl: 'https://img.com/a.png',
        })
        expect(isSpamToken(token, 2, EMPTY_CANONICAL)).toBe(true)
      })
    }
  })

  describe('heuristic: empty metadata', () => {
    it('flags empty symbol', () => {
      const token = makeToken({ symbol: '', logoUrl: 'https://img.com/a.png' })
      expect(isSpamToken(token, 2, EMPTY_CANONICAL)).toBe(true)
    })

    it('flags UNKNOWN symbol', () => {
      const token = makeToken({ symbol: 'UNKNOWN', logoUrl: 'https://img.com/a.png' })
      expect(isSpamToken(token, 2, EMPTY_CANONICAL)).toBe(true)
    })

    it('flags Unknown name', () => {
      const token = makeToken({ name: 'Unknown', logoUrl: 'https://img.com/a.png' })
      expect(isSpamToken(token, 2, EMPTY_CANONICAL)).toBe(true)
    })
  })

  describe('heuristic: single provider + no logo', () => {
    it('flags single-provider token with no logo', () => {
      const token = makeToken({ symbol: 'ABC', name: 'Abc Token' })
      expect(isSpamToken(token, 1, EMPTY_CANONICAL)).toBe(true)
    })

    it('allows single-provider token with logo', () => {
      const token = makeToken({ symbol: 'ABC', name: 'Abc Token', logoUrl: 'https://logo.png' })
      expect(isSpamToken(token, 1, EMPTY_CANONICAL)).toBe(false)
    })

    it('allows multi-provider token with no logo', () => {
      const token = makeToken({ symbol: 'ABC', name: 'Abc Token' })
      expect(isSpamToken(token, 2, EMPTY_CANONICAL)).toBe(false)
    })
  })

  it('passes clean tokens with logo and multi-provider', () => {
    const token = makeToken({ symbol: 'WETH', name: 'Wrapped Ether', logoUrl: 'https://logo.png' })
    expect(isSpamToken(token, 3, EMPTY_CANONICAL)).toBe(false)
  })
})

// ─── filterSpamTokens ─────────────────────────────────────────────

describe('filterSpamTokens', () => {
  it('filters out spam and keeps clean tokens', () => {
    const tokens = [
      makeToken({ address: '0x1', symbol: 'WETH', name: 'Wrapped Ether', logoUrl: 'https://a.png' }),
      makeToken({ address: '0x2', symbol: 'Visit scam.com', name: 'Scam' }),
      makeToken({ address: '0x3', symbol: '', name: 'Unknown' }),
    ] as Parameters<typeof filterSpamTokens>[0]

    const counts = new Map([
      ['0x1', 3],
      ['0x2', 1],
      ['0x3', 1],
    ])

    const result = filterSpamTokens(tokens, counts)
    expect(result).toHaveLength(1)
    expect(result[0].symbol).toBe('WETH')
  })
})
