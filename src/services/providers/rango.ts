import { RangoClient } from 'rango-sdk-basic'
import { IProvider, QuoteRequest, QuoteResponse, StatusRequest, StatusResponse, TransactionStatus } from '@/types/provider'

// Map generic ChainID to Rango Blockchain Name
const CHAIN_MAP: Record<number, string> = {
  1: 'ETH',
  137: 'POLYGON',
  42161: 'ARBITRUM',
  10: 'OPTIMISM',
  8453: 'BASE',
  56: 'BSC',
  43114: 'AVAX_CCHAIN',
}

export class RangoProvider implements IProvider {
  name = 'rango'
  private client: RangoClient
  private hasApiKey: boolean

  constructor() {
    const apiKey = process.env.RANGO_API_KEY
    this.hasApiKey = !!apiKey && apiKey.length > 10
    this.client = new RangoClient(apiKey || 'no-api-key')
  }

  async getQuote(request: QuoteRequest): Promise<QuoteResponse[]> {
    try {
      // Skip if no API key configured
      if (!this.hasApiKey) {
        console.warn('Rango: API key not configured. Get one at https://rango.exchange/api')
        return []
      }

      const fromChain = CHAIN_MAP[request.fromChain]
      const toChain = CHAIN_MAP[request.toChain]

      if (!fromChain || !toChain) return []

      const quote = await this.client.quote({
        from: { blockchain: fromChain, address: request.fromToken },
        to: { blockchain: toChain, address: request.toToken },
        amount: request.fromAmount,
      })

      if (!quote || !quote.route) return []

      console.log('=== RANGO RAW RESPONSE ===')
      console.log('requestId:', quote.requestId)
      console.log('route.outputAmount:', quote.route.outputAmount)
      console.log('route.outputAmountMin:', quote.route.outputAmountMin)
      console.log('route.feeUsd:', quote.route.feeUsd)
      console.log('route.estimatedTime:', quote.route.estimatedTime)
      console.log('route.path:', JSON.stringify(quote.route.path, null, 2))
      console.log('===========================')

      // Get estimated time from route or first path element
      const estimatedTime = quote.route.estimatedTime || 
        quote.route.path?.[0]?.estimatedTimeInSeconds || 
        60

      return [{
        provider: 'rango',
        id: quote.requestId,
        fromAmount: request.fromAmount,
        toAmount: quote.route.outputAmount,
        toAmountMin: quote.route.outputAmountMin || quote.route.outputAmount,
        estimatedGas: quote.route.feeUsd || '0',
        estimatedDuration: estimatedTime,
        transactionRequest: null, // Fetch at execution time via swap() call
        routes: [{
          type: 'swap',
          tool: 'rango',
          action: {
            fromToken: {
              address: request.fromToken,
              chainId: request.fromChain,
              symbol: 'UNKNOWN', 
              decimals: 18
            },
            toToken: {
              address: request.toToken,
              chainId: request.toChain,
              symbol: 'UNKNOWN',
              decimals: 18
            },
            fromAmount: request.fromAmount,
            toAmount: quote.route.outputAmount
          },
          estimate: {
            executionDuration: quote.route.estimatedTime
          }
        }]
      }]
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
}

export const rangoProvider = new RangoProvider()
