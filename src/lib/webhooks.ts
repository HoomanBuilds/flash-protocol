import crypto from 'crypto'

export const WEBHOOK_EVENTS = [
  'payment.completed',
  'payment.failed',
  'link.expired',
] as const

export type WebhookEventType = (typeof WEBHOOK_EVENTS)[number]

export interface WebhookPayload {
  id: string
  type: WebhookEventType
  created_at: string
  data: Record<string, unknown>
}

export interface DeliveryResult {
  responseStatus: number | null
  responseBody: string | null
  errorMessage: string | null
  delivered: boolean
  durationMs: number
}

export function generateWebhookSecret(): string {
  return 'whsec_' + crypto.randomBytes(32).toString('hex')
}

export function signPayload(body: string, secret: string): string {
  // Strip whsec_ prefix before using as HMAC key (Stripe/Svix convention)
  const rawSecret = secret.startsWith('whsec_') ? secret.slice(6) : secret
  const hmac = crypto.createHmac('sha256', rawSecret)
  hmac.update(body)
  return 'sha256=' + hmac.digest('hex')
}

export function buildWebhookPayload(
  eventType: WebhookEventType,
  transaction: Record<string, unknown>,
): WebhookPayload {
  const data: Record<string, unknown> = {
    transaction_id: transaction.id,
    payment_link_id: transaction.payment_link_id,
    status: transaction.status,
    customer_wallet: transaction.customer_wallet,
    from_chain_id: transaction.from_chain_id,
    from_token_symbol: transaction.from_token_symbol,
    from_amount: transaction.from_amount,
    to_chain_id: transaction.to_chain_id,
    to_token_symbol: transaction.to_token_symbol,
    to_amount: transaction.to_amount,
    actual_output: transaction.actual_output,
    provider: transaction.provider,
    source_tx_hash: transaction.source_tx_hash,
    dest_tx_hash: transaction.dest_tx_hash,
    completed_at: transaction.completed_at,
  }

  if (eventType === 'payment.failed') {
    data.error_message = transaction.error_message
    data.failure_stage = transaction.failure_stage
  }

  return {
    id: 'evt_' + crypto.randomBytes(12).toString('hex'),
    type: eventType,
    created_at: new Date().toISOString(),
    data,
  }
}

export async function deliverToEndpoint(
  url: string,
  secret: string,
  eventType: string,
  payload: WebhookPayload | Record<string, unknown>,
): Promise<DeliveryResult> {
  const body = JSON.stringify(payload)
  const signature = signPayload(body, secret)
  const deliveryId = crypto.randomUUID()
  const timestamp = Math.floor(Date.now() / 1000).toString()

  const startTime = Date.now()
  let responseStatus: number | null = null
  let responseBody: string | null = null
  let errorMessage: string | null = null
  let delivered = false

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Flash-Signature': signature,
        'X-Flash-Event': eventType,
        'X-Flash-Delivery-Id': deliveryId,
        'X-Flash-Timestamp': timestamp,
        'User-Agent': 'FlashProtocol-Webhook/1.0',
      },
      body,
      signal: controller.signal,
    })

    clearTimeout(timeout)
    responseStatus = response.status
    responseBody = (await response.text()).substring(0, 1024)
    delivered = response.ok
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : 'Unknown delivery error'
  }

  const durationMs = Date.now() - startTime

  return { responseStatus, responseBody, errorMessage, delivered, durationMs }
}
