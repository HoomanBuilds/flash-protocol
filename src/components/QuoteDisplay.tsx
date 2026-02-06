import { formatUnits } from 'viem'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  // Pass token info from parent for accurate display
  fromTokenInfo?: { symbol: string; decimals: number }
  toTokenInfo?: { symbol: string; decimals: number }
  onSwap: () => void
  isLoading?: boolean
}

export function QuoteDisplay({ route, fromTokenInfo, toTokenInfo, onSwap, isLoading }: QuoteDisplayProps) {
  const firstStep = route.routes?.[0]
  
  // Use passed token info first, fallback to route data
  const fromToken = fromTokenInfo || firstStep?.action?.fromToken || { symbol: 'TOKEN', decimals: 18 }
  const toToken = toTokenInfo || firstStep?.action?.toToken || { symbol: 'TOKEN', decimals: 18 }
  const fromChainId = firstStep?.action?.fromToken?.chainId || 1
  const toChainId = firstStep?.action?.toToken?.chainId || 1

  // Safely parse amounts with correct decimals
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
  
  const gasCostUSD = route.estimatedGas || '0.00'

  // Get chain names
  const getChainName = (chainId: number) => {
    const chains: Record<number, string> = {
      1: 'Ethereum',
      10: 'Optimism',
      56: 'BSC',
      137: 'Polygon',
      42161: 'Arbitrum',
      8453: 'Base',
      43114: 'Avalanche',
      324: 'zkSync',
      534352: 'Scroll',
      59144: 'Linea',
    }
    return chains[chainId] || `Chain ${chainId}`
  }

  // Format number with appropriate precision
  const formatAmount = (amount: string, decimals: number) => {
    const num = parseFloat(amount)
    if (num === 0) return '0'
    // For stablecoins (6 decimals)
    // For ETH/tokens (18 decimals)
    if (decimals <= 8) {
      return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })
    }
    if (num < 0.0001) return num.toExponential(4)
    if (num < 1) return num.toFixed(6)
    return num.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 6 })
  }

  return (
    <Card className="w-full max-w-md mx-auto mt-4 bg-white border-slate-200 text-slate-900 shadow-xl">
      <CardHeader className="pb-3 border-b border-slate-100">
        <CardTitle className="flex justify-between items-center">
          <span className="text-slate-800">Swap Details</span>
          <div className="flex items-center gap-2">
            <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded text-xs font-bold uppercase border border-blue-100">
              {route.provider}
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {/* From Amount */}
        <div className="flex justify-between items-center p-4 bg-slate-50 border border-slate-200 rounded-xl hover:border-slate-300 transition-colors">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">You Pay</p>
            <p className="text-xl font-bold text-slate-900 tracking-tight">{formatAmount(fromAmount, fromToken.decimals)} <span className="text-slate-500 text-lg">{fromToken.symbol}</span></p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-lg border border-slate-100">
              {/* Could add chain icon here */}
              <p className="text-sm font-medium text-slate-600">{getChainName(fromChainId)}</p>
            </div>
          </div>
        </div>

        {/* Route Steps */}
        {route.routes && route.routes.length > 0 && (
          <div className="relative pl-4 ml-4 border-l-2 border-slate-200 space-y-4 py-2">
            {route.routes.map((step, idx) => (
              <div key={idx} className="flex items-center gap-3 text-sm">
                <div className="absolute -left-[9px] w-4 h-4 rounded-full bg-slate-100 border-2 border-slate-300" />
                {step.toolLogoURI ? (
                  <img src={step.toolLogoURI} alt={step.tool} className="w-6 h-6 rounded-full bg-white border border-slate-200" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs">🛠️</div>
                )}
                <div className="flex flex-col">
                  <span className="text-slate-500 text-xs uppercase font-semibold tracking-wider">
                    {step.type === 'bridge' ? 'Bridge via' : 'Swap via'}
                  </span>
                  <span className="font-medium text-blue-600">{step.toolName || step.tool}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Flow Arrow */}
        {!route.routes?.length && (
          <div className="flex justify-center -my-2 relative z-10">
            <div className="bg-white rounded-full p-2 border-4 border-slate-50 text-slate-400 shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>
            </div>
          </div>
        )}

        {/* To Amount */}
        <div className="flex justify-between items-center p-4 bg-slate-50 border border-slate-200 rounded-xl hover:border-slate-300 transition-colors">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">You Receive</p>
            <p className="text-xl font-bold text-green-600 tracking-tight">{formatAmount(toAmount, toToken.decimals)} <span className="text-green-600/70 text-lg">{toToken.symbol}</span></p>
            {minAmount !== toAmount && (
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                <span>Min:</span>
                <span className="font-mono text-slate-600">{formatAmount(minAmount, toToken.decimals)}</span>
              </p>
            )}
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-lg border border-slate-100">
              <p className="text-sm font-medium text-slate-600">{getChainName(toChainId)}</p>
            </div>
          </div>
        </div>

        {/* Fee Breakdown */}
        <div className="p-4 bg-slate-50/50 border border-slate-200 rounded-xl space-y-3">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Transaction Costs</p>

          {/* Gas Cost */}
          <div className="flex justify-between text-sm items-center">
            <span className="text-slate-500">Gas Cost</span>
            <span className="font-mono text-slate-900">${parseFloat(gasCostUSD).toFixed(4)}</span>
          </div>

          {/* Bridge/Protocol Fees */}
          {route.fees?.bridgeFee && parseFloat(route.fees.bridgeFee) > 0 && (
            <div className="flex justify-between text-sm items-center">
              <span className="text-slate-500">Bridge Fee</span>
              <span className="font-mono text-slate-900">${route.fees.bridgeFee}</span>
            </div>
          )}

          {/* LP Fees */}
          {route.fees?.lpFee && parseFloat(route.fees.lpFee) > 0 && (
            <div className="flex justify-between text-sm items-center">
              <span className="text-slate-500">LP/DEX Fee</span>
              <span className="font-mono text-slate-900">${route.fees.lpFee}</span>
            </div>
          )}

          {/* Total Fees in USD */}
          {route.fees?.totalFeeUSD && parseFloat(route.fees.totalFeeUSD) > 0 && (
            <div className="flex justify-between text-sm pt-3 mt-1 border-t border-slate-200 items-center">
              <span className="text-slate-600 font-medium">Total Fees</span>
              <span className="text-orange-600 font-bold bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                ${parseFloat(route.fees.totalFeeUSD).toFixed(2)}
              </span>
            </div>
          )}
        </div>

        {/* Route Info */}
        <div className="text-xs text-slate-500 space-y-2 px-1">
          {route.toolsUsed && route.toolsUsed.length > 0 && (
            <div className="flex justify-between items-center">
              <span>Optimized Route</span>
              <span className="text-blue-600 font-medium">{route.toolsUsed.join(' → ')}</span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span>Estimated Duration</span>
            <span className="font-medium text-slate-600">
              {route.estimatedDuration ? `${Math.floor(route.estimatedDuration / 60)}m ${route.estimatedDuration % 60}s` : '~1m'}
            </span>
          </div>
        </div>

        <Button 
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-6 text-lg rounded-xl shadow-lg shadow-blue-500/20 transition-all transform hover:scale-[1.02]"
          onClick={onSwap}
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin">⏳</span> Processing...
            </span>
          ) : 'Confirm Swap'}
        </Button>
      </CardContent>
    </Card>
  )
}
