import { useDynamicContext } from '@dynamic-labs/sdk-react-core'

/**
 * Hook that provides the connected wallet address from Dynamic.xyz
 * Replaces the old session cookie-based approach.
 */
export function useSession() {
  const { primaryWallet } = useDynamicContext()

  return {
    sessionToken: primaryWallet?.address || null,
    walletAddress: primaryWallet?.address || null,
    isConnected: !!primaryWallet,
  }
}
