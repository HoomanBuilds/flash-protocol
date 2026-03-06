/**
 * Script 1: Test Chain & Token Fetching for Solana + EVM
 *
 * Verifies:
 * - Solana chain appears with key "solana", type "solana", chainId null
 * - Solana tokens (SOL, USDC, USDT) have correct addresses and decimals
 * - USDC mint address EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v is present
 * - EVM baseline (Arbitrum 42161) works correctly for comparison
 *
 * Usage:
 *   npx tsx scripts/test-chain-tokens.ts
 */

import { config } from 'dotenv'
config({ path: '.env.local' })

import { createConfig, getChains, getTokens, ChainType as LifiChainType } from '@lifi/sdk'
import { RangoClient } from 'rango-sdk-basic'
import { OneClickService, OpenAPI } from '@defuse-protocol/one-click-sdk-typescript'

// --- Init SDKs ---

createConfig({
  integrator: process.env.NEXT_PUBLIC_LIFI_INTEGRATOR_ID || 'flash-protocol',
})

OpenAPI.BASE = 'https://1click.chaindefuser.com'
if (process.env.NEAR_INTENTS_JWT) {
  OpenAPI.TOKEN = process.env.NEAR_INTENTS_JWT
}

// --- Constants ---

const SOLANA_USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
const SOLANA_USDT_MINT = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'
const LIFI_SOLANA_CHAIN_ID = 1151111081099710
const ARB_CHAIN_ID = 42161

// --- Helpers ---

let passed = 0
let failed = 0

