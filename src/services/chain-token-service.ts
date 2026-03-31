import { createConfig, getChains, getTokens, ChainType as LifiChainType } from '@lifi/sdk'
import { RangoClient } from 'rango-sdk-basic'
import { OneClickService, OpenAPI } from '@defuse-protocol/one-click-sdk-typescript'
import { SYMBIOSIS_CONFIG } from '@/services/providers/symbiosis-data'
import { CHAINS } from '@/lib/chains'
import { TOKENS } from '@/lib/tokens'
import { filterSpamTokens } from '@/lib/token-filter'
import {
  UnifiedChain,
  UnifiedToken,
  emptyProviderSupport,
  normalizeChainType,
  type ChainType,
} from '@/lib/chain-registry'

// Ensure LiFi SDK is initialized
createConfig({
  integrator: process.env.NEXT_PUBLIC_LIFI_INTEGRATOR_ID || 'flash-protocol',
})

// Ensure NEAR Intents API is configured
OpenAPI.BASE = 'https://1click.chaindefuser.com'
if (process.env.NEAR_INTENTS_JWT) {
  OpenAPI.TOKEN = process.env.NEAR_INTENTS_JWT
}

// --- Cache ---
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

let chainCache: { data: UnifiedChain[]; expiry: number } | null = null
const tokenCaches = new Map<string, { data: UnifiedToken[]; expiry: number }>()

// --- Internal provider data types ---

interface ProviderChainEntry {
  key: string
  chainId: number | null
  name: string
  type: ChainType
  symbol: string
  logoUrl?: string
  providerId: string | number
}

// ========== PROVIDER FETCHERS ==========

/**
 * LiFi: getChains() returns all supported chains with full metadata
 */
async function fetchLifiChains(): Promise<ProviderChainEntry[]> {
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
        providerId: c.id,
      }
    })
  } catch (error) {
    console.warn('ChainTokenService: LiFi getChains() failed:', error)
    return []
  }
}

/**
 * Rango: meta() returns blockchains, tokens, and protocols
 */
async function fetchRangoChains(): Promise<ProviderChainEntry[]> {
  try {
    const apiKey = process.env.RANGO_API_KEY
    if (!apiKey || apiKey.length <= 10) return []

    const client = new RangoClient(apiKey)
    const meta = await client.meta()

    if (!meta?.blockchains) return []

    return meta.blockchains
      .filter((bc: { enabled?: boolean }) => bc.enabled !== false)
      .map((bc: { name: string; chainId?: string | null; type?: string; logo?: string; defaultDecimals?: number; displayName?: string; shortName?: string }) => {
        const chainId = bc.chainId ? parseInt(bc.chainId) : null
        // Negative or extremely large chainIds are non-EVM — use name as key
        const isValidEvmChainId = chainId && !isNaN(chainId) && chainId > 0 && chainId < 1e15
        const key = isValidEvmChainId ? String(chainId) : bc.name.toLowerCase()
        return {
          key,
          chainId: isValidEvmChainId ? chainId : null,
          name: bc.displayName || bc.name,
          type: normalizeChainType(bc.type || 'EVM'),
          symbol: bc.shortName || bc.name,
          logoUrl: bc.logo,
          providerId: bc.name, // Rango uses string blockchain name
        }
      })
  } catch (error) {
    console.warn('ChainTokenService: Rango meta() failed:', error)
    return []
  }
}

/**
 * Rubic: GET /api/info/chains returns all supported chains
 */
// async function fetchRubicChains(): Promise<ProviderChainEntry[]> {
//   try {
//     const res = await fetch(
//       'https://api-v2.rubic.exchange/api/info/chains?includeTestnets=false'
//     )
//     if (!res.ok) return []

//     const chains: { id: number; name: string; type?: string; providers?: unknown }[] = await res.json()

//     return chains.map((c) => {
//       const key = c.id ? String(c.id) : c.name.toLowerCase()
//       return {
//         key,
//         chainId: c.id || null,
//         name: c.name,
//         type: normalizeChainType(c.type || 'EVM'),
//         symbol: c.name,
//         logoUrl: undefined,
//         providerId: c.name, // Rubic uses string blockchain name
//       }
//     })
//   } catch (error) {
//     console.warn('ChainTokenService: Rubic chains fetch failed:', error)
//     return []
//   }
// }

