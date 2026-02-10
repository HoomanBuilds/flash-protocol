import { IProvider, QuoteRequest, QuoteResponse, StatusRequest, StatusResponse, TransactionStatus } from '@/types/provider'
import { OneClickService, QuoteRequest as DefuseQuoteRequest, OpenAPI } from '@defuse-protocol/one-click-sdk-typescript'

OpenAPI.BASE = 'https://1click.chaindefuser.com'

if (process.env.NEAR_INTENTS_JWT) {
  OpenAPI.TOKEN = process.env.NEAR_INTENTS_JWT
}

// Chain prefix mapping for asset ID format
const CHAIN_PREFIX_MAP: Record<number, string> = {
  1: 'eth',
  137: 'polygon', 
  42161: 'arb',
  10: 'op',
  8453: 'base',
  56: 'bsc',
  43114: 'avax',
  100: 'gnosis',
}

// Native token asset IDs from https://1click.chaindefuser.com/v0/tokens
const NATIVE_ASSET_IDS: Record<number, string> = {
  1: 'nep141:eth.omft.near',
  42161: 'nep141:arb.omft.near',
  8453: 'nep141:base.omft.near',
  10: 'nep245:v2_1.omni.hot.tg:10_11111111111111111111',
  137: 'nep245:v2_1.omni.hot.tg:137_11111111111111111111',
  56: 'nep245:v2_1.omni.hot.tg:56_11111111111111111111',
  43114: 'nep245:v2_1.omni.hot.tg:43114_11111111111111111111',
  100: 'nep141:gnosis.omft.near',
}

export class NearIntentsProvider implements IProvider {
  name = 'near-intents'

  /**
   * Convert chainId + token address to NEAR Intents asset ID format
   * ERC20 format: nep141:[chain]-[address].omft.near
   * Native format: nep141:[chain].omft.near (no contract address)
   */
  private getAssetId(chainId: number, tokenAddress: string): string | null {
    const chainPrefix = CHAIN_PREFIX_MAP[chainId]
    if (!chainPrefix) {
      console.log(`NEAR Intents: Unsupported chain ${chainId}`)
      return null
    }

    const address = tokenAddress.toLowerCase()
    
    // Native token (zero address) - use chain-level asset ID
    if (address === '0x0000000000000000000000000000000000000000') {
      const nativeId = NATIVE_ASSET_IDS[chainId]
      if (!nativeId) {
        console.log(`NEAR Intents: No native asset ID for chain ${chainId}`)
        return null
      }
      return nativeId
    }

    return `nep141:${chainPrefix}-${address}.omft.near`
  }

  async getQuote(request: QuoteRequest): Promise<QuoteResponse[]> {
    try {
      // Check if JWT is configured
      if (!process.env.NEAR_INTENTS_JWT) {
        console.log('NEAR Intents: JWT not configured (NEAR_INTENTS_JWT)')
        return []
      }

      const originAsset = this.getAssetId(request.fromChain, request.fromToken)
      const destinationAsset = this.getAssetId(request.toChain, request.toToken)

      if (!originAsset || !destinationAsset) {
        console.log('NEAR Intents: Could not generate asset IDs')
        return []
      }

      console.log('NEAR Intents: Fetching quote with SDK', {
        originAsset,
        destinationAsset,
        amount: request.fromAmount
      })

      // Create deadline 1 hour from now in ISO format
      const deadline = new Date(Date.now() + 3600000).toISOString()

      const quoteRequest: DefuseQuoteRequest = {
        dry: true,
        swapType: DefuseQuoteRequest.swapType.EXACT_INPUT,
        slippageTolerance: Math.round((request.slippage || 0.5) * 100), // Basis points (100 = 1%)
        originAsset,
        depositType: DefuseQuoteRequest.depositType.ORIGIN_CHAIN,
        destinationAsset,
        amount: request.fromAmount,
        refundTo: request.fromAddress,
        refundType: DefuseQuoteRequest.refundType.ORIGIN_CHAIN,
        recipient: request.toAddress || request.fromAddress,
        recipientType: DefuseQuoteRequest.recipientType.DESTINATION_CHAIN,
        deadline,
      }

      console.log('NEAR Intents: Full request payload:', JSON.stringify(quoteRequest, null, 2))

      const response = await OneClickService.getQuote(quoteRequest)

      console.log('NEAR Intents SDK Response:', JSON.stringify(response, null, 2))

      const quote = response.quote
      if (!quote?.amountOut) {
        console.log('NEAR Intents: No quote available in response')
        return []
      }

      return [{
        provider: 'near-intents',
        id: response.correlationId || Math.random().toString(36).substring(7),
        fromAmount: request.fromAmount,
        toAmount: quote.amountOut,
        toAmountMin: quote.minAmountOut || quote.amountOut,
        estimatedGas: '0', // NEAR Intents handles gas internally
        estimatedDuration: 120, // NEAR Intents typically ~2 minutes
        transactionRequest: quote.depositAddress ? { 
          depositAddress: quote.depositAddress,
          memo: quote.depositMemo 
        } : null,
        metadata: {
          depositAddress: quote.depositAddress,
          depositMemo: quote.depositMemo,
          signature: response.signature,
          deadline: quote.deadline,
          amountOutFormatted: quote.amountOutFormatted,
          amountOutUsd: quote.amountOutUsd,
        },
        routes: [{
          type: 'bridge' as const,
          tool: 'near-intents',
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
            toAmount: quote.amountOut
          },
          estimate: {
            executionDuration: 120
          }
        }]
      }]

    } catch (error: any) {
      console.error('NEAR Intents Quote Error:', error)
      if (error?.body) {
        console.error('NEAR Intents Error Body:', JSON.stringify(error.body, null, 2))
      }
      if (error?.request?.body) {
        console.error('NEAR Intents Request that failed:', error.request.body)
      }
      return []
    }
  }

  async getStatus(request: StatusRequest): Promise<StatusResponse> {
    try {
      const response = await OneClickService.getExecutionStatus(request.txHash)

      if (!response) {
        return { status: 'NOT_FOUND' }
      }

      let finalStatus: TransactionStatus = 'PENDING'
      
      const status = (response.status || '').toLowerCase()
      if (['completed', 'success', 'done', 'settled'].includes(status)) {
        finalStatus = 'DONE'
      } else if (['failed', 'refunded', 'expired', 'error'].includes(status)) {
        finalStatus = 'FAILED'
      } else if (['pending', 'processing', 'waiting', 'in_progress'].includes(status)) {
        finalStatus = 'PENDING'
      }

      return {
        status: finalStatus,
        subStatus: response.status,
        txLink: undefined
      }
    } catch (error) {
      console.error('NEAR Intents Status Error:', error)
      return { status: 'NOT_FOUND' }
    }
  }
}

export const nearIntentsProvider = new NearIntentsProvider()
