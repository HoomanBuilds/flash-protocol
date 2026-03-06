/**
 * Script: Fetch and inspect chains from all providers
 *
 * Usage:
 *   npx tsx scripts/fetch-chains.ts
 *   npx tsx scripts/fetch-chains.ts --tokens 1      # also fetch tokens for chain key "1"
 *   npx tsx scripts/fetch-chains.ts --type evm       # filter by chain type
 *   npx tsx scripts/fetch-chains.ts --provider lifi  # filter by provider
 */

import { config } from 'dotenv'
config({ path: '.env.local' })

import { createConfig, getChains, ChainType as LifiChainType } from '@lifi/sdk'
import { RangoClient } from 'rango-sdk-basic'
import { OneClickService, OpenAPI } from '@defuse-protocol/one-click-sdk-typescript'
import { SYMBIOSIS_CONFIG } from '@/services/providers/symbiosis-data'
import { normalizeChainType, type ChainType } from '@/lib/chain-registry'

// --- Init SDKs ---

createConfig({
  integrator: process.env.NEXT_PUBLIC_LIFI_INTEGRATOR_ID || 'flash-protocol',
})

OpenAPI.BASE = 'https://1click.chaindefuser.com'
if (process.env.NEAR_INTENTS_JWT) {
  OpenAPI.TOKEN = process.env.NEAR_INTENTS_JWT
}

// --- Types ---

interface RawChain {
  key: string
  chainId: number | null
  name: string
  type: ChainType
  symbol: string
  logoUrl?: string
  provider: string
  providerId: string | number
}

// --- Provider fetchers ---

async function fetchLifi(): Promise<RawChain[]> {
  try {
    const chains = await getChains({
      chainTypes: [LifiChainType.EVM, LifiChainType.SVM, LifiChainType.UTXO],
    })
    return chains.map((c) => {
      const chainType = normalizeChainType(c.chainType || 'EVM')
      const key = chainType === 'bitcoin' ? c.name.toLowerCase() : String(c.id)
      return {
        key,
        chainId: chainType === 'bitcoin' ? null : (typeof c.id === 'number' ? c.id : null),
        name: c.name,
        type: chainType,
        symbol: c.nativeToken?.symbol || 'ETH',
        logoUrl: c.logoURI,
        provider: 'lifi',
        providerId: c.id,
      }
    })
  } catch (e) {
    console.error('LiFi fetch failed:', e)
    return []
  }
}

async function fetchRango(): Promise<RawChain[]> {
  try {
    const apiKey = process.env.RANGO_API_KEY
    if (!apiKey || apiKey.length <= 10) {
      console.warn('Rango: No valid API key, skipping')
      return []
    }
    const client = new RangoClient(apiKey)
    const meta = await client.meta()
    if (!meta?.blockchains) return []

    return meta.blockchains
      .filter((bc: { enabled?: boolean }) => bc.enabled !== false)
      .map(
        (bc: {
          name: string
          chainId?: string | null
          type?: string
          logo?: string
          displayName?: string
          shortName?: string
        }) => {
          const chainId = bc.chainId ? parseInt(bc.chainId) : null
          const key = chainId && !isNaN(chainId) ? String(chainId) : bc.name.toLowerCase()
          return {
            key,
            chainId: chainId && !isNaN(chainId) ? chainId : null,
            name: bc.displayName || bc.name,
            type: normalizeChainType(bc.type || 'EVM'),
            symbol: bc.shortName || bc.name,
            logoUrl: bc.logo,
            provider: 'rango',
            providerId: bc.name,
          }
        }
      )
  } catch (e) {
    console.error('Rango fetch failed:', e)
    return []
  }
}

function fetchSymbiosis(): RawChain[] {
  try {
    return SYMBIOSIS_CONFIG.chains
      .filter(
        (c: { metaRouterGateway?: string }) =>
          c.metaRouterGateway &&
          c.metaRouterGateway !== '0x0000000000000000000000000000000000000000'
      )
      .map((c: { id: number }) => ({
        key: String(c.id),
        chainId: c.id,
        name: `Chain ${c.id}`,
        type: 'evm' as ChainType,
        symbol: 'ETH',
        logoUrl: undefined,
        provider: 'symbiosis',
        providerId: c.id,
      }))
  } catch (e) {
    console.error('Symbiosis fetch failed:', e)
    return []
  }
}

