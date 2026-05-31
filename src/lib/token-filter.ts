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

/**
 * Known bridged/variant stablecoin symbols folded into their canonical base
 * for display. Only stablecoins — never fold arbitrary tokens by symbol.
 */
const SYMBOL_VARIANT_MAP: Record<string, string> = {
  'USDC.E': 'USDC',
  USDBC: 'USDC',
  FUSDT: 'USDT',
}

/**
 * Normalize a token symbol to its display family key (case-insensitive,
 * folds known bridged variants like USDC.e → USDC).
 */
export function normalizeSymbolKey(symbol: string): string {
  const upper = (symbol || '').toUpperCase()
  return SYMBOL_VARIANT_MAP[upper] || upper
}

/**
 * Collapse same-symbol tokens into a single canonical row per symbol family.
 *
 * Fixes the "2-3 USDC / multiple SOL on one chain" problem: providers return the
 * same logical token at different addresses (native USDC vs USDC.e vs another
 * provider's USDC), and without this they each render as a separate selectable row.
 *
 * Within each family the winner is scored by: native > exact base-symbol match >
 * canonical address > provider count > has-logo. A family with only a bridged
 * variant (e.g. USDC.e but no USDC) keeps that variant — never drops a whole family.
 *
 * @param tokens - Tokens for a single chain (already spam-filtered)
 * @param chainKey - Chain key for canonical address lookup
 * @param providerCounts - Optional map of lowercase address → provider count;
 *   falls back to providerIds._count on each token.
 */
export function collapseTokensBySymbol(
  tokens: UnifiedToken[],
  chainKey?: string,
  providerCounts?: Map<string, number>,
): UnifiedToken[] {
  const canonical = chainKey ? buildCanonicalAddresses(chainKey) : new Set<string>()
  const groups = new Map<string, UnifiedToken[]>()

  for (const token of tokens) {
    const key = normalizeSymbolKey(token.symbol)
    const group = groups.get(key)
    if (group) group.push(token)
    else groups.set(key, [token])
  }

  const countOf = (t: UnifiedToken): number => {
    if (providerCounts) {
      const c = providerCounts.get(t.address.toLowerCase())
      if (c) return c
    }
    const ids = t.providerIds as Record<string, unknown> | undefined
    if (ids && typeof ids._count === 'number') return ids._count as number
    return 1
  }

  const result: UnifiedToken[] = []
  for (const group of groups.values()) {
    if (group.length === 1) {
      result.push(group[0])
      continue
    }
    const familyKey = normalizeSymbolKey(group[0].symbol)
    const score = (t: UnifiedToken): number => {
      let s = 0
      if (t.isNative) s += 1000
      // Base symbol (USDC) beats bridged variant (USDC.e) within the same family
      if ((t.symbol || '').toUpperCase() === familyKey) s += 100
      if (canonical.has(t.address.toLowerCase())) s += 50
      s += Math.min(countOf(t), 9) * 2
      if (t.logoUrl) s += 1
      return s
    }
    const winner = group.reduce((best, t) => (score(t) > score(best) ? t : best), group[0])
    result.push(winner)
  }

  return result
}
