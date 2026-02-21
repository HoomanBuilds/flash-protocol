import type { ChainId } from '@/types/provider'

/**
 * Chain types supported across all providers
 */
export type ChainType = 'evm' | 'solana' | 'bitcoin' | 'cosmos' | 'near' | 'tron' | 'sui'

/**
 * Unified chain representation across all providers
 * Each chain gets a universal `key` used internally.
 * Provider-specific identifiers are stored in `providerIds`.
 */
export interface UnifiedChain {
  key: string
  chainId: number | null
  name: string
  type: ChainType
  symbol: string
  logoUrl?: string
  isTestnet?: boolean
  providers: {
    lifi: boolean
    rango: boolean
    rubic: boolean
    symbiosis: boolean
    nearIntents: boolean
    cctp: boolean
  }
  /** Provider-specific identifiers for this chain */
  providerIds: {
    lifi?: number | string
    rango?: string
    rubic?: string
    symbiosis?: number
    nearIntents?: string
    cctp?: number
  }
}

/**
 * Unified token representation across all providers
 */
export interface UnifiedToken {
  address: string
  symbol: string
  name: string
  decimals: number
  logoUrl?: string
  isNative?: boolean
  chainKey: string
  providerIds?: {
    rango?: { blockchain: string; address: string | null }
    nearIntents?: string
  }
}

/**
 * Default provider support — all false
 */
export function emptyProviderSupport(): UnifiedChain['providers'] {
  return {
    lifi: false,
    rango: false,
    rubic: false,
    symbiosis: false,
    nearIntents: false,
    cctp: false,
  }
}

/**
 * Convert a UnifiedChain key to a ChainId for use in QuoteRequest
 * EVM chains use numeric IDs, non-EVM use string keys
 */
export function chainKeyToChainId(key: string): ChainId {
  const numericId = Number(key)
  if (!isNaN(numericId) && Number.isInteger(numericId)) {
    return numericId
  }
  return key
}

/**
 * Convert a ChainId back to a chain key string
 */
export function chainIdToKey(chainId: ChainId): string {
  return String(chainId)
}

/**
 * Map chain type string to our ChainType
 */
export function normalizeChainType(type: string): ChainType {
  const normalized = type.toLowerCase()
  const typeMap: Record<string, ChainType> = {
    'evm': 'evm',
    'svm': 'solana',
    'solana': 'solana',
    'utxo': 'bitcoin',
    'bitcoin': 'bitcoin',
    'btc': 'bitcoin',
    'cosmos': 'cosmos',
    'near': 'near',
    'tron': 'tron',
    'sui': 'sui',
  }
  return typeMap[normalized] || 'evm'
}
