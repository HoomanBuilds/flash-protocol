'use client'

import { RainbowKitProvider, RainbowKitAuthenticationProvider, AuthenticationStatus, darkTheme } from '@rainbow-me/rainbowkit'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { WagmiProvider } from 'wagmi'
import { config } from '@/config/wagmi'
import { authenticationAdapter } from '@/lib/auth-adapter'
import { useEffect } from 'react'
import { useUserStore } from '@/store/user'
import '@rainbow-me/rainbowkit/styles.css'

const queryClient = new QueryClient()

export function Providers({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, fetchUser } = useUserStore()

  useEffect(() => {
    fetchUser()
  }, []) 

  const status: AuthenticationStatus = isLoading 
    ? 'loading' 
    : isAuthenticated ? 'authenticated' : 'unauthenticated'

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitAuthenticationProvider 
          adapter={authenticationAdapter} 
          status={status}
        >
          <RainbowKitProvider theme={darkTheme()}>
            {children}
          </RainbowKitProvider>
        </RainbowKitAuthenticationProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
