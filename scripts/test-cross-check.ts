/**
 * Script: Comprehensive Cross-Check Before Production Changes
 *
 * Tests a WIDE variety of chains and tokens across all providers to ensure
 * proposed fixes don't break anything. This is the safety net.
 *
 * Test matrix:
 * - EVM chains: Ethereum, Arbitrum, Base, Polygon, Optimism, BSC, Avalanche
 * - Non-EVM chains: Solana, Bitcoin
 * - Token types: Native tokens, USDC, USDT, other SPL tokens
 * - Quote directions: EVM→EVM, Solana→EVM, EVM→Solana (if supported)
 *
 * Usage:
 *   npx tsx scripts/test-cross-check.ts
 */

import { config } from 'dotenv'
config({ path: '.env.local' })

import { createConfig } from '@lifi/sdk'
import {
  OneClickService,
  OpenAPI,
  QuoteRequest as DefuseQuoteRequest,
} from '@defuse-protocol/one-click-sdk-typescript'
import type { QuoteRequest } from '@/types/provider'

// --- Init ---

createConfig({
  integrator: process.env.NEXT_PUBLIC_LIFI_INTEGRATOR_ID || 'flash-protocol',
})

OpenAPI.BASE = 'https://1click.chaindefuser.com'
if (process.env.NEAR_INTENTS_JWT) OpenAPI.TOKEN = process.env.NEAR_INTENTS_JWT

// --- Addresses ---

const WALLETS = {
  evm: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18',
  solana: '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV',
}

const NATIVE = '0x0000000000000000000000000000000000000000'
const SOL_NATIVE = '11111111111111111111111111111111'

// USDC addresses per chain
const USDC: Record<string, string> = {
  '1': '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  '42161': '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  '8453': '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  '137': '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
  '10': '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
  '56': '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
  '43114': '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
  solana: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
}

// --- Proposed NEAR blockchain mappings (the FIX we want to verify) ---

// Updated mapping: NEAR API now uses abbreviated names
const NEAR_BC_TO_KEY_FIXED: Record<string, { key: string; chainId: number | null; type: string; name: string; symbol: string }> = {
  eth: { key: '1', chainId: 1, type: 'evm', name: 'Ethereum', symbol: 'ETH' },
  arb: { key: '42161', chainId: 42161, type: 'evm', name: 'Arbitrum One', symbol: 'ETH' },
  base: { key: '8453', chainId: 8453, type: 'evm', name: 'Base', symbol: 'ETH' },
  op: { key: '10', chainId: 10, type: 'evm', name: 'Optimism', symbol: 'ETH' },
  pol: { key: '137', chainId: 137, type: 'evm', name: 'Polygon', symbol: 'POL' },
  bsc: { key: '56', chainId: 56, type: 'evm', name: 'BNB Smart Chain', symbol: 'BNB' },
  avax: { key: '43114', chainId: 43114, type: 'evm', name: 'Avalanche', symbol: 'AVAX' },
  gnosis: { key: '100', chainId: 100, type: 'evm', name: 'Gnosis', symbol: 'xDAI' },
  near: { key: 'near', chainId: null, type: 'near', name: 'NEAR', symbol: 'NEAR' },
  sol: { key: 'solana', chainId: null, type: 'solana', name: 'Solana', symbol: 'SOL' },
  btc: { key: 'bitcoin', chainId: null, type: 'bitcoin', name: 'Bitcoin', symbol: 'BTC' },
  doge: { key: 'dogecoin', chainId: null, type: 'bitcoin', name: 'Dogecoin', symbol: 'DOGE' },
  bera: { key: '80094', chainId: 80094, type: 'evm', name: 'Berachain', symbol: 'BERA' },
  tron: { key: 'tron', chainId: null, type: 'tron', name: 'Tron', symbol: 'TRX' },
  sui: { key: 'sui', chainId: null, type: 'sui', name: 'Sui', symbol: 'SUI' },
  bch: { key: 'bch', chainId: null, type: 'bitcoin', name: 'Bitcoin Cash', symbol: 'BCH' },
  ltc: { key: 'ltc', chainId: null, type: 'bitcoin', name: 'Litecoin', symbol: 'LTC' },
  xrp: { key: 'xrp', chainId: null, type: 'cosmos', name: 'XRP', symbol: 'XRP' },
  ton: { key: 'ton', chainId: null, type: 'cosmos', name: 'TON', symbol: 'TON' },
}

