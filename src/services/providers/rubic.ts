import { IProvider, QuoteRequest, QuoteResponse, StatusRequest, StatusResponse, TransactionStatus } from '@/types/provider'

// Rubic API v2 
const RUBIC_API_BASE = 'https://api-v2.rubic.exchange/api'

// Hardcoded fallback — used when /api/info/chains fails
const FALLBACK_CHAIN_MAP: Record<string, string> = {
  // EVM Chains
  '1': 'ETH',
  '137': 'POLYGON',
  '42161': 'ARBITRUM',
  '10': 'OPTIMISM',
  '8453': 'BASE',
  '56': 'BSC',
  '43114': 'AVALANCHE',
  '250': 'FANTOM',
  '100': 'GNOSIS',
  '1101': 'POLYGON_ZKEVM',
  '324': 'ZK_SYNC',
  '59144': 'LINEA',
  '1313161554': 'AURORA',
  '169': 'MANTA_PACIFIC',
  '534352': 'SCROLL',
  '5000': 'MANTLE',
  '81457': 'BLAST',
  // Non-EVM Chains
  'solana': 'SOLANA',
  'bitcoin': 'BITCOIN',
  'tron': 'TRON',
}

// Dynamic chain map: populated from /api/info/chains at first use
let dynamicChainMap: Record<string, string> | null = null
let chainMapLoading: Promise<void> | null = null

async function ensureChainMap(): Promise<void> {
  if (dynamicChainMap) return
  if (chainMapLoading) { await chainMapLoading; return }

  chainMapLoading = (async () => {
    try {
      const res = await fetch(`${RUBIC_API_BASE}/info/chains?includeTestnets=false`)
      if (res.ok) {
        const chains: { id: number; name: string }[] = await res.json()
        dynamicChainMap = {}
        for (const c of chains) {
          // Map by numeric ID (for EVM)
          if (c.id) dynamicChainMap[String(c.id)] = c.name
          // Map by lowercase name (for non-EVM)
          dynamicChainMap[c.name.toLowerCase()] = c.name
        }
        console.log(`Rubic: Loaded ${Object.keys(dynamicChainMap).length} chain mappings from API`)
      } else {
        throw new Error(`HTTP ${res.status}`)
      }
    } catch (error) {
      console.warn('Rubic: /api/info/chains failed, using fallback:', error)
      dynamicChainMap = { ...FALLBACK_CHAIN_MAP }
    }
  })()

  await chainMapLoading
  chainMapLoading = null
}

function resolveChain(chainId: number | string): string | null {
  const map = dynamicChainMap || FALLBACK_CHAIN_MAP
  return map[String(chainId)] || null
}

export class RubicProvider implements IProvider {
  name = 'rubic'

