'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider, type Config } from 'wagmi'
import { type ReactNode } from 'react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { SolanaAdapter } from '@reown/appkit-adapter-solana/react'
import { createAppKit } from '@reown/appkit/react'
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets'
import { http } from 'wagmi'
import * as allNetworks from '@reown/appkit/networks'
import type { AppKitNetwork } from '@reown/appkit/networks'

const queryClient = new QueryClient()

const alchemyKey = process.env.NEXT_PUBLIC_ALCHEMY_KEY
const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || ''

// Testnet keywords to filter out
const TESTNET_KEYWORDS = [
  'testnet', 'sepolia', 'goerli', 'holesky', 'devnet', 'fuji', 'mumbai',
  'amoy', 'chapel', 'alfajores', 'chiado', 'inmemorynode', 'localnode',
  'localhyperchain', 'localcustom', 'anvil', 'hardhat', 'localhost',
  'signet', 'bartio', 'bepolia',
]

// Dynamically collect all mainnet networks from @reown/appkit/networks
const mainnetNetworks: AppKitNetwork[] = Object.entries(allNetworks)
  .filter((entry) => {
    const v = entry[1]
    if (typeof v !== 'object' || v === null || !('id' in v)) return false
    const net = v as any
    if (net.testnet === true) return false
    const kLow = (net.name || '').toLowerCase()
    return !TESTNET_KEYWORDS.some(t => kLow.includes(t))
  })
  .map(([, v]) => v as AppKitNetwork)

// Alchemy transports for popular chains (others use default public RPCs)
const getTransport = (chainId: number) => {
  if (!alchemyKey) return http()
  const alchemyUrls: Record<number, string> = {
    1: `https://eth-mainnet.g.alchemy.com/v2/${alchemyKey}`,
    137: `https://polygon-mainnet.g.alchemy.com/v2/${alchemyKey}`,
    10: `https://opt-mainnet.g.alchemy.com/v2/${alchemyKey}`,
    42161: `https://arb-mainnet.g.alchemy.com/v2/${alchemyKey}`,
    8453: `https://base-mainnet.g.alchemy.com/v2/${alchemyKey}`,
  }
  return alchemyUrls[chainId] ? http(alchemyUrls[chainId]) : http()
}

// Build transports map for EVM chains that have numeric IDs
const evmNetworks = mainnetNetworks.filter(n => typeof n.id === 'number')
const transports: Record<number, ReturnType<typeof http>> = {}
for (const n of evmNetworks) {
  transports[n.id as number] = getTransport(n.id as number)
}

// Reown AppKit wagmi adapter (EVM chains)
export const wagmiAdapter = new WagmiAdapter({
  projectId,
  networks: evmNetworks,
  transports,
})

// Reown AppKit Solana adapter
const solanaAdapter = new SolanaAdapter({
  wallets: [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
})

// Initialize AppKit modal (runs once at module load)
if (projectId) {
  createAppKit({
    adapters: [wagmiAdapter, solanaAdapter],
    projectId,
    networks: mainnetNetworks as [AppKitNetwork, ...AppKitNetwork[]],
    defaultNetwork: allNetworks.mainnet,
    metadata: {
      name: 'Flash Protocol',
      description: 'Cross-chain payment gateway',
      url: typeof window !== 'undefined' ? window.location.origin : 'https://flashprotocol.com',
      icons: ['/logo-black.png'],
    },
    features: {
      analytics: false,
    },
    themeMode: 'dark',
  })
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig as Config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}