function check(label: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  ✅ ${label}`)
    passed++
  } else {
    console.log(`  ❌ ${label}${detail ? ` — ${detail}` : ''}`)
    failed++
  }
}

function header(title: string) {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`  ${title}`)
  console.log('='.repeat(60))
}

// ========== CHAIN TESTS ==========

async function testLifiChains() {
  header('LiFi Chains')
  try {
    const chains = await getChains({
      chainTypes: [LifiChainType.EVM, LifiChainType.SVM, LifiChainType.UTXO],
    })

    console.log(`  Total chains: ${chains.length}`)

    // Find Solana
    const solana = chains.find(
      (c) => c.id === LIFI_SOLANA_CHAIN_ID || c.name.toLowerCase() === 'solana',
    )
    check('Solana chain exists in LiFi', !!solana)
    if (solana) {
      console.log(`    id: ${solana.id}, name: ${solana.name}, chainType: ${solana.chainType}`)
      check(
        'LiFi Solana chainId is 1151111081099710',
        solana.id === LIFI_SOLANA_CHAIN_ID,
        `got ${solana.id}`,
      )
      check(
        'LiFi Solana chainType is SVM',
        solana.chainType === 'SVM',
        `got ${solana.chainType}`,
      )
    }

    // Find Arbitrum
    const arb = chains.find((c) => c.id === ARB_CHAIN_ID)
    check('Arbitrum chain exists in LiFi', !!arb)
    if (arb) {
      console.log(`    id: ${arb.id}, name: ${arb.name}`)
    }
  } catch (error) {
    console.log(`  ⚠️  LiFi getChains() failed: ${error}`)
  }
}

async function testRangoChains() {
  header('Rango Chains')
  try {
    const apiKey = process.env.RANGO_API_KEY
    if (!apiKey || apiKey.length <= 10) {
      console.log('  ⚠️  RANGO_API_KEY not configured, skipping')
      return
    }

    const client = new RangoClient(apiKey)
    const meta = await client.meta()

    if (!meta?.blockchains) {
      console.log('  ⚠️  meta().blockchains is empty')
      return
    }

    console.log(`  Total blockchains: ${meta.blockchains.length}`)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const solana = meta.blockchains.find((bc: any) => bc.name === 'SOLANA')
    check('Solana blockchain exists in Rango', !!solana)
    if (solana) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const s = solana as any
      console.log(
        `    name: ${s.name}, chainId: ${s.chainId}, type: ${s.type}, displayName: ${s.displayName}`,
      )
      check(
        'Rango Solana chainId is null/empty',
        !s.chainId || s.chainId === 'null',
        `got "${s.chainId}"`,
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const arb = meta.blockchains.find((bc: any) => bc.name === 'ARBITRUM' || bc.chainId === '42161')
    check('Arbitrum blockchain exists in Rango', !!arb)
    if (arb) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const a = arb as any
      console.log(`    name: ${a.name}, chainId: ${a.chainId}`)
    }
  } catch (error) {
    console.log(`  ⚠️  Rango meta() failed: ${error}`)
  }
}

async function testNearChains() {
  header('NEAR Intents Chains')
  try {
    if (!process.env.NEAR_INTENTS_JWT) {
      console.log('  ⚠️  NEAR_INTENTS_JWT not configured, skipping')
      return
    }

    const tokens = await OneClickService.getTokens()
    if (!tokens || !Array.isArray(tokens)) {
      console.log('  ⚠️  getTokens() returned empty')
      return
    }

    console.log(`  Total tokens from NEAR: ${tokens.length}`)

    // Extract unique blockchains
    const blockchains = new Set<string>()
    for (const t of tokens) {
      const bc = (t as { blockchain?: string }).blockchain
      if (bc) blockchains.add(bc)
    }
    console.log(`  Unique blockchains: ${[...blockchains].sort().join(', ')}`)

    check('NEAR has "solana" blockchain', blockchains.has('solana'))
    check('NEAR has "arbitrum" blockchain', blockchains.has('arbitrum'))
    check('NEAR has "ethereum" blockchain', blockchains.has('ethereum'))
  } catch (error) {
    console.log(`  ⚠️  NEAR Intents getTokens() failed: ${error}`)
  }
}

// ========== TOKEN TESTS ==========

async function testLifiTokens() {
  header('LiFi Tokens — Solana')
  try {
    const response = await getTokens({ chains: [LIFI_SOLANA_CHAIN_ID] })
    const solTokens = response.tokens?.[LIFI_SOLANA_CHAIN_ID] || []

    console.log(`  Tokens found: ${solTokens.length}`)

    if (solTokens.length > 0) {
      // Show first 10
      console.log('  Sample tokens:')
      for (const t of solTokens.slice(0, 10)) {
        console.log(`    ${t.symbol.padEnd(10)} ${t.address.slice(0, 20)}... (${t.decimals} dec)`)
      }

      const usdc = solTokens.find(
        (t: { address: string }) => t.address === SOLANA_USDC_MINT,
      )
      check('USDC mint address found', !!usdc, SOLANA_USDC_MINT)
      if (usdc) {
        check('USDC decimals is 6', usdc.decimals === 6, `got ${usdc.decimals}`)
      }

      const usdt = solTokens.find(
        (t: { address: string }) => t.address === SOLANA_USDT_MINT,
      )
      check('USDT mint address found', !!usdt, SOLANA_USDT_MINT)
    } else {
      check('LiFi returns Solana tokens', false, 'empty token list')
    }
  } catch (error) {
    console.log(`  ⚠️  LiFi getTokens() for Solana failed: ${error}`)
  }

  header('LiFi Tokens — Arbitrum (baseline)')
  try {
    const response = await getTokens({ chains: [ARB_CHAIN_ID] })
    const arbTokens = response.tokens?.[ARB_CHAIN_ID] || []

    console.log(`  Tokens found: ${arbTokens.length}`)
    check('Arbitrum has tokens', arbTokens.length > 0)

    const usdc = arbTokens.find(
      (t: { symbol: string }) => t.symbol === 'USDC',
    )
    check('Arbitrum USDC found', !!usdc)
    if (usdc) {
      console.log(`    USDC address: ${usdc.address}`)
      check('Arbitrum USDC decimals is 6', usdc.decimals === 6, `got ${usdc.decimals}`)
    }
  } catch (error) {
    console.log(`  ⚠️  LiFi getTokens() for Arbitrum failed: ${error}`)
  }
}

async function testRangoTokens() {
  header('Rango Tokens — Solana')
  try {
    const apiKey = process.env.RANGO_API_KEY
    if (!apiKey || apiKey.length <= 10) {
      console.log('  ⚠️  RANGO_API_KEY not configured, skipping')
      return
    }

    const client = new RangoClient(apiKey)
    const meta = await client.meta()

    if (!meta?.tokens) {
      console.log('  ⚠️  meta().tokens is empty')
      return
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const solTokens = meta.tokens.filter((t: any) => t.blockchain === 'SOLANA')
    console.log(`  Solana tokens found: ${solTokens.length}`)

    if (solTokens.length > 0) {
      console.log('  Sample tokens:')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const t of solTokens.slice(0, 10) as any[]) {
        console.log(
          `    ${(t.symbol || '???').padEnd(10)} ${(t.address || 'native').slice(0, 20)}... (${t.decimals} dec)`,
        )
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const usdc = solTokens.find((t: any) => t.address === SOLANA_USDC_MINT)
      check('Rango has Solana USDC', !!usdc, SOLANA_USDC_MINT)
    } else {
      check('Rango returns Solana tokens', false, 'empty')
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const arbTokens = meta.tokens.filter((t: any) => t.blockchain === 'ARBITRUM')
    console.log(`\n  Arbitrum tokens found: ${arbTokens.length}`)
    check('Rango returns Arbitrum tokens', arbTokens.length > 0)
  } catch (error) {
    console.log(`  ⚠️  Rango meta() failed: ${error}`)
  }
}

async function testNearTokens() {
  header('NEAR Intents Tokens — Solana')
  try {
    if (!process.env.NEAR_INTENTS_JWT) {
      console.log('  ⚠️  NEAR_INTENTS_JWT not configured, skipping')
      return
    }

    const tokens = await OneClickService.getTokens()
    if (!tokens || !Array.isArray(tokens)) {
      console.log('  ⚠️  getTokens() returned empty')
      return
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const solTokens = tokens.filter((t: any) => t.blockchain === 'solana')
    console.log(`  Solana tokens found: ${solTokens.length}`)

    if (solTokens.length > 0) {
      console.log('  All Solana tokens:')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const t of solTokens as any[]) {
        console.log(
          `    ${(t.symbol || '???').padEnd(10)} contract=${t.contractAddress || 'native'} assetId=${t.assetId}`,
        )
      }

      // Check USDC — note NEAR Intents stores address in contractAddress
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const usdc = solTokens.find((t: any) => t.contractAddress === SOLANA_USDC_MINT)
      check('NEAR has Solana USDC (exact case)', !!usdc, SOLANA_USDC_MINT)

      // BUG CHECK: Does lowercasing break the address?
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const usdcLower = solTokens.find((t: any) => t.contractAddress?.toLowerCase() === SOLANA_USDC_MINT.toLowerCase())
      if (usdcLower && !usdc) {
        console.log('  🐛 BUG: USDC found via lowercase but NOT exact case — case sensitivity issue!')
      }
    } else {
      check('NEAR returns Solana tokens', false, 'empty')
    }
  } catch (error) {
    console.log(`  ⚠️  NEAR Intents getTokens() failed: ${error}`)
  }
}

// ========== CHAIN-TOKEN SERVICE INTEGRATION TEST ==========

async function testChainTokenService() {
  header('ChainTokenService Integration Test')
  try {
    // Import the actual service to test the full pipeline
    const { ChainTokenService } = await import('@/services/chain-token-service')
    ChainTokenService.clearCache()

    console.log('  Fetching all chains via ChainTokenService...')
    const chains = await ChainTokenService.getChains()
    console.log(`  Total unified chains: ${chains.length}`)

    // Find Solana
    const solana = chains.find((c) => c.key === 'solana')
    check('Solana chain exists (key="solana")', !!solana)
    if (solana) {
      console.log(`    key: ${solana.key}`)
      console.log(`    chainId: ${solana.chainId}`)
      console.log(`    name: ${solana.name}`)
      console.log(`    type: ${solana.type}`)
      console.log(`    providers: ${JSON.stringify(solana.providers)}`)
      console.log(`    providerIds: ${JSON.stringify(solana.providerIds)}`)

      check('Solana type is "solana"', solana.type === 'solana', `got "${solana.type}"`)
      check('Solana chainId is null', solana.chainId === null, `got ${solana.chainId}`)
      check('Solana has LiFi support', solana.providers.lifi === true)
      check('Solana has Rango support', solana.providers.rango === true)
      check('Solana has NEAR Intents support', solana.providers.nearIntents === true)
    }

    // Check for duplicate Solana entries (bug: LiFi key "1151111081099710" not aliased)
    const solanaLifi = chains.find((c) => c.key === '1151111081099710')
    check(
      'No duplicate Solana with key "1151111081099710"',
      !solanaLifi,
      solanaLifi ? 'duplicate exists — CHAIN_KEY_ALIASES not working' : undefined,
    )

    // Find Arbitrum
    const arb = chains.find((c) => c.key === '42161')
    check('Arbitrum chain exists (key="42161")', !!arb)
    if (arb) {
      console.log(`    name: ${arb.name}, chainId: ${arb.chainId}`)
    }

    // Test Solana tokens
    console.log('\n  Fetching Solana tokens...')
    const solTokens = await ChainTokenService.getTokens('solana')
    console.log(`  Solana tokens: ${solTokens.length}`)

    if (solTokens.length > 0) {
      console.log('  Sample:')
      for (const t of solTokens.slice(0, 10)) {
        console.log(
          `    ${t.symbol.padEnd(10)} ${t.address.slice(0, 30)}... (${t.decimals} dec) native=${t.isNative}`,
        )
      }

      const usdc = solTokens.find((t) => t.address === SOLANA_USDC_MINT)
      check('Solana USDC in merged tokens', !!usdc, SOLANA_USDC_MINT)

      // BUG CHECK: token addresses lowercased during merge?
      const usdcLower = solTokens.find(
        (t) => t.address.toLowerCase() === SOLANA_USDC_MINT.toLowerCase() && t.address !== SOLANA_USDC_MINT,
      )
      if (usdcLower) {
        console.log(`  🐛 BUG: USDC address was lowercased: ${usdcLower.address}`)
        console.log('    Expected:', SOLANA_USDC_MINT)
        console.log('    mergeTokens() uses address.toLowerCase() as dedup key — this destroys Solana addresses')
      }
    } else {
      check('Solana has tokens', false, 'empty token list')
    }

    // Test Arbitrum tokens (baseline)
    console.log('\n  Fetching Arbitrum tokens...')
    const arbTokens = await ChainTokenService.getTokens('42161')
    console.log(`  Arbitrum tokens: ${arbTokens.length}`)
    check('Arbitrum has tokens', arbTokens.length > 0)
  } catch (error) {
    console.log(`  ⚠️  ChainTokenService test failed: ${error}`)
  }
}

// ========== MAIN ==========

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗')
  console.log('║  Chain & Token Fetching Test — Solana + EVM              ║')
  console.log('╚════════════════════════════════════════════════════════════╝')

  // Phase 1: Individual provider chain tests
  await testLifiChains()
  await testRangoChains()
  await testNearChains()

  // Phase 2: Individual provider token tests
  await testLifiTokens()
  await testRangoTokens()
  await testNearTokens()

  // Phase 3: Full ChainTokenService integration
  await testChainTokenService()

  // Summary
  header('SUMMARY')
  console.log(`  ✅ Passed: ${passed}`)
  console.log(`  ❌ Failed: ${failed}`)
  console.log(`  Total: ${passed + failed}`)
  console.log()

  if (failed > 0) {
    process.exit(1)
  }
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
