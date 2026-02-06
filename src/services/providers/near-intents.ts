import { IProvider, QuoteRequest, QuoteResponse, StatusRequest, StatusResponse, TransactionStatus } from '@/types/provider'

// NEAR Intents 1Click API
const NEAR_INTENTS_API = 'https://1click.chaindefuser.com/v0'

const NATIVE_ASSET_IDS: Record<number, string> = {
  // nep141 format chains
  1: 'nep141:eth.omft.near',           // ETH on Ethereum
  42161: 'nep141:arb.omft.near',       // ETH on Arbitrum
  8453: 'nep141:base.omft.near',       // ETH on Base
  100: 'nep141:gnosis.omft.near',      // xDAI on Gnosis
  // nep245 format chains (use chainId in the format)
  56: 'nep245:v2_1.omni.hot.tg:56_11111111111111111111',      // BNB on BSC
  137: 'nep245:v2_1.omni.hot.tg:137_11111111111111111111',    // POL on Polygon
  43114: 'nep245:v2_1.omni.hot.tg:43114_11111111111111111111', // AVAX on Avalanche
  10: 'nep245:v2_1.omni.hot.tg:10_11111111111111111111',       // ETH on Optimism
}

// Chain blockchain name mapping for token address format
const CHAIN_PREFIX_MAP: Record<number, string> = {
  1: 'eth',
  137: 'pol',
  42161: 'arb',
  10: 'op',
  8453: 'base',
  56: 'bsc',
  43114: 'avax',
  100: 'gnosis',
}

export class NearIntentsProvider implements IProvider {
  name = 'near-intents'

  private getAssetId(chainId: number, tokenAddress: string): string | null {
    const chainPrefix = CHAIN_PREFIX_MAP[chainId]
    if (!chainPrefix) return null

    const address = tokenAddress.toLowerCase()
    if (address === '0x0000000000000000000000000000000000000000') {
      return NATIVE_ASSET_IDS[chainId] || null
    }

    return `nep141:${chainPrefix}-${address}.omft.near`
  }

  async getQuote(request: QuoteRequest): Promise<QuoteResponse[]> {
    try {
      const originAsset = this.getAssetId(request.fromChain, request.fromToken)
      const destinationAsset = this.getAssetId(request.toChain, request.toToken)
      
      if (!originAsset || !destinationAsset) {
        console.log('NEAR Intents: Unsupported chain')
        return []
      }

      const response = await fetch(`${NEAR_INTENTS_API}/quote`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dry: true,
          swapType: 'EXACT_INPUT',
          slippageTolerance: Math.round((request.slippage || 0.5) * 100), // Basis points (50 = 0.5%)
          originAsset,
          depositType: 'ORIGIN_CHAIN',
          destinationAsset,
          amount: request.fromAmount,
          refundTo: request.fromAddress,
          refundType: 'ORIGIN_CHAIN',
          recipient: request.toAddress || request.fromAddress,
          recipientType: 'DESTINATION_CHAIN',
          deadline: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('NEAR Intents API Error:', errorText)
        return []
      }

      const data = await response.json()
      
      if (!data.amountOut) {
        console.log('NEAR Intents: No quote available')
        return []
      }

      return [{
        provider: 'near-intents',
        id: data.quoteId || Math.random().toString(36).substring(7),
        fromAmount: request.fromAmount,
        toAmount: data.amountOut,
        toAmountMin: data.minAmountOut || data.amountOut,
        estimatedGas: '0', // NEAR Intents handles gas internally
        estimatedDuration: data.estimatedTime || 180, 
        transactionRequest: null, 
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
            toAmount: data.amountOut
          },
          estimate: {
            executionDuration: data.estimatedTime || 180
          }
        }]
      }]

    } catch (error) {
      console.error('NEAR Intents Quote Error:', error)
      return []
    }
  }

  async getStatus(request: StatusRequest): Promise<StatusResponse> {
    try {
      const response = await fetch(`${NEAR_INTENTS_API}/status?intentHash=${request.txHash}`)
      
      if (!response.ok) return { status: 'NOT_FOUND' }

      const data = await response.json()
      
      let finalStatus: TransactionStatus = 'PENDING'
      
      const statusLower = (data.status || '').toLowerCase()
      if (['completed', 'success', 'done'].includes(statusLower)) {
        finalStatus = 'DONE'
      } else if (['failed', 'refunded', 'expired'].includes(statusLower)) {
        finalStatus = 'FAILED'
      } else if (['pending', 'processing', 'waiting_deposit'].includes(statusLower)) {
        finalStatus = 'PENDING'
      }

      return {
        status: finalStatus,
        subStatus: data.status,
        txLink: data.explorerUrl
      }
    } catch (error) {
      console.error('NEAR Intents Status Error:', error)
      return { status: 'NOT_FOUND' }
    }
  }
}

export const nearIntentsProvider = new NearIntentsProvider()
