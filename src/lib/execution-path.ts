import type { QuoteResponse } from '@/types/provider'
import { deriveChainFamily } from './chain-family'

/**
 * The execution branch the transaction executor should dispatch a quote to.
 * 'blocked' means we have no safe signing path for the source chain and must
 * refuse rather than misroute funds.
 */
export type ExecutionPath = 'near' | 'solana' | 'bitcoin' | 'evm' | 'blocked'

/**
 * Resolve which execution branch a quote belongs to.
 *
 * Solana detection is intentionally tolerant: LiFi reports its Solana chain id
 * as a numeric value (1151111081099710), which deriveChainFamily classifies as
 * 'evm', so we also honor the provider-set metadata.chainType. Without this, a
 * LiFi Solana-source quote would fall through to the EVM signer and be
 * unexecutable.
 */
export function resolveExecutionPath(quote: QuoteResponse): ExecutionPath {
  if (quote.provider === 'near-intents') return 'near'

  const chainType = quote.metadata?.chainType as string | undefined
  const sourceFamily = deriveChainFamily(quote.routes?.[0]?.action?.fromToken?.chainId ?? '')

  if (chainType === 'solana' || sourceFamily === 'solana') return 'solana'
  if (chainType === 'bitcoin' || sourceFamily === 'bitcoin') return 'bitcoin'

  if (quote.metadata?.isDepositTrade && chainType === 'other') return 'blocked'

  return 'evm'
}

/**
 * True when a quote bridges across two different chains. For atomic providers
 * (Symbiosis/Rubic) broadcasting the source tx does NOT mean the swap finished:
 * a cross-chain bridge settles on the destination minutes later. Callers must
 * not claim 'completed' on broadcast for these — the server-side poller is the
 * real source of truth. Same-chain swaps DO complete on broadcast.
 */
export function isCrossChainSwap(quote: QuoteResponse): boolean {
  const route = quote.routes?.[0]?.action
  const from = route?.fromToken?.chainId
  const to = route?.toToken?.chainId
  if (from === undefined || to === undefined) return false
  return String(from) !== String(to)
}
