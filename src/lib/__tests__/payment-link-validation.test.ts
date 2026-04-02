import { describe, it, expect } from 'vitest'
import { createPaymentLinkSchema, updatePaymentLinkSchema } from '../validations/payment-link'

// ─── createPaymentLinkSchema ──────────────────────────────────────

describe('createPaymentLinkSchema', () => {
  const validBase = {
    title: 'Test Product',
    amount: 49.99,
    currency: 'USD',
    recipient_address: '0xabc123',
    receive_mode: 'same_chain' as const,
  }

  it('accepts valid minimal input', () => {
    const result = createPaymentLinkSchema.safeParse(validBase)
    expect(result.success).toBe(true)
  })

  it('accepts full input with all optional fields', () => {
    const result = createPaymentLinkSchema.safeParse({
      ...validBase,
      description: 'A test product',
      receive_token: '0xtoken',
      receive_token_symbol: 'USDC',
      receive_chain_id: 8453,
      use_stealth: true,
      max_uses: 10,
      expires_at: '2026-12-31T23:59:59Z',
      config: {
        theme: 'dark',
        logoUrl: 'https://example.com/logo.png',
        redirectUrl: 'https://example.com/success',
      },
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing title', () => {
    const { title: _title, ...noTitle } = validBase
    const result = createPaymentLinkSchema.safeParse(noTitle)
    expect(result.success).toBe(false)
  })

  it('rejects empty title', () => {
    const result = createPaymentLinkSchema.safeParse({ ...validBase, title: '' })
    expect(result.success).toBe(false)
  })

  it('rejects title over 100 chars', () => {
    const result = createPaymentLinkSchema.safeParse({
      ...validBase,
      title: 'A'.repeat(101),
    })
    expect(result.success).toBe(false)
  })

  it('rejects negative amount', () => {
    const result = createPaymentLinkSchema.safeParse({ ...validBase, amount: -10 })
    expect(result.success).toBe(false)
  })

  it('rejects zero amount', () => {
    const result = createPaymentLinkSchema.safeParse({ ...validBase, amount: 0 })
    expect(result.success).toBe(false)
  })

  it('rejects missing recipient_address', () => {
    const { recipient_address: _addr, ...noAddr } = validBase
    const result = createPaymentLinkSchema.safeParse(noAddr)
    expect(result.success).toBe(false)
  })

  it('rejects invalid receive_mode', () => {
    const result = createPaymentLinkSchema.safeParse({
      ...validBase,
      receive_mode: 'invalid',
    })
    expect(result.success).toBe(false)
  })

  it('accepts receive_chain_id as string', () => {
    const result = createPaymentLinkSchema.safeParse({
      ...validBase,
      receive_chain_id: 'solana',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid config theme', () => {
    const result = createPaymentLinkSchema.safeParse({
      ...validBase,
      config: { theme: 'neon' },
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid expires_at format', () => {
    const result = createPaymentLinkSchema.safeParse({
      ...validBase,
      expires_at: 'not-a-date',
    })
    expect(result.success).toBe(false)
  })
})

// ─── updatePaymentLinkSchema ──────────────────────────────────────

describe('updatePaymentLinkSchema', () => {
  it('accepts partial updates (only status)', () => {
    const result = updatePaymentLinkSchema.safeParse({ status: 'paused' })
    expect(result.success).toBe(true)
  })

  it('accepts empty object (all fields optional)', () => {
    const result = updatePaymentLinkSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('rejects invalid status', () => {
    const result = updatePaymentLinkSchema.safeParse({ status: 'deleted' })
    expect(result.success).toBe(false)
  })

  it('accepts valid status values', () => {
    for (const status of ['active', 'paused', 'archived', 'expired']) {
      const result = updatePaymentLinkSchema.safeParse({ status })
      expect(result.success).toBe(true)
    }
  })
})
