'use client'

import { useState } from 'react'
import { useAccount, useSendTransaction } from 'wagmi'
import { formatUnits, parseUnits } from 'viem'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { QuoteDisplay } from '@/components/QuoteDisplay'
import { ConnectButton } from '@rainbow-me/rainbowkit'

// Hardcoded Test Tokens (Sepolia -> Optimism Sepolia)
const TOKENS = {
  SEPOLIA: {
    chainId: 11155111,
    address: '0x0000000000000000000000000000000000000000', // Native ETH
    symbol: 'ETH',
    decimals: 18
  },
  OP_SEPOLIA: {
    chainId: 11155420,
    address: '0x0000000000000000000000000000000000000000', // Native ETH
    symbol: 'ETH',
    decimals: 18
  }
}

export default function SwapPage() {
  const { address, isConnected } = useAccount()
  const [amount, setAmount] = useState('0.01')
  const [quote, setQuote] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { sendTransactionAsync } = useSendTransaction()

  const handleGetQuote = async () => {
    setIsLoading(true)
    setQuote(null)
    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        body: JSON.stringify({
          fromChainId: TOKENS.SEPOLIA.chainId,
          toChainId: TOKENS.OP_SEPOLIA.chainId,
          fromTokenAddress: TOKENS.SEPOLIA.address,
          toTokenAddress: TOKENS.OP_SEPOLIA.address,
          fromAmount: parseUnits(amount, TOKENS.SEPOLIA.decimals).toString(),
          fromAddress: address,
        }),
      })
      const data = await res.json()
      if (data.routes && data.routes.length > 0) {
        setQuote(data.routes[0])
      } else {
        alert('No routes found')
      }
    } catch (e) {
      console.error(e)
      alert('Failed to get quote')
    } finally {
      setIsLoading(false)
    }
  }

  const handleExecute = async () => {
    if (!quote || !address) return
    setIsLoading(true)
    try {
      // 1. Log Intent
      const initRes = await fetch('/api/transactions/initiate', {
        method: 'POST',
        body: JSON.stringify({
          walletAddress: address,
          fromChainId: TOKENS.SEPOLIA.chainId,
          toChainId: TOKENS.OP_SEPOLIA.chainId,
          fromToken: TOKENS.SEPOLIA.address,
          toToken: TOKENS.OP_SEPOLIA.address,
          fromAmount: quote.fromAmount,
          toAmount: quote.toAmount,
          route: quote,
          paymentLinkId: null 
        })
      })
      
      if (!initRes.ok) throw new Error('Failed to initiate transaction')

      // 2. Execute Transaction
      const txRequest = quote.transactionRequest
      if (txRequest) {
        const hash = await sendTransactionAsync({
          to: txRequest.to as `0x${string}`,
          data: txRequest.data as `0x${string}`,
          value: BigInt(txRequest.value || '0'),
          chainId: TOKENS.SEPOLIA.chainId
        })
        alert(`Transaction Submitted! Hash: ${hash}`)
      }
    } catch (e) {
      console.error(e)
      alert('Transaction Failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-10 flex flex-col items-center">
      <h1 className="text-3xl font-bold mb-8">Phase 2: LI.FI Swap Test</h1>
      
      <div className="mb-8">
        <ConnectButton />
      </div>

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Testnet Bridge</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>From (Sepolia ETH)</Label>
            <Input 
              type="number" 
              value={amount} 
              onChange={(e) => setAmount(e.target.value)} 
            />
          </div>
          
          <div className="space-y-2">
            <Label>To (Optimism Sepolia ETH)</Label>
            <div className="p-3 bg-secondary rounded-md text-sm text-muted-foreground">
              Auto-calculated
            </div>
          </div>

          <Button 
            className="w-full" 
            onClick={handleGetQuote} 
            disabled={!isConnected || isLoading}
          >
            {isLoading ? 'Loading...' : 'Get Quote'}
          </Button>
        </CardContent>
      </Card>

      {quote && (
        <QuoteDisplay 
          route={quote} 
          onSwap={handleExecute} 
          isLoading={isLoading} 
        />
      )}
    </div>
  )
}
