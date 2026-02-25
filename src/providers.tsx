'use client'

import { DynamicContextProvider } from '@dynamic-labs/sdk-react-core'
import { EthereumWalletConnectors } from '@dynamic-labs/ethereum'
import { SolanaWalletConnectors } from '@dynamic-labs/solana'
import { BitcoinWalletConnectors } from '@dynamic-labs/bitcoin'
import { DynamicWagmiConnector } from '@dynamic-labs/wagmi-connector'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider, createConfig, http } from 'wagmi'
import { mainnet, polygon, optimism, arbitrum, base } from 'wagmi/chains'
import { type ReactNode, Component, type ErrorInfo } from 'react'

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
})

const dynamicEnvId = process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID

/**
 * Error boundary that catches Dynamic SDK's "getClient still null" error
 * and retries rendering after a short delay. This handles the race condition
 * where DynamicContextProvider hasn't set up its internal client yet
 * when child components try to access it.
 */
class DynamicClientErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; retryCount: number }
> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false, retryCount: 0 }
  }

  static getDerivedStateFromError(error: Error) {
    if (error.message?.includes('getClient when it was still null')) {
      return { hasError: true }
    }
    throw error // Re-throw non-Dynamic errors
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('[DynamicClientErrorBoundary] Caught initialization error, retrying...', error.message, info)
  }

  componentDidUpdate() {
    if (this.state.hasError && this.state.retryCount < 5) {
      setTimeout(() => {
        this.setState(prev => ({
          hasError: false,
          retryCount: prev.retryCount + 1,
        }))
      }, 200 * (this.state.retryCount + 1))
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.state.retryCount >= 5) {
        return (
          <div className="flex items-center justify-center min-h-screen">
            <p className="text-muted-foreground">Failed to initialize. Please refresh the page.</p>
          </div>
        )
      }
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      )
    }
    return this.props.children
  }
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
          <DynamicClientErrorBoundary>
            <DynamicWagmiConnector>
              {children}
            </DynamicWagmiConnector>
          </DynamicClientErrorBoundary>
        </QueryClientProvider>
      </WagmiProvider>
    </DynamicContextProvider>
  )
}
