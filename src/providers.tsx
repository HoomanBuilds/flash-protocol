'use client'

import { RainbowKitProvider, RainbowKitAuthenticationProvider, AuthenticationStatus, lightTheme } from '@rainbow-me/rainbowkit'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { WagmiProvider } from 'wagmi'
import { config } from '@/config/wagmi'
import { authenticationAdapter } from '@/lib/auth-adapter'
import { useEffect } from 'react'
import { useUserStore } from '@/store/user'
import '@rainbow-me/rainbowkit/styles.css'

const queryClient = new QueryClient()

const monoTheme = lightTheme({
  accentColor: '#000000',
  accentColorForeground: '#ffffff',
  borderRadius: 'none',
  fontStack: 'system',
  overlayBlur: 'small',
})

// Override specific tokens for full monochrome
monoTheme.colors.connectButtonBackground = '#ffffff'
monoTheme.colors.connectButtonInnerBackground = '#f5f5f5'
monoTheme.colors.connectButtonText = '#000000'
monoTheme.colors.modalBackground = '#ffffff'
monoTheme.colors.modalBorder = '#e5e5e5'
monoTheme.fonts.body = "'Geist Mono', monospace"

export function Providers({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, fetchUser } = useUserStore()

  useEffect(() => {
    fetchUser()
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
          <RainbowKitProvider theme={monoTheme}>
            {children}
          </RainbowKitProvider>
        </RainbowKitAuthenticationProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
