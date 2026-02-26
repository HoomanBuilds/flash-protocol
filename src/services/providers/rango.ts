import { RangoClient } from 'rango-sdk-basic'
import { IProvider, QuoteRequest, QuoteResponse as UnifiedQuoteResponse, StatusRequest, StatusResponse, TransactionStatus } from '@/types/provider'

// Hardcoded fallback — used when meta() fails
const FALLBACK_CHAIN_MAP: Record<string, string> = {
  '1': 'ETH',
  '137': 'POLYGON',
  '42161': 'ARBITRUM',
  '10': 'OPTIMISM',
  '8453': 'BASE',
  '56': 'BSC',
  '43114': 'AVAX_CCHAIN',
  'solana': 'SOLANA',
  'bitcoin': 'BTC',
  'tron': 'TRON',
  'cosmos': 'COSMOS',
}

// Dynamic chain map: populated from meta() at first use
let dynamicChainMap: Record<string, string> | null = null
let chainMapLoading: Promise<void> | null = null

export class RangoProvider implements IProvider {
  name = 'rango'
  private client: RangoClient
  private hasApiKey: boolean

  constructor() {
    const apiKey = process.env.RANGO_API_KEY
    this.hasApiKey = !!apiKey && apiKey.length > 10
    this.client = new RangoClient(apiKey || 'no-api-key')
  }

  /**
   * Build CHAIN_MAP dynamically from meta().blockchains
   * Maps by both chainId (for EVM) and lowercase name (for non-EVM)
   */
  private async ensureChainMap(): Promise<void> {
    if (dynamicChainMap) return
    if (chainMapLoading) { await chainMapLoading; return }

    chainMapLoading = (async () => {
      try {
        const meta = await this.client.meta()
        if (meta?.blockchains) {
          dynamicChainMap = {}
          for (const bc of meta.blockchains) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const b = bc as any
            // Map by numeric chainId (for EVM queries)
            if (b.chainId) {
              dynamicChainMap[String(b.chainId)] = b.name
            }
            // Map by lowercase name (for non-EVM queries)
            dynamicChainMap[b.name.toLowerCase()] = b.name
          }
          console.log(`Rango: Loaded ${Object.keys(dynamicChainMap).length} chain mappings from meta()`)
        }
      } catch (error) {
        console.warn('Rango: meta() failed, using fallback chain map:', error)
        dynamicChainMap = { ...FALLBACK_CHAIN_MAP }
      }
    })()

