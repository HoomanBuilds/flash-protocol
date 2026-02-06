/**
 * Comprehensive Chain Definitions for Cross-Chain Providers
 */

export type ChainType = 'evm' | 'solana' | 'bitcoin' | 'cosmos' | 'near' | 'tron' | 'sui'

export interface ChainConfig {
  chainId: number | string 
  name: string
  shortName: string
  symbol: string // Native token symbol
  type: ChainType
  isTestnet: boolean
  nativeToken: string // Address (0x0 for native, actual for wrapped)
  explorerUrl: string
  rpcUrl?: string
  logoUrl?: string
  providers: {
    lifi: boolean
    rango: boolean
    rubic: boolean
    symbiosis: boolean
    near: boolean
  }
  providerChainIds?: {
    lifi?: string
    rango?: string
    rubic?: string
    symbiosis?: number
    near?: string
  }
}

// Native token address constant
const NATIVE = '0x0000000000000000000000000000000000000000'

/**
 * All Supported Chains
 * Organized by type and popularity
 */
export const CHAINS: ChainConfig[] = [
  // ============================================
  // MAJOR EVM CHAINS (All providers support)
  // ============================================
  {
    chainId: 1,
    name: 'Ethereum',
    shortName: 'ETH',
    symbol: 'ETH',
    type: 'evm',
    isTestnet: false,
    nativeToken: NATIVE,
    explorerUrl: 'https://etherscan.io',
    providers: { lifi: true, rango: true, rubic: true, symbiosis: true, near: true },
    providerChainIds: { lifi: 'ETH', rango: 'ETH', rubic: 'ETH', near: 'eth' }
  },
  {
    chainId: 137,
    name: 'Polygon',
    shortName: 'POL',
    symbol: 'POL',
    type: 'evm',
    isTestnet: false,
    nativeToken: NATIVE,
    explorerUrl: 'https://polygonscan.com',
    providers: { lifi: true, rango: true, rubic: true, symbiosis: true, near: true },
    providerChainIds: { lifi: 'POL', rango: 'POLYGON', rubic: 'POLYGON', near: 'pol' }
  },
  {
    chainId: 42161,
    name: 'Arbitrum One',
    shortName: 'ARB',
    symbol: 'ETH',
    type: 'evm',
    isTestnet: false,
    nativeToken: NATIVE,
    explorerUrl: 'https://arbiscan.io',
    providers: { lifi: true, rango: true, rubic: true, symbiosis: true, near: true },
    providerChainIds: { lifi: 'ARB', rango: 'ARBITRUM', rubic: 'ARBITRUM', near: 'arb' }
  },
  {
    chainId: 10,
    name: 'Optimism',
    shortName: 'OP',
    symbol: 'ETH',
    type: 'evm',
    isTestnet: false,
    nativeToken: NATIVE,
    explorerUrl: 'https://optimistic.etherscan.io',
    providers: { lifi: true, rango: true, rubic: true, symbiosis: true, near: true },
    providerChainIds: { lifi: 'OPT', rango: 'OPTIMISM', rubic: 'OPTIMISM', near: 'op' }
  },
  {
    chainId: 8453,
    name: 'Base',
    shortName: 'BASE',
    symbol: 'ETH',
    type: 'evm',
    isTestnet: false,
    nativeToken: NATIVE,
    explorerUrl: 'https://basescan.org',
    providers: { lifi: true, rango: true, rubic: true, symbiosis: true, near: true },
    providerChainIds: { lifi: 'BAS', rango: 'BASE', rubic: 'BASE', near: 'base' }
  },
  {
    chainId: 56,
    name: 'BNB Chain',
    shortName: 'BSC',
    symbol: 'BNB',
    type: 'evm',
    isTestnet: false,
    nativeToken: NATIVE,
    explorerUrl: 'https://bscscan.com',
    providers: { lifi: true, rango: true, rubic: true, symbiosis: true, near: true },
    providerChainIds: { lifi: 'BSC', rango: 'BSC', rubic: 'BSC', near: 'bsc' }
  },
  {
    chainId: 43114,
    name: 'Avalanche C-Chain',
    shortName: 'AVAX',
    symbol: 'AVAX',
    type: 'evm',
    isTestnet: false,
    nativeToken: NATIVE,
    explorerUrl: 'https://snowtrace.io',
    providers: { lifi: true, rango: true, rubic: true, symbiosis: true, near: true },
    providerChainIds: { lifi: 'AVA', rango: 'AVAX_CCHAIN', rubic: 'AVALANCHE', near: 'avax' }
  },

  // ============================================
  // LAYER 2s & SCALING SOLUTIONS
  // ============================================
  {
    chainId: 324,
    name: 'zkSync Era',
    shortName: 'ERA',
    symbol: 'ETH',
    type: 'evm',
    isTestnet: false,
    nativeToken: NATIVE,
    explorerUrl: 'https://explorer.zksync.io',
    providers: { lifi: true, rango: true, rubic: true, symbiosis: true, near: false },
  },
  {
    chainId: 59144,
    name: 'Linea',
    shortName: 'LNA',
    symbol: 'ETH',
    type: 'evm',
    isTestnet: false,
    nativeToken: NATIVE,
    explorerUrl: 'https://lineascan.build',
    providers: { lifi: true, rango: true, rubic: true, symbiosis: true, near: false },
  },
  {
    chainId: 534352,
    name: 'Scroll',
    shortName: 'SCR',
    symbol: 'ETH',
    type: 'evm',
    isTestnet: false,
    nativeToken: NATIVE,
    explorerUrl: 'https://scrollscan.com',
    providers: { lifi: true, rango: true, rubic: true, symbiosis: true, near: false },
  },
  {
    chainId: 5000,
    name: 'Mantle',
    shortName: 'MNT',
    symbol: 'MNT',
    type: 'evm',
    isTestnet: false,
    nativeToken: NATIVE,
    explorerUrl: 'https://explorer.mantle.xyz',
    providers: { lifi: true, rango: true, rubic: true, symbiosis: true, near: false },
  },
  {
    chainId: 81457,
    name: 'Blast',
    shortName: 'BLS',
    symbol: 'ETH',
    type: 'evm',
    isTestnet: false,
    nativeToken: NATIVE,
    explorerUrl: 'https://blastscan.io',
    providers: { lifi: true, rango: true, rubic: true, symbiosis: true, near: false },
  },
  {
    chainId: 34443,
    name: 'Mode',
    shortName: 'MODE',
    symbol: 'ETH',
    type: 'evm',
    isTestnet: false,
    nativeToken: NATIVE,
    explorerUrl: 'https://explorer.mode.network',
    providers: { lifi: true, rango: true, rubic: true, symbiosis: false, near: false },
  },
  {
    chainId: 1101,
    name: 'Polygon zkEVM',
    shortName: 'PZE',
    symbol: 'ETH',
    type: 'evm',
    isTestnet: false,
    nativeToken: NATIVE,
    explorerUrl: 'https://zkevm.polygonscan.com',
    providers: { lifi: true, rango: true, rubic: true, symbiosis: true, near: false },
  },
  {
    chainId: 169,
    name: 'Manta Pacific',
    shortName: 'MANTA',
    symbol: 'ETH',
    type: 'evm',
    isTestnet: false,
    nativeToken: NATIVE,
    explorerUrl: 'https://pacific-explorer.manta.network',
    providers: { lifi: true, rango: true, rubic: true, symbiosis: false, near: false },
  },
  {
    chainId: 1088,
    name: 'Metis',
    shortName: 'METIS',
    symbol: 'METIS',
    type: 'evm',
    isTestnet: false,
    nativeToken: NATIVE,
    explorerUrl: 'https://explorer.metis.io',
    providers: { lifi: true, rango: true, rubic: true, symbiosis: true, near: false },
  },

  // ============================================
  // ALTERNATIVE L1s
  // ============================================
  {
    chainId: 250,
    name: 'Fantom',
    shortName: 'FTM',
    symbol: 'FTM',
    type: 'evm',
    isTestnet: false,
    nativeToken: NATIVE,
    explorerUrl: 'https://ftmscan.com',
    providers: { lifi: true, rango: true, rubic: true, symbiosis: true, near: false },
  },
  {
    chainId: 100,
    name: 'Gnosis',
    shortName: 'GNO',
    symbol: 'xDAI',
    type: 'evm',
    isTestnet: false,
    nativeToken: NATIVE,
    explorerUrl: 'https://gnosisscan.io',
    providers: { lifi: true, rango: true, rubic: true, symbiosis: false, near: true },
  },
  {
    chainId: 42220,
    name: 'Celo',
    shortName: 'CELO',
    symbol: 'CELO',
    type: 'evm',
    isTestnet: false,
    nativeToken: NATIVE,
    explorerUrl: 'https://celoscan.io',
    providers: { lifi: true, rango: true, rubic: true, symbiosis: false, near: false },
  },
  {
    chainId: 1284,
    name: 'Moonbeam',
    shortName: 'GLMR',
    symbol: 'GLMR',
    type: 'evm',
    isTestnet: false,
    nativeToken: NATIVE,
    explorerUrl: 'https://moonbeam.moonscan.io',
    providers: { lifi: true, rango: true, rubic: true, symbiosis: false, near: false },
  },
  {
    chainId: 1285,
    name: 'Moonriver',
    shortName: 'MOVR',
    symbol: 'MOVR',
    type: 'evm',
    isTestnet: false,
    nativeToken: NATIVE,
    explorerUrl: 'https://moonriver.moonscan.io',
    providers: { lifi: true, rango: true, rubic: true, symbiosis: false, near: false },
  },
  {
    chainId: 1313161554,
    name: 'Aurora',
    shortName: 'AURORA',
    symbol: 'ETH',
    type: 'evm',
    isTestnet: false,
    nativeToken: NATIVE,
    explorerUrl: 'https://explorer.aurora.dev',
    providers: { lifi: true, rango: true, rubic: true, symbiosis: true, near: false },
  },
  {
    chainId: 25,
    name: 'Cronos',
    shortName: 'CRO',
    symbol: 'CRO',
    type: 'evm',
    isTestnet: false,
    nativeToken: NATIVE,
    explorerUrl: 'https://cronoscan.com',
    providers: { lifi: true, rango: true, rubic: true, symbiosis: false, near: false },
  },
  {
    chainId: 2222,
    name: 'Kava',
    shortName: 'KAVA',
    symbol: 'KAVA',
    type: 'evm',
    isTestnet: false,
    nativeToken: NATIVE,
    explorerUrl: 'https://kavascan.com',
    providers: { lifi: true, rango: true, rubic: true, symbiosis: false, near: false },
  },

  // ============================================
  // LI.FI focused
  // ============================================
  {
    chainId: 80094,
    name: 'Berachain',
    shortName: 'BERA',
    symbol: 'BERA',
    type: 'evm',
    isTestnet: false,
    nativeToken: NATIVE,
    explorerUrl: 'https://berascan.io',
    providers: { lifi: true, rango: false, rubic: false, symbiosis: false, near: true },
  },
  {
    chainId: 146,
    name: 'Sonic',
    shortName: 'S',
    symbol: 'S',
    type: 'evm',
    isTestnet: false,
    nativeToken: NATIVE,
    explorerUrl: 'https://sonicscan.org',
    providers: { lifi: true, rango: false, rubic: false, symbiosis: false, near: false },
  },

  // ============================================
  // NON-EVM CHAINS
  // ============================================
  {
    chainId: 'solana',
    name: 'Solana',
    shortName: 'SOL',
    symbol: 'SOL',
    type: 'solana',
    isTestnet: false,
    nativeToken: 'So11111111111111111111111111111111111111112', // Wrapped SOL
    explorerUrl: 'https://solscan.io',
    providers: { lifi: true, rango: true, rubic: true, symbiosis: false, near: true },
    providerChainIds: { lifi: 'SOL', rango: 'SOLANA', rubic: 'SOLANA', near: 'sol' }
  },
  {
    chainId: 'bitcoin',
    name: 'Bitcoin',
    shortName: 'BTC',
    symbol: 'BTC',
    type: 'bitcoin',
    isTestnet: false,
    nativeToken: 'btc', // Native BTC
    explorerUrl: 'https://mempool.space',
    providers: { lifi: false, rango: true, rubic: true, symbiosis: true, near: true },
    providerChainIds: { rango: 'BTC', rubic: 'BITCOIN', near: 'btc' }
  },
  {
    chainId: 'tron',
    name: 'Tron',
    shortName: 'TRX',
    symbol: 'TRX',
    type: 'tron',
    isTestnet: false,
    nativeToken: 'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb', // Native TRX
    explorerUrl: 'https://tronscan.org',
    providers: { lifi: false, rango: true, rubic: true, symbiosis: true, near: true },
    providerChainIds: { rango: 'TRON', rubic: 'TRON', near: 'tron' }
  },
  {
    chainId: 'near',
    name: 'NEAR Protocol',
    shortName: 'NEAR',
    symbol: 'NEAR',
    type: 'near',
    isTestnet: false,
    nativeToken: 'wrap.near',
    explorerUrl: 'https://nearblocks.io',
    providers: { lifi: false, rango: true, rubic: true, symbiosis: false, near: true },
    providerChainIds: { rango: 'NEAR', rubic: 'NEAR', near: 'near' }
  },
  {
    chainId: 'sui',
    name: 'Sui',
    shortName: 'SUI',
    symbol: 'SUI',
    type: 'sui',
    isTestnet: false,
    nativeToken: '0x2::sui::SUI',
    explorerUrl: 'https://suiscan.xyz',
    providers: { lifi: true, rango: false, rubic: false, symbiosis: false, near: true },
    providerChainIds: { lifi: 'SUI', near: 'sui' }
  },

  // ============================================
  // COSMOS ECOSYSTEM (Rango only)
  // ============================================
  {
    chainId: 'cosmos',
    name: 'Cosmos Hub',
    shortName: 'ATOM',
    symbol: 'ATOM',
    type: 'cosmos',
    isTestnet: false,
    nativeToken: 'uatom',
    explorerUrl: 'https://www.mintscan.io/cosmos',
    providers: { lifi: false, rango: true, rubic: false, symbiosis: false, near: false },
    providerChainIds: { rango: 'COSMOS' }
  },
  {
    chainId: 'osmosis',
    name: 'Osmosis',
    shortName: 'OSMO',
    symbol: 'OSMO',
    type: 'cosmos',
    isTestnet: false,
    nativeToken: 'uosmo',
    explorerUrl: 'https://www.mintscan.io/osmosis',
    providers: { lifi: false, rango: true, rubic: false, symbiosis: false, near: false },
    providerChainIds: { rango: 'OSMOSIS' }
  },

  // ============================================
  // TESTNETS
  // ============================================
  {
    chainId: 11155111,
    name: 'Sepolia',
    shortName: 'SEP',
    symbol: 'ETH',
    type: 'evm',
    isTestnet: true,
    nativeToken: NATIVE,
    explorerUrl: 'https://sepolia.etherscan.io',
    providers: { lifi: false, rango: false, rubic: false, symbiosis: false, near: false },
  },
  {
    chainId: 11155420,
    name: 'OP Sepolia',
    shortName: 'OP-SEP',
    symbol: 'ETH',
    type: 'evm',
    isTestnet: true,
    nativeToken: NATIVE,
    explorerUrl: 'https://sepolia-optimism.etherscan.io',
    providers: { lifi: false, rango: false, rubic: false, symbiosis: false, near: false },
  },
  {
    chainId: 84532,
    name: 'Base Sepolia',
    shortName: 'BASE-SEP',
    symbol: 'ETH',
    type: 'evm',
    isTestnet: true,
    nativeToken: NATIVE,
    explorerUrl: 'https://sepolia.basescan.org',
    providers: { lifi: false, rango: false, rubic: false, symbiosis: false, near: false },
  },
  {
    chainId: 421614,
    name: 'Arbitrum Sepolia',
    shortName: 'ARB-SEP',
    symbol: 'ETH',
    type: 'evm',
    isTestnet: true,
    nativeToken: NATIVE,
    explorerUrl: 'https://sepolia.arbiscan.io',
    providers: { lifi: false, rango: false, rubic: false, symbiosis: false, near: false },
  },
]

