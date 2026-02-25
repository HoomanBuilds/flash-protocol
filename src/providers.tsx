'use client'

import { DynamicContextProvider } from '@dynamic-labs/sdk-react-core'
import { EthereumWalletConnectors } from '@dynamic-labs/ethereum'
import { SolanaWalletConnectors } from '@dynamic-labs/solana'
import { BitcoinWalletConnectors } from '@dynamic-labs/bitcoin'
import { DynamicWagmiConnector } from '@dynamic-labs/wagmi-connector'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider, createConfig, http } from 'wagmi'
import { mainnet, polygon, optimism, arbitrum, base } from 'wagmi/chains'
import { type ReactNode } from 'react'

const queryClient = new QueryClient()

const alchemyKey = process.env.NEXT_PUBLIC_ALCHEMY_KEY

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

const evmChains = [mainnet, polygon, optimism, arbitrum, base] as const

// Official Dynamic.xyz wagmi config — no ssr flag, no extra options
const config = createConfig({
  chains: evmChains,
  multiInjectedProviderDiscovery: false,
  transports: {
    [mainnet.id]: getTransport(mainnet.id),
    [polygon.id]: getTransport(polygon.id),
    [optimism.id]: getTransport(optimism.id),
    [arbitrum.id]: getTransport(arbitrum.id),
    [base.id]: getTransport(base.id),
  },
})

const dynamicEnvId = process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID

// Provider nesting follows official Dynamic.xyz docs exactly:
// DynamicContextProvider > WagmiProvider > QueryClientProvider > DynamicWagmiConnector
export function Providers({ children }: { children: ReactNode }) {
  if (!dynamicEnvId) {
    return (
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </WagmiProvider>
    )
  }

  return (
    <DynamicContextProvider
      settings={{
        environmentId: dynamicEnvId,
        walletConnectors: [
          EthereumWalletConnectors,
          SolanaWalletConnectors,
          BitcoinWalletConnectors,
        ],
      }}
    >
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <DynamicWagmiConnector>
            {children}
          </DynamicWagmiConnector>
        </QueryClientProvider>
      </WagmiProvider>
    </DynamicContextProvider>
  )
}