    await chainMapLoading
    chainMapLoading = null
  }

  /**
   * Resolve a ChainId (number or string) to Rango blockchain name
   */
  private resolveChain(chainId: number | string): string | null {
    const map = dynamicChainMap || FALLBACK_CHAIN_MAP
    return map[String(chainId)] || null
  }

  async getQuote(request: QuoteRequest): Promise<UnifiedQuoteResponse[]> {
    try {
      // Skip if no API key configured
      if (!this.hasApiKey) {
        console.warn('Rango: API key not configured. Get one at https://rango.exchange/api')
        return []
      }

      await this.ensureChainMap()

      const fromChain = this.resolveChain(request.fromChain)
      const toChain = this.resolveChain(request.toChain)

      if (!fromChain || !toChain) return []

      const quote = await this.client.quote({
        from: { blockchain: fromChain, address: request.fromToken },
        to: { blockchain: toChain, address: request.toToken },
        amount: request.fromAmount,
      })

      if (!quote || !quote.route) return []

      const rangoParams = {
        from: { blockchain: fromChain, address: request.fromToken },
        to: { blockchain: toChain, address: request.toToken },
        amount: request.fromAmount,
        referrerAddress: process.env.NEXT_PUBLIC_PLATFORM_REFERRER_ADDRESS || null,
        referrerFee: 0.5, // 0.5%
        disableEstimate: false,
        slippage: request.slippage || 1.0, 
      }

      console.log('=== RANGO RAW RESPONSE ===')
      console.log('requestId:', quote.requestId)
      console.log('route.outputAmount:', quote.route.outputAmount)
      console.log('route.outputAmountMin:', quote.route.outputAmountMin)
      console.log('route.feeUsd:', quote.route.feeUsd)
      console.log('route.estimatedTime:', quote.route.estimatedTime)
      console.log('route.path:', JSON.stringify(quote.route.path, null, 2))
      console.log('===========================')

      return [this.mapQuoteToResponse(quote, request.fromAmount, rangoParams)]
    } catch (error) {
      console.error('Rango Quote Error:', error)
      return []
    }
  }

  async getStatus(request: StatusRequest): Promise<StatusResponse> {
    try {
      if (!request.requestId) return { status: 'NOT_FOUND' }

      const status = await this.client.status({
        requestId: request.requestId,
        txId: request.txHash
      })

      let finalStatus: TransactionStatus = 'PENDING'
      if (status.status === 'SUCCESS') finalStatus = 'DONE'
      else if (status.status === 'FAILED') finalStatus = 'FAILED'

      return {
        status: finalStatus,
        txLink: status.explorerUrl
      }
    } catch (error) {
      console.error('Rango Status Error:', error)
      return { status: 'NOT_FOUND' }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapQuoteToResponse(quote: any, fromAmount: string, rangoParams: any): UnifiedQuoteResponse {
    if (!quote.route) throw new Error('No route in quote')

    // Map fees
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fees = quote.route.fee.map((f: any) => ({
      type: f.name.toLowerCase().includes('gas') ? 'GAS' : 'BRIDGE' as const,
      name: f.name,
      amount: f.amount,
      amountUSD: f.amountUSD || '0',
      description: f.expenseType,
      included: f.expenseType === 'DECREASE_FROM_OUTPUT',
      token: {
        address: f.token.address || '',
        chainId: -1, 
        symbol: f.token.symbol,
        decimals: f.token.decimals
      }
    }))

    // Extract tool logos/names from path
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const toolsUsed: string[] = quote.route.path?.map((p: any) => p.swapper.title) || []
    
    // Get estimated time
    const estimatedTime = quote.route.estimatedTime || 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        quote.route.path?.reduce((acc: number, p: any) => acc + (p.estimatedTimeInSeconds || 0), 0) || 
        60

     return {
      provider: 'rango',
      id: quote.requestId,
      fromAmount: fromAmount, 
      toAmount: quote.route.outputAmount,
      toAmountMin: quote.route.outputAmountMin,
      estimatedGas: quote.route.feeUsd?.toString() || '0',
      estimatedDuration: estimatedTime,
      transactionRequest: null, 
      metadata: {
        rangoParams,
        chainType: rangoParams.from.blockchain === 'SOLANA' ? 'solana' as const
                 : rangoParams.from.blockchain === 'BTC' ? 'bitcoin' as const
                 : 'evm' as const,
      },
      routes: [{
        type: 'bridge',
        tool: quote.route.swapper.title, 
        toolName: quote.route.swapper.title,
        toolLogoURI: quote.route.swapper.logo,
        action: {
          fromToken: {
            address: quote.route.from.address || '',
            chainId: -1,
            symbol: quote.route.from.symbol,
            decimals: quote.route.from.decimals
          },
          toToken: {
            address: quote.route.to.address || '',
            chainId: -1,
            symbol: quote.route.to.symbol,
            decimals: quote.route.to.decimals
          },
          fromAmount: fromAmount,
          toAmount: quote.route.outputAmount
        },
        estimate: {
          executionDuration: estimatedTime,
          feeCosts: fees
        }
      }],
      toolsUsed: [...new Set(toolsUsed)],
      fees: {
        totalFeeUSD: quote.route.feeUsd?.toString() || '0',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        bridgeFee: fees.filter((f: any) => f.type === 'BRIDGE').reduce((acc: number, f: any) => acc + parseFloat(f.amountUSD), 0).toFixed(4),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        gasCost: fees.filter((f: any) => f.type === 'GAS').reduce((acc: number, f: any) => acc + parseFloat(f.amountUSD), 0).toFixed(4),
      }
    }
  }
}

export const rangoProvider = new RangoProvider()
