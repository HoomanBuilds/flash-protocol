import type { ChainId } from '@/types/provider'
import { deriveChainFamily } from './chain-family'

const EVM_ADDRESS = /^0x[0-9a-fA-F]{40}$/
const SOLANA_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/
const BTC_BECH32 = /^(bc1|tb1)[02-9ac-hj-np-z]{6,87}$/i
const BTC_LEGACY = /^[13mn2][a-km-zA-HJ-NP-Z1-9]{25,39}$/

/**
 * Whether `address` is a syntactically valid address for `chain`'s wallet family.
 * Empty/whitespace addresses are allowed (quotes can be requested without a
 * connected wallet). 'other'-family chains return true here — A5 (unsupported)
 * handles them so we don't double-reject.
 */
export function isValidAddressForChain(address: string, chain: ChainId): boolean {
  const addr = (address ?? '').trim()
  if (addr === '') return true

  const family = deriveChainFamily(chain)
  switch (family) {
    case 'evm':
      return EVM_ADDRESS.test(addr)
    case 'solana':
      return !addr.startsWith('0x') && SOLANA_ADDRESS.test(addr)
    case 'bitcoin':
      return BTC_BECH32.test(addr) || BTC_LEGACY.test(addr)
    default:
      return true
  }
}

export type ValidateQuoteResult =
  | { ok: true }
  | { ok: false; unsupported?: boolean; reason: string }

/**
 * Pure central validation for a quote request. Surfaces 'other'-family chains
 * as `unsupported` (no executable signing path — see chain-family / N2) BEFORE
 * address validation, so an exotic chain reads as "unsupported" rather than
 * "bad address". Then rejects addresses that don't match the chain's address
 * space.
 */
export function validateQuoteRequest(req: {
  fromChain: ChainId
  toChain: ChainId
  fromAddress?: string
  toAddress?: string
}): ValidateQuoteResult {
  const fromFamily = deriveChainFamily(req.fromChain)
  const toFamily = deriveChainFamily(req.toChain)

  if (fromFamily === 'other') {
    return {
      ok: false,
      unsupported: true,
      reason: `Source chain "${req.fromChain}" is not supported for payments yet.`,
    }
  }
  if (toFamily === 'other') {
    return {
      ok: false,
      unsupported: true,
      reason: `Destination chain "${req.toChain}" is not supported for payments yet.`,
    }
  }

  if (req.fromAddress && !isValidAddressForChain(req.fromAddress, req.fromChain)) {
    return {
      ok: false,
      reason: `Source address is not a valid ${fromFamily} address for this chain.`,
    }
  }
  if (req.toAddress && !isValidAddressForChain(req.toAddress, req.toChain)) {
    return {
      ok: false,
      reason: `Destination address is not a valid ${toFamily} address for this chain.`,
    }
  }

  return { ok: true }
}
