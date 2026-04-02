import { describe, it, expect } from 'vitest'
import { getSlippageBuffer, calculateFromAmount } from '../../services/token-price'

// ─── getSlippageBuffer ────────────────────────────────────────────

describe('getSlippageBuffer', () => {
  it('returns 0.5% for stablecoin-to-stablecoin', () => {
    expect(getSlippageBuffer('USDC', 'USDT')).toBe(0.5)
    expect(getSlippageBuffer('DAI', 'USDC.e')).toBe(0.5)
    expect(getSlippageBuffer('USDbC', 'fUSDT')).toBe(0.5)
  })

  it('returns 1.0% when source is not stablecoin', () => {
    expect(getSlippageBuffer('ETH', 'USDC')).toBe(1.0)
    expect(getSlippageBuffer('WBTC', 'USDT')).toBe(1.0)
  })

  it('returns 1.0% when destination is not stablecoin', () => {
    expect(getSlippageBuffer('USDC', 'ETH')).toBe(1.0)
    expect(getSlippageBuffer('USDT', 'WBTC')).toBe(1.0)
  })

  it('returns 1.0% for non-stablecoin pairs', () => {
    expect(getSlippageBuffer('ETH', 'WBTC')).toBe(1.0)
    expect(getSlippageBuffer('SOL', 'AVAX')).toBe(1.0)
  })
})

// ─── calculateFromAmount ──────────────────────────────────────────

describe('calculateFromAmount', () => {
  it('calculates correct base amount without slippage', () => {
    // $100 at $1/token, 0% slippage = 100 tokens
    const result = parseFloat(calculateFromAmount(100, 1, 0))
    expect(result).toBeCloseTo(100, 2)
  })

  it('applies slippage buffer correctly', () => {
    // $100 at $1/token, 1% slippage = 101 tokens
    const result = parseFloat(calculateFromAmount(100, 1, 1))
    expect(result).toBeCloseTo(101, 2)
  })

  it('uses 8 decimal precision for high-price tokens (>$100)', () => {
    // BTC-like: $50000/token
    const result = calculateFromAmount(100, 50000, 1)
    expect(result.split('.')[1]?.length).toBe(8)
  })

  it('uses 6 decimal precision for mid-range tokens ($1-$100)', () => {
    // SOL-like: $50/token
    const result = calculateFromAmount(100, 50, 1)
    expect(result.split('.')[1]?.length).toBe(6)
  })

  it('uses 4 decimal precision for low-price tokens ($0.01-$1)', () => {
    const result = calculateFromAmount(100, 0.5, 1)
    expect(result.split('.')[1]?.length).toBe(4)
  })

  it('uses 2 decimal precision for very low price tokens (<$0.01)', () => {
    const result = calculateFromAmount(100, 0.001, 1)
    expect(result.split('.')[1]?.length).toBe(2)
  })

  it('throws on zero price', () => {
    expect(() => calculateFromAmount(100, 0, 1)).toThrow('Invalid token price')
  })

  it('throws on negative price', () => {
    expect(() => calculateFromAmount(100, -5, 1)).toThrow('Invalid token price')
  })
})