async function fetchNear(): Promise<RawChain[]> {
  try {
    if (!process.env.NEAR_INTENTS_JWT) {
      console.warn('NEAR Intents: No JWT, skipping')
      return []
    }
    const tokens = await OneClickService.getTokens()
    if (!tokens || !Array.isArray(tokens)) return []

    const blockchainMap = new Map<string, string>()
    for (const t of tokens) {
      const bc = (t as { blockchain?: string }).blockchain
      if (bc && !blockchainMap.has(bc)) blockchainMap.set(bc, bc)
    }

    const nearMapping: Record<
      string,
      { key: string; chainId: number | null; type: ChainType; name: string; symbol: string }
    > = {
      ethereum: { key: '1', chainId: 1, type: 'evm', name: 'Ethereum', symbol: 'ETH' },
      arbitrum: { key: '42161', chainId: 42161, type: 'evm', name: 'Arbitrum One', symbol: 'ETH' },
      base: { key: '8453', chainId: 8453, type: 'evm', name: 'Base', symbol: 'ETH' },
      optimism: { key: '10', chainId: 10, type: 'evm', name: 'Optimism', symbol: 'ETH' },
      polygon: { key: '137', chainId: 137, type: 'evm', name: 'Polygon', symbol: 'MATIC' },
      bsc: { key: '56', chainId: 56, type: 'evm', name: 'BNB Smart Chain', symbol: 'BNB' },
      avalanche: {
        key: '43114',
        chainId: 43114,
        type: 'evm',
        name: 'Avalanche',
        symbol: 'AVAX',
      },
      gnosis: { key: '100', chainId: 100, type: 'evm', name: 'Gnosis', symbol: 'xDAI' },
      near: { key: 'near', chainId: null, type: 'near', name: 'NEAR', symbol: 'NEAR' },
      solana: { key: 'solana', chainId: null, type: 'solana', name: 'Solana', symbol: 'SOL' },
      bitcoin: { key: 'bitcoin', chainId: null, type: 'bitcoin', name: 'Bitcoin', symbol: 'BTC' },
      dogecoin: {
        key: 'dogecoin',
        chainId: null,
        type: 'bitcoin',
        name: 'Dogecoin',
        symbol: 'DOGE',
      },
      aurora: {
        key: '1313161554',
        chainId: 1313161554,
        type: 'evm',
        name: 'Aurora',
        symbol: 'ETH',
      },
    }

    const entries: RawChain[] = []
    for (const [blockchain] of blockchainMap) {
      const mapping = nearMapping[blockchain]
      if (mapping) {
        entries.push({ ...mapping, logoUrl: undefined, provider: 'near', providerId: blockchain })
      } else {
        entries.push({
          key: blockchain,
          chainId: null,
          name: blockchain.charAt(0).toUpperCase() + blockchain.slice(1),
          type: 'evm',
          symbol: blockchain.toUpperCase(),
          logoUrl: undefined,
          provider: 'near',
          providerId: blockchain,
        })
      }
    }
    return entries
  } catch (e) {
    console.error('NEAR Intents fetch failed:', e)
    return []
  }
}

function fetchCCTP(): RawChain[] {
  return [
    { key: '1', chainId: 1, name: 'Ethereum', type: 'evm', symbol: 'ETH', provider: 'cctp', providerId: 0 },
    { key: '42161', chainId: 42161, name: 'Arbitrum One', type: 'evm', symbol: 'ETH', provider: 'cctp', providerId: 3 },
    { key: '8453', chainId: 8453, name: 'Base', type: 'evm', symbol: 'ETH', provider: 'cctp', providerId: 6 },
    { key: '137', chainId: 137, name: 'Polygon', type: 'evm', symbol: 'MATIC', provider: 'cctp', providerId: 7 },
    { key: '10', chainId: 10, name: 'Optimism', type: 'evm', symbol: 'ETH', provider: 'cctp', providerId: 2 },
    { key: '43114', chainId: 43114, name: 'Avalanche', type: 'evm', symbol: 'AVAX', provider: 'cctp', providerId: 1 },
    { key: '59144', chainId: 59144, name: 'Linea', type: 'evm', symbol: 'ETH', provider: 'cctp', providerId: 11 },
    { key: '146', chainId: 146, name: 'Sonic', type: 'evm', symbol: 'S', provider: 'cctp', providerId: 14 },
  ]
}

