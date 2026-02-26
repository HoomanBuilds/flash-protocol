import { useAppKitAccount } from '@reown/appkit/react'

/**
 * Hook that provides the connected wallet address.
 * Uses Reown AppKit's useAppKitAccount which works across all chains
 * (EVM, Solana, etc.), unlike wagmi's useAccount which is EVM-only.
 */
export function useSession() {
  const { address, isConnected } = useAppKitAccount()

  return {
    sessionToken: address || null,
    walletAddress: address || null,
    isConnected,
  }
}