/**
 * Symbiosis: Extract chains from SYMBIOSIS_CONFIG (already loaded)
 */
function getSymbiosisChains(): ProviderChainEntry[] {
  try {
    return SYMBIOSIS_CONFIG.chains
      .filter(
        (c: { metaRouterGateway?: string }) =>
          c.metaRouterGateway &&
          c.metaRouterGateway !== '0x0000000000000000000000000000000000000000'
      )
      .map((c: { id: number; rpc?: string }) => ({
        key: String(c.id),
        chainId: c.id,
        name: `Chain ${c.id}`, // Symbiosis data doesn't include names, will be enriched via merge
        type: 'evm' as ChainType,
        symbol: 'ETH',
        logoUrl: undefined,
        providerId: c.id,
      }))
  } catch (error) {
    console.warn('ChainTokenService: Symbiosis chains failed:', error)
    return []
  }
}

/**
 * NEAR Intents: getTokens() returns all tokens, extract unique blockchains
 */
async function fetchNearChains(): Promise<ProviderChainEntry[]> {
  try {
    if (!process.env.NEAR_INTENTS_JWT) return []

    const tokens = await OneClickService.getTokens()
    if (!tokens || !Array.isArray(tokens)) return []

    // Extract unique blockchains from token list
    const blockchainMap = new Map<string, string>()
    for (const t of tokens) {
      const bc = (t as { blockchain?: string }).blockchain
      if (bc && !blockchainMap.has(bc)) {
        blockchainMap.set(bc, bc)
      }
    }

    // Map NEAR blockchain names to chain keys
    const nearBlockchainToKey: Record<string, { key: string; chainId: number | null; type: ChainType; name: string; symbol: string }> = {
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
      ton: { key: 'ton', chainId: null, type: 'ton', name: 'TON', symbol: 'TON' },
      starknet: { key: 'starknet', chainId: null, type: 'starknet', name: 'StarkNet', symbol: 'STRK' },
      monad: { key: '143', chainId: 143, type: 'evm', name: 'Monad', symbol: 'MON' },
      xlayer: { key: '196', chainId: 196, type: 'evm', name: 'X Layer', symbol: 'OKB' },
      plasma: { key: '9745', chainId: 9745, type: 'evm', name: 'Plasma', symbol: 'ETH' },
      xrp: { key: 'xrp', chainId: null, type: 'other', name: 'XRP Ledger', symbol: 'XRP' },
      stellar: { key: 'stellar', chainId: null, type: 'other', name: 'Stellar', symbol: 'XLM' },
      zec: { key: 'zec', chainId: null, type: 'bitcoin', name: 'Zcash', symbol: 'ZEC' },
      dash: { key: 'dash', chainId: null, type: 'bitcoin', name: 'Dash', symbol: 'DASH' },
      cardano: { key: 'cardano', chainId: null, type: 'other', name: 'Cardano', symbol: 'ADA' },
      aptos: { key: 'aptos', chainId: null, type: 'aptos', name: 'Aptos', symbol: 'APT' },
      aleo: { key: 'aleo', chainId: null, type: 'other', name: 'Aleo', symbol: 'ALEO' },
      adi: { key: 'adi', chainId: null, type: 'other', name: 'ADI', symbol: 'ADI' },
    }

    const entries: ProviderChainEntry[] = []
    for (const [blockchain] of blockchainMap) {
      const mapping = nearBlockchainToKey[blockchain]
      if (mapping) {
        entries.push({
          key: mapping.key,
          chainId: mapping.chainId,
          name: mapping.name,
          type: mapping.type,
          symbol: mapping.symbol,
          logoUrl: undefined,
          providerId: blockchain, // NEAR Intents chain prefix
        })
      } else {
        // Unknown blockchain — use the name as key, type as 'other' (not EVM)
        entries.push({
          key: blockchain,
          chainId: null,
          name: blockchain.charAt(0).toUpperCase() + blockchain.slice(1),
          type: 'other' as ChainType,
          symbol: blockchain.toUpperCase(),
          logoUrl: undefined,
          providerId: blockchain,
        })
      }
    }

    return entries
  } catch (error) {
    console.warn('ChainTokenService: NEAR Intents chains failed:', error)
    return []
  }
}

