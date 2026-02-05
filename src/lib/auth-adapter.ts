import { createAuthenticationAdapter } from '@rainbow-me/rainbowkit'
import { createSiweMessage } from 'viem/siwe'
import { useUserStore } from '@/store/user'

export const authenticationAdapter = createAuthenticationAdapter({
  getNonce: async () => {
    const response = await fetch('/api/auth/nonce')
    const { nonce } = await response.json()
    return nonce
  },

  createMessage: ({ nonce, address, chainId }) => {
    return createSiweMessage({
      domain: window.location.host,
      address,
      statement: 'Sign in to Crypto Payment Gateway',
      uri: window.location.origin,
      version: '1',
      chainId,
      nonce,
    })
  },



  verify: async ({ message, signature }) => {
    try {
      const verifyRes = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, signature }),
      })
      
      if (!verifyRes.ok) {
        const errorData = await verifyRes.json()
        console.error('SIWE Verify failed:', errorData)
        return false
      }

      const data = await verifyRes.json()
      if (data.success && data.user) {
          useUserStore.getState().setUser(data.user)
      }
      
      return Boolean(data.success)
    } catch (error) {
      console.error('SIWE Verify Error:', error)
      return false
    }
  },

  signOut: async () => {
    await useUserStore.getState().logout()
  },
})
