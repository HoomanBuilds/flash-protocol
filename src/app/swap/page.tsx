'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSendTransaction, useSwitchChain, useAccount } from 'wagmi'
import { formatUnits, parseUnits } from 'viem'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { QuoteDisplay } from '@/components/QuoteDisplay'
import { useAppKit, useAppKitAccount } from '@reown/appkit/react'

import { CHAINS } from '@/lib/chains'
import { getTokensByChain } from '@/lib/tokens'

const SUPPORTED_CHAINS = CHAINS.filter(c => 
  c.type === 'evm' && !c.isTestnet
).sort((a, b) => {
  const aCount = Object.values(a.providers).filter(Boolean).length
  const bCount = Object.values(b.providers).filter(Boolean).length
  return bCount - aCount
})

interface QuoteData {
  id: string
  provider: string
  fromAmount: string
  toAmount: string
  toAmountMin?: string
  estimatedGas: string
  estimatedDuration: number
  transactionRequest?: Record<string, unknown>
  fees?: {
    totalFeeUSD: string
    bridgeFee?: string
    lpFee?: string
    gasCost?: string
    slippage?: string
  }
  toolsUsed?: string[]
  routes?: Array<{
    type?: 'swap' | 'bridge' | 'cross' | 'custom'
    tool?: string
    toolName?: string
    toolLogoURI?: string
    action: {
      fromToken: { symbol: string; chainId: number; decimals: number }
      toToken: { symbol: string; chainId: number; decimals: number }
      fromAmount?: string
      toAmount?: string
    }
    estimate?: {
      feeCosts?: Array<{
        name: string
        amountUSD: string
        percentage?: number
        description?: string
        included?: boolean
      }>
    }
  }>
}