/**
 * CCTP: Fixed 8-chain protocol for USDC transfers
 */
function getCCTPChains(): ProviderChainEntry[] {
  return [
    { key: '1', chainId: 1, name: 'Ethereum', type: 'evm', symbol: 'ETH', providerId: 0 },
    { key: '42161', chainId: 42161, name: 'Arbitrum One', type: 'evm', symbol: 'ETH', providerId: 3 },
    { key: '8453', chainId: 8453, name: 'Base', type: 'evm', symbol: 'ETH', providerId: 6 },
    { key: '137', chainId: 137, name: 'Polygon', type: 'evm', symbol: 'MATIC', providerId: 7 },
    { key: '10', chainId: 10, name: 'Optimism', type: 'evm', symbol: 'ETH', providerId: 2 },
    { key: '43114', chainId: 43114, name: 'Avalanche', type: 'evm', symbol: 'AVAX', providerId: 1 },
    { key: '59144', chainId: 59144, name: 'Linea', type: 'evm', symbol: 'ETH', providerId: 11 },
    { key: '146', chainId: 146, name: 'Sonic', type: 'evm', symbol: 'S', providerId: 14 },
  ]
}

/**
 * Map known provider-specific chain IDs to canonical keys.
 * This prevents duplicates when e.g. LiFi uses '1151111081099710' for Solana
 * but NEAR Intents uses 'solana'.
 */
const CHAIN_KEY_ALIASES: Record<string, string> = {
  '1151111081099710': 'solana',
  '3652501241': 'bitcoin',
  'solana': 'solana',
  'sol': 'solana',
  'bitcoin': 'bitcoin',
  'btc': 'bitcoin',
  'near': 'near',
  'tron': 'tron',
  'sui': 'sui',
  'cosmos': 'cosmos',
  'osmosis': 'osmosis',
  'dogecoin': 'dogecoin',
  'doge': 'dogecoin',
  'turbochain': 'turbochain',
  '-239': 'ton',
  'ton': 'ton',
  '23448594291968336': 'starknet',
  'starknet': 'starknet',
  '728126428': 'tron',
  'aptos': 'aptos',
  'cardano': 'cardano',
  'stellar': 'stellar',
  'xrp': 'xrp',
}

/**
 * Known chain types by canonical key.
 * Prevents misclassification when a provider doesn't report type correctly.
 */
const CHAIN_KEY_TYPES: Record<string, ChainType> = {
  solana: 'solana',
  bitcoin: 'bitcoin',
  near: 'near',
  tron: 'tron',
  sui: 'sui',
  cosmos: 'cosmos',
  osmosis: 'cosmos',
  dogecoin: 'bitcoin',
  bch: 'bitcoin',
  ltc: 'bitcoin',
  dash: 'bitcoin',
  zec: 'bitcoin',
  ton: 'ton',
  starknet: 'starknet',
  aptos: 'aptos',
  stellar: 'other',
  xrp: 'other',
  cardano: 'other',
  aleo: 'other',
  adi: 'other',
}

function normalizeChainKey(key: string): string {
  return CHAIN_KEY_ALIASES[key] || key
}

// ========== MERGING ==========

/**
 * Merge chains from all providers into a unified list, deduped by key
 */
