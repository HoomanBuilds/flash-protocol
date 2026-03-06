/**
 * Script 2: Test Quote Requests Per-Provider (Current Code)
 *
 * Sends quote requests to each provider individually for 3 test cases:
 * 1. Solana SOL → Arbitrum USDC  (cross-chain non-EVM to EVM)
 * 2. Arbitrum ETH → Arbitrum USDC (same-chain EVM baseline)
 * 3. Solana USDC → Arbitrum USDC (SPL token cross-chain)
 *
 * Reveals bugs:
 * - Whether each provider handles "solana" string key
 * - Whether NEAR Intents' toLowerCase() breaks SPL token addresses
 * - Whether Rubic's fromTokenDecimals default (18) produces wrong amounts for SOL (9 decimals)
 *
 * Usage:
 *   npx tsx scripts/test-quotes.ts
 */

import { config } from 'dotenv'
config({ path: '.env.local' })

import { createConfig } from '@lifi/sdk'
import { OpenAPI } from '@defuse-protocol/one-click-sdk-typescript'
import type { QuoteRequest } from '@/types/provider'

// --- Init SDKs ---

createConfig({
  integrator: process.env.NEXT_PUBLIC_LIFI_INTEGRATOR_ID || 'flash-protocol',
})

OpenAPI.BASE = 'https://1click.chaindefuser.com'
if (process.env.NEAR_INTENTS_JWT) {
  OpenAPI.TOKEN = process.env.NEAR_INTENTS_JWT
}

// --- Constants ---

// Solana tokens
const SOL_NATIVE = '11111111111111111111111111111111' // System program (native SOL)
const SOL_WRAPPED = 'So11111111111111111111111111111111111111112' // Wrapped SOL
const SOLANA_USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'

// Arbitrum tokens
const ARB_NATIVE = '0x0000000000000000000000000000000000000000' // Native ETH
const ARB_USDC = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'

// Test wallet addresses (not real — just for quote simulation)
const SOLANA_WALLET = '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV' // Dummy Solana address
const EVM_WALLET = '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18' // Dummy EVM address

// Amounts
const ONE_SOL_LAMPORTS = '1000000000' // 1 SOL = 10^9 lamports
const POINT_ONE_ETH_WEI = '100000000000000000' // 0.1 ETH = 10^17 wei
const TEN_USDC_UNITS = '10000000' // 10 USDC = 10^7 (6 decimals)

// --- Test Cases ---

interface TestCase {
  name: string
  request: QuoteRequest
  notes: string
}

const TEST_CASES: TestCase[] = [
  {
    name: 'Solana SOL → Arbitrum USDC',
    request: {
      fromChain: 'solana',
      toChain: 42161,
      fromToken: SOL_NATIVE,
      toToken: ARB_USDC,
      fromAmount: ONE_SOL_LAMPORTS,
      fromAddress: SOLANA_WALLET,
      fromTokenDecimals: 9,
      slippage: 1,
    },
    notes: 'Cross-chain non-EVM→EVM. Tests "solana" string key handling.',
  },
  {
    name: 'Arbitrum ETH → Arbitrum USDC',
    request: {
      fromChain: 42161,
      toChain: 42161,
      fromToken: ARB_NATIVE,
      toToken: ARB_USDC,
      fromAmount: POINT_ONE_ETH_WEI,
      fromAddress: EVM_WALLET,
      fromTokenDecimals: 18,
      slippage: 1,
    },
    notes: 'Same-chain EVM baseline. Should work for all EVM providers.',
  },
  {
    name: 'Solana USDC → Arbitrum USDC',
    request: {
      fromChain: 'solana',
      toChain: 42161,
      fromToken: SOLANA_USDC,
      toToken: ARB_USDC,
      fromAmount: TEN_USDC_UNITS,
      fromAddress: SOLANA_WALLET,
      fromTokenDecimals: 6,
      slippage: 1,
    },
    notes:
      'SPL token cross-chain. Tests case sensitivity (NEAR toLowerCase bug) and Rubic decimals.',
  },
]

// --- Helpers ---

function header(title: string) {
  console.log(`\n${'='.repeat(70)}`)
  console.log(`  ${title}`)
  console.log('='.repeat(70))
}

function formatAmount(amount: string, decimals: number): string {
  const val = BigInt(amount)
  const divisor = BigInt(10 ** decimals)
  const int = val / divisor
  const frac = val % divisor
  if (frac === BigInt(0)) return int.toString()
  return `${int}.${frac.toString().padStart(decimals, '0').replace(/0+$/, '')}`
}

interface ProviderResult {
  provider: string
  success: boolean
  quoteCount: number
  toAmount?: string
  toAmountFormatted?: string
  error?: string
  duration: number
}

async function testProvider(
  providerName: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  provider: any,
  request: QuoteRequest,
): Promise<ProviderResult> {
  const start = Date.now()
  try {
    const quotes = await provider.getQuote(request)
    const duration = Date.now() - start

    if (!quotes || quotes.length === 0) {
      return { provider: providerName, success: false, quoteCount: 0, error: 'No routes', duration }
    }

    const best = quotes[0]
    return {
      provider: providerName,
      success: true,
      quoteCount: quotes.length,
      toAmount: best.toAmount,
      toAmountFormatted: best.toAmount ? formatAmount(best.toAmount, 6) : undefined,
      duration,
    }
  } catch (error) {
    const duration = Date.now() - start
    return {
      provider: providerName,
      success: false,
      quoteCount: 0,
      error: String(error).slice(0, 200),
      duration,
    }
  }
}