export default function SwapPage() {
  const { open } = useAppKit()
  const { address: appKitAddress, isConnected } = useAppKitAccount()
  const address = appKitAddress as `0x${string}` | undefined
  const { chain: connectedChain } = useAccount()
  const { switchChain } = useSwitchChain()
  
  // Chain selection state
  const [fromChainId, setFromChainId] = useState(1) // Default: Ethereum
  const [toChainId, setToChainId] = useState(42161) // Default: Arbitrum
  
  // Token selection state
  const [fromTokenAddress, setFromTokenAddress] = useState('0x0000000000000000000000000000000000000000')
  const [toTokenAddress, setToTokenAddress] = useState('0x0000000000000000000000000000000000000000')
  
  const [amount, setAmount] = useState('0.01') // Default amount
  const [quotes, setQuotes] = useState<QuoteData[]>([])
  const [selectedQuote, setSelectedQuote] = useState<QuoteData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [expiresAt, setExpiresAt] = useState<number | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<number>(0)
  const [providerStats, setProviderStats] = useState<{
    succeeded: string[]
    failed: string[]
    timedOut: string[]
  } | null>(null)
  const { sendTransactionAsync } = useSendTransaction()

  const getChain = (chainId: number | string) => SUPPORTED_CHAINS.find(c => c.chainId === chainId)
  const fromChain = getChain(fromChainId)
  const toChain = getChain(toChainId)
  
  const getTokensForChain = (chainId: number) => {
    const chainTokens = getTokensByChain(chainId)
    const chain = getChain(chainId)
    
    const nonNativeTokens = chainTokens.filter(t => 
      t.address !== '0x0000000000000000000000000000000000000000' && !t.isNative
    )
    
    const nativeToken = {
      symbol: chain?.symbol || 'ETH',
      name: `Native ${chain?.symbol || 'ETH'}`,
      address: '0x0000000000000000000000000000000000000000',
      decimals: 18,
      chainId,
      isNative: true,
    }
    return [nativeToken, ...nonNativeTokens]
  }
  
  const fromTokens = getTokensForChain(fromChainId)
  const toTokens = getTokensForChain(toChainId)
  
  const fromToken = fromTokens.find(t => t.address.toLowerCase() === fromTokenAddress.toLowerCase()) || fromTokens[0]
  const toToken = toTokens.find(t => t.address.toLowerCase() === toTokenAddress.toLowerCase()) || toTokens[0]
  
  useEffect(() => {
    setFromTokenAddress('0x0000000000000000000000000000000000000000')
  }, [fromChainId])
  
  useEffect(() => {
    setToTokenAddress('0x0000000000000000000000000000000000000000')
  }, [toChainId])

  useEffect(() => {
    if (!expiresAt) return

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000))
      setTimeRemaining(remaining)

      if (remaining === 0 && quotes.length > 0) {
        handleGetQuote()
      }
    }, 1000)

    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiresAt, quotes.length])

  const handleGetQuote = useCallback(async () => {
    if (!address) return
    setIsLoading(true)
    setQuotes([])
    setSelectedQuote(null)
    setExpiresAt(null)
    setProviderStats(null)
    
    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromChainId,
          toChainId,
          fromTokenAddress,
          toTokenAddress,
          fromAmount: parseUnits(amount, fromToken.decimals).toString(),
          fromAddress: address,
        }),
      })
      const data = await res.json()
      
      if (data.routes && data.routes.length > 0) {
        setQuotes(data.routes)
        setSelectedQuote(data.bestQuote || data.routes[0])
        setExpiresAt(data.expiresAt)
        setTimeRemaining(Math.floor((data.expiresAt - Date.now()) / 1000))
        setProviderStats(data.providerStats)
      } else {
        setProviderStats(data.providerStats)
        alert('No routes found from any provider')
      }
    } catch (e) {
      console.error(e)
      alert('Failed to get quote')
    } finally {
      setIsLoading(false)
    }
  }, [address, amount, fromChainId, toChainId, fromTokenAddress, toTokenAddress, fromToken.decimals])

  const handleExecute = async () => {
    if (!selectedQuote || !address) return
    
    if (expiresAt && Date.now() > expiresAt) {
      alert('Quote expired. Fetching fresh quotes...')
      handleGetQuote()
      return
    }

    if (connectedChain?.id !== fromChainId) {
      try {
        await switchChain({ chainId: fromChainId })
      } catch {
        alert(`Please switch to ${fromChain?.name} to execute this transaction`)
        return
      }
    }

    setIsLoading(true)
    try {
      const initRes = await fetch('/api/transactions/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: address,
          fromChainId,
          toChainId,
          fromToken: fromChain?.nativeToken,
          toToken: toChain?.nativeToken,
          fromAmount: selectedQuote.fromAmount,
          toAmount: selectedQuote.toAmount,
          route: selectedQuote,
          provider: selectedQuote.provider,
          paymentLinkId: null 
        })
      })
      
      if (!initRes.ok) throw new Error('Failed to initiate transaction')
      const { transactionId } = await initRes.json()

      const txRequest = selectedQuote.transactionRequest
      if (txRequest) {
        const txTarget = (txRequest as Record<string, unknown>).to as string | undefined
        const txData = (txRequest as Record<string, unknown>).data as string | undefined
        const txValue = (txRequest as Record<string, unknown>).value as string | undefined

        if (txTarget && txData) {
          const hash = await sendTransactionAsync({
            to: txTarget as `0x${string}`,
            data: txData as `0x${string}`,
            value: BigInt(txValue || '0'),
            chainId: fromChainId
          })

          await fetch(`/api/transactions/${transactionId}/hash`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              txHash: hash,
              requestId: (txRequest as Record<string, unknown>).requestId
            })
          })

          alert(`Transaction Submitted! Hash: ${hash}`)
        } else {
          alert('Transaction data missing. Please try a different quote.')
        }
      } else {
        alert('No transaction data. Please refresh quotes.')
      }
    } catch (e) {
      console.error(e)
      alert('Transaction Failed')
    } finally {
      setIsLoading(false)
    }
  }

  const isBestQuote = (quote: QuoteData) => {
    if (quotes.length === 0) return false
    return quote.id === quotes[0].id && quote.provider === quotes[0].provider
  }

  return (
    <div className="container mx-auto py-10 flex flex-col items-center min-h-screen bg-slate-50 text-slate-900">
      <h1 className="text-3xl font-bold mb-8 text-slate-900">Cross-Chain Swap Aggregator</h1>
      
      <div className="mb-8">
        <button onClick={() => open()} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          Connect Wallet
        </button>
      </div>

      <Card className="w-full max-w-md mb-6 bg-white border-slate-200 shadow-xl">
        <CardHeader className="pb-4 border-b border-slate-100">
          <CardTitle className="text-slate-900">Bridge / Swap</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          {/* From Section */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 hover:border-slate-300 transition-colors">
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wide">From Network</Label>
            
            {/* From Chain */}
            <select 
              value={fromChainId}
              onChange={(e) => setFromChainId(Number(e.target.value))}
              className="w-full p-3 rounded-lg bg-white border border-slate-200 text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
            >
              {SUPPORTED_CHAINS.map(chain => (
                <option key={chain.chainId} value={chain.chainId}>
                  {chain.name}
                </option>
              ))}
            </select>
            
            {/* From Token */}
            <div className="flex gap-2">
              <select 
                value={fromTokenAddress}
                onChange={(e) => setFromTokenAddress(e.target.value)}
                className="flex-1 p-3 rounded-lg bg-white border border-slate-200 text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
              >
                {fromTokens.map(token => (
                  <option key={token.address} value={token.address}>
                    {token.symbol}
                  </option>
                ))}
              </select>
            </div>

            {/* Amount */}
            <div className="flex gap-2 items-center bg-white p-2 rounded-lg border border-slate-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all shadow-sm">
              <Input 
                type="number" 
                value={amount} 
                onChange={(e) => setAmount(e.target.value)}
                step="0.001"
                min="0"
                className="flex-1 bg-transparent border-0 focus-visible:ring-0 text-lg font-bold placeholder:text-slate-400 text-slate-900"
                placeholder="0.00"
              />
              <span className="text-sm font-bold text-slate-500 min-w-[50px] text-right pr-2">{fromToken.symbol}</span>
            </div>
          </div>

          {/* Swap Direction Arrow */}
          <div className="flex justify-center -my-3 relative z-10">
            <div className="p-2 bg-white rounded-full border-4 border-slate-50 text-slate-400 hover:text-blue-500 transition-colors cursor-pointer hover:bg-slate-50 shadow-sm hover:shadow-md">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>
            </div>
          </div>

          {/* To Section */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 hover:border-slate-300 transition-colors">
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wide">To Network</Label>
            
            {/* To Chain */}
            <select 
              value={toChainId}
              onChange={(e) => setToChainId(Number(e.target.value))}
              className="w-full p-3 rounded-lg bg-white border border-slate-200 text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
            >
              {SUPPORTED_CHAINS.filter(c => c.chainId !== fromChainId).map(chain => (
                <option key={chain.chainId} value={chain.chainId}>
                  {chain.name}
                </option>
              ))}
            </select>
            
            {/* To Token */}
            <select 
              value={toTokenAddress}
              onChange={(e) => setToTokenAddress(e.target.value)}
              className="w-full p-3 rounded-lg bg-white border border-slate-200 text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
            >
              {toTokens.map(token => (
                <option key={token.address} value={token.address}>
                  {token.symbol} {token.name && token.name !== token.symbol ? `- ${token.name}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Network Warning */}
          {connectedChain && connectedChain.id !== fromChainId && (
            <div className="p-3 bg-amber-50 text-amber-900 border border-amber-200 text-sm font-medium rounded-lg text-center flex items-center justify-center gap-2">
              ⚠️ Connected to {connectedChain.name}. Will prompt switch to {fromChain?.name}.
            </div>
          )}

          <Button 
            className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold py-6 text-lg rounded-xl shadow-lg shadow-blue-500/20 transition-all transform hover:scale-[1.02]" 
            onClick={handleGetQuote} 
            disabled={!isConnected || isLoading}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">🔍</span> Finding Best Routes...
              </span>
            ) : 'Find Best Quote'}
          </Button>
        </CardContent>
      </Card>

      {expiresAt && quotes.length > 0 && (
        <div className={`mb-6 px-4 py-2 rounded-full font-medium text-sm border flex items-center gap-2 ${
          timeRemaining <= 10 
            ? 'bg-red-50 text-red-600 border-red-100 animate-pulse' 
            : 'bg-blue-50 text-blue-600 border-blue-100'
        }`}>
          {timeRemaining > 0 ? (
            <span>Quotes expire in <strong>{timeRemaining}s</strong> (auto-refresh)</span>
          ) : (
            <span>Refreshing quotes...</span>
          )}
        </div>
      )}

      {/* Provider Stats */}
      {providerStats && (
        <div className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500 text-center flex gap-4">
          <span className="text-green-600 flex items-center gap-1">✅ {providerStats.succeeded.length} succeeded</span>
          {providerStats.failed.length > 0 && (
            <span className="text-amber-600 flex items-center gap-1">⚠️ {providerStats.failed.length} no routes</span>
          )}
          {providerStats.timedOut.length > 0 && (
            <span className="text-red-600 flex items-center gap-1">❌ {providerStats.timedOut.length} timed out</span>
          )}
        </div>
      )}

      {quotes.length > 0 && (
        <div className="w-full max-w-md space-y-4">
          <h3 className="text-lg font-bold text-center text-slate-800">Available Quotes</h3>
          {quotes.map((q, i) => (
            <div 
              key={q.id || i}
              onClick={() => setSelectedQuote(q)}
              className={`p-4 rounded-xl border cursor-pointer transition-all relative group ${
                selectedQuote?.id === q.id && selectedQuote?.provider === q.provider
                  ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500/50 shadow-lg shadow-blue-500/10' 
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
              }`}
            >
              {isBestQuote(q) && (
                <div className="absolute -top-3 -right-2 px-3 py-1 bg-green-500 text-white text-[10px] font-black uppercase tracking-wider rounded-full shadow-lg shadow-green-500/20 border border-green-400 flex items-center gap-1">
                  <span>★ BEST</span>
                </div>
              )}
              
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wide border ${
                    selectedQuote?.id === q.id ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}>
                    {q.provider}
                  </span>
                  {/* Tools used pills */}
                  {q.toolsUsed && q.toolsUsed.length > 0 && (
                     <span className="text-[10px] text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 truncate max-w-[120px]">
                       via {q.toolsUsed[0]}
                       {q.toolsUsed.length > 1 && ` +${q.toolsUsed.length - 1}`}
                     </span>
                  )}
                </div>
                <span className="text-lg font-bold text-green-600 tracking-tight">
                  {parseFloat(formatUnits(BigInt(q.toAmount), toToken.decimals)).toLocaleString(undefined, { maximumFractionDigits: 4 })} 
                  <span className="text-sm font-medium text-green-600/70 ml-1">{toToken.symbol}</span>
                </span>
              </div>

              <div className="flex justify-between text-xs text-slate-500 border-t border-slate-100 pt-2 group-hover:border-slate-200 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    {q.fees?.totalFeeUSD && parseFloat(q.fees.totalFeeUSD) > 0
                      ? `Fees: $${parseFloat(q.fees.totalFeeUSD).toFixed(2)}`
                      : `Gas: $${parseFloat(q.estimatedGas || '0').toFixed(2)}`
                    }
                  </span>
                </div>
                <span className="flex items-center gap-1 font-medium bg-slate-50 px-1.5 py-0.5 rounded text-slate-500 border border-slate-100">
                  ⏱ {q.estimatedDuration >= 60 
                    ? `${Math.floor(q.estimatedDuration / 60)}m ${q.estimatedDuration % 60}s`
                    : `${q.estimatedDuration}s`
                  }
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedQuote && (
        <QuoteDisplay 
          route={selectedQuote} 
          fromTokenInfo={{ symbol: fromToken.symbol, decimals: fromToken.decimals }}
          toTokenInfo={{ symbol: toToken.symbol, decimals: toToken.decimals }}
          onSwap={handleExecute} 
          isLoading={isLoading} 
        />
      )}
    </div>
  )
}
