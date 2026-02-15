import { z } from 'zod'

export const createPaymentLinkSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title is too long'),
  description: z.string().max(500, 'Description is too long').optional(),
  amount: z.number().positive('Amount must be positive'),
  currency: z.string(),
  receive_token: z.string().optional(),
  receive_token_symbol: z.string().optional(),
  receive_chain_id: z.number().int().positive().optional(),
  recipient_address: z.string().min(1, 'Recipient address is required'),
  receive_mode: z.enum(['same_chain', 'specific_chain']),
  config: z.object({
    theme: z.enum(['light', 'dark', 'system']),
    logoUrl: z.string().url().optional(),
    redirectUrl: z.string().url().optional(),
  }).optional(),
  max_uses: z.number().int().positive().optional(),
  expires_at: z.string().datetime().optional(),
})

export const updatePaymentLinkSchema = createPaymentLinkSchema.partial().extend({
  status: z.enum(['active', 'paused', 'archived', 'expired']).optional(),
})

export type CreatePaymentLinkInput = z.infer<typeof createPaymentLinkSchema>
export type UpdatePaymentLinkInput = z.infer<typeof updatePaymentLinkSchema>
