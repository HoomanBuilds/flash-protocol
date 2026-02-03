import { createAuthenticationAdapter } from '@rainbow-me/rainbowkit'
import { SiweMessage } from 'siwe'
import { useUserStore } from '@/store/user'

export const authenticationAdapter = createAuthenticationAdapter({
  getNonce: async () => {
    const response = await fetch('/api/auth/nonce')
    const { nonce } = await response.json()
    return nonce
  },

  createMessage: ({ nonce, address, chainId }) => {
    return new SiweMessage({
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
    const verifyRes = await fetch('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: message.prepareMessage(), signature }),
    })
    
    if (!verifyRes.ok) {
        throw new Error('Failed to verify signature')
    }

    const data = await verifyRes.json()
    if (data.success && data.user) {
        useUserStore.getState().setUser(data.user)
    }
    
    return Boolean(data.success)
  },

  signOut: async () => {
    await useUserStore.getState().logout()
  },
})
