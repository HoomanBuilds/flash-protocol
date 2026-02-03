import { Route } from '@lifi/sdk'
import { formatUnits } from 'viem'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface QuoteDisplayProps {
  route: Route
  onSwap: () => void
  isLoading?: boolean
}

export function QuoteDisplay({ route, onSwap, isLoading }: QuoteDisplayProps) {
  const fromAmount = formatUnits(BigInt(route.fromAmount), route.fromToken.decimals)
  const toAmount = formatUnits(BigInt(route.toAmount), route.toToken.decimals)
  const gasCostUSD = route.gasCostUSD || '0.00'

  return (
    <Card className="w-full max-w-md mx-auto mt-4 bg-slate-900 border-slate-800 text-white">
      <CardHeader>
        <CardTitle>Swap Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center p-3 bg-slate-800 rounded-lg">
          <div>
            <p className="text-sm text-slate-400">Pay</p>
            <p className="text-xl font-bold">{Number(fromAmount).toFixed(4)} {route.fromToken.symbol}</p>
          </div>
          <div className="text-right">
             <p className="text-sm text-slate-400">on {route.fromToken.chainId}</p>
          </div>
        </div>

        <div className="flex justify-center">
            ⬇️
        </div>

        <div className="flex justify-between items-center p-3 bg-slate-800 rounded-lg">
          <div>
            <p className="text-sm text-slate-400">Receive</p>
            <p className="text-xl font-bold text-green-400">{Number(toAmount).toFixed(4)} {route.toToken.symbol}</p>
          </div>
          <div className="text-right">
             <p className="text-sm text-slate-400">on {route.toToken.chainId}</p>
          </div>
        </div>

        <div className="text-sm text-slate-400 space-y-1">
          <div className="flex justify-between">
            <span>Gas Cost</span>
            <span>${gasCostUSD}</span>
          </div>
          <div className="flex justify-between">
            <span>Provider</span>
            <span>LI.FI</span>
          </div>
        </div>

        <Button 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 text-lg"
            onClick={onSwap}
            disabled={isLoading}
        >
            {isLoading ? 'Processing...' : 'Confirm Swap'}
        </Button>
      </CardContent>
    </Card>
  )
}