function mergeAllChains(
  lifi: ProviderChainEntry[],
  rango: ProviderChainEntry[],
  // rubic: ProviderChainEntry[],
  symbiosis: ProviderChainEntry[],
  near: ProviderChainEntry[],
  cctp: ProviderChainEntry[]
): UnifiedChain[] {
  const chainMap = new Map<string, UnifiedChain>()

  function upsert(
    entries: ProviderChainEntry[],
    providerKey: keyof UnifiedChain['providers'],
    providerIdKey: keyof UnifiedChain['providerIds']
  ) {
    for (const entry of entries) {
      const normalizedKey = normalizeChainKey(entry.key)
      const resolvedType = CHAIN_KEY_TYPES[normalizedKey] || entry.type
      let chain = chainMap.get(normalizedKey)
      if (!chain) {
        const isNonEvm = resolvedType !== 'evm'
        chain = {
          key: normalizedKey,
          chainId: isNonEvm ? null : entry.chainId,
          name: entry.name,
          type: resolvedType,
          symbol: entry.symbol,
          logoUrl: entry.logoUrl,
          providers: emptyProviderSupport(),
          providerIds: {},
        }
        chainMap.set(normalizedKey, chain)
      }

      // Fix type if a more specific type is known (e.g. 'evm' → 'solana')
      if (chain.type === 'evm' && resolvedType !== 'evm') {
        chain.type = resolvedType
        chain.chainId = null // non-EVM chains shouldn't have numeric chainId
      }

      // Mark provider support
      chain.providers[providerKey] = true
      // Store provider-specific ID
      ;(chain.providerIds as Record<string, unknown>)[providerIdKey] = entry.providerId

      // Enrich metadata if current entry has better info
      if (!chain.logoUrl && entry.logoUrl) chain.logoUrl = entry.logoUrl
      if (chain.name.startsWith('Chain ') && !entry.name.startsWith('Chain ')) {
        chain.name = entry.name
      }
    }
  }

  upsert(lifi, 'lifi', 'lifi')
  upsert(rango, 'rango', 'rango')
  // upsert(rubic, 'rubic', 'rubic')
  upsert(symbiosis, 'symbiosis', 'symbiosis')
  upsert(near, 'nearIntents', 'nearIntents')
  upsert(cctp, 'cctp', 'cctp')

  return Array.from(chainMap.values())
}

/**
 * Enrich merged chains with static fallback data from chains.ts
 */
function enrichWithStaticData(chains: UnifiedChain[]): UnifiedChain[] {
  const chainMap = new Map(chains.map((c) => [c.key, c]))

  // Add any static chains not already present
  for (const staticChain of CHAINS) {
    const key = String(staticChain.chainId)
    let chain = chainMap.get(key)

    if (!chain) {
      chain = {
        key,
        chainId: typeof staticChain.chainId === 'number' ? staticChain.chainId : null,
        name: staticChain.name,
        type: staticChain.type as ChainType,
        symbol: staticChain.symbol,
        logoUrl: staticChain.logoUrl,
        isTestnet: staticChain.isTestnet,
        providers: {
          lifi: staticChain.providers?.lifi || false,
          rango: staticChain.providers?.rango || false,
          rubic: staticChain.providers?.rubic || false,
          symbiosis: staticChain.providers?.symbiosis || false,
          nearIntents: staticChain.providers?.near || false,
          cctp: false,
        },
        providerIds: {},
      }
      chainMap.set(key, chain)
    } else {
      // Enrich existing chain
      if (!chain.logoUrl && staticChain.logoUrl) chain.logoUrl = staticChain.logoUrl
      if (staticChain.name && chain.name.startsWith('Chain ')) chain.name = staticChain.name

      // Carry over provider-specific chain IDs from static config
      if (staticChain.providerChainIds) {
        if (staticChain.providerChainIds.lifi && !chain.providerIds.lifi) {
          chain.providerIds.lifi = staticChain.providerChainIds.lifi
        }
        if (staticChain.providerChainIds.rango && !chain.providerIds.rango) {
          chain.providerIds.rango = staticChain.providerChainIds.rango
        }
        if (staticChain.providerChainIds.rubic && !chain.providerIds.rubic) {
          chain.providerIds.rubic = staticChain.providerChainIds.rubic
        }
        if (staticChain.providerChainIds.symbiosis && !chain.providerIds.symbiosis) {
          chain.providerIds.symbiosis = staticChain.providerChainIds.symbiosis
        }
        if (staticChain.providerChainIds.near && !chain.providerIds.nearIntents) {
          chain.providerIds.nearIntents = staticChain.providerChainIds.near
        }
      }
    }
  }

  // Filter out testnets
  const result = Array.from(chainMap.values()).filter((c) => !c.isTestnet)

  // Sort: EVM first (by chainId), then non-EVM alphabetically
  result.sort((a, b) => {
    if (a.type === 'evm' && b.type !== 'evm') return -1
    if (a.type !== 'evm' && b.type === 'evm') return 1
    if (a.type === 'evm' && b.type === 'evm') {
      return (a.chainId || 999999) - (b.chainId || 999999)
    }
    return a.name.localeCompare(b.name)
  })

  return result
}

