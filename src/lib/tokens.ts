/**
 * Common Token Addresses by Chain
 * Based on provider-chains-research.md
 * 
 * Includes: USDC, USDT, WETH, WBTC on major chains
 */

export interface TokenConfig {
  address: string
  symbol: string
  name: string
  decimals: number
  logoUrl?: string
  isNative?: boolean
}

// Native token placeholder
const NATIVE = '0x0000000000000000000000000000000000000000'

/**
 * Token addresses organized by chainId
 */
export const TOKENS: Record<number | string, TokenConfig[]> = {
  // ============================================
  // ETHEREUM (Chain ID: 1)
  // ============================================
  1: [
    { address: NATIVE, symbol: 'ETH', name: 'Ether', decimals: 18, isNative: true },
    { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
    { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', symbol: 'USDT', name: 'Tether USD', decimals: 6 },
    { address: '0x6B175474E89094C44Da98b954EescdeCB5c6E0000', symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18 },
    { address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', symbol: 'WETH', name: 'Wrapped Ether', decimals: 18 },
    { address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', symbol: 'WBTC', name: 'Wrapped Bitcoin', decimals: 8 },
  ],

  // ============================================
  // POLYGON (Chain ID: 137)
  // ============================================
  137: [
    { address: NATIVE, symbol: 'POL', name: 'POL (ex-MATIC)', decimals: 18, isNative: true },
    { address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
    { address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', symbol: 'USDC.e', name: 'Bridged USDC', decimals: 6 },
    { address: '0xc2132D05D31c914a87C6611C10748AEB04B58e8F', symbol: 'USDT', name: 'Tether USD', decimals: 6 },
    { address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', symbol: 'WETH', name: 'Wrapped Ether', decimals: 18 },
    { address: '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6', symbol: 'WBTC', name: 'Wrapped Bitcoin', decimals: 8 },
  ],

  // ============================================
  // ARBITRUM (Chain ID: 42161)
  // ============================================
  42161: [
    { address: NATIVE, symbol: 'ETH', name: 'Ether', decimals: 18, isNative: true },
    { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
    { address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', symbol: 'USDC.e', name: 'Bridged USDC', decimals: 6 },
    { address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', symbol: 'USDT', name: 'Tether USD', decimals: 6 },
    { address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', symbol: 'WETH', name: 'Wrapped Ether', decimals: 18 },
    { address: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f', symbol: 'WBTC', name: 'Wrapped Bitcoin', decimals: 8 },
  ],

  // ============================================
  // OPTIMISM (Chain ID: 10)
  // ============================================
  10: [
    { address: NATIVE, symbol: 'ETH', name: 'Ether', decimals: 18, isNative: true },
    { address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
    { address: '0x7F5c764cBc14f9669B88837ca1490cCa17c31607', symbol: 'USDC.e', name: 'Bridged USDC', decimals: 6 },
    { address: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58', symbol: 'USDT', name: 'Tether USD', decimals: 6 },
    { address: '0x4200000000000000000000000000000000000006', symbol: 'WETH', name: 'Wrapped Ether', decimals: 18 },
    { address: '0x68f180fcCe6836688e9084f035309E29Bf0A2095', symbol: 'WBTC', name: 'Wrapped Bitcoin', decimals: 8 },
  ],

  // ============================================
  // BASE (Chain ID: 8453)
  // ============================================
  8453: [
    { address: NATIVE, symbol: 'ETH', name: 'Ether', decimals: 18, isNative: true },
    { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
    { address: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', symbol: 'USDbC', name: 'Bridged USDC', decimals: 6 },
    { address: '0x4200000000000000000000000000000000000006', symbol: 'WETH', name: 'Wrapped Ether', decimals: 18 },
  ],

  // ============================================
  // BNB CHAIN (Chain ID: 56)
  // ============================================
  56: [
    { address: NATIVE, symbol: 'BNB', name: 'BNB', decimals: 18, isNative: true },
    { address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', symbol: 'USDC', name: 'USD Coin', decimals: 18 },
    { address: '0x55d398326f99059fF775485246999027B3197955', symbol: 'USDT', name: 'Tether USD', decimals: 18 },
    { address: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8', symbol: 'WETH', name: 'Wrapped Ether', decimals: 18 },
    { address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', symbol: 'WBNB', name: 'Wrapped BNB', decimals: 18 },
    { address: '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c', symbol: 'BTCB', name: 'Bitcoin BEP20', decimals: 18 },
  ],

  // ============================================
  // AVALANCHE (Chain ID: 43114)
  // ============================================
  43114: [
    { address: NATIVE, symbol: 'AVAX', name: 'Avalanche', decimals: 18, isNative: true },
    { address: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
    { address: '0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664', symbol: 'USDC.e', name: 'Bridged USDC', decimals: 6 },
    { address: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7', symbol: 'USDT', name: 'Tether USD', decimals: 6 },
    { address: '0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB', symbol: 'WETH.e', name: 'Wrapped Ether', decimals: 18 },
    { address: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7', symbol: 'WAVAX', name: 'Wrapped AVAX', decimals: 18 },
  ],

  // ============================================
  // zkSync Era (Chain ID: 324)
  // ============================================
  324: [
    { address: NATIVE, symbol: 'ETH', name: 'Ether', decimals: 18, isNative: true },
    { address: '0x1d17CBcF0D6D143135aE902365D2E5e2A16538D4', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
    { address: '0x5AEa5775959fBC2557Cc8789bC1bf90A239D9a91', symbol: 'WETH', name: 'Wrapped Ether', decimals: 18 },
  ],

  // ============================================
  // LINEA (Chain ID: 59144)
  // ============================================
  59144: [
    { address: NATIVE, symbol: 'ETH', name: 'Ether', decimals: 18, isNative: true },
    { address: '0x176211869cA2b568f2A7D4EE941E073a821EE1ff', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
    { address: '0xA219439258ca9da29E9Cc4cE5596924745e12B93', symbol: 'USDT', name: 'Tether USD', decimals: 6 },
    { address: '0xe5D7C2a44FfDDf6b295A15c148167daaAf5Cf34f', symbol: 'WETH', name: 'Wrapped Ether', decimals: 18 },
  ],

  // ============================================
  // SCROLL (Chain ID: 534352)
  // ============================================
  534352: [
    { address: NATIVE, symbol: 'ETH', name: 'Ether', decimals: 18, isNative: true },
    { address: '0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
    { address: '0xf55BEC9cafDbE8730f096Aa55dad6D22d44099Df', symbol: 'USDT', name: 'Tether USD', decimals: 6 },
    { address: '0x5300000000000000000000000000000000000004', symbol: 'WETH', name: 'Wrapped Ether', decimals: 18 },
  ],

  // ============================================
  // FANTOM (Chain ID: 250)
  // ============================================
  250: [
    { address: NATIVE, symbol: 'FTM', name: 'Fantom', decimals: 18, isNative: true },
    { address: '0x04068DA6C83AFCFA0e13ba15A6696662335D5B75', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
    { address: '0x049d68029688eAbF473097a2fC38ef61633A3C7A', symbol: 'fUSDT', name: 'Frapped USDT', decimals: 6 },
    { address: '0x74b23882a30290451A17c44f4F05243b6b58C76d', symbol: 'WETH', name: 'Wrapped Ether', decimals: 18 },
    { address: '0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83', symbol: 'WFTM', name: 'Wrapped FTM', decimals: 18 },
  ],

  // ============================================
  // SOLANA (Non-EVM)
  // ============================================
  'solana': [
    { address: 'So11111111111111111111111111111111111111112', symbol: 'SOL', name: 'Solana', decimals: 9, isNative: true },
    { address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
    { address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', symbol: 'USDT', name: 'Tether USD', decimals: 6 },
  ],

  // ============================================
  // BITCOIN (Non-EVM)
  // ============================================
  'bitcoin': [
    { address: 'btc', symbol: 'BTC', name: 'Bitcoin', decimals: 8, isNative: true },
  ],

  // ============================================
  // TRON (Non-EVM)
  // ============================================
  'tron': [
    { address: 'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb', symbol: 'TRX', name: 'Tron', decimals: 6, isNative: true },
    { address: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', symbol: 'USDT', name: 'Tether USD', decimals: 6 },
    { address: 'TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
  ],
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/** Get tokens for a specific chain */
export const getTokensByChain = (chainId: number | string): TokenConfig[] => {
  return TOKENS[chainId] || []
}

/** Get native token for a chain */
export const getNativeToken = (chainId: number | string): TokenConfig | undefined => {
  return TOKENS[chainId]?.find(t => t.isNative)
}

/** Get token by symbol on a chain */
export const getTokenBySymbol = (chainId: number | string, symbol: string): TokenConfig | undefined => {
  return TOKENS[chainId]?.find(t => t.symbol.toUpperCase() === symbol.toUpperCase())
}

/** Get USDC address for a chain (prioritizes native USDC over bridged) */
export const getUSDCAddress = (chainId: number | string): string | undefined => {
  const tokens = TOKENS[chainId]
  const usdc = tokens?.find(t => t.symbol === 'USDC')
  return usdc?.address
}

/** Check if token exists on chain */
export const isTokenOnChain = (chainId: number | string, tokenAddress: string): boolean => {
  return TOKENS[chainId]?.some(t => t.address.toLowerCase() === tokenAddress.toLowerCase()) ?? false
}

/** Get all stablecoins on a chain */
export const getStablecoins = (chainId: number | string): TokenConfig[] => {
  const stableSymbols = ['USDC', 'USDC.e', 'USDbC', 'USDT', 'fUSDT', 'DAI', 'BUSD']
  return TOKENS[chainId]?.filter(t => stableSymbols.includes(t.symbol)) || []
}