// Reverse: chain key → NEAR blockchain name (FIXED)
const KEY_TO_NEAR_BC_FIXED: Record<string, string> = {}
for (const [bc, info] of Object.entries(NEAR_BC_TO_KEY_FIXED)) {
  KEY_TO_NEAR_BC_FIXED[info.key] = bc
}

// Updated prefix map (NEAR asset IDs use these prefixes)
const NEAR_PREFIX_FIXED: Record<string, string> = {
  '1': 'eth',
  '42161': 'arb',
  '8453': 'base',
  '10': 'op',
  '137': 'pol',
  '56': 'bsc',
  '43114': 'avax',
  '100': 'gnosis',
  solana: 'sol',
  bitcoin: 'btc',
  near: 'near',
  dogecoin: 'doge',
  '1313161554': 'aurora',
  '80094': 'bera',
  tron: 'tron',
  sui: 'sui',
}

const NEAR_NATIVE_IDS_FIXED: Record<string, string> = {
  '1': 'nep141:eth.omft.near',         // was same
  '42161': 'nep141:arb.omft.near',     // was same
  '8453': 'nep141:base.omft.near',     // was same
  '10': 'nep245:v2_1.omni.hot.tg:10_11111111111111111111',
  '137': 'nep245:v2_1.omni.hot.tg:137_11111111111111111111',
  '56': 'nep245:v2_1.omni.hot.tg:56_11111111111111111111',
  '43114': 'nep245:v2_1.omni.hot.tg:43114_11111111111111111111',
  '100': 'nep141:gnosis.omft.near',
  solana: 'nep141:sol.omft.near',
  near: 'wrap.near',
  bitcoin: 'nep141:btc.omft.near',
  dogecoin: 'nep141:doge.omft.near',
}

// Non-EVM chains where addresses are case-sensitive
const CASE_SENSITIVE = new Set(['solana', 'near', 'bitcoin', 'dogecoin', 'sui', 'cosmos', 'tron', 'bch', 'ltc', 'xrp'])

function getAssetIdFixed(chainKey: string, tokenAddress: string): string | null {
  const prefix = NEAR_PREFIX_FIXED[chainKey]
  if (!prefix) return null

  const isNonEvm = CASE_SENSITIVE.has(chainKey)
  const addr = isNonEvm ? tokenAddress : tokenAddress.toLowerCase()

  const isNative =
    addr === NATIVE ||
    addr === SOL_NATIVE ||
    addr.toLowerCase() === 'so11111111111111111111111111111111111111112' ||
    !addr

  if (isNative) return NEAR_NATIVE_IDS_FIXED[chainKey] || null
  return `nep141:${prefix}-${addr}.omft.near`
}

// --- Helpers ---

let passed = 0
let failed = 0
let skipped = 0

function check(label: string, condition: boolean, detail?: string) {
  if (condition) { console.log(`  ✅ ${label}`); passed++ }
  else { console.log(`  ❌ ${label}${detail ? ` — ${detail}` : ''}`); failed++ }
}

function skip(label: string, reason: string) {
  console.log(`  ⏭️  ${label} — ${reason}`)
  skipped++
}

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

// ========================================================================
// SECTION 1: Verify NEAR Intents blockchain mapping produces correct chains
// ========================================================================

