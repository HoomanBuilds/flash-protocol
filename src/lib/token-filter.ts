import { TOKENS } from '@/lib/tokens'
import type { UnifiedToken } from '@/lib/chain-registry'

/** Minimum token shape needed for spam detection */
interface SpamCheckToken {
  address: string
  symbol: string
  name: string
  isNative?: boolean
  logoUrl?: string
}

/**
 * Spam token filtering heuristics.
 * Combines blocklist pattern matching, provider consensus, and metadata checks.
 * Canonical tokens (from static TOKENS map) always bypass filtering.
 */

export const STABLECOIN_SYMBOLS = new Set([
  'USDC',
  'USDT',
  'DAI',
  'USDC.e',
  'USDbC',
  'fUSDT',
  'BUSD',
])

export const MAX_SYMBOL_LENGTH = 10

/** Patterns that indicate scam/spam tokens */
export const SPAM_SYMBOL_PATTERNS = [
  /https?:\/\//i, // URLs
  /\.com\b/i, // .com domains
  /\.io\b/i, // .io domains
  /\.xyz\b/i, // .xyz domains
  /\.net\b/i, // .net domains
  /\.org\b/i, // .org domains
  /\bairdrop\b/i, // airdrop lure
  /\bclaim\b/i, // claim lure
  /\bfree\b/i, // free lure
  /\bvisit\b/i, // visit lure
  /\bwww\./i, // www. prefix
  /\breward\b/i, // reward lure
]

/** Characters that don't belong in a legitimate token symbol */
const INVALID_SYMBOL_CHARS = /[^\w.\-() +/]/

/**
 * Build a set of known-good (canonical) token addresses for a chain
 * from the static TOKENS map.
 */
export function buildCanonicalAddresses(chainKey: string): Set<string> {
  const canonical = new Set<string>()
  const num = Number(chainKey)
  const staticTokens = (!isNaN(num) ? TOKENS[num] : null) || TOKENS[chainKey]
  if (staticTokens) {
    for (const t of staticTokens) {
      canonical.add(t.address.toLowerCase())
    }
  }
  return canonical
}

/**
 * Check if a single token is spam.
 *
 * @param token - The token to check
 * @param providerCount - How many providers listed this token
 * @param canonicalAddresses - Set of known-good addresses (lowercase)
 */
export function isSpamToken(
  token: SpamCheckToken,
  providerCount: number,
  canonicalAddresses: Set<string>,
): boolean {
  const addr = token.address.toLowerCase()
  const symbol = token.symbol || ''
  const name = token.name || ''

  // --- Allowlist bypass ---
  // Native tokens always pass
  if (token.isNative) return false
  // Canonical (static map) tokens always pass
  if (canonicalAddresses.has(addr)) return false
  // Multi-provider stablecoins always pass (single-provider "USDC" clones are NOT bypassed)
  if (providerCount >= 2 && STABLECOIN_SYMBOLS.has(symbol)) return false

  // --- Heuristic 1: Invalid characters in symbol ---
  if (INVALID_SYMBOL_CHARS.test(symbol)) return true

  // --- Heuristic 2: Symbol too long ---
  if (symbol.length > MAX_SYMBOL_LENGTH) return true

  // --- Heuristic 3: Scam patterns in symbol or name ---
  for (const pattern of SPAM_SYMBOL_PATTERNS) {
    if (pattern.test(symbol) || pattern.test(name)) return true
  }

  // --- Heuristic 4: Empty / placeholder metadata ---
  if (!symbol || symbol === 'UNKNOWN' || !name || name === 'Unknown') return true

  // --- Heuristic 5: Single-provider + no logo ---
  if (providerCount <= 1 && !token.logoUrl) return true

  return false
}

/**
 * Filter spam tokens from a merged token list.
 *
 * @param tokens - Merged token array (after dedup, with providerIds._count set)
 * @param providerCounts - Map of lowercase address → provider count
 * @param chainKey - Optional chain key for canonical address lookup
 */
export function filterSpamTokens(
  tokens: UnifiedToken[],
  providerCounts: Map<string, number>,
  chainKey?: string,
): UnifiedToken[] {
  const canonical = chainKey ? buildCanonicalAddresses(chainKey) : new Set<string>()

  return tokens.filter((token) => {
    const addr = token.address.toLowerCase()
    const count = providerCounts.get(addr) || 1
    return !isSpamToken(token, count, canonical)
  })
}
