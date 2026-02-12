'use client'

import { useEffect, useState } from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount } from 'wagmi'
import { Loader2, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import PaymentInterface from '@/components/PaymentInterface'

interface PaymentLinkData {
  id: string
  title: string
  description?: string
  amount?: number
  currency: string
  recipient_address: string
  receive_mode: 'same_chain' | 'specific_chain'
  receive_chain_id?: number
  receive_token?: string
  receive_token_symbol?: string
}

export default function PayPage({ params: paramsPromise }: { params: Promise<{ linkId: string }> }) {
  const { address, isConnected } = useAccount()
  const [link, setLink] = useState<PaymentLinkData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [linkId, setLinkId] = useState<string>('')
  const [amount, setAmount] = useState<string>('')

  useEffect(() => {
    paramsPromise.then(p => setLinkId(p.linkId))
  }, [paramsPromise])

  useEffect(() => {
    async function fetchLink() {
      try {
        const res = await fetch(`/api/payment-links/${linkId}`)
        if (!res.ok) {
          const errData = await res.json()
          throw new Error(errData.error || 'Failed to load payment link')
        }
        const data = await res.json()
        setLink(data)
        if (data.amount) setAmount(data.amount.toString())
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        setError(message)
      } finally {
        setLoading(false)
      }
    }
    if (linkId) fetchLink()
  }, [linkId])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground font-mono">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="text-sm text-muted-foreground animate-pulse">INITIALIZING_SECURE_CONNECTION...</span>
      </div>
    </div>
  )

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Alert variant="destructive" className="max-w-md font-mono">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>CONNECTION_ERROR</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    </div>
  )

  if (!link) return null

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden font-mono flex flex-col">
      {/* Header */}
      <header className="relative z-10 px-6 py-4 flex justify-between items-center border-b border-border bg-background">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-xs tracking-widest text-muted-foreground uppercase">SECURE_PAYMENT_CHANNEL</span>
        </div>
        {!isConnected && (
          <ConnectButton.Custom>
            {({ openConnectModal, mounted }) =>
              mounted && (
                <button
                  onClick={openConnectModal}
                  className="text-xs bg-foreground text-background px-4 py-2 hover:bg-foreground/90 transition-colors uppercase tracking-wider font-bold"
                >
                  [ CONNECT_WALLET ]
                </button>
              )
            }
          </ConnectButton.Custom>
        )}
        {isConnected && (
          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground hidden sm:inline-block">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
            <ConnectButton showBalance={false} chainStatus="icon" accountStatus="avatar" />
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 relative z-10">

        <div className="mb-8 text-center space-y-2">
          <h1 className="text-2xl md:text-4xl font-bold tracking-tighter">
            {link.title.toUpperCase()}
          </h1>
          {link.description && (
            <p className="text-muted-foreground text-sm max-w-lg mx-auto border-l-2 border-border pl-3 text-left">
              {link.description}
            </p>
          )}
        </div>

        {/* Amount Display */}
        <div className="mb-8 text-center">
          <div className="inline-block px-6 py-2 bg-muted/50 border border-border">
            <span className="text-xs text-muted-foreground uppercase tracking-widest mr-3">TOTAL_DUE</span>
            <span className="text-2xl md:text-3xl font-bold tracking-tight">
              {link.amount ? `$${link.amount} ${link.currency}` : 'OPEN_AMOUNT'}
            </span>
          </div>
        </div>

        {/* Interface Container */}
        <div className="w-full max-w-2xl px-4">
          {!isConnected ? (
            <div className="text-center py-12 border border-dashed border-border bg-background">
              <p className="text-muted-foreground mb-6 font-mono text-sm">WALLET_REQUIRED</p>
              <ConnectButton.Custom>
                {({ openConnectModal, mounted }) => (
                  <button
                    onClick={openConnectModal}
                    disabled={!mounted}
                    className="bg-foreground text-background font-bold py-3 px-8 text-sm uppercase tracking-wider transition-all hover:bg-foreground/90"
                  >
                    [ INITIALIZE_CONNECTION ]
                  </button>
                )}
              </ConnectButton.Custom>
            </div>
          ) : (
            <PaymentInterface link={link} />
          )}
        </div>

      </main>

      {/* Footer Status Bar */}
      <footer className="relative z-10 border-t border-border bg-background px-6 py-2 flex justify-between items-center text-[10px] text-muted-foreground font-mono uppercase">
        <div className="flex gap-4">
          <span>LATENCY: 12ms</span>
          <span>ENCRYPTION: AES-256</span>
        </div>
        <div>
          FLASH PROTOCOL_SYSTEMS © {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  )
}