// --- CLI args ---

const args = process.argv.slice(2)
function getArg(name: string): string | undefined {
  const idx = args.indexOf(`--${name}`)
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : undefined
}

// --- Main ---

async function main() {
  console.log('='.repeat(80))
  console.log('  FLASH PROTOCOL — Chain Fetcher Debug Script')
  console.log('='.repeat(80))
  console.log()

  const filterType = getArg('type') as ChainType | undefined
  const filterProvider = getArg('provider')

  // Fetch from all providers in parallel
  console.log('Fetching chains from all providers...\n')

  const results = await Promise.allSettled([
    fetchLifi(),
    fetchRango(),
    Promise.resolve(fetchSymbiosis()),
    fetchNear(),
    Promise.resolve(fetchCCTP()),
  ])

  const providerNames = ['lifi', 'rango', 'symbiosis', 'near', 'cctp']
  const providerResults: Record<string, RawChain[]> = {}

  for (let i = 0; i < results.length; i++) {
    const name = providerNames[i]
    if (results[i].status === 'fulfilled') {
      providerResults[name] = (results[i] as PromiseFulfilledResult<RawChain[]>).value
    } else {
      providerResults[name] = []
      console.error(
        `  ✗ ${name} FAILED:`,
        (results[i] as PromiseRejectedResult).reason
      )
    }
  }

  // --- Per-provider summary ---

  console.log('┌─────────────────────────────────────────────────────────┐')
  console.log('│  PER-PROVIDER RESULTS                                  │')
  console.log('└─────────────────────────────────────────────────────────┘\n')

  for (const [name, chains] of Object.entries(providerResults)) {
    const evmCount = chains.filter((c) => c.type === 'evm').length
    const nonEvmCount = chains.length - evmCount
    const types = [...new Set(chains.map((c) => c.type))].join(', ')

    console.log(`  ${name.toUpperCase().padEnd(12)} ${String(chains.length).padStart(4)} chains  (${evmCount} EVM, ${nonEvmCount} non-EVM)  types: [${types}]`)

    if (chains.length > 0 && chains.length <= 20) {
      for (const c of chains) {
        console.log(`    ${c.key.padEnd(16)} ${c.name.padEnd(25)} ${c.type.padEnd(10)} ${c.symbol}`)
      }
    }
    console.log()
  }

  // --- Merge and deduplicate ---

  console.log('┌─────────────────────────────────────────────────────────┐')
  console.log('│  MERGED & DEDUPLICATED                                 │')
  console.log('└─────────────────────────────────────────────────────────┘\n')

  // Alias map (same as chain-token-service.ts)
  const CHAIN_KEY_ALIASES: Record<string, string> = {
    '1151111081099710': 'solana',
    '3652501241': 'bitcoin',
    solana: 'solana',
    bitcoin: 'bitcoin',
    near: 'near',
    tron: 'tron',
    sui: 'sui',
    cosmos: 'cosmos',
    osmosis: 'osmosis',
    dogecoin: 'dogecoin',
    turbochain: 'turbochain',
  }

  interface MergedChain {
    key: string
    chainId: number | null
    name: string
    type: ChainType
    symbol: string
    supportedBy: string[]
    providerIds: Record<string, string | number>
  }

  const merged = new Map<string, MergedChain>()

  for (const [providerName, chains] of Object.entries(providerResults)) {
    if (filterProvider && providerName !== filterProvider) continue

    for (const c of chains) {
      const normalizedKey = CHAIN_KEY_ALIASES[c.key] || c.key
      let existing = merged.get(normalizedKey)

      if (!existing) {
        existing = {
          key: normalizedKey,
          chainId: c.chainId,
          name: c.name,
          type: c.type,
          symbol: c.symbol,
          supportedBy: [],
          providerIds: {},
        }
        merged.set(normalizedKey, existing)
      }

      existing.supportedBy.push(providerName)
      existing.providerIds[providerName] = c.providerId

      // Prefer better names
      if (existing.name.startsWith('Chain ') && !c.name.startsWith('Chain ')) {
        existing.name = c.name
      }
    }
  }

  // Apply filters
  let mergedList = Array.from(merged.values())
  if (filterType) {
    mergedList = mergedList.filter((c) => c.type === filterType)
  }

  // Sort: EVM by chainId, then non-EVM alphabetically
  mergedList.sort((a, b) => {
    if (a.type === 'evm' && b.type !== 'evm') return -1
    if (a.type !== 'evm' && b.type === 'evm') return 1
    if (a.type === 'evm' && b.type === 'evm') return (a.chainId || 999999) - (b.chainId || 999999)
    return a.name.localeCompare(b.name)
  })

  console.log(`  Total unique chains: ${mergedList.length}`)
  if (filterType) console.log(`  Filtered by type: ${filterType}`)
  if (filterProvider) console.log(`  Filtered by provider: ${filterProvider}`)
  console.log()

  // Table header
  const hKey = 'KEY'.padEnd(16)
  const hName = 'NAME'.padEnd(28)
  const hType = 'TYPE'.padEnd(10)
  const hSym = 'SYMBOL'.padEnd(8)
  const hProviders = 'PROVIDERS'
  console.log(`  ${hKey} ${hName} ${hType} ${hSym} ${hProviders}`)
  console.log(`  ${'─'.repeat(16)} ${'─'.repeat(28)} ${'─'.repeat(10)} ${'─'.repeat(8)} ${'─'.repeat(30)}`)

  for (const c of mergedList) {
    const key = c.key.padEnd(16)
    const name = c.name.slice(0, 27).padEnd(28)
    const type = c.type.padEnd(10)
    const sym = c.symbol.padEnd(8)
    const providers = c.supportedBy.join(', ')
    console.log(`  ${key} ${name} ${type} ${sym} ${providers}`)
  }

  // --- Stats ---

  console.log()
  console.log('┌─────────────────────────────────────────────────────────┐')
  console.log('│  STATS                                                 │')
  console.log('└─────────────────────────────────────────────────────────┘\n')

  const byType = new Map<string, number>()
  for (const c of mergedList) {
    byType.set(c.type, (byType.get(c.type) || 0) + 1)
  }
  console.log('  By type:')
  for (const [type, count] of [...byType.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`    ${type.padEnd(12)} ${count}`)
  }

  const byProviderCount = new Map<number, number>()
  for (const c of mergedList) {
    const n = c.supportedBy.length
    byProviderCount.set(n, (byProviderCount.get(n) || 0) + 1)
  }
  console.log('\n  By number of providers supporting:')
  for (const [count, chains] of [...byProviderCount.entries()].sort((a, b) => b[0] - a[0])) {
    console.log(`    ${count} provider(s)  →  ${chains} chain(s)`)
  }

  // Chains supported by most providers
  const multiProvider = mergedList
    .filter((c) => c.supportedBy.length >= 3)
    .sort((a, b) => b.supportedBy.length - a.supportedBy.length)

  if (multiProvider.length > 0) {
    console.log('\n  Best covered chains (3+ providers):')
    for (const c of multiProvider) {
      console.log(`    ${c.name.padEnd(25)} ${c.supportedBy.length} providers  [${c.supportedBy.join(', ')}]`)
    }
  }

  // Chains only on 1 provider
  const singleProvider = mergedList.filter((c) => c.supportedBy.length === 1)
  if (singleProvider.length > 0) {
    console.log(`\n  Single-provider chains (${singleProvider.length}):`)
    const byProvider = new Map<string, string[]>()
    for (const c of singleProvider) {
      const p = c.supportedBy[0]
      if (!byProvider.has(p)) byProvider.set(p, [])
      byProvider.get(p)!.push(c.name)
    }
    for (const [provider, chains] of byProvider) {
      console.log(`    ${provider}: ${chains.slice(0, 10).join(', ')}${chains.length > 10 ? ` ... +${chains.length - 10} more` : ''}`)
    }
  }

  console.log()
}

main().catch((e) => {
  console.error('Script failed:', e)
  process.exit(1)
})