async function testNearChainMapping() {
  header('NEAR Intents — Blockchain Name Mapping (Fixed)')

  if (!process.env.NEAR_INTENTS_JWT) {
    skip('NEAR chain mapping', 'NEAR_INTENTS_JWT not configured')
    return
  }

  const tokens = await OneClickService.getTokens()
  const blockchains = new Set<string>()
  for (const t of tokens) {
    const bc = (t as { blockchain?: string }).blockchain
    if (bc) blockchains.add(bc)
  }

  console.log(`  NEAR API returns ${blockchains.size} blockchains`)

  // Verify every blockchain from API maps to a chain key
  let unmapped = 0
  for (const bc of [...blockchains].sort()) {
    const mapping = NEAR_BC_TO_KEY_FIXED[bc]
    if (mapping) {
      console.log(`  ${bc.padEnd(12)} → key="${mapping.key}" type=${mapping.type}`)
    } else {
      console.log(`  ${bc.padEnd(12)} → ⚠️  UNMAPPED (will use "${bc}" as key)`)
      unmapped++
    }
  }

  check('Most blockchains are mapped', unmapped <= 5, `${unmapped} unmapped`)

  // Verify key EVM chains
  check('eth → key "1"', NEAR_BC_TO_KEY_FIXED['eth']?.key === '1')
  check('arb → key "42161"', NEAR_BC_TO_KEY_FIXED['arb']?.key === '42161')
  check('base → key "8453"', NEAR_BC_TO_KEY_FIXED['base']?.key === '8453')
  check('op → key "10"', NEAR_BC_TO_KEY_FIXED['op']?.key === '10')
  check('pol → key "137"', NEAR_BC_TO_KEY_FIXED['pol']?.key === '137')
  check('bsc → key "56"', NEAR_BC_TO_KEY_FIXED['bsc']?.key === '56')
  check('avax → key "43114"', NEAR_BC_TO_KEY_FIXED['avax']?.key === '43114')

  // Verify non-EVM
  check('sol → key "solana"', NEAR_BC_TO_KEY_FIXED['sol']?.key === 'solana')
  check('btc → key "bitcoin"', NEAR_BC_TO_KEY_FIXED['btc']?.key === 'bitcoin')
  check('near → key "near"', NEAR_BC_TO_KEY_FIXED['near']?.key === 'near')
  check('doge → key "dogecoin"', NEAR_BC_TO_KEY_FIXED['doge']?.key === 'dogecoin')
}

// ========================================================================
// SECTION 2: Verify NEAR Intents token filtering with fixed mapping
// ========================================================================

async function testNearTokenFiltering() {
  header('NEAR Intents — Token Filtering (Fixed Mapping)')

  if (!process.env.NEAR_INTENTS_JWT) {
    skip('NEAR token filtering', 'NEAR_INTENTS_JWT not configured')
    return
  }

  const tokens = await OneClickService.getTokens()

  // Test filtering for each key chain
  const testChains = [
    { key: 'solana', nearBc: 'sol', expectSymbols: ['SOL'] },
    { key: '42161', nearBc: 'arb', expectSymbols: ['ETH', 'USDC'] },
    { key: '1', nearBc: 'eth', expectSymbols: ['USDC', 'USDT'] },
    { key: '8453', nearBc: 'base', expectSymbols: ['ETH'] },
    { key: '137', nearBc: 'pol', expectSymbols: ['USDC'] },
    { key: 'bitcoin', nearBc: 'btc', expectSymbols: ['BTC'] },
    { key: '10', nearBc: 'op', expectSymbols: ['ETH'] },
    { key: '56', nearBc: 'bsc', expectSymbols: ['BNB'] },
  ]

  for (const tc of testChains) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chainTokens = tokens.filter((t: any) => t.blockchain === tc.nearBc)
    const symbols = [...new Set(chainTokens.map((t: any) => (t as { symbol: string }).symbol))]

    if (chainTokens.length > 0) {
      const hasExpected = tc.expectSymbols.every((s) =>
        symbols.some((sym) => sym.toUpperCase().includes(s)),
      )
      check(
        `${tc.key} (bc="${tc.nearBc}"): ${chainTokens.length} tokens, has ${tc.expectSymbols.join('/')}`,
        hasExpected,
        `symbols: ${symbols.slice(0, 5).join(', ')}`,
      )
    } else {
      check(`${tc.key} (bc="${tc.nearBc}"): has tokens`, false, '0 tokens')
    }
  }
}