// ========== TOKEN FETCHING ==========

/**
 * LiFi: getTokens({ chains: [chainId] }) returns all tokens on a chain
 */
async function fetchLifiTokens(chain: UnifiedChain): Promise<UnifiedToken[]> {
  try {
    const lifiChainId = chain.providerIds.lifi || chain.chainId
    if (!lifiChainId) return []

    const response = await getTokens({ chains: [lifiChainId as number] })
    const chainTokens = response.tokens?.[lifiChainId as number] || []

    return chainTokens.map((t: { address: string; symbol: string; name: string; decimals: number; logoURI?: string }) => ({
      address: t.address,
      symbol: t.symbol,
      name: t.name,
      decimals: t.decimals,
      logoUrl: t.logoURI,
      isNative: t.address === '0x0000000000000000000000000000000000000000',
      chainKey: chain.key,
    }))
  } catch (error) {
    console.warn(`ChainTokenService: LiFi tokens for ${chain.key} failed:`, error)
    return []
  }
}

/**
 * Rango: meta().tokens contains all tokens across all chains.
 * We cache the full meta() response and filter per chain at query time.
 */
let rangoMetaCache: { tokens: unknown[]; expiry: number } | null = null

async function fetchRangoTokens(chain: UnifiedChain): Promise<UnifiedToken[]> {
  try {
    const rangoChainName = chain.providerIds.rango as string | undefined
    if (!rangoChainName) return []

    const apiKey = process.env.RANGO_API_KEY
    if (!apiKey || apiKey.length <= 10) return []

    // Fetch meta once and cache
    if (!rangoMetaCache || Date.now() > rangoMetaCache.expiry) {
      const client = new RangoClient(apiKey)
      const meta = await client.meta()
      if (meta?.tokens) {
        rangoMetaCache = { tokens: meta.tokens, expiry: Date.now() + CACHE_TTL }
      } else {
        return []
      }
    }

    // Filter tokens for this specific chain
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chainTokens = rangoMetaCache.tokens.filter((t: any) => t.blockchain === rangoChainName)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return chainTokens.map((t: any) => ({
      address: t.address || '0x0000000000000000000000000000000000000000',
      symbol: t.symbol || 'UNKNOWN',
      name: t.name || t.symbol || 'Unknown',
      decimals: t.decimals || 18,
      logoUrl: t.image || undefined,
      isNative: !t.address || t.address === null,
      chainKey: chain.key,
    }))
  } catch (error) {
    console.warn(`ChainTokenService: Rango tokens for ${chain.key} failed:`, error)
    return []
  }
}

/**
 * NEAR Intents: getTokens() returns all tokens with blockchain info.
 * We cache the full response and filter per chain at query time.
 */
let nearTokensCache: { tokens: unknown[]; expiry: number } | null = null

// Reverse mapping: chain key → NEAR blockchain name (abbreviated)
const KEY_TO_NEAR_BLOCKCHAIN: Record<string, string> = {
  '1': 'eth',
  '42161': 'arb',
  '8453': 'base',
  '10': 'op',
  '137': 'pol',
  '56': 'bsc',
  '43114': 'avax',
  '100': 'gnosis',
  'near': 'near',
  'solana': 'sol',
  'bitcoin': 'btc',
  'dogecoin': 'doge',
  '80094': 'bera',
  'tron': 'tron',
  'sui': 'sui',
  'bch': 'bch',
  'ltc': 'ltc',
  'ton': 'ton',
  'starknet': 'starknet',
  '143': 'monad',
  '196': 'xlayer',
  '9745': 'plasma',
  'xrp': 'xrp',
  'stellar': 'stellar',
  'zec': 'zec',
  'dash': 'dash',
  'cardano': 'cardano',
  'aptos': 'aptos',
  'aleo': 'aleo',
  'adi': 'adi',
}

