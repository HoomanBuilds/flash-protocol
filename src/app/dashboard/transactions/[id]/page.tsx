'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useDynamicContext } from '@dynamic-labs/sdk-react-core'
import { 
  ArrowLeft, 
  Loader2, 
  ExternalLink, 
  Copy, 
  CheckCircle, 
  XCircle, 
  Clock,
  Share2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'

interface TransactionDetails {
  id: string
  payment_link_id: string
  status: 'completed' | 'pending' | 'failed'
  amount: number
  currency: string
  customer_wallet: string
  tx_hash: string
  from_chain_id: number
  to_chain_id: number
  from_token: string
  to_token: string
  created_at: string
  completed_at?: string
  platform_fee?: number
  actual_output?: number
  metadata?: any
}

export default function TransactionDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { toast } = useToast()
  const resolvedParams = use(params)
  const [transaction, setTransaction] = useState<TransactionDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const { primaryWallet } = useDynamicContext()

  useEffect(() => {
    fetchTransactionDetails()
  }, [resolvedParams.id])

  async function fetchTransactionDetails() {
    try {
      const headers: Record<string, string> = primaryWallet?.address ? { 'x-wallet-address': primaryWallet.address } : {}
      const res = await fetch(`/api/transactions/${resolvedParams.id}`, { headers })
      if (res.ok) {
        const data = await res.json()
        setTransaction(data)
      } else {
        toast({
          title: "Error",
          description: "Failed to load transaction details",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Failed to fetch transaction', error)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard.`
    })
  }

  const getExplorerLink = (txHash: string, chainId: number) => {
    // Basic mapping, in production use a robust chain config
    const explorers: Record<number, string> = {
      1: 'https://etherscan.io/tx/',
      137: 'https://polygonscan.com/tx/',
      42161: 'https://arbiscan.io/tx/',
      10: 'https://optimistic.etherscan.io/tx/',
      8453: 'https://basescan.org/tx/'
    }
    return (explorers[chainId] || 'https://etherscan.io/tx/') + txHash
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!transaction) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-bold">Transaction Not Found</h2>
        <Button variant="link" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
        </Button>
      </div>
    )
  }

  const paymentPageUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/pay/${transaction.payment_link_id}`

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            TRANSACTION DETAILS
            <Badge variant={transaction.status === 'completed' ? 'default' : 'secondary'} className="ml-2 uppercase">
              {transaction.status}
            </Badge>
          </h1>
          <p className="text-sm text-muted-foreground font-mono">ID: {transaction.id}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Main Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-mono tracking-widest uppercase text-muted-foreground">Payment Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Total Amount</div>
              <div className="text-3xl font-bold">
                ${transaction.amount?.toFixed(2)} {transaction.currency || 'USD'}
              </div>
            </div>
            
            <Separator />
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground mb-1">Date</div>
                <div className="font-medium">
                  {new Date(transaction.created_at).toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground mb-1">Method</div>
                <div className="font-medium uppercase">
                  {transaction.from_token} on Chain #{transaction.from_chain_id}
                </div>
              </div>
            </div>

            {/* Payment Page Link - The requested feature */}
            {transaction.payment_link_id && (
              <div className="pt-4 mt-4 border-t border-border">
                <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                  <Share2 className="h-3 w-3" /> PAYMENT PAGE URL
                </div>
                <div className="flex items-center gap-2 bg-muted p-2 rounded text-xs font-mono break-all">
                  <span className="flex-1 truncate">{paymentPageUrl}</span>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-6 w-6"
                    onClick={() => copyToClipboard(paymentPageUrl, "Payment URL")}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Link href={paymentPageUrl} target="_blank">
                    <Button size="icon" variant="ghost" className="h-6 w-6">
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Blockchain Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-mono tracking-widest uppercase text-muted-foreground">Blockchain Data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <div className="text-muted-foreground mb-1">Customer Wallet</div>
              <div className="font-mono flex items-center gap-2">
                {transaction.customer_wallet}
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-4 w-4"
                  onClick={() => copyToClipboard(transaction.customer_wallet, "Wallet Address")}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <div>
              <div className="text-muted-foreground mb-1">Transaction Hash</div>
              <div className="font-mono flex items-center gap-2 break-all">
                <span className="truncate">{transaction.tx_hash || 'Pending...'}</span>
                {transaction.tx_hash && (
                  <Link 
                    href={getExplorerLink(transaction.tx_hash, transaction.from_chain_id)} 
                    target="_blank"
                  >
                    <ExternalLink className="h-4 w-4 text-primary hover:underline" />
                  </Link>
                )}
              </div>
            </div>

            <Separator />
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-muted-foreground mb-1">Network Fee</div>
                <div>{transaction.platform_fee ? `$${transaction.platform_fee.toFixed(2)}` : '-'}</div>
              </div>
              <div>
                <div className="text-muted-foreground mb-1">Net Received</div>
                <div className="font-bold text-green-600">
                  {transaction.actual_output ? `$${transaction.actual_output.toFixed(2)}` : 'Calculating...'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Metadata / Raw Data */}
        {transaction.metadata && Object.keys(transaction.metadata).length > 0 && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-sm font-mono tracking-widest uppercase text-muted-foreground">API Metadata</CardTitle>
            </CardHeader>
            <CardContent>
               <pre className="bg-muted p-4 rounded text-xs font-mono overflow-x-auto">
                 {JSON.stringify(transaction.metadata, null, 2)}
               </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