// ============================================
// HELPER FUNCTIONS
// ============================================

/** Get all mainnet chains */
export const getMainnetChains = () => CHAINS.filter(c => !c.isTestnet)

/** Get all testnet chains */
export const getTestnetChains = () => CHAINS.filter(c => c.isTestnet)

/** Get EVM chains only */
export const getEVMChains = () => CHAINS.filter(c => c.type === 'evm')

/** Get chains supported by a specific provider */
export const getChainsByProvider = (provider: keyof ChainConfig['providers']) =>
  CHAINS.filter(c => c.providers[provider] && !c.isTestnet)

/** Get chain by chainId */
export const getChainById = (chainId: number | string) =>
  CHAINS.find(c => c.chainId === chainId)

/** Get chain's provider-specific ID */
export const getProviderChainId = (chainId: number | string, provider: string): string | undefined => {
  const chain = getChainById(chainId)
  if (!chain?.providerChainIds) return undefined
  const value = chain.providerChainIds[provider as keyof typeof chain.providerChainIds]
  return value !== undefined ? String(value) : undefined
}

/** Check if a chain is supported by any provider */
export const isChainSupported = (chainId: number | string): boolean => {
  const chain = getChainById(chainId)
  if (!chain) return false
  return Object.values(chain.providers).some(v => v)
}

/** Get provider support count for a chain */
export const getProviderCount = (chainId: number | string): number => {
  const chain = getChainById(chainId)
  if (!chain) return 0
  return Object.values(chain.providers).filter(v => v).length
}
