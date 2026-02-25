'use client'

import { DynamicContextProvider, useDynamicContext } from '@dynamic-labs/sdk-react-core'
import { EthereumWalletConnectors } from '@dynamic-labs/ethereum'
import { SolanaWalletConnectors } from '@dynamic-labs/solana'
import { BitcoinWalletConnectors } from '@dynamic-labs/bitcoin'
import { DynamicWagmiConnector } from '@dynamic-labs/wagmi-connector'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider, createConfig, http } from 'wagmi'
import { mainnet, polygon, optimism, arbitrum, base } from 'wagmi/chains'
import { type ReactNode, useEffect, useState } from 'react'

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

const wagmiConfig = createConfig({
  chains: evmChains,
  transports: {
    [mainnet.id]: getTransport(mainnet.id),
    [polygon.id]: getTransport(polygon.id),
    [optimism.id]: getTransport(optimism.id),
    [arbitrum.id]: getTransport(arbitrum.id),
    [base.id]: getTransport(base.id),
  },
  multiInjectedProviderDiscovery: false,
  ssr: true,
})

const dynamicEnvId = process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID

/**
 * Defers rendering the Wagmi connector until the Dynamic SDK has fully loaded.
 * This prevents the "Tried to getClient when it was still null" error in Next.js 15
 * where Turbopack evaluates chunks and triggers wagmi client creation before Dynamic 
 * has finished its async initialization.
 */
function WagmiConnectorWrapper({ children }: { children: ReactNode }) {
  const { sdkHasLoaded } = useDynamicContext()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Do not mount Wagmi connector or children until Dynamic SDK is completely ready
  if (!mounted || !sdkHasLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <DynamicWagmiConnector>
      {children}
    </DynamicWagmiConnector>
  )
}

export function Providers({ children }: { children: ReactNode }) {
  if (!dynamicEnvId) {
    return (
      <WagmiProvider config={wagmiConfig}>
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
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <WagmiConnectorWrapper>
            {children}
          </WagmiConnectorWrapper>
        </QueryClientProvider>
      </WagmiProvider>
    </DynamicContextProvider>
  )
}
