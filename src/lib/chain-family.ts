import type { ChainId } from '@/types/provider'

/**
 * The wallet family the app can actually sign a deposit/transaction with.
 * 'other' means we have NO working signing path for that chain today — and
 * several such chains (XRP, TON, Stellar) REQUIRE a memo/tag we can't safely
 * attach. Callers MUST block execution for 'other' rather than misroute it to
 * the EVM signer (which would send funds with a wrong-format address / no memo
 * → unrecoverable loss).
 */
export type ChainFamily = 'evm' | 'solana' | 'bitcoin' | 'other'

const SOLANA_KEYS = new Set(['solana', 'sol'])
const BITCOIN_KEYS = new Set(['bitcoin', 'btc'])

/**
 * Map a chain identifier (numeric chainId or string key) to its executable
 * wallet family. Numeric (or numeric-string) ids are EVM; 'solana'/'bitcoin'
 * map to themselves; everything else is 'other'.
 */
export function deriveChainFamily(chain: ChainId): ChainFamily {
  if (typeof chain === 'number') return 'evm'
  const s = String(chain).toLowerCase().trim()
  if (/^\d+$/.test(s)) return 'evm'
  if (SOLANA_KEYS.has(s)) return 'solana'
  if (BITCOIN_KEYS.has(s)) return 'bitcoin'
  return 'other'
}

/** Whether a deposit can be executed for this family with a real wallet today. */
export function isExecutableDepositFamily(family: ChainFamily): boolean {
  return family === 'evm' || family === 'solana' || family === 'bitcoin'
}
