import { describe, it, expect } from 'vitest'
import { isValidAddressForChain, validateQuoteRequest } from '../chain-address'

describe('isValidAddressForChain', () => {
  it('accepts a valid EVM address on an evm chain', () => {
    expect(isValidAddressForChain('0x1111111111111111111111111111111111111111', 1)).toBe(true)
    expect(isValidAddressForChain('0xaF88d065e77c8cC2239327C5EDb3A432268e5831', 42161)).toBe(true)
  })

  it('rejects a non-EVM address on an evm chain', () => {
    expect(isValidAddressForChain('4Nd1mYsL-not-an-evm-addr', 1)).toBe(false)
    expect(isValidAddressForChain('0x123', 1)).toBe(false)
    expect(isValidAddressForChain('0x11111111111111111111111111111111111111', 1)).toBe(false)
  })

  it('accepts a valid Solana (base58) address on solana', () => {
    expect(isValidAddressForChain('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', 'solana')).toBe(
      true,
    )
  })

  it('rejects an EVM 0x address on solana', () => {
    expect(isValidAddressForChain('0x1111111111111111111111111111111111111111', 'solana')).toBe(
      false,
    )
  })

  it('accepts valid Bitcoin addresses (bech32 and legacy) on bitcoin', () => {
    expect(isValidAddressForChain('bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq', 'bitcoin')).toBe(
      true,
    )
    expect(isValidAddressForChain('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', 'bitcoin')).toBe(true)
    expect(isValidAddressForChain('3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy', 'bitcoin')).toBe(true)
  })

  it('rejects an EVM 0x address on bitcoin', () => {
    expect(isValidAddressForChain('0x1111111111111111111111111111111111111111', 'bitcoin')).toBe(
      false,
    )
  })

  it("returns true for 'other'-family chains (A5 handles those)", () => {
    expect(isValidAddressForChain('anything-goes', 'stellar')).toBe(true)
    expect(isValidAddressForChain('rXYZ', 'xrp')).toBe(true)
  })

  it('allows empty/whitespace addresses through (quotes without a wallet)', () => {
    expect(isValidAddressForChain('', 1)).toBe(true)
    expect(isValidAddressForChain('   ', 1)).toBe(true)
    expect(isValidAddressForChain('', 'solana')).toBe(true)
  })
})

describe('validateQuoteRequest', () => {
  it('returns ok for a valid evm->evm request', () => {
    expect(
      validateQuoteRequest({
        fromChain: 42161,
        toChain: 8453,
        fromAddress: '0x1111111111111111111111111111111111111111',
        toAddress: '0x2222222222222222222222222222222222222222',
      }),
    ).toEqual({ ok: true })
  })

  it('returns ok when addresses are missing', () => {
    expect(validateQuoteRequest({ fromChain: 1, toChain: 1 })).toEqual({ ok: true })
  })

  it('flags an exotic source chain as unsupported', () => {
    const r = validateQuoteRequest({ fromChain: 'stellar', toChain: 8453 })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.unsupported).toBe(true)
      expect(r.reason).toMatch(/stellar/i)
    }
  })

  it('flags an exotic destination chain as unsupported', () => {
    const r = validateQuoteRequest({ fromChain: 1, toChain: 'xrp' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.unsupported).toBe(true)
  })

  it('runs the unsupported check BEFORE the address check', () => {
    const r = validateQuoteRequest({
      fromChain: 'stellar',
      toChain: 8453,
      fromAddress: 'totally-bogus',
    })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.unsupported).toBe(true)
  })

  it('flags a mismatched fromAddress as invalid (not unsupported)', () => {
    const r = validateQuoteRequest({
      fromChain: 1,
      toChain: 1,
      fromAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.unsupported).toBeFalsy()
      expect(r.reason).toMatch(/source address/i)
    }
  })

  it('flags a mismatched toAddress as invalid (not unsupported)', () => {
    const r = validateQuoteRequest({
      fromChain: 1,
      toChain: 'solana',
      fromAddress: '0x1111111111111111111111111111111111111111',
      toAddress: '0x2222222222222222222222222222222222222222',
    })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.unsupported).toBeFalsy()
      expect(r.reason).toMatch(/destination address/i)
    }
  })
})
