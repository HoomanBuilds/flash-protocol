import { describe, it, expect } from 'vitest'
import { deriveChainFamily, isExecutableDepositFamily } from '../chain-family'

describe('deriveChainFamily', () => {
  it('numeric chainId → evm', () => {
    expect(deriveChainFamily(1)).toBe('evm')
    expect(deriveChainFamily(42161)).toBe('evm')
  })

  it('numeric string chainId → evm', () => {
    expect(deriveChainFamily('137')).toBe('evm')
    expect(deriveChainFamily('8453')).toBe('evm')
  })

  it('solana keys → solana', () => {
    expect(deriveChainFamily('solana')).toBe('solana')
    expect(deriveChainFamily('sol')).toBe('solana')
  })

  it('bitcoin keys → bitcoin', () => {
    expect(deriveChainFamily('bitcoin')).toBe('bitcoin')
    expect(deriveChainFamily('btc')).toBe('bitcoin')
  })

  it('exotic / memo-required chains → other (NOT evm — this is the fund-loss guard)', () => {
    for (const c of ['xrp', 'ton', 'stellar', 'xlm', 'tron', 'sui', 'dogecoin', 'near', 'aptos', 'cosmos']) {
      expect(deriveChainFamily(c), c).toBe('other')
    }
  })

  it('is case-insensitive', () => {
    expect(deriveChainFamily('SOLANA')).toBe('solana')
    expect(deriveChainFamily('XRP')).toBe('other')
  })
})

describe('isExecutableDepositFamily', () => {
  it('evm/solana/bitcoin are executable', () => {
    expect(isExecutableDepositFamily('evm')).toBe(true)
    expect(isExecutableDepositFamily('solana')).toBe(true)
    expect(isExecutableDepositFamily('bitcoin')).toBe(true)
  })

  it('other is NOT executable (must be blocked, not misrouted)', () => {
    expect(isExecutableDepositFamily('other')).toBe(false)
  })
})