// ========== MAIN ==========

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════════╗')
  console.log('║  Quote Request Test — Per-Provider (Current Code)                   ║')
  console.log('╚══════════════════════════════════════════════════════════════════════╝')

  // Import providers
  const { lifiProvider } = await import('@/services/providers/lifi')
  const { rangoProvider } = await import('@/services/providers/rango')
  const { rubicProvider } = await import('@/services/providers/rubic')
  const { nearIntentsProvider } = await import('@/services/providers/near-intents')
  const { symbiosisProvider } = await import('@/services/providers/symbiosis')
  const { cctpProvider } = await import('@/services/providers/cctp')

  const allProviders = [
    { name: 'lifi', provider: lifiProvider },
    { name: 'rango', provider: rangoProvider },
    { name: 'rubic', provider: rubicProvider },
    { name: 'near-intents', provider: nearIntentsProvider },
    { name: 'symbiosis', provider: symbiosisProvider },
    { name: 'cctp', provider: cctpProvider },
  ]

  const allResults: { testCase: string; results: ProviderResult[] }[] = []

  for (const tc of TEST_CASES) {
    header(`TEST: ${tc.name}`)
    console.log(`  Notes: ${tc.notes}`)
    console.log(`  fromChain: ${tc.request.fromChain} (${typeof tc.request.fromChain})`)
    console.log(`  toChain: ${tc.request.toChain} (${typeof tc.request.toChain})`)
    console.log(`  fromToken: ${tc.request.fromToken}`)
    console.log(`  toToken: ${tc.request.toToken}`)
    console.log(`  fromAmount: ${tc.request.fromAmount}`)
    console.log(`  fromTokenDecimals: ${tc.request.fromTokenDecimals}`)
    console.log()

    const results: ProviderResult[] = []

    for (const { name, provider } of allProviders) {
      process.stdout.write(`  [${name.padEnd(15)}] querying... `)
      const result = await testProvider(name, provider, tc.request)
      results.push(result)

      if (result.success) {
        console.log(
          `✅ ${result.quoteCount} quote(s) — output: ${result.toAmountFormatted || result.toAmount} USDC (${result.duration}ms)`,
        )
      } else {
        console.log(`❌ ${result.error} (${result.duration}ms)`)
      }
    }

    allResults.push({ testCase: tc.name, results })
  }

  // ========== SUMMARY ==========

  header('SUMMARY TABLE')
  console.log()
  console.log(
    `  ${'Provider'.padEnd(17)} ${'Sol→Arb'.padEnd(15)} ${'Arb→Arb'.padEnd(15)} ${'SolUSDC→Arb'.padEnd(15)}`,
  )
  console.log(`  ${'─'.repeat(17)} ${'─'.repeat(15)} ${'─'.repeat(15)} ${'─'.repeat(15)}`)

  for (const { name } of allProviders) {
    const cols = allResults.map((tr) => {
      const r = tr.results.find((r) => r.provider === name)
      if (!r) return '?'.padEnd(15)
      if (r.success) return `✅ ${(r.toAmountFormatted || '?').slice(0, 10)}`.padEnd(15)
      return `❌ ${(r.error || '').slice(0, 10)}`.padEnd(15)
    })
    console.log(`  ${name.padEnd(17)} ${cols.join(' ')}`)
  }

  // ========== BUG ANALYSIS ==========

  header('BUG ANALYSIS')

  // Check: NEAR Intents Solana USDC
  const nearSolUsdcResult = allResults[2]?.results.find((r) => r.provider === 'near-intents')
  if (nearSolUsdcResult && !nearSolUsdcResult.success) {
    console.log(
      '  🐛 NEAR Intents failed for Solana USDC — likely toLowerCase() bug on SPL mint address',
    )
    console.log(`     Input token: ${SOLANA_USDC}`)
    console.log(`     Lowercased:  ${SOLANA_USDC.toLowerCase()}`)
    console.log('     These are DIFFERENT on Solana (base58 is case-sensitive)')
  }

  // Check: Rubic Solana SOL decimals
  const rubicSolResult = allResults[0]?.results.find((r) => r.provider === 'rubic')
  if (rubicSolResult?.success && rubicSolResult.toAmount) {
    const amount = BigInt(rubicSolResult.toAmount)
    // If Rubic used 18 decimals instead of 9, the amount would be 10^9 times too small
    if (amount < BigInt(1000)) {
      console.log(
        '  🐛 Rubic output suspiciously low — likely using default 18 decimals instead of SOL\'s 9',
      )
      console.log(
        `     Output: ${rubicSolResult.toAmount} (${rubicSolResult.toAmountFormatted} USDC)`,
      )
      console.log(
        '     1 SOL ≈ $130-180 USDC, so output should be ~130-180 USDC, not near-zero',
      )
    }
  }

  // Check: Rubic toWei with wrong decimals
  const rubicSolUsdcResult = allResults[2]?.results.find((r) => r.provider === 'rubic')
  if (rubicSolUsdcResult?.success && rubicSolUsdcResult.toAmount) {
    // Rubic's toWei uses hardcoded 18 in routes[].action.toAmount
    // The main toAmount uses data.tokens.to.decimals (usually correct)
    // But the route action toAmount is hardcoded to 18 — may produce huge numbers
    console.log(`  ℹ️  Rubic Solana USDC output: ${rubicSolUsdcResult.toAmountFormatted} USDC`)
    console.log('     Check routes[].action.toAmount for hardcoded-18-decimal bug')
  }

  // Check: Did any provider handle "solana" string key for the Solana test cases?
  const solProviders = allResults[0]?.results.filter((r) => r.success) || []
  console.log(`\n  Providers that handled "solana" string key: ${solProviders.map((r) => r.provider).join(', ') || 'NONE'}`)
  const evmProviders = allResults[1]?.results.filter((r) => r.success) || []
  console.log(`  Providers that handled EVM baseline: ${evmProviders.map((r) => r.provider).join(', ') || 'NONE'}`)

  console.log()
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
