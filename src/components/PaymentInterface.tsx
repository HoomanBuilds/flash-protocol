'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAccount, useSendTransaction, useSwitchChain } from 'wagmi'
import { parseUnits } from 'viem'
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { QuoteDisplay } from '@/components/QuoteDisplay'
import { CHAINS } from '@/lib/chains'
import { getTokensByChain, getUSDCAddress } from '@/lib/tokens'
import { QuoteResponse } from '@/types/provider'

const PAYER_CHAINS = CHAINS.filter(c => c.type === 'evm' && !c.isTestnet)
const PRICE_REFRESH_INTERVAL = 30_000

const STABLECOINS = new Set(['USDC', 'USDC.e', 'USDbC', 'USDT', 'fUSDT', 'DAI', 'BUSD'])

interface PaymentInterfaceProps {
  link: {
    id: string
    amount?: number
    currency: string
    receive_mode: 'same_chain' | 'specific_chain'
    receive_chain_id?: number
    receive_token?: string
    receive_token_symbol?: string
    recipient_address: string
  }
}

export default function PaymentInterface({ link }: PaymentInterfaceProps) {
  const { address, isConnected, chain: connectedChain } = useAccount()
  const { switchChain } = useSwitchChain()
  const { sendTransactionAsync } = useSendTransaction()

  const [fromChainId, setFromChainId] = useState(
    connectedChain?.id && PAYER_CHAINS.find(c => c.chainId === connectedChain.id)
      ? connectedChain.id
      : 42161
  )
  const [fromTokenAddress, setFromTokenAddress] = useState('0x0000000000000000000000000000000000000000')

  const toChainId = link.receive_mode === 'same_chain' ? fromChainId : (link.receive_chain_id || 1)

  const [quotes, setQuotes] = useState<QuoteResponse[]>([])
  const [selectedQuote, setSelectedQuote] = useState<QuoteResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // Price conversion state
  const [tokenPriceUSD, setTokenPriceUSD] = useState<number | null>(null)
  const [convertedAmount, setConvertedAmount] = useState<string>('')
  const [priceLoading, setPriceLoading] = useState(false)
  const [priceError, setPriceError] = useState('')
  const [priceSource, setPriceSource] = useState<string>('')
  const [lastPriceUpdate, setLastPriceUpdate] = useState<number>(0)

  // For open-amount links only
  const [manualAmount, setManualAmount] = useState('')

  const isFixedAmount = typeof link.amount === 'number' && link.amount > 0
  const displayAmountUSD = isFixedAmount ? link.amount! : parseFloat(manualAmount) || 0

  const availableTokens = getTokensByChain(fromChainId)
  const fromToken = availableTokens.find(t => t.address.toLowerCase() === fromTokenAddress.toLowerCase())
  const destinationToken = link.receive_token || getUSDCAddress(toChainId)

  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch token price
  const fetchPrice = useCallback(async () => {
    if (!fromToken) return

    setPriceLoading(true)
    setPriceError('')

    try {
      const params = new URLSearchParams({
        chainId: fromChainId.toString(),
        tokenAddress: fromTokenAddress,
        symbol: fromToken.symbol,
      })

      const res = await fetch(`/api/price?${params}`)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Price unavailable')
      }

      setTokenPriceUSD(data.priceUSD)
      setPriceSource(data.source)
      setLastPriceUpdate(Date.now())

      // Calculate converted amount if we have a USD amount
      if (displayAmountUSD > 0 && data.priceUSD > 0) {
        const toSymbol = link.receive_token_symbol || 'USDC'
        const slippage = (STABLECOINS.has(fromToken.symbol) && STABLECOINS.has(toSymbol)) ? 0.5 : 1.0
        const rawAmount = displayAmountUSD / data.priceUSD
        const withSlippage = rawAmount * (1 + slippage / 100)

        // Determine precision
        let precision: number
        if (data.priceUSD > 100) precision = 8
        else if (data.priceUSD > 1) precision = 6
        else if (data.priceUSD > 0.01) precision = 4
        else precision = 2

        setConvertedAmount(withSlippage.toFixed(precision))
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Price fetch failed'
      setPriceError(message)
      setTokenPriceUSD(null)
      setConvertedAmount('')
    } finally {
      setPriceLoading(false)
    }
  }, [fromChainId, fromTokenAddress, fromToken, displayAmountUSD, link.receive_token_symbol])

  // Fetch price on chain/token change
  useEffect(() => {
    if (!fromToken) return
    fetchPrice()
  }, [fromChainId, fromTokenAddress, fromToken?.symbol, displayAmountUSD])

  // Auto-refresh price every 30s
  useEffect(() => {
    if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current)

    if (fromToken && displayAmountUSD > 0) {
      refreshIntervalRef.current = setInterval(fetchPrice, PRICE_REFRESH_INTERVAL)
    }

    return () => {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current)
    }
  }, [fetchPrice, fromToken, displayAmountUSD])

  // Handle chain change — reset token to native
  const handleChainChange = (newChainId: number) => {
    setFromChainId(newChainId)
    setFromTokenAddress('0x0000000000000000000000000000000000000000')
    setQuotes([])
    setSelectedQuote(null)
    setError('')
  }

  // Handle token change
  const handleTokenChange = (newAddress: string) => {
    setFromTokenAddress(newAddress)
    setQuotes([])
    setSelectedQuote(null)
    setError('')
  }

  const handleGetQuote = async () => {
    const amountToUse = isFixedAmount ? convertedAmount : manualAmount
    if (!amountToUse || !fromToken) return

    setIsLoading(true)
    setError('')
    setQuotes([])
    setSelectedQuote(null)

    try {
      const amountInWei = parseUnits(amountToUse, fromToken.decimals).toString()

      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromChainId,
          fromTokenAddress,
          toChainId,
          toTokenAddress: destinationToken,
          fromAmount: amountInWei,
          fromAddress: address,
        }),
      })

      const data = await res.json()
      if (data.routes && data.routes.length > 0) {
        setQuotes(data.routes)
        const best = data.bestQuote || data.routes[0]
        setSelectedQuote(best)
      } else {
        throw new Error(data.error || 'No routes found')
      }
    } catch (e) {
      console.error(e)
      const message = e instanceof Error ? e.message : 'Failed to fetch quotes'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleExecute = async () => {
    if (!selectedQuote || !address) return
    setIsLoading(true)
    setError('')

    try {
      if (Number(connectedChain?.id) !== fromChainId) {
        await switchChain({ chainId: fromChainId })
      }

      const initRes = await fetch('/api/transactions/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          linkId: link.id,
          quoteId: selectedQuote.id,
          route: selectedQuote,
          payerAddress: address,
        }),
      })
      const { transactionId } = await initRes.json()

      const txRequest = selectedQuote.transactionRequest
      if (!txRequest) throw new Error('No transaction request in quote')

      const hash = await sendTransactionAsync({
        to: txRequest.to as `0x${string}`,
        data: txRequest.data as `0x${string}`,
        value: BigInt(txRequest.value || 0),
      })

      alert(`Transaction submitted! Hash: ${hash}`)
    } catch (e) {
      console.error(e)
      const message = e instanceof Error ? e.message : 'Transaction Failed'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const timeSinceUpdate = lastPriceUpdate > 0 ? Math.floor((Date.now() - lastPriceUpdate) / 1000) : null

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="border border-border bg-background p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs font-mono text-muted-foreground">PAYMENT_GATEWAY</span>
          </div>
          <span className="px-2 py-0.5 text-[10px] font-mono border border-border text-muted-foreground">
            ENCRYPTED
          </span>
        </div>

        <div className="space-y-8">
          {/* Fixed Amount Display */}
          {isFixedAmount ? (
            <div className="text-center space-y-3 py-4">
              <Label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                Total Payment Amount
              </Label>
              <div className="flex items-start justify-center text-foreground">
                <span className="text-4xl font-light text-muted-foreground mt-2">$</span>
                <span className="text-7xl md:text-8xl font-bold tracking-tighter">
                  {link.amount}
                </span>
              </div>
              <div className="text-sm text-muted-foreground font-mono">
                {link.currency.toUpperCase()}
              </div>

              {/* Converted Amount */}
              {fromToken && (
                <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-muted/50 border border-border">
                  {priceLoading ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span className="text-xs font-mono">FETCHING_RATE...</span>
                    </div>
                  ) : priceError ? (
                    <div className="flex items-center gap-2 text-red-500">
                      <AlertCircle className="w-3 h-3" />
                      <span className="text-xs font-mono">{priceError}</span>
                    </div>
                  ) : convertedAmount ? (
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-mono font-bold text-foreground">
                        ≈ {convertedAmount} {fromToken.symbol}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        (${tokenPriceUSD?.toLocaleString(undefined, { maximumFractionDigits: 2 })} / {fromToken.symbol})
                      </span>
                      <button
                        onClick={fetchPrice}
                        className="p-1 hover:bg-muted transition-colors"
                        title="Refresh price"
                      >
                        <RefreshCw className="w-3 h-3 text-muted-foreground" />
                      </button>
                    </div>
                  ) : null}
                </div>
              )}

              {/* Price metadata */}
              {lastPriceUpdate > 0 && !priceError && (
                <div className="text-[10px] text-muted-foreground font-mono flex items-center justify-center gap-2">
                  <span>SRC: {priceSource.toUpperCase()}</span>
                  <span>·</span>
                  <span>UPDATED: {timeSinceUpdate}s ago</span>
                  <span>·</span>
                  <span>SLIPPAGE: {STABLECOINS.has(fromToken?.symbol || '') ? '0.5' : '1.0'}%</span>
                </div>
              )}
            </div>
          ) : (
            /* Open Amount — editable */
            <div className="text-center space-y-3 py-4">
              <Label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                Enter Payment Amount ({link.currency.toUpperCase()})
              </Label>
              <div className="max-w-xs mx-auto">
                <Input
                  type="number"
                  placeholder="0.00"
                  value={manualAmount}
                  onChange={(e) => setManualAmount(e.target.value)}
                  className="h-16 text-center text-3xl bg-background border-border text-foreground font-mono font-bold focus:border-foreground/50 placeholder:text-muted-foreground/40"
                />
              </div>
              {fromToken && convertedAmount && (
                <div className="text-sm font-mono text-muted-foreground">
                  ≈ {convertedAmount} {fromToken.symbol}
                </div>
              )}
            </div>
          )}

          {/* Controls Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/30 p-6 border border-border">
            {/* Network Selection */}
            <div className="space-y-3">
              <Label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Payment Network</Label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-2 h-2 bg-green-500" />
                <select
                  className="w-full pl-8 pr-4 py-4 bg-background border border-border text-foreground font-mono text-sm focus:border-foreground/50 transition-all outline-none appearance-none cursor-pointer hover:bg-muted/50"
                  value={fromChainId}
                  onChange={(e) => handleChainChange(Number(e.target.value))}
                >
                  {PAYER_CHAINS.map(c => <option key={c.chainId} value={c.chainId}>{c.name}</option>)}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                  <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-50">
                    <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            </div>

            {/* Asset Selection */}
            <div className="space-y-3">
              <Label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Payment Asset</Label>
              <div className="relative">
                <select
                  className="w-full px-4 py-4 bg-background border border-border text-foreground font-mono text-sm focus:border-foreground/50 transition-all outline-none appearance-none cursor-pointer hover:bg-muted/50"
                  value={fromTokenAddress}
                  onChange={(e) => handleTokenChange(e.target.value)}
                >
                  {availableTokens.map(t => <option key={t.address} value={t.address}>{t.symbol}</option>)}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                  <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-50">
                    <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <Button
            className="w-full h-16 text-base font-bold tracking-wide bg-foreground text-background hover:bg-foreground/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-mono"
            onClick={handleGetQuote}
            disabled={isLoading || (isFixedAmount ? !convertedAmount : !manualAmount) || priceLoading}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="animate-spin h-5 w-5" />
                <span>Processing Route...</span>
              </div>
            ) : (
              <span>[ REVIEW_PAYMENT ]</span>
            )}
          </Button>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {selectedQuote && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pt-4">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground font-mono uppercase tracking-widest">[ ROUTE_OPTIMIZED ]</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <QuoteDisplay
                route={selectedQuote}
                onSwap={handleExecute}
                isLoading={isLoading}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
