import { IProvider, QuoteRequest, QuoteResponse, StatusRequest, StatusResponse, TransactionStatus } from '@/types/provider'
import { SYMBIOSIS_GATEWAY_MAP, SYMBIOSIS_CHAIN_IDS } from './symbiosis-config'

const SYMBIOSIS_API_BASE = 'https://api.symbiosis.finance/crosschain/v1'

export class SymbiosisProvider implements IProvider {
  name = 'symbiosis'

  async getQuote(request: QuoteRequest): Promise<QuoteResponse[]> {
    try {
      const fromChainId = typeof request.fromChain === 'number' ? request.fromChain : Number(request.fromChain)
      const toChainId = typeof request.toChain === 'number' ? request.toChain : Number(request.toChain)
      if (isNaN(fromChainId) || isNaN(toChainId)) return []
      
      const isFromSupported = SYMBIOSIS_CHAIN_IDS.includes(fromChainId)
      const isToSupported = SYMBIOSIS_CHAIN_IDS.includes(toChainId)

      if (!isFromSupported || !isToSupported) {
        return []
      }

      const response = await fetch(`${SYMBIOSIS_API_BASE}/swap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenAmountIn: {
            chainId: fromChainId,
            address: request.fromToken,
            amount: request.fromAmount,
            decimals: 18 
          },
          tokenOut: {
            chainId: toChainId,
            address: request.toToken,
            decimals: 18  
          },
          from: request.fromAddress,
          to: request.toAddress || request.fromAddress,
          slippage: (request.slippage || 0.5) * 100,
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Symbiosis API Error:', errorText)
        return []
      }

      const data = await response.json()
      
      console.log('=== SYMBIOSIS RAW RESPONSE ===')
      console.log('id:', data.id)
      console.log('tokenAmountOut:', JSON.stringify(data.tokenAmountOut, null, 2))
      console.log('priceImpact:', data.priceImpact)
      console.log('fee:', JSON.stringify(data.fee, null, 2))
      console.log('estimatedTime:', data.estimatedTime)
      console.log('==============================')

      if (!data.tokenAmountOut) return []

      // Symbiosis embeds fees in the output
      const inputAmountRaw = request.fromAmount
      const outputAmountRaw = data.tokenAmountOut.amount
      
      const inputDecimals = data.tokenAmountIn?.decimals || 18
      const outputDecimals = data.tokenAmountOut?.decimals || 18
      
      const inputHuman = parseFloat(inputAmountRaw) / Math.pow(10, inputDecimals)
      const outputHuman = parseFloat(outputAmountRaw) / Math.pow(10, outputDecimals)
      
      const impliedFeeUSD = Math.max(0, inputHuman - outputHuman).toFixed(2)
      
      const apiFeeUSD = data.fee?.usd?.toString() || '0'
      const bridgeFeeUSD = parseFloat(apiFeeUSD) > 0 ? apiFeeUSD : impliedFeeUSD
      const priceImpact = data.priceImpact?.toString()

      const approvalAddress = SYMBIOSIS_GATEWAY_MAP[fromChainId as number]

      return [{
        provider: 'symbiosis',
        id: data.id || Math.random().toString(36).substring(7),
        fromAmount: request.fromAmount,
        toAmount: data.tokenAmountOut.amount,
        toAmountMin: data.tokenAmountOutMin?.amount || data.tokenAmountOut.amount,
        estimatedGas: bridgeFeeUSD,
        estimatedDuration: data.estimatedTime || 65,
        transactionRequest: data.tx, 
        fees: {
          totalFeeUSD: bridgeFeeUSD,
          bridgeFee: bridgeFeeUSD,
          slippage: priceImpact,
        },
        toolsUsed: ['Symbiosis'],
        routes: [{
          type: 'bridge' as const,
          tool: 'symbiosis',
          toolName: 'Symbiosis Bridge',
          action: {
            fromToken: {
              address: request.fromToken,
              chainId: request.fromChain,
              symbol: data.tokenAmountIn?.symbol || 'UNKNOWN',
              decimals: data.tokenAmountIn?.decimals || 18
            },
            toToken: {
              address: request.toToken,
              chainId: request.toChain,
              symbol: (data.tokenAmountOut?.symbol && data.tokenAmountOut.symbol !== 'tokenOut') ? data.tokenAmountOut.symbol : 'UNKNOWN',
              decimals: data.tokenAmountOut?.decimals || 18
            },
            fromAmount: request.fromAmount,
            toAmount: data.tokenAmountOut.amount
          },
          estimate: {
            executionDuration: data.estimatedTime,
            approvalAddress: approvalAddress,
            feeCosts: [
              ...(parseFloat(bridgeFeeUSD) > 0 ? [{
                type: 'BRIDGE' as const,
                name: 'Bridge Fee',
                description: 'Symbiosis Protocol Fee',
                amount: bridgeFeeUSD,
                amountUSD: bridgeFeeUSD,
                included: true
              }] : [])
            ]
          }
        }]
      }]

    } catch (error) {
      console.error('Symbiosis Quote Error:', error)
      return []
    }
  }

  async getStatus(request: StatusRequest): Promise<StatusResponse> {
    try {
      const response = await fetch(`${SYMBIOSIS_API_BASE}/tx/${request.txHash}`)
      
      if (!response.ok) return { status: 'NOT_FOUND' }

      const data = await response.json()
      
      let finalStatus: TransactionStatus = 'PENDING'
      if (data.status === 'success' || data.status === 'completed') finalStatus = 'DONE'
      else if (data.status === 'failed' || data.status === 'reverted') finalStatus = 'FAILED'

      return {
        status: finalStatus,
        subStatus: data.status,
        txLink: data.explorerUrl
      }
    } catch (error) {
      console.error('Symbiosis Status Error:', error)
      return { status: 'NOT_FOUND' }
    }
  }
}

export const symbiosisProvider = new SymbiosisProvider()
