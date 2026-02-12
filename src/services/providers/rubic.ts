import { IProvider, QuoteRequest, QuoteResponse, StatusRequest, StatusResponse, TransactionStatus } from '@/types/provider'

// Rubic API v2 
const RUBIC_API_BASE = 'https://api-v2.rubic.exchange/api'

// Map chain IDs to Rubic blockchain identifiers
const CHAIN_MAP: Record<number, string> = {
  1: 'ETH',
  137: 'POLYGON',
  42161: 'ARBITRUM',
  10: 'OPTIMISM',
  8453: 'BASE',
  56: 'BSC',
  43114: 'AVALANCHE',
}

export class RubicProvider implements IProvider {
  name = 'rubic'

  async getQuote(request: QuoteRequest): Promise<QuoteResponse[]> {
    try {
      const srcTokenBlockchain = CHAIN_MAP[request.fromChain]
      const dstTokenBlockchain = CHAIN_MAP[request.toChain]
      
      if (!srcTokenBlockchain || !dstTokenBlockchain) return []

      // Convert native token address to Rubic format
      const srcTokenAddress = request.fromToken === '0x0000000000000000000000000000000000000000' 
        ? '0x0000000000000000000000000000000000000000'
        : request.fromToken
      const dstTokenAddress = request.toToken === '0x0000000000000000000000000000000000000000'
        ? '0x0000000000000000000000000000000000000000'
        : request.toToken

      // Rubic quoteBest endpoint
      const response = await fetch(`${RUBIC_API_BASE}/routes/quoteBest`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          srcTokenAddress,
          srcTokenBlockchain,
          srcTokenAmount: this.formatAmount(request.fromAmount, 18),
          dstTokenAddress,
          dstTokenBlockchain,
          referrer: 'rubic.exchange',
          fromAddress: request.fromAddress || undefined,
          slippage: Math.max(0.01, (request.slippage || 1) / 100), // Min 0.01 (1%)
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Rubic API Error:', errorText)
        return []
      }

      const data = await response.json()
      
      console.log('=== RUBIC RAW RESPONSE ===')
      console.log('destinationTokenAmount:', data.estimate?.destinationTokenAmount)
      console.log('destinationTokenMinAmount:', data.estimate?.destinationTokenMinAmount)
      console.log('type/providerType:', data.type, data.providerType)
      console.log('tokens:', JSON.stringify(data.tokens, null, 2))
      console.log('===========================')
      
      if (!data.estimate || !data.estimate.destinationTokenAmount) {
        console.log('Rubic: No routes found in response')
        return []
      }

      // Extract underlying provider name from Rubic
      const underlyingProvider = data.type || data.providerType || 'rubic'
      const gasCostUSD = data.estimate?.gasFeeInfo?.usdValue || '0'
      
      // IMPORTANT: Rubic returns human-readable amounts
      const toDecimals = data.tokens?.to?.decimals || 6
      const toAmountHuman = data.estimate.destinationTokenAmount
      const toAmountMinHuman = data.estimate.destinationTokenMinAmount || toAmountHuman
      
      return [{
        provider: 'rubic',
        id: data.id || Math.random().toString(36).substring(7),
        fromAmount: request.fromAmount,
        toAmount: this.toWei(toAmountHuman, toDecimals),
        toAmountMin: this.toWei(toAmountMinHuman, toDecimals),
        estimatedGas: gasCostUSD,
        estimatedDuration: data.estimate.estimatedTime || 300,
        transactionRequest: data.transaction ? {
          to: data.transaction.to,
          data: data.transaction.data,
          value: data.transaction.value,
        } : null,
        fees: {
          totalFeeUSD: gasCostUSD,
          gasCost: gasCostUSD,
        },
        toolsUsed: [underlyingProvider],
        routes: [{
          type: 'bridge' as const,
          tool: underlyingProvider,
          toolName: data.providerName || underlyingProvider,
          action: {
            fromToken: {
              address: request.fromToken,
              chainId: request.fromChain,
              symbol: data.tokens?.from?.symbol || 'UNKNOWN',
              decimals: data.tokens?.from?.decimals || 18
            },
            toToken: {
              address: request.toToken,
              chainId: request.toChain,
              symbol: data.tokens?.to?.symbol || 'UNKNOWN',
              decimals: data.tokens?.to?.decimals || 18
            },
            fromAmount: request.fromAmount,
            toAmount: this.toWei(data.estimate.destinationTokenAmount, 18)
          },
          estimate: {
            executionDuration: data.estimate.estimatedTime,
            feeCosts: [
              ...(gasCostUSD !== '0' ? [{
                type: 'GAS' as const,
                name: 'Network Gas',
                description: 'Estimated gas fee',
                amount: '0', // Rubic often gives USD value directly
                amountUSD: gasCostUSD,
                included: false
              }] : []),
              ...(data.estimate.fixedFee ? [{
                type: 'PROTOCOL' as const,
                name: 'Fixed Fee',
                description: 'Rubic Fixed Fee',
                amount: data.estimate.fixedFee,
                amountUSD: data.estimate.fixedFee, // Assuming USD for now
                included: true
              }] : [])
            ]
          }
        }]
      }]

    } catch (error) {
      console.error('Rubic Quote Error:', error)
      return []
    }
  }

  async getStatus(request: StatusRequest): Promise<StatusResponse> {
    try {
      const response = await fetch(
        `${RUBIC_API_BASE}/info/status_by_src_hash?srcHash=${request.txHash}`
      )
      
      if (!response.ok) return { status: 'NOT_FOUND' }
      
      const data = await response.json()
      
      let finalStatus: TransactionStatus = 'PENDING'
      const statusLower = (data.status || '').toLowerCase()
      
      if (['success', 'completed', 'done'].includes(statusLower)) {
        finalStatus = 'DONE'
      } else if (['failed', 'reverted', 'error'].includes(statusLower)) {
        finalStatus = 'FAILED'
      }
      
      return {
        status: finalStatus,
        subStatus: data.status,
        txLink: data.dstTxLink || data.explorerUrl
      }
    } catch (error) {
      console.error('Rubic Status Error:', error)
      return { status: 'NOT_FOUND' }
    }
  }

  private formatAmount(weiAmount: string, decimals: number): string {
    const value = BigInt(weiAmount)
    const divisor = BigInt(10 ** decimals)
    const integerPart = value / divisor
    const fractionalPart = value % divisor
    
    if (fractionalPart === BigInt(0)) {
      return integerPart.toString()
    }
    
    const fractionalStr = fractionalPart.toString().padStart(decimals, '0')
    return `${integerPart}.${fractionalStr}`.replace(/\.?0+$/, '')
  }

  private toWei(amount: string | number, decimals: number): string {
    if (!amount) return '0'
    const str = amount.toString()
    const [intPart, fracPart = ''] = str.split('.')
    const paddedFrac = fracPart.padEnd(decimals, '0').slice(0, decimals)
    return BigInt(intPart + paddedFrac).toString()
  }
}

export const rubicProvider = new RubicProvider()
