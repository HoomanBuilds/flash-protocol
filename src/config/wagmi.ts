import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { http } from 'wagmi'
import { mainnet, polygon, optimism, arbitrum, base, sepolia, optimismSepolia } from 'wagmi/chains'

// RPC Configuration: Use Alchemy if available, fallback to public RPCs
const alchemyKey = process.env.NEXT_PUBLIC_ALCHEMY_KEY

const getTransport = (chainId: number) => {
  if (!alchemyKey) return http() // Use RainbowKit's default public RPCs
  
  const alchemyUrls: Record<number, string> = {
    1: `https://eth-mainnet.g.alchemy.com/v2/${alchemyKey}`,
    137: `https://polygon-mainnet.g.alchemy.com/v2/${alchemyKey}`,
    10: `https://opt-mainnet.g.alchemy.com/v2/${alchemyKey}`,
    42161: `https://arb-mainnet.g.alchemy.com/v2/${alchemyKey}`,
    8453: `https://base-mainnet.g.alchemy.com/v2/${alchemyKey}`,
    11155111: `https://eth-sepolia.g.alchemy.com/v2/${alchemyKey}`,
    11155420: `https://opt-sepolia.g.alchemy.com/v2/${alchemyKey}`,
  }
  
  return alchemyUrls[chainId] ? http(alchemyUrls[chainId]) : http()
}

const chains = [
  mainnet,
  polygon,
  optimism,
  arbitrum,
  base,
  ...(process.env.NEXT_PUBLIC_ENABLE_TESTNETS === 'true' ? [sepolia, optimismSepolia] : []),
] as const

export const config = getDefaultConfig({
  appName: 'Crypto Payment Gateway',
  projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID!,
  chains,
  transports: Object.fromEntries(
    chains.map(chain => [chain.id, getTransport(chain.id)])
  ),
  ssr: true,
})
