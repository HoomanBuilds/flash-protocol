'use client'

import { useState, useEffect, useCallback } from 'react'
import { useWalletClient } from 'wagmi'
import { useAppKitAccount } from '@reown/appkit/react'
import { Loader2, Shield, ShieldOff, ShieldCheck, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { generateStealthKeys } from '@/lib/stealth'

interface StealthStatus {
  stealth_enabled: boolean
  stealth_meta_address: string | null
  has_keys: boolean
}

export default function StealthSettings() {
  const { data: walletClient } = useWalletClient()
  const { address } = useAppKitAccount()

  const [status, setStatus] = useState<StealthStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchStatus = useCallback(async () => {
    if (!address) return
    try {
      const res = await fetch('/api/profile/stealth', {
        headers: { 'x-wallet-address': address },
      })
      const data = await res.json()
      if (res.ok) setStatus(data)
    } catch (err) {
      console.error('Failed to fetch stealth status:', err)
    } finally {
      setLoading(false)
    }
  }, [address])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  const handleEnable = async () => {
    if (!walletClient || !address) return

    setActionLoading(true)
    setError('')

    try {
      // 1. Generate keys client-side (triggers wallet signature)
      const { viewingKeyNodeSerialized, stealthMetaAddress } =
        await generateStealthKeys(walletClient)

      // 2. Send viewing key node to backend (spending key stays in browser)
      const res = await fetch('/api/profile/stealth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': address,
        },
        body: JSON.stringify({
          viewingKeyNode: viewingKeyNodeSerialized,
          stealthMetaAddress,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to enable stealth mode')
      }

      await fetchStatus()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to enable stealth mode'
      if (message.includes('rejected') || message.includes('denied')) {
        setError('Signature rejected. You must sign the message to enable privacy mode.')
      } else {
        setError(message)
      }
    } finally {
      setActionLoading(false)
    }
  }

  const handleDisable = async () => {
    if (!address) return

    setActionLoading(true)
    setError('')

    try {
      const res = await fetch('/api/profile/stealth', {
        method: 'DELETE',
        headers: { 'x-wallet-address': address },
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to disable stealth mode')
      }

      await fetchStatus()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to disable stealth mode'
      setError(message)
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  const isEnabled = status?.stealth_enabled && status?.has_keys

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          {isEnabled ? (
            <ShieldCheck className="w-5 h-5 text-green-500" />
          ) : (
            <Shield className="w-5 h-5 text-muted-foreground" />
          )}
          <CardTitle>Privacy Mode</CardTitle>
        </div>
        <CardDescription>
          Receive payments at unlinkable stealth addresses. Each payment gets a fresh address
          that cannot be traced back to your wallet on-chain.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Toggle */}
        <div className="flex items-center justify-between p-4 bg-muted/50 border border-border">
          <div className="space-y-1">
            <Label className="text-sm font-bold font-mono">STEALTH_MODE</Label>
            <p className="text-xs text-muted-foreground">
              {isEnabled
                ? 'Payments are privacy-protected with stealth addresses'
                : 'Enable to receive payments at unlinkable addresses'}
            </p>
          </div>
          <Switch
            checked={isEnabled}
            onCheckedChange={(checked) => {
              if (checked) handleEnable()
              else handleDisable()
            }}
            disabled={actionLoading}
          />
        </div>

        {/* Key Status */}
        {isEnabled && status?.stealth_meta_address && (
          <div className="space-y-3">
            <Label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
              STEALTH_META_ADDRESS
            </Label>
            <div className="p-3 bg-muted/30 border border-border font-mono text-xs break-all text-muted-foreground">
              {status.stealth_meta_address}
            </div>
            <p className="text-[10px] text-muted-foreground font-mono">
              This is your public stealth identity. It is used to generate unique payment
              addresses. Your spending key is never stored — it is derived from your wallet
              signature each time you claim.
            </p>
          </div>
        )}

        {/* Info Notice */}
        {!isEnabled && (
          <div className="p-4 border border-border bg-muted/20 space-y-2">
            <p className="text-xs font-mono text-muted-foreground">
              <span className="text-foreground font-bold">HOW_IT_WORKS:</span> When enabled,
              customers pay to single-use stealth Safe addresses. You receive native chain tokens
              (ETH, MATIC, etc.) instead of USDC. Claim payments from your dashboard when ready.
            </p>
            <p className="text-xs font-mono text-yellow-500">
              ⚠ IMPORTANT: You will receive native tokens, not stablecoins. Prices may fluctuate.
            </p>
          </div>
        )}

        {/* Loading State */}
        {actionLoading && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-xs font-mono">
              {isEnabled ? 'DISABLING...' : 'SIGN_WALLET_MESSAGE...'}
            </span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs font-mono">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