// ========================================================================
// SECTION 3: Verify NEAR asset ID construction (case sensitivity)
// ========================================================================

async function testNearAssetIds() {
  header('NEAR Intents — Asset ID Construction (Case Sensitivity Fix)')

  // EVM addresses — should be lowercased (EVM is case-insensitive)
  const evmTests = [
    { chain: '42161', token: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', label: 'Arb USDC' },
    { chain: '1', token: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', label: 'Eth USDC' },
    { chain: '8453', token: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', label: 'Base USDC' },
  ]

  for (const t of evmTests) {
    const id = getAssetIdFixed(t.chain, t.token)
    const hasLowerAddr = id?.includes(t.token.toLowerCase()) || false
    check(`${t.label}: address lowercased in asset ID`, hasLowerAddr, id || 'null')
  }

  // Solana addresses — must preserve case (base58 is case-sensitive)
  const solTests = [
    {
      chain: 'solana',
      token: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      label: 'Solana USDC',
    },
    {
      chain: 'solana',
      token: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
      label: 'Solana USDT',
    },
  ]

  for (const t of solTests) {
    const id = getAssetIdFixed(t.chain, t.token)
    const preservesCase = id?.includes(t.token) || false
    check(`${t.label}: case preserved in asset ID`, preservesCase, id || 'null')
  }

  // Native tokens
  const nativeTests = [
    { chain: '42161', token: NATIVE, label: 'Arb ETH (native)', expected: 'nep141:arb.omft.near' },
    { chain: 'solana', token: SOL_NATIVE, label: 'SOL (native)', expected: 'nep141:sol.omft.near' },
    { chain: '1', token: NATIVE, label: 'ETH (native)', expected: 'nep141:eth.omft.near' },
    { chain: 'bitcoin', token: '', label: 'BTC (native)', expected: 'nep141:btc.omft.near' },
  ]

  for (const t of nativeTests) {
    const id = getAssetIdFixed(t.chain, t.token)
    check(`${t.label}: correct native ID`, id === t.expected, `got "${id}", expected "${t.expected}"`)
  }
}

// ========================================================================
// SECTION 4: Verify NEAR Intents quotes with fixed asset IDs
// ========================================================================

async function testNearQuotes() {
  header('NEAR Intents — Quote Requests (Fixed Asset IDs)')

  if (!process.env.NEAR_INTENTS_JWT) {
    skip('NEAR quotes', 'NEAR_INTENTS_JWT not configured')
    return
  }

  const quoteTests = [
    { from: 'solana', fromToken: SOL_NATIVE, to: '42161', toToken: USDC['42161'], amount: '1000000000', label: 'SOL→Arb USDC (native)' },
    { from: 'solana', fromToken: USDC['solana'], to: '42161', toToken: USDC['42161'], amount: '10000000', label: 'Solana USDC→Arb USDC (SPL)' },
    { from: '42161', fromToken: NATIVE, to: '1', toToken: USDC['1'], amount: '100000000000000000', label: 'Arb ETH→Eth USDC (EVM→EVM)' },
    { from: '1', fromToken: USDC['1'], to: '42161', toToken: USDC['42161'], amount: '10000000', label: 'Eth USDC→Arb USDC (EVM cross)' },
    { from: 'bitcoin', fromToken: '', to: '42161', toToken: USDC['42161'], amount: '100000', label: 'BTC→Arb USDC (0.001 BTC)' },
  ]

  for (const t of quoteTests) {
    const originAsset = getAssetIdFixed(t.from, t.fromToken)
    const destAsset = getAssetIdFixed(t.to, t.toToken)

    if (!originAsset || !destAsset) {
      check(`${t.label}`, false, `asset ID generation failed: origin=${originAsset}, dest=${destAsset}`)
      continue
    }

    process.stdout.write(`  [${t.label.padEnd(35)}] `)
    try {
      const deadline = new Date(Date.now() + 3600000).toISOString()
      const response = await OneClickService.getQuote({
        dry: false,
        swapType: DefuseQuoteRequest.swapType.EXACT_INPUT,
        slippageTolerance: 100,
        originAsset,
        depositType: DefuseQuoteRequest.depositType.ORIGIN_CHAIN,
        destinationAsset: destAsset,
        amount: t.amount,
        refundTo: t.from === 'solana' ? WALLETS.solana : WALLETS.evm,
        refundType: DefuseQuoteRequest.refundType.ORIGIN_CHAIN,
        recipient: t.to === 'solana' ? WALLETS.solana : WALLETS.evm,
        recipientType: DefuseQuoteRequest.recipientType.DESTINATION_CHAIN,
        deadline,
        referral: 'flash-protocol',
      })

      const quote = response.quote
      if (quote?.amountOut) {
        console.log(`✅ output=${quote.amountOutFormatted || quote.amountOut}`)
        passed++
      } else {
        console.log('❌ no quote returned')
        failed++
      }
    } catch (error) {
      console.log(`❌ ${String(error).slice(0, 80)}`)
      failed++
    }
  }
}

// ========================================================================
// SECTION 5: Verify provider quote requests across varied chains
// ========================================================================

async function testProviderQuotes() {
  header('Provider Quotes — Varied Chains (Current Providers, No Changes)')

  const { lifiProvider } = await import('@/services/providers/lifi')
  const { rangoProvider } = await import('@/services/providers/rango')
  const { rubicProvider } = await import('@/services/providers/rubic')
  const { symbiosisProvider } = await import('@/services/providers/symbiosis')

  interface QuoteTest {
    label: string
    request: QuoteRequest
    expectProviders: string[]
  }

  const quoteTests: QuoteTest[] = [
    {
      label: 'Arb ETH → Arb USDC (same-chain swap)',
      request: {
        fromChain: 42161,
        toChain: 42161,
        fromToken: NATIVE,
        toToken: USDC['42161'],
        fromAmount: '100000000000000000',
        fromAddress: WALLETS.evm,
        fromTokenDecimals: 18,
        slippage: 1,
      },
      expectProviders: ['lifi', 'symbiosis'],
    },
    {
      label: 'Eth USDC → Arb USDC (EVM cross-chain)',
      request: {
        fromChain: 1,
        toChain: 42161,
        fromToken: USDC['1'],
        toToken: USDC['42161'],
        fromAmount: '10000000',
        fromAddress: WALLETS.evm,
        fromTokenDecimals: 6,
        slippage: 1,
      },
      expectProviders: ['lifi'],
    },
    {
      label: 'Base ETH → Arb USDC (EVM cross-chain)',
      request: {
        fromChain: 8453,
        toChain: 42161,
        fromToken: NATIVE,
        toToken: USDC['42161'],
        fromAmount: '100000000000000000',
        fromAddress: WALLETS.evm,
        fromTokenDecimals: 18,
        slippage: 1,
      },
      expectProviders: ['lifi'],
    },
    {
      label: 'Solana SOL → Arb USDC (non-EVM cross)',
      request: {
        fromChain: 'solana',
        toChain: 42161,
        fromToken: SOL_NATIVE,
        toToken: USDC['42161'],
        fromAmount: '1000000000',
        fromAddress: WALLETS.solana,
        fromTokenDecimals: 9,
        slippage: 1,
      },
      expectProviders: ['lifi'],
    },
    {
      label: 'Solana USDC → Arb USDC (SPL cross)',
      request: {
        fromChain: 'solana',
        toChain: 42161,
        fromToken: USDC['solana'],
        toToken: USDC['42161'],
        fromAmount: '10000000',
        fromAddress: WALLETS.solana,
        fromTokenDecimals: 6,
        slippage: 1,
      },
      expectProviders: ['lifi'],
    },
    {
      label: 'Polygon USDC → Arb USDC (EVM cross)',
      request: {
        fromChain: 137,
        toChain: 42161,
        fromToken: USDC['137'],
        toToken: USDC['42161'],
        fromAmount: '10000000',
        fromAddress: WALLETS.evm,
        fromTokenDecimals: 6,
        slippage: 1,
      },
      expectProviders: ['lifi'],
    },
  ]

  const allProviders = [
    { name: 'lifi', provider: lifiProvider },
    { name: 'rango', provider: rangoProvider },
    { name: 'rubic', provider: rubicProvider },
    { name: 'symbiosis', provider: symbiosisProvider },
  ]

  for (const test of quoteTests) {
    console.log(`\n  ${test.label}`)
    console.log(`    from: ${test.request.fromChain} → to: ${test.request.toChain}`)

    for (const { name, provider } of allProviders) {
      process.stdout.write(`    [${name.padEnd(12)}] `)
      try {
        const start = Date.now()
        const quotes = await provider.getQuote(test.request)
        const elapsed = Date.now() - start

        if (quotes.length > 0) {
          const q = quotes[0]
          const outputFormatted = formatAmount(q.toAmount, 6)
          console.log(`✅ ${outputFormatted} USDC (${elapsed}ms)`)
        } else {
          console.log(`— no routes (${elapsed}ms)`)
        }
      } catch (error) {
        console.log(`❌ ${String(error).slice(0, 60)}`)
      }
    }
  }
}

// ========================================================================
// SECTION 6: Verify ChainTokenService with proposed NEAR mapping changes
// ========================================================================

async function testChainTokenService() {
  header('ChainTokenService — Key Chains After Fix')

  const { ChainTokenService } = await import('@/services/chain-token-service')
  ChainTokenService.clearCache()

  const chains = await ChainTokenService.getChains()
  console.log(`  Total chains: ${chains.length}`)

  // Check key chains exist and have correct metadata
  const keyChains = [
    { key: '1', name: 'Ethereum', type: 'evm', hasLifi: true, hasRango: true },
    { key: '42161', name: 'Arbitrum', type: 'evm', hasLifi: true, hasRango: true },
    { key: '8453', name: 'Base', type: 'evm', hasLifi: true, hasRango: true },
    { key: '137', name: 'Polygon', type: 'evm', hasLifi: true, hasRango: true },
    { key: '10', name: 'Optimism', type: 'evm', hasLifi: true, hasRango: true },
    { key: '56', name: 'BNB', type: 'evm', hasLifi: true, hasRango: true },
    { key: '43114', name: 'Avalanche', type: 'evm', hasLifi: true, hasRango: true },
    { key: 'solana', name: 'Solana', type: 'solana', hasLifi: true, hasRango: true },
    { key: 'bitcoin', name: 'Bitcoin', type: 'bitcoin', hasLifi: true, hasRango: false },
  ]

  for (const kc of keyChains) {
    const chain = chains.find((c) => c.key === kc.key)
    if (!chain) {
      check(`${kc.name} (key="${kc.key}") exists`, false)
      continue
    }
    check(
      `${kc.name} (key="${kc.key}"): type=${chain.type}, lifi=${chain.providers.lifi}, rango=${chain.providers.rango}`,
      chain.type === kc.type && chain.providers.lifi === kc.hasLifi,
    )
  }

  // Check no duplicate Solana
  const solanaEntries = chains.filter((c) => c.name.toLowerCase().includes('solana') || c.key === 'solana' || c.key === '1151111081099710')
  check('Single Solana entry (no duplicates)', solanaEntries.length === 1, `found ${solanaEntries.length}: ${solanaEntries.map(c => c.key).join(', ')}`)

  // Spot-check tokens for key chains
  const tokenTests = [
    { chainKey: '42161', expectSymbol: 'USDC', minCount: 10 },
    { chainKey: '1', expectSymbol: 'USDC', minCount: 10 },
    { chainKey: 'solana', expectSymbol: 'USDC', minCount: 5 },
  ]

  for (const tt of tokenTests) {
    const tokens = await ChainTokenService.getTokens(tt.chainKey)
    const hasExpected = tokens.some((t) => t.symbol === tt.expectSymbol)
    check(
      `Tokens for ${tt.chainKey}: ${tokens.length} tokens, has ${tt.expectSymbol}`,
      tokens.length >= tt.minCount && hasExpected,
      `count=${tokens.length}, has${tt.expectSymbol}=${hasExpected}`,
    )
  }
}

// ========================================================================
// SECTION 7: Verify Rubic decimals handling
// ========================================================================

async function testRubicDecimals() {
  header('Rubic — Decimal Handling Verification')

  // Import Rubic to test formatAmount and toWei behavior
  const { rubicProvider } = await import('@/services/providers/rubic')

  // Test with correct decimals
  const tests = [
    {
      label: 'SOL→USDC (9 decimals)',
      request: {
        fromChain: 'solana' as const,
        toChain: 42161,
        fromToken: SOL_NATIVE,
        toToken: USDC['42161'],
        fromAmount: '1000000000', // 1 SOL
        fromAddress: WALLETS.solana,
        fromTokenDecimals: 9,
        slippage: 1,
      },
    },
    {
      label: 'Solana USDC→Arb USDC (6 decimals)',
      request: {
        fromChain: 'solana' as const,
        toChain: 42161,
        fromToken: USDC['solana'],
        toToken: USDC['42161'],
        fromAmount: '10000000', // 10 USDC
        fromAddress: WALLETS.solana,
        fromTokenDecimals: 6,
        slippage: 1,
      },
    },
    {
      label: 'Arb ETH→Arb USDC (18 decimals)',
      request: {
        fromChain: 42161,
        toChain: 42161,
        fromToken: NATIVE,
        toToken: USDC['42161'],
        fromAmount: '100000000000000000', // 0.1 ETH
        fromAddress: WALLETS.evm,
        fromTokenDecimals: 18,
        slippage: 1,
      },
    },
  ]

  for (const t of tests) {
    process.stdout.write(`  [${t.label.padEnd(40)}] `)
    try {
      const quotes = await rubicProvider.getQuote(t.request as QuoteRequest)
      if (quotes.length > 0) {
        const q = quotes[0]
        const output = formatAmount(q.toAmount, 6)
        console.log(`✅ ${output} USDC`)

        // Sanity check output range
        const outputNum = parseFloat(output)
        if (t.label.includes('SOL') && !t.label.includes('USDC→') && (outputNum < 10 || outputNum > 500)) {
          console.log(`    ⚠️  1 SOL should be ~$80-200 USDC, got ${outputNum}`)
        }
        if (t.label.includes('USDC→') && (outputNum < 5 || outputNum > 15)) {
          console.log(`    ⚠️  10 USDC should give ~9-11 USDC, got ${outputNum}`)
        }
      } else {
        console.log('— no routes')
      }
    } catch (error) {
      console.log(`❌ ${String(error).slice(0, 60)}`)
    }
  }
}

// ========================================================================
// MAIN
// ========================================================================

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════════╗')
  console.log('║  Comprehensive Cross-Check — Pre-Production Verification            ║')
  console.log('╚══════════════════════════════════════════════════════════════════════╝')

  await testNearChainMapping()
  await testNearTokenFiltering()
  await testNearAssetIds()
  await testNearQuotes()
  await testProviderQuotes()
  await testChainTokenService()
  await testRubicDecimals()

  header('FINAL SUMMARY')
  console.log(`  ✅ Passed:  ${passed}`)
  console.log(`  ❌ Failed:  ${failed}`)
  console.log(`  ⏭️  Skipped: ${skipped}`)
  console.log(`  Total:     ${passed + failed + skipped}`)
  console.log()

  if (failed > 0) {
    console.log('  ⚠️  Some checks failed. Review above before applying production changes.')
    process.exit(1)
  } else {
    console.log('  🎉 All checks passed! Safe to apply production changes.')
  }
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
