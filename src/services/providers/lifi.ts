import { createConfig, getRoutes, getStatus, getStepTransaction, Route } from '@lifi/sdk'
import { IProvider, QuoteRequest, QuoteResponse, StatusRequest, StatusResponse, TransactionStatus } from '@/types/provider'

// Initialize LI.FI SDK
createConfig({
  integrator: process.env.NEXT_PUBLIC_LIFI_INTEGRATOR_ID || 'crypto-payment-gateway',
})

export class LifiProvider implements IProvider {
  name = 'lifi'

  async getQuote(request: QuoteRequest): Promise<QuoteResponse[]> {
    try {
      const referrer = process.env.NEXT_PUBLIC_PLATFORM_REFERRER_ADDRESS
      const options: any = {
        slippage: request.slippage ? request.slippage / 100 : undefined,
      }

      if (referrer) {
        options.fee = 0.005 // 0.5% platform fee
        options.referrer = referrer
      }

      const routesResponse = await getRoutes({
        fromChainId: request.fromChain,
        toChainId: request.toChain,
        fromTokenAddress: request.fromToken,
        toTokenAddress: request.toToken,
        fromAmount: request.fromAmount,
        fromAddress: request.fromAddress,
        toAddress: request.toAddress,
        options
      })

      // Map routes and fetch transaction data for each
      const quotes: QuoteResponse[] = []
      for (const route of routesResponse.routes) {
        try {
          let txData = null
          if (route.steps.length > 0 && request.fromAddress) {
            const stepWithTx = await getStepTransaction(route.steps[0])
            txData = stepWithTx.transactionRequest
          }
          
          quotes.push(this.mapRouteToQuote(route, txData))
        } catch (stepError) {
          console.warn('LI.FI getStepTransaction error:', stepError)
          // Still include route without tx data as fallback
          quotes.push(this.mapRouteToQuote(route, null))
        }
      }
      
      return quotes
    } catch (error) {
      console.error('LI.FI Quote Error:', error)
      return []
    }
  }

  async getStatus(request: StatusRequest): Promise<StatusResponse> {
    try {
      const status = await getStatus({
        txHash: request.txHash,
        fromChain: request.fromChainId,
        toChain: request.toChainId,
        bridge: request.bridge,
      })

      const finalStatus: TransactionStatus = 
        status.status === 'DONE' ? 'DONE' :
        status.status === 'FAILED' ? 'FAILED' : 'PENDING'

      return {
        status: finalStatus,
        subStatus: status.substatus,
        txLink: (status as unknown as { receiving?: { txLink?: string } }).receiving?.txLink
      }
    } catch (error) {
      console.error('LI.FI Status Error:', error)
      return { status: 'NOT_FOUND' }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapRouteToQuote(route: Route, txData?: any): QuoteResponse {
    console.log('=== LIFI RAW ROUTE ===')
    console.log('route.fromAmount:', route.fromAmount)
    console.log('route.toAmount:', route.toAmount)
    console.log('route.toAmountMin:', route.toAmountMin)
    console.log('fromToken:', route.fromToken?.symbol, route.fromToken?.decimals)
    console.log('toToken:', route.toToken?.symbol, route.toToken?.decimals)
    console.log('tool:', route.steps?.[0]?.tool)
    console.log('=====================')
    
    const toolsUsed = route.steps.map(step => step.toolDetails?.name || step.tool)
    
    let totalBridgeFee = 0
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const feeCosts: any[] = []
    
    for (const step of route.steps) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((step.estimate as any).feeCosts) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const fee of (step.estimate as any).feeCosts) {
          totalBridgeFee += parseFloat(fee.amountUSD || '0')
          feeCosts.push({
            type: 'PROTOCOL', 
            name: fee.name,
            description: fee.description,
            amount: fee.amount,
            amountUSD: fee.amountUSD || '0',
            percentage: fee.percentage,
            included: fee.included,
            token: fee.token ? {
              address: fee.token.address,
              chainId: fee.token.chainId,
              symbol: fee.token.symbol,
              decimals: fee.token.decimals
            } : undefined
          })
        }
      }
    }
    
    const gasCostUSD = parseFloat(route.gasCostUSD || '0')

    return {
      provider: 'lifi',
      id: route.id,
      fromAmount: route.fromAmount,
      toAmount: route.toAmount,
      toAmountMin: route.toAmountMin,
      estimatedGas: route.gasCostUSD || '0',
      estimatedDuration: route.steps.reduce((acc, step) => acc + (step.estimate.executionDuration || 0), 0),
      transactionRequest: txData || route,
      metadata: { lifiRoute: route },
      fees: {
        totalFeeUSD: (totalBridgeFee + gasCostUSD).toFixed(4),
        bridgeFee: totalBridgeFee > 0 ? totalBridgeFee.toFixed(4) : undefined,
        gasCost: gasCostUSD > 0 ? gasCostUSD.toFixed(4) : undefined,
      },
      toolsUsed: [...new Set(toolsUsed)],
      routes: route.steps.map(step => ({
        type: (step.type === 'lifi' || step.type === 'cross') ? 'bridge' : step.type as 'swap' | 'bridge',
        tool: step.tool,
        toolName: step.toolDetails?.name,
        toolLogoURI: step.toolDetails?.logoURI,
        action: {
          fromToken: {
            address: step.action.fromToken.address,
            chainId: step.action.fromToken.chainId,
            symbol: step.action.fromToken.symbol,
            decimals: step.action.fromToken.decimals
          },
          toToken: {
            address: step.action.toToken.address,
            chainId: step.action.toToken.chainId,
            symbol: step.action.toToken.symbol,
            decimals: step.action.toToken.decimals
          },
          fromAmount: step.action.fromAmount,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          toAmount: (step.estimate as any).toAmount || '0'
        },
        estimate: {
          approvalAddress: step.estimate.approvalAddress,
          executionDuration: step.estimate.executionDuration,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          feeCosts: (step.estimate as any).feeCosts?.map((f: any) => ({
            type: 'BRIDGE' as const,
            name: f.name || `${step.tool} Fee`,
            amount: f.amount,
            amountUSD: f.amountUSD || '0',
            percentage: f.percentage
          })),
          gasCosts: step.estimate.gasCosts?.map(g => ({
            type: 'GAS',
            name: 'Network Gas',
            description: 'Gas fee for transaction execution',
            amount: g.amount,
            amountUSD: g.amountUSD || '0',
            included: false, 
            token: {
              address: g.token.address,
              chainId: g.token.chainId,
              symbol: g.token.symbol,
              decimals: g.token.decimals
            }
          }))
        }
      }))
    }
  }
}

// Singleton instance
export const lifiProvider = new LifiProvider()