async function fetchNearTokens(chain: UnifiedChain): Promise<UnifiedToken[]> {
  try {
    if (!process.env.NEAR_INTENTS_JWT) return []

    const nearBlockchain = KEY_TO_NEAR_BLOCKCHAIN[chain.key] || (chain.providerIds.nearIntents as string)
    if (!nearBlockchain) return []

    // Fetch all tokens once and cache
    if (!nearTokensCache || Date.now() > nearTokensCache.expiry) {
      const tokens = await OneClickService.getTokens()
      if (tokens && Array.isArray(tokens)) {
        nearTokensCache = { tokens, expiry: Date.now() + CACHE_TTL }
      } else {
        return []
      }
    }

    // Filter tokens for this specific blockchain
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chainTokens = nearTokensCache.tokens.filter((t: any) => t.blockchain === nearBlockchain)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return chainTokens.map((t: any) => ({
      address: t.contractAddress || '0x0000000000000000000000000000000000000000',
      symbol: t.symbol || 'UNKNOWN',
      name: t.name || t.symbol || 'Unknown',
      decimals: t.decimals || 18,
      logoUrl: t.icon || undefined,
      isNative: !t.contractAddress || t.contractAddress === null,
      chainKey: chain.key,
      providerIds: {
        nearIntents: t.assetId,
      },
    }))
  } catch (error) {
    console.warn(`ChainTokenService: NEAR Intents tokens for ${chain.key} failed:`, error)
    return []
  }
}

/**
 * CCTP: Only supports USDC on 8 chains. Hardcoded addresses.
 */
const CCTP_USDC_ADDRESSES: Record<string, string> = {
  '1': '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',       // Ethereum
  '42161': '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',   // Arbitrum
  '8453': '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',    // Base
  '137': '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',      // Polygon
  '10': '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',       // Optimism
  '43114': '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',   // Avalanche
  '59144': '0x176211869cA2b568f2A7D4EE941E073a821EE1ff',   // Linea
  '146': '0x29219dd400f2Bf60E5a23d13Be72B486D4038894',      // Sonic
}

function getCCTPTokens(chain: UnifiedChain): UnifiedToken[] {
  const usdcAddress = CCTP_USDC_ADDRESSES[chain.key]
  if (!usdcAddress) return []

  return [{
    address: usdcAddress,
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    logoUrl: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png',
    isNative: false,
    chainKey: chain.key,
  }]
}

/**
 * Symbiosis: Tokens are available in SYMBIOSIS_CONFIG.chains[].stables
 * Each chain entry has a `stables` array with full token metadata.
 */
function getSymbiosisTokens(chain: UnifiedChain): UnifiedToken[] {
  const chainId = chain.chainId
  if (!chainId) return []

  // Find matching chain config in Symbiosis data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const symbiosisChain = SYMBIOSIS_CONFIG.chains.find((c: any) => c.id === chainId)
  if (!symbiosisChain || !symbiosisChain.stables) return []

  return symbiosisChain.stables
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((t: any) => !t.deprecated)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((t: any) => ({
      address: t.address,
      symbol: t.symbol || 'UNKNOWN',
      name: t.name || t.symbol || 'Unknown',
      decimals: t.decimals || 18,
      logoUrl: t.icons?.large || t.icons?.small || undefined,
      isNative: t.isNative || false,
      chainKey: chain.key,
    }))
}

// Note: Rubic does NOT have a token list API endpoint.
// Their /api/info/chains only returns chain metadata (id, name, type, providers).
// Rubic accepts any token address in quote requests, so no token listing is needed.

/**
 * Get static fallback tokens from tokens.ts
 */
function getStaticTokens(chainKey: string): UnifiedToken[] {
  const num = Number(chainKey)
  const staticTokens = (!isNaN(num) ? TOKENS[num] : null) || TOKENS[chainKey]
  if (!staticTokens) return []

  return staticTokens.map((t) => ({
    address: t.address,
    symbol: t.symbol,
    name: t.name,
    decimals: t.decimals,
    logoUrl: t.logoUrl,
    isNative: t.isNative,
    chainKey,
  }))
}

