'use client'

import { useState, useEffect, useCallback } from 'react'
import { useWalletClient, usePublicClient } from 'wagmi'
import { useAppKitAccount } from '@reown/appkit/react'
import { createWalletClient, http } from 'viem'
import * as viemChains from 'viem/chains'
import { Loader2, ArrowDownToLine, CheckCircle, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { deriveClaimKey } from '@/lib/stealth'
import { privateKeyToAccount } from 'viem/accounts'

interface StealthClaim {
  id: string
  stealth_safe_address: string
  chain_id: string
  nonce: number
  ephemeral_public_key: string
  amount_received: number
  claimed: boolean
  claimed_at: string | null
  claim_tx_hash: string | null
  created_at: string
}

interface ClaimsData {
  unclaimed: StealthClaim[]
  claimed: StealthClaim[]
  total_unclaimed: number
  total_claimable: number
}

// Chain display names
const CHAIN_NAMES: Record<string, string> = {
  '1': 'Ethereum',
  '10': 'Optimism',
  '137': 'Polygon',
  '8453': 'Base',
  '42161': 'Arbitrum',
  '43114': 'Avalanche',
  '56': 'BSC',
}

const CHAIN_SYMBOLS: Record<string, string> = {
  '1': 'ETH',
  '10': 'ETH',
  '137': 'MATIC',
  '8453': 'ETH',
  '42161': 'ETH',
  '43114': 'AVAX',
  '56': 'BNB',
}

// Map chain IDs to viem chain configs
const chainMap: Record<number, any> = {}
for (const [, chain] of Object.entries(viemChains)) {
  if (typeof chain === 'object' && chain !== null && 'id' in chain) {
    chainMap[(chain as any).id] = chain
  }
}

export default function ClaimPanel() {
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  const { address } = useAppKitAccount()

  const [claims, setClaims] = useState<ClaimsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [claimingId, setClaimingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const fetchClaims = useCallback(async () => {
    if (!address) return
    try {
      const res = await fetch('/api/stealth/claims', {
        headers: { 'x-wallet-address': address },
      })
      const data = await res.json()
      if (res.ok) setClaims(data)
    } catch (err) {
      console.error('Failed to fetch claims:', err)
    } finally {
      setLoading(false)
    }
  }, [address])

  useEffect(() => {
    fetchClaims()
  }, [fetchClaims])

  const handleClaim = async (claim: StealthClaim) => {
    if (!walletClient || !publicClient || !address) return

    setClaimingId(claim.id)
    setError('')

    try {
      // 1. Re-derive the stealth private key (requires wallet signature)
      const { stealthPrivateKey } = await deriveClaimKey({
        walletClient,
        ephemeralPublicKey: claim.ephemeral_public_key as `0x${string}`,
      })

      // 2. Create a wallet client for the stealth EOA
      // This is separate from the merchant's connected wallet
      const stealthAccount = privateKeyToAccount(stealthPrivateKey)
      const chainId = parseInt(claim.chain_id, 10)
      const chain = chainMap[chainId]

      if (!chain) throw new Error(`Unsupported chain: ${claim.chain_id}`)

      const stealthWalletClient = createWalletClient({
        account: stealthAccount,
        chain,
        transport: http(),
      })

      // 3. Estimate gas cost dynamically instead of hardcoded values
      const amountWei = BigInt(Math.floor(claim.amount_received * 1e18))
      const gasPrice = await publicClient.getGasPrice()
      const gasLimit = BigInt(21000) // Simple ETH transfer
      const gasCost = gasPrice * gasLimit
      const sweepAmount = amountWei - gasCost

      if (sweepAmount <= BigInt(0)) {
        throw new Error('Balance too low to cover gas for claiming')
      }

      // 4. Send from stealth EOA → merchant wallet
      const hash = await stealthWalletClient.sendTransaction({
        chain,
        to: address as `0x${string}`,
        value: sweepAmount,
      })

      // 5. Mark as claimed in backend
      await fetch('/api/stealth/claims', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': address,
        },
        body: JSON.stringify({
          stealthAddressId: claim.id,
          claimTxHash: hash,
        }),
      })

      // 6. Refresh claims
      await fetchClaims()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Claim failed'
      if (message.includes('rejected') || message.includes('denied')) {
        setError('Signature rejected')
      } else {
        setError(message)
      }
    } finally {
      setClaimingId(null)
    }
  }

  if (loading) {
    return (
      <div className="border border-border bg-background p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-xs font-mono">SCANNING_STEALTH_ADDRESSES...</span>
        </div>
      </div>
    )
  }

  if (!claims || (claims.unclaimed.length === 0 && claims.claimed.length === 0)) {
    return null // Don't render if no stealth activity
  }

  return (
    <div className="border border-border bg-background">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ArrowDownToLine className="w-4 h-4 text-green-500" />
          <span className="text-sm font-bold font-mono tracking-widest uppercase">
            STEALTH_CLAIMS
          </span>
        </div>
        {claims.total_unclaimed > 0 && (
          <span className="px-2 py-0.5 text-xs font-mono bg-green-500/10 text-green-500 border border-green-500/30">
            {claims.total_unclaimed} UNCLAIMED
          </span>
        )}
      </div>

      {/* Unclaimed Payments */}
      {claims.unclaimed.length > 0 && (
        <div className="divide-y divide-border">
          {claims.unclaimed.map((claim) => {
            const chainName = CHAIN_NAMES[claim.chain_id] || `Chain ${claim.chain_id}`
            const symbol = CHAIN_SYMBOLS[claim.chain_id] || 'ETH'
            const isClaiming = claimingId === claim.id

            return (
              <div key={claim.id} className="px-6 py-4 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold font-mono">
                      {claim.amount_received.toFixed(6)} {symbol}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      on {chainName}
                    </span>
                  </div>
                  <div className="text-[10px] text-muted-foreground font-mono truncate max-w-[200px] md:max-w-[400px]">
                    {claim.stealth_safe_address}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="font-mono text-xs"
                  onClick={() => handleClaim(claim)}
                  disabled={isClaiming}
                >
                  {isClaiming ? (
                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                  ) : null}
                  {isClaiming ? 'CLAIMING...' : 'CLAIM'}
                </Button>
              </div>
            )
          })}
        </div>
      )}

      {/* Recently Claimed */}
      {claims.claimed.length > 0 && (
        <div className="border-t border-border">
          <div className="px-6 py-2 bg-muted/30">
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
              RECENTLY_CLAIMED
            </span>
          </div>
          <div className="divide-y divide-border">
            {claims.claimed.slice(0, 5).map((claim) => {
              const symbol = CHAIN_SYMBOLS[claim.chain_id] || 'ETH'
              return (
                <div key={claim.id} className="px-6 py-3 flex items-center justify-between text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3 h-3 text-green-500" />
                    <span className="text-xs font-mono">
                      {claim.amount_received?.toFixed(6)} {symbol}
                    </span>
                  </div>
                  {claim.claim_tx_hash && (
                    <span className="text-[10px] font-mono truncate max-w-[120px]">
                      {claim.claim_tx_hash.slice(0, 10)}...
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="px-6 py-3 bg-destructive/10 border-t border-destructive/20 text-destructive text-xs font-mono">
          {error}
        </div>
      )}
    </div>
  )
}
