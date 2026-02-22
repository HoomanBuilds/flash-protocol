import { formatUnits } from 'viem'

import { Button } from '@/components/ui/button'

interface QuoteDisplayProps {
  route: {
    provider: string
    fromAmount: string
    toAmount: string
    toAmountMin?: string
    estimatedGas?: string
    estimatedDuration?: number
    routes?: Array<{
      type?: 'swap' | 'bridge' | 'cross' | 'custom'
      tool?: string
      toolName?: string
      toolLogoURI?: string
      action: {
        fromToken: { symbol: string; chainId: number | string; decimals: number }
        toToken: { symbol: string; chainId: number | string; decimals: number }
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
    fees?: {
      totalFeeUSD: string
      bridgeFee?: string
      lpFee?: string
      gasCost?: string
      slippage?: string
    }
    toolsUsed?: string[]
  }
  fromTokenInfo?: { symbol: string; decimals: number }
  toTokenInfo?: { symbol: string; decimals: number }
  onSwap: () => void
  isLoading?: boolean
  loadingStep?: string
}

export function QuoteDisplay({ route, fromTokenInfo, toTokenInfo, onSwap, isLoading, loadingStep }: QuoteDisplayProps) {
  const firstStep = route.routes?.[0]

  const fromToken = fromTokenInfo || firstStep?.action?.fromToken || { symbol: 'TOKEN', decimals: 18 }
  const toToken = toTokenInfo || firstStep?.action?.toToken || { symbol: 'TOKEN', decimals: 18 }
  const fromChainId = firstStep?.action?.fromToken?.chainId || 1
  const toChainId = firstStep?.action?.toToken?.chainId || 1

  const safeFormatUnits = (value: string | undefined, decimals: number): string => {
    if (!value || value === '0') return '0'
    try {
      return formatUnits(BigInt(value), decimals)
    } catch {
      return '0'
    }
  }

  const fromAmount = safeFormatUnits(route.fromAmount, fromToken.decimals)
  const toAmount = safeFormatUnits(route.toAmount, toToken.decimals)
  const minAmount = route.toAmountMin ? safeFormatUnits(route.toAmountMin, toToken.decimals) : toAmount

  const getChainName = (chainId: number | string) => {
    const chains: Record<string, string> = {
      '1': 'Ethereum',
      '10': 'Optimism',
      '56': 'BSC',
      '137': 'Polygon',
      '42161': 'Arbitrum',
      '8453': 'Base',
      '43114': 'Avalanche',
      '324': 'zkSync',
      '534352': 'Scroll',
      '59144': 'Linea',
      'solana': 'Solana',
      'bitcoin': 'Bitcoin',
      'near': 'NEAR',
      'tron': 'Tron',
      'cosmos': 'Cosmos',
    }
    return chains[String(chainId)] || `Chain ${chainId}`
  }

  const formatAmount = (amount: string, decimals: number) => {
    const num = parseFloat(amount)
    if (num === 0) return '0'
    if (decimals <= 8) {
      return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })
    }
    // Fixed: Avoid scientific notation for small numbers
    if (num < 0.000001) {
      return '< 0.000001'
    }
    if (num < 0.0001) {
      return num.toLocaleString(undefined, { maximumFractionDigits: 8 }) 
    }
    if (num < 1) return num.toLocaleString(undefined, { maximumFractionDigits: 6 })
    return num.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 6 })
  }

  return (
    <div className="w-full mt-6 space-y-4 font-mono text-sm">
      {/* Route Header */}
      <div className="flex justify-between items-center pb-4 border-b border-border text-muted-foreground">
        <span className="text-xs uppercase tracking-widest">ROUTE_DETAILS</span>
        <div className="flex items-center gap-2 px-2 py-1 border border-border text-xs font-bold">
          {route.provider.toUpperCase()}
        </div>
      </div>

      {/* From Amount */}
      <div className="bg-muted/30 border border-border p-4 flex justify-between items-center hover:bg-muted/50 transition-colors">
        <div>
          <div className="text-[10px] text-muted-foreground uppercase mb-1 tracking-wider">Input Source</div>
          <div className="text-xl text-foreground font-bold">
            {formatAmount(fromAmount, fromToken.decimals)} <span className="text-muted-foreground">{fromToken.symbol}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="inline-block px-3 py-1.5 border border-border text-muted-foreground text-xs font-medium">
            {getChainName(fromChainId)}
          </div>
        </div>
      </div>

      {/* Route Steps */}
      <div className="py-2 pl-6 ml-4 border-l-2 border-dashed border-border space-y-4">
        {route.routes?.map((step, idx) => (
          <div key={idx} className="relative">
            <div className="absolute -left-[29px] top-1/2 -translate-y-1/2 w-3 h-3 bg-muted border-2 border-border" />
            <div className="flex items-center gap-3 text-sm">
              <span className="text-muted-foreground font-medium px-2 py-1 bg-muted border border-border text-xs">{step.type === 'bridge' ? 'BRIDGE' : 'SWAP'}</span>
              <span className="text-muted-foreground">via</span>
              <span className="text-foreground font-bold">{step.toolName || step.tool}</span>
            </div>
          </div>
        ))}
        {!route.routes?.length && (
          <div className="text-muted-foreground text-xs">Direct Transfer</div>
        )}
      </div>

      {/* To Amount */}
      <div className="bg-green-50 border border-green-200 p-4 flex justify-between items-center">
        <div>
          <div className="text-[10px] text-green-600 uppercase mb-1 tracking-wider">Estimated Output</div>
          <div className="text-xl text-green-700 font-bold">
            {formatAmount(toAmount, toToken.decimals)} <span className="text-green-500">{toToken.symbol}</span>
          </div>
          {minAmount !== toAmount && (
            <div className="text-[10px] text-muted-foreground mt-1">Min: {formatAmount(minAmount, toToken.decimals)}</div>
          )}
        </div>
        <div className="text-right">
          <div className="inline-block px-3 py-1.5 bg-green-100 border border-green-200 text-green-700 text-xs font-medium">
            {getChainName(toChainId)}
          </div>
        </div>
      </div>

      {/* Cost Breakdown */}
      <div className="bg-muted/30 border border-border p-4 space-y-2">
        {firstStep?.estimate?.feeCosts?.map((fee, idx) => (
          <div key={idx} className="flex justify-between text-xs text-muted-foreground">
            <span>{fee.name}</span>
            <span>${parseFloat(fee.amountUSD).toFixed(2)}</span>
          </div>
        ))}
        <div className="flex justify-between text-sm text-foreground pt-2 border-t border-border font-bold">
          <span>Estimated Network Cost</span>
          <span>~${(firstStep?.estimate?.feeCosts?.reduce((acc, fee) => acc + parseFloat(fee.amountUSD), 0) || 0).toFixed(2)}</span>
        </div>
      </div>

      {/* Confirm Button */}
      <Button
        className="w-full h-14 text-base font-bold tracking-wide bg-foreground text-background hover:bg-foreground/90 transition-all font-mono"
        onClick={onSwap}
        disabled={isLoading}
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <span className="animate-spin w-4 h-4 border-2 border-background/30 border-t-background rounded-full" />
            <span>{loadingStep || 'Processing...'}</span>
          </div>
        ) : (
          <span>CONFIRM_TRANSACTION</span>
        )}
      </Button>
    </div>
  )
}
