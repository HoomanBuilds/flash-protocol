import { describe, it, expect } from 'vitest'
import { isValidSolanaAddress, isSolNative, NATIVE_SOL_MINT } from '../solana'

// ─── isValidSolanaAddress ─────────────────────────────────────────

describe('isValidSolanaAddress', () => {
  it('accepts valid Solana public keys', () => {
    // System program
    expect(isValidSolanaAddress('11111111111111111111111111111111')).toBe(true)
    // Token program
    expect(isValidSolanaAddress('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')).toBe(true)
    // Random valid base58
    expect(isValidSolanaAddress('So11111111111111111111111111111111111111111')).toBe(true)
  })

  it('rejects empty string', () => {
    expect(isValidSolanaAddress('')).toBe(false)
  })

  it('rejects EVM addresses', () => {
    expect(isValidSolanaAddress('0x1234567890abcdef1234567890abcdef12345678')).toBe(false)
  })

  it('rejects random strings', () => {
    expect(isValidSolanaAddress('not-a-solana-address')).toBe(false)
    expect(isValidSolanaAddress('hello world')).toBe(false)
  })

  it('rejects addresses with invalid base58 characters', () => {
    // 0, O, I, l are not in base58
    expect(isValidSolanaAddress('0OIl')).toBe(false)
  })
})

// ─── isSolNative ──────────────────────────────────────────────────

describe('isSolNative', () => {
  it('identifies NATIVE_SOL_MINT', () => {
    expect(isSolNative(NATIVE_SOL_MINT)).toBe(true)
  })

  it('identifies system program address', () => {
    expect(isSolNative('11111111111111111111111111111111')).toBe(true)
  })

  it('identifies empty string as native', () => {
    expect(isSolNative('')).toBe(true)
  })

  it('identifies "native" keyword', () => {
    expect(isSolNative('native')).toBe(true)
  })

  it('rejects SPL token addresses', () => {
    expect(isSolNative('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')).toBe(false) // USDC
    expect(isSolNative('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')).toBe(false)
  })

  it('rejects random strings', () => {
    expect(isSolNative('sol')).toBe(false)
    expect(isSolNative('SOL')).toBe(false)
  })
})
