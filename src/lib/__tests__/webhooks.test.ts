import { describe, it, expect } from 'vitest'
import { generateWebhookSecret, signPayload, buildWebhookPayload } from '../webhooks'

// ─── generateWebhookSecret ────────────────────────────────────────

describe('generateWebhookSecret', () => {
  it('starts with whsec_ prefix', () => {
    const secret = generateWebhookSecret()
    expect(secret).toMatch(/^whsec_/)
  })

  it('has correct length (whsec_ + 64 hex chars = 70)', () => {
    const secret = generateWebhookSecret()
    expect(secret).toHaveLength(70)
  })

  it('generates unique secrets', () => {
    const a = generateWebhookSecret()
    const b = generateWebhookSecret()
    expect(a).not.toBe(b)
  })
})

// ─── signPayload ──────────────────────────────────────────────────

describe('signPayload', () => {
  it('returns sha256= prefixed signature', () => {
    const sig = signPayload('{"test": true}', 'whsec_abc123')
    expect(sig).toMatch(/^sha256=[a-f0-9]{64}$/)
  })

  it('is deterministic for same input', () => {
    const body = '{"amount": 100}'
    const secret = 'whsec_deadbeef'
    expect(signPayload(body, secret)).toBe(signPayload(body, secret))
  })

  it('produces different signatures for different bodies', () => {
    const secret = 'whsec_deadbeef'
    const sig1 = signPayload('body1', secret)
    const sig2 = signPayload('body2', secret)
    expect(sig1).not.toBe(sig2)
  })

  it('strips whsec_ prefix before signing', () => {
    const body = '{"test": true}'
    // Signing with raw hex should match signing with prefixed secret
    const withPrefix = signPayload(body, 'whsec_abc123')
    const withoutPrefix = signPayload(body, 'abc123')
    expect(withPrefix).toBe(withoutPrefix)
  })
})

// ─── buildWebhookPayload ──────────────────────────────────────────

describe('buildWebhookPayload', () => {
  const mockTransaction = {
    id: 'tx-123',
    payment_link_id: 'pl-456',
    status: 'completed',
    customer_wallet: '0xabc',
    from_chain_id: '137',
    from_token_symbol: 'USDC',
    from_amount: '50.00',
    to_chain_id: '1',
    to_token_symbol: 'ETH',
    to_amount: '0.025',
    actual_output: '0.025',
    provider: 'lifi',
    source_tx_hash: '0xsrc',
    dest_tx_hash: '0xdst',
    completed_at: '2026-01-01T00:00:00Z',
  }

  it('creates correct structure for payment.completed', () => {
    const payload = buildWebhookPayload('payment.completed', mockTransaction)

    expect(payload.type).toBe('payment.completed')
    expect(payload.id).toMatch(/^evt_/)
    expect(payload.created_at).toBeDefined()
    expect(payload.data.transaction_id).toBe('tx-123')
    expect(payload.data.payment_link_id).toBe('pl-456')
    expect(payload.data.provider).toBe('lifi')
  })

  it('includes error fields for payment.failed', () => {
    const failedTx = {
      ...mockTransaction,
      status: 'failed',
      error_message: 'Bridge timeout',
      failure_stage: 'bridge',
    }

    const payload = buildWebhookPayload('payment.failed', failedTx)

    expect(payload.data.error_message).toBe('Bridge timeout')
    expect(payload.data.failure_stage).toBe('bridge')
  })

  it('does NOT include error fields for payment.completed', () => {
    const payload = buildWebhookPayload('payment.completed', mockTransaction)

    expect(payload.data).not.toHaveProperty('error_message')
    expect(payload.data).not.toHaveProperty('failure_stage')
  })

  it('generates unique event IDs', () => {
    const a = buildWebhookPayload('payment.completed', mockTransaction)
    const b = buildWebhookPayload('payment.completed', mockTransaction)
    expect(a.id).not.toBe(b.id)
  })
})
