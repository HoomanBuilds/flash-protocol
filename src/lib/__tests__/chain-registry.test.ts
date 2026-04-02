import { describe, it, expect } from 'vitest'
import {
  chainKeyToChainId,
  chainIdToKey,
  normalizeChainType,
  emptyProviderSupport,
} from '../chain-registry'

// ─── chainKeyToChainId ────────────────────────────────────────────

describe('chainKeyToChainId', () => {
  it('returns number for numeric string keys', () => {
    expect(chainKeyToChainId('1')).toBe(1)
    expect(chainKeyToChainId('137')).toBe(137)
    expect(chainKeyToChainId('42161')).toBe(42161)
  })

  it('returns string for non-numeric keys', () => {
    expect(chainKeyToChainId('solana')).toBe('solana')
    expect(chainKeyToChainId('bitcoin')).toBe('bitcoin')
    expect(chainKeyToChainId('near')).toBe('near')
  })

  it('handles edge case: "0" is numeric', () => {
    expect(chainKeyToChainId('0')).toBe(0)
  })
})

// ─── chainIdToKey ─────────────────────────────────────────────────

describe('chainIdToKey', () => {
  it('converts number to string', () => {
    expect(chainIdToKey(1)).toBe('1')
    expect(chainIdToKey(137)).toBe('137')
  })

  it('passes through strings unchanged', () => {
    expect(chainIdToKey('solana')).toBe('solana')
  })
})

// ─── normalizeChainType ───────────────────────────────────────────

describe('normalizeChainType', () => {
  const mappings = [
    ['evm', 'evm'],
    ['EVM', 'evm'],
    ['svm', 'solana'],
    ['solana', 'solana'],
    ['utxo', 'bitcoin'],
    ['bitcoin', 'bitcoin'],
    ['btc', 'bitcoin'],
    ['cosmos', 'cosmos'],
    ['near', 'near'],
    ['tron', 'tron'],
    ['sui', 'sui'],
    ['ton', 'ton'],
    ['starknet', 'starknet'],
    ['aptos', 'aptos'],
  ] as const

  for (const [input, expected] of mappings) {
    it(`maps "${input}" → "${expected}"`, () => {
      expect(normalizeChainType(input)).toBe(expected)
    })
  }

  it('defaults unknown types to "evm"', () => {
    expect(normalizeChainType('unknown_chain')).toBe('evm')
    expect(normalizeChainType('')).toBe('evm')
  })
})

// ─── emptyProviderSupport ─────────────────────────────────────────

describe('emptyProviderSupport', () => {
  it('returns all providers as false', () => {
    const support = emptyProviderSupport()
    expect(support.lifi).toBe(false)
    expect(support.rango).toBe(false)
    expect(support.rubic).toBe(false)
    expect(support.symbiosis).toBe(false)
    expect(support.nearIntents).toBe(false)
    expect(support.cctp).toBe(false)
  })

  it('returns a new object each time (no shared reference)', () => {
    const a = emptyProviderSupport()
    const b = emptyProviderSupport()
    expect(a).not.toBe(b)
    a.lifi = true
    expect(b.lifi).toBe(false)
  })
})
