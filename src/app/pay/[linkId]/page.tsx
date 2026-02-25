'use client'

import { useEffect, useState } from 'react'
import { DynamicWidget, useDynamicContext } from '@dynamic-labs/sdk-react-core'
import { Loader2, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import PaymentInterface from '@/components/PaymentInterface'
import { ReceiptStatus } from '@/components/receipt/ReceiptStatus'

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
  success_url?: string | null
  cancel_url?: string | null
}

export default function PayPage({ 
  params: paramsPromise,
  searchParams: searchParamsPromise
}: { 
  params: Promise<{ linkId: string }>
  searchParams: Promise<{ txId?: string }>
}) {
  const { primaryWallet } = useDynamicContext()
  const address = primaryWallet?.address
  const isConnected = !!primaryWallet
  const [link, setLink] = useState<PaymentLinkData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [linkId, setLinkId] = useState<string>('')
  const [amount, setAmount] = useState<string>('')
  const [successMessage, setSuccessMessage] = useState('')
  
  // Receipt State
  const [txId, setTxId] = useState<string | null>(null)

  useEffect(() => {
    paramsPromise.then(p => setLinkId(p.linkId))
    searchParamsPromise.then(p => {
      if (p.txId) setTxId(p.txId)
    })
  }, [paramsPromise, searchParamsPromise])

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

  const handlePaymentComplete = (txHash: string, transactionId: string) => {
    // Update URL without full reload to show receipt
    const newUrl = `${window.location.pathname}?txId=${transactionId}`
    window.history.pushState({ path: newUrl }, '', newUrl)
    setTxId(transactionId)
  }

  const handleCancel = () => {
    if (link?.cancel_url) {
      window.location.href = link.cancel_url
    }
  }

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

  if (successMessage) return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 font-mono">
       <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-green-500 rounded-full mx-auto flex items-center justify-center animate-bounce">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-background">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <h2 className="text-2xl font-bold">{successMessage}</h2>
          {link.success_url && <p className="text-muted-foreground text-sm">You are being redirected...</p>}
       </div>
    </div>
  )

  if (txId) {
    return (
      <div className="min-h-screen bg-background text-foreground relative overflow-hidden font-mono flex flex-col">
         <header className="px-6 py-4 border-b border-border flex justify-between items-center">
              <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-foreground rounded-full" />
                  <span className="font-bold tracking-tight">RECEIPT_VIEWER</span>
              </div>
         </header>
         <main className="flex-1 flex items-center justify-center p-4">
              <ReceiptStatus transactionId={txId} />
         </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden font-mono flex flex-col">
      {/* Header */}
      <header className="relative z-10 px-6 py-4 flex justify-between items-center border-b border-border bg-background">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-xs tracking-widest text-muted-foreground uppercase">SECURE_PAYMENT_CHANNEL</span>
        </div>
        {!isConnected && (
          <DynamicWidget />
        )}
        {isConnected && (
          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground hidden sm:inline-block">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
            <DynamicWidget />
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
        <div className="w-full max-w-2xl px-4 space-y-4">
          {!isConnected ? (
            <div className="text-center py-12 border border-dashed border-border bg-background">
              <p className="text-muted-foreground mb-6 font-mono text-sm">WALLET_REQUIRED</p>
              <DynamicWidget />
            </div>
          ) : (
            <PaymentInterface link={link} onSuccess={handlePaymentComplete} />
          )}

          {link.cancel_url && (
            <button 
              onClick={handleCancel}
              className="w-full text-center text-xs text-muted-foreground hover:text-red-500 transition-colors uppercase tracking-widest py-4 border border-transparent hover:border-red-200"
            >
              CANCEL_PAYMENT
            </button>
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