/**
 * Build a set of canonical token addresses from the static TOKENS map.
 * These are known-good addresses (Circle USDC, official USDT, etc.)
 */
function buildCanonicalAddresses(chainKey: string): Set<string> {
  const canonical = new Set<string>()
  // TOKENS uses numeric keys for EVM chains and string keys for non-EVM
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
 * Merge tokens from multiple sources, deduplicating by address.
 * Tracks provider count per token — real tokens appear across multiple providers,
 * fake/spam tokens only appear in one. Canonical tokens from static map always win.
 */
function mergeTokens(tokenSets: UnifiedToken[][], chainKey?: string): UnifiedToken[] {
  const tokenMap = new Map<string, UnifiedToken>()
  const providerCount = new Map<string, number>()

  for (const tokens of tokenSets) {
    const seenInSet = new Set<string>()
    for (const token of tokens) {
      const key = token.address.toLowerCase()
      const existing = tokenMap.get(key)
      if (!existing) {
        tokenMap.set(key, token)
        providerCount.set(key, 1)
      } else {
        // Enrich existing token
        if (!existing.logoUrl && token.logoUrl) existing.logoUrl = token.logoUrl
        if (!existing.name && token.name) existing.name = token.name
        // Count this provider if we haven't seen this address in this set yet
        if (!seenInSet.has(key)) {
          providerCount.set(key, (providerCount.get(key) || 1) + 1)
        }
      }
      seenInSet.add(key)
    }
  }

  // Persist provider count into providerIds._count so it survives DB caching
  for (const [addr, count] of providerCount) {
    const token = tokenMap.get(addr)
    if (token && count > 1) {
      if (!token.providerIds) token.providerIds = {}
      ;(token.providerIds as Record<string, unknown>)._count = count
    }
  }

  const filtered = filterSpamTokens(
    Array.from(tokenMap.values()),
    providerCount,
    chainKey,
  )
  const result = filtered
  const canonical = chainKey ? buildCanonicalAddresses(chainKey) : new Set<string>()

  // Sort: native first, then canonical stablecoins, then multi-provider stablecoins,
  // then single-provider stablecoins, then alphabetically
  const STABLECOIN_SYMBOLS = ['USDC', 'USDT', 'DAI', 'USDC.e', 'USDbC']
  result.sort((a, b) => {
    if (a.isNative && !b.isNative) return -1
    if (!a.isNative && b.isNative) return 1

    const aIsStable = STABLECOIN_SYMBOLS.includes(a.symbol)
    const bIsStable = STABLECOIN_SYMBOLS.includes(b.symbol)
    if (aIsStable && !bIsStable) return -1
    if (!aIsStable && bIsStable) return 1

    if (aIsStable && bIsStable && a.symbol === b.symbol) {
      const aCanonical = canonical.has(a.address.toLowerCase())
      const bCanonical = canonical.has(b.address.toLowerCase())
      if (aCanonical && !bCanonical) return -1
      if (!aCanonical && bCanonical) return 1
      // More providers = more likely real
      const aCount = providerCount.get(a.address.toLowerCase()) || 0
      const bCount = providerCount.get(b.address.toLowerCase()) || 0
      if (aCount !== bCount) return bCount - aCount
    }

    return a.symbol.localeCompare(b.symbol)
  })

  return result
}

// ========== PUBLIC API ==========

export const ChainTokenService = {
  /**
   * Get all supported chains across all providers
   * Results are cached for 5 minutes
   */
  async getChains(): Promise<UnifiedChain[]> {
    // Return cache if valid
    if (chainCache && Date.now() < chainCache.expiry) {
      return chainCache.data
    }

    console.log('ChainTokenService: Fetching chains from all providers...')

    // Fetch from all providers in parallel with graceful failure
    const [lifiResult, rangoResult, symbiosisResult, nearResult, cctpResult] =
      await Promise.allSettled([
        fetchLifiChains(),
        fetchRangoChains(),
        // fetchRubicChains(),
        Promise.resolve(getSymbiosisChains()),
        fetchNearChains(),
        Promise.resolve(getCCTPChains()),
      ])

    const lifi = lifiResult.status === 'fulfilled' ? lifiResult.value : []
    const rango = rangoResult.status === 'fulfilled' ? rangoResult.value : []
    // const rubic = rubicResult.status === 'fulfilled' ? rubicResult.value : []
    const symbiosis = symbiosisResult.status === 'fulfilled' ? symbiosisResult.value : []
    const near = nearResult.status === 'fulfilled' ? nearResult.value : []
    const cctp = cctpResult.status === 'fulfilled' ? cctpResult.value : []

    console.log(
      `ChainTokenService: Fetched chains — LiFi: ${lifi.length}, Rango: ${rango.length}, Symbiosis: ${symbiosis.length}, NEAR: ${near.length}, CCTP: ${cctp.length}`
    )

    // Merge and enrich
    const merged = mergeAllChains(lifi, rango, symbiosis, near, cctp)
    const enriched = enrichWithStaticData(merged)

    console.log(`ChainTokenService: Total unified chains: ${enriched.length}`)

    // Cache result
    chainCache = { data: enriched, expiry: Date.now() + CACHE_TTL }

    return enriched
  },

  /**
   * Get tokens for a specific chain
   * Results are cached per chain for 5 minutes
   */
  async getTokens(chainKey: string): Promise<UnifiedToken[]> {
    // Return cache if valid
    const cached = tokenCaches.get(chainKey)
    if (cached && Date.now() < cached.expiry) {
      return cached.data
    }

    // Find the chain to know which providers support it
    const chains = await this.getChains()
    const chain = chains.find((c) => c.key === chainKey)
    if (!chain) {
      console.warn(`ChainTokenService: Unknown chain key: ${chainKey}`)
      return getStaticTokens(chainKey) // Fall back to static
    }

    console.log(`ChainTokenService: Fetching tokens for ${chain.name} (${chainKey})...`)

    // Bitcoin-type chains (BTC, DOGE, etc.) don't have tokens from bridge providers.
    // Inject their native token directly.
    if (chain.type === 'bitcoin') {
      const nativeToken: UnifiedToken = {
        address: chain.key, // 'bitcoin', 'dogecoin', etc.
        symbol: chain.symbol || chain.key.toUpperCase(),
        name: chain.name,
        decimals: 8, 
        chainKey: chain.key,
        isNative: true,
        logoUrl: chain.logoUrl,
      }
      tokenCaches.set(chainKey, { data: [nativeToken], expiry: Date.now() + CACHE_TTL })
      console.log(`ChainTokenService: 1 native token for ${chain.name}`)
      return [nativeToken]
    }

    // Fetch from providers that support this chain
    const fetchers: Promise<UnifiedToken[]>[] = []

    if (chain.providers.lifi) {
      fetchers.push(fetchLifiTokens(chain))
    }

    if (chain.providers.rango) {
      fetchers.push(fetchRangoTokens(chain))
    }

    if (chain.providers.nearIntents) {
      fetchers.push(fetchNearTokens(chain))
    }

    if (chain.providers.cctp) {
      fetchers.push(Promise.resolve(getCCTPTokens(chain)))
    }

    if (chain.providers.symbiosis) {
      fetchers.push(Promise.resolve(getSymbiosisTokens(chain)))
    }

    // Always include static fallback
    fetchers.push(Promise.resolve(getStaticTokens(chainKey)))

    const results = await Promise.allSettled(fetchers)
    const tokenSets = results
      .filter((r): r is PromiseFulfilledResult<UnifiedToken[]> => r.status === 'fulfilled')
      .map((r) => r.value)

    const merged = mergeTokens(tokenSets, chainKey)

    console.log(`ChainTokenService: ${merged.length} tokens for ${chain.name}`)

    // Cache result
    tokenCaches.set(chainKey, { data: merged, expiry: Date.now() + CACHE_TTL })

    return merged
  },

  /**
   * Clear all caches (useful for testing or forced refresh)
   */
  clearCache() {
    chainCache = null
    tokenCaches.clear()
  },
}