  async getQuote(request: QuoteRequest): Promise<QuoteResponse[]> {
    try {
      await ensureChainMap()

      const srcTokenBlockchain = resolveChain(request.fromChain)
      const dstTokenBlockchain = resolveChain(request.toChain)
      
      if (!srcTokenBlockchain || !dstTokenBlockchain) return []

      // Convert native token address to Rubic format
      const srcTokenAddress = request.fromToken === '0x0000000000000000000000000000000000000000' 
        ? '0x0000000000000000000000000000000000000000'
        : request.fromToken
      const dstTokenAddress = request.toToken === '0x0000000000000000000000000000000000000000'
        ? '0x0000000000000000000000000000000000000000'
        : request.toToken

      // Detect non-EVM chains for deposit trade flow
      const NON_EVM_CHAINS = ['SOLANA', 'BITCOIN', 'TRON']
      const isNonEvmSource = NON_EVM_CHAINS.includes(srcTokenBlockchain)

      // Rubic quoteBest endpoint
      const commonParams = {
        srcTokenAddress,
        srcTokenBlockchain,
        srcTokenAmount: this.formatAmount(request.fromAmount, request.fromTokenDecimals || 18),
        dstTokenAddress,
        dstTokenBlockchain,
        referrer: 'rubic.exchange',
        fromAddress: request.fromAddress || undefined,
        slippage: Math.max(0.01, (request.slippage || 1) / 100), // Min 0.01 (1%)
      }

      // Determine chainType for metadata
      const chainType: 'evm' | 'solana' | 'bitcoin' =
        srcTokenBlockchain === 'SOLANA' ? 'solana'
        : srcTokenBlockchain === 'BITCOIN' ? 'bitcoin'
        : 'evm'

      // Use deposit-trade endpoint for non-EVM source chains
      const quoteEndpoint = isNonEvmSource ? `${RUBIC_API_BASE}/routes/quoteDepositTrades` : `${RUBIC_API_BASE}/routes/quoteBest`

      const response = await fetch(quoteEndpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...commonParams,
          ...(isNonEvmSource ? { depositTradeParams: 'all' } : {})
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
      
      // Process EVM transaction data
      let transactionRequest = null
      let approvalAddress = data.transaction?.approvalAddress
      let insufficientBalance = false

      if (data.id) {
        try {
          if (isNonEvmSource) {
            // Non-EVM
            const swapResponse = await fetch(`${RUBIC_API_BASE}/routes/swapDepositTrade`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...commonParams,
                id: data.id,
                receiver: request.toAddress || request.fromAddress,
              })
            })

            if (swapResponse.ok) {
              const swapData = await swapResponse.json()
              if (swapData.transaction?.depositAddress) {
                transactionRequest = {
                  depositAddress: swapData.transaction.depositAddress,
                  amountToSend: swapData.transaction.amountToSend,
                  exchangeId: swapData.transaction.exchangeId,
                  type: chainType,
                }
              }
            }
          } else {
            // EVM
            const swapResponse = await fetch(`${RUBIC_API_BASE}/routes/swap`, {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({
                 ...commonParams,
                 id: data.id
               })
            })
            
            if (swapResponse.ok) {
              const swapData = await swapResponse.json()
              if (swapData.transaction) {
                 transactionRequest = {
                   to: swapData.transaction.to,
                   data: swapData.transaction.data,
                   value: swapData.transaction.value,
                   type: 'evm',
                 }
                
                 approvalAddress = swapData.transaction.approvalAddress || approvalAddress
              }
            } else {
               const errorText = await swapResponse.text()
               try {
                  const errorJson = JSON.parse(errorText)
                  if (errorJson.error?.code === 3003 || errorJson.error?.reason?.includes('not enough balance')) {
                    insufficientBalance = true
                    console.log(`[Rubic] Balance check: user has insufficient ${srcTokenBlockchain} balance`)
                  }
               } catch (e) {
                  // Ignore parse errors
               }
               console.warn('Rubic Swap Data Error:', errorText)
            }
          }
        } catch (swapErr) {
          console.warn('Failed to fetch Rubic swap data:', swapErr)
        }
      }

      // Calculate total fees
      const protocolFeeUSD = data.fees?.gasTokenFees?.protocol?.fixedUsdAmount || 0
      const providerFeeUSD = data.fees?.gasTokenFees?.provider?.fixedUsdAmount || 0
      const totalFeeUSD = (parseFloat(gasCostUSD) + protocolFeeUSD + providerFeeUSD).toFixed(4)

