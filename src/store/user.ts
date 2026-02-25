import { create } from 'zustand'

interface WalletState {
  walletAddress: string | null
  isConnected: boolean
  chainType: 'evm' | 'solana' | 'bitcoin' | null

  setWallet: (address: string | null, chainType?: 'evm' | 'solana' | 'bitcoin' | null) => void
  disconnect: () => void
}

export const useWalletStore = create<WalletState>((set) => ({
  walletAddress: null,
  isConnected: false,
  chainType: null,

  setWallet: (address, chainType = null) =>
    set({ walletAddress: address, isConnected: !!address, chainType }),

  disconnect: () =>
    set({ walletAddress: null, isConnected: false, chainType: null }),
}))

// Keep backward compat alias
export const useUserStore = useWalletStore