      return [{
        provider: 'rubic',
        id: data.id || Math.random().toString(36).substring(7),
        fromAmount: request.fromAmount,
        toAmount: this.toWei(toAmountHuman, toDecimals),
        toAmountMin: this.toWei(toAmountMinHuman, toDecimals),
        estimatedGas: gasCostUSD,
        estimatedDuration: data.estimate.estimatedTime || 300,
        transactionRequest,
        fees: {
          totalFeeUSD,
          gasCost: gasCostUSD,
          bridgeFee: (protocolFeeUSD + providerFeeUSD).toFixed(4)
        },
        toolsUsed: [underlyingProvider],
        metadata: {
           insufficientBalance: insufficientBalance || undefined,
           chainType,
           isDepositTrade: isNonEvmSource,
           ...(isNonEvmSource && transactionRequest?.depositAddress ? {
             depositAddress: transactionRequest.depositAddress,
             amountToSend: transactionRequest.amountToSend,
           } : {}),
        },
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
          // TODO: Add support for platform fees
          estimate: {
            approvalAddress,
            executionDuration: data.estimate.estimatedTime,
            feeCosts: [
              // Gas Fees
              ...(data.fees?.gasTokenFees?.gas?.totalUsdAmount ? [{
                type: 'GAS' as const,
                name: 'Network Gas',
                description: 'Estimated gas fee for transaction',
                amount: data.fees.gasTokenFees.gas.totalWeiAmount || '0',
                amountUSD: data.fees.gasTokenFees.gas.totalUsdAmount.toString(),
                included: false,
                token: {
                  address: data.fees.gasTokenFees.nativeToken?.address || '',
                  chainId: data.fees.gasTokenFees.nativeToken?.blockchainId || request.fromChain,
                  symbol: data.fees.gasTokenFees.nativeToken?.symbol || 'ETH',
                  decimals: data.fees.gasTokenFees.nativeToken?.decimals || 18
                }
              }] : []),

              // Rubic Protocol Fee
              ...(data.fees?.gasTokenFees?.protocol?.fixedUsdAmount ? [{
                type: 'PROTOCOL' as const,
                name: 'Rubic Protocol Fee',
                description: 'Fixed fee charged by Rubic',
                amount: data.fees.gasTokenFees.protocol.fixedWeiAmount || '0',
                amountUSD: data.fees.gasTokenFees.protocol.fixedUsdAmount.toString(),
                included: true
              }] : []),

              // Provider/Bridge Fee
              ...(data.fees?.gasTokenFees?.provider?.fixedUsdAmount ? [{
                type: 'BRIDGE' as const,
                name: 'Provider Fee',
                description: 'Fee charged by the underlying bridge/provider',
                amount: data.fees.gasTokenFees.provider.fixedWeiAmount || '0',
                amountUSD: data.fees.gasTokenFees.provider.fixedUsdAmount.toString(),
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
        `${RUBIC_API_BASE}/info/status?srcTxHash=${request.txHash}`
      )
      
      if (!response.ok) return { status: 'NOT_FOUND' }
      
      const data = await response.json()
      
      let finalStatus: TransactionStatus = 'PENDING'
      const statusLower = (data.status || '').toLowerCase()
      
      if (['success', 'completed', 'done', 'ready_to_claim'].includes(statusLower)) {
        finalStatus = 'DONE'
      } else if (['failed', 'reverted', 'error', 'fail'].includes(statusLower)) {
        finalStatus = 'FAILED'
      }
      
      return {
        status: finalStatus,
        subStatus: data.status,
        txLink: data.destinationTxHash 
          ? (data.destinationNetworkChainId ? this.getExplorerLink(data.destinationNetworkChainId, data.destinationTxHash) : data.destinationTxHash)
          : undefined
      }
    } catch (error) {
      console.error('Rubic Status Error:', error)
      return { status: 'NOT_FOUND' }
    }
  }

  private getExplorerLink(chainId: number, hash: string): string {
      // Simple helper to try and generate a link if we have the chain ID
      const scanMap: Record<number, string> = {
          1: 'https://etherscan.io/tx/',
          137: 'https://polygonscan.com/tx/',
          42161: 'https://arbiscan.io/tx/',
          10: 'https://optimistic.etherscan.io/tx/',
          8453: 'https://basescan.org/tx/',
          56: 'https://bscscan.com/tx/',
          43114: 'https://snowtrace.io/tx/',
      }
      const base = scanMap[chainId]
      return base ? `${base}${hash}` : hash
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
