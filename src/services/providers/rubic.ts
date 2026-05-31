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
      const SOLANA_NATIVE = '11111111111111111111111111111111'
      const SOLANA_WRAPPED_SOL = 'So11111111111111111111111111111111111111112'
      
      let srcTokenAddress = request.fromToken
      if (srcTokenAddress === SOLANA_NATIVE) {
        srcTokenAddress = SOLANA_WRAPPED_SOL
      }

      let dstTokenAddress = request.toToken
      if (dstTokenAddress === SOLANA_NATIVE) {
        dstTokenAddress = SOLANA_WRAPPED_SOL
      }

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

      // quoteDepositTrades wraps the route in { routes: [route] }; quoteBest
      // returns it flat. Normalize to a single quote payload accessor.
      const quote = isNonEvmSource ? (data.routes?.[0] ?? {}) : data

      console.log('=== RUBIC RAW RESPONSE ===')
      console.log('destinationTokenAmount:', quote.estimate?.destinationTokenAmount)
      console.log('destinationTokenMinAmount:', quote.estimate?.destinationTokenMinAmount)
      console.log('type/providerType:', quote.type, quote.providerType)
      console.log('tokens:', JSON.stringify(quote.tokens, null, 2))
      console.log('===========================')

      if (!quote.estimate || !quote.estimate.destinationTokenAmount) {
        console.log('Rubic: No routes found in response')
        return []
      }

      // Extract underlying provider name from Rubic
      const underlyingProvider = quote.type || quote.providerType || 'rubic'
      const gasCostUSD = quote.estimate?.gasFeeInfo?.usdValue || '0'

      // IMPORTANT: Rubic returns human-readable amounts
      const toDecimals = quote.tokens?.to?.decimals || 6
      const toAmountHuman = quote.estimate.destinationTokenAmount
      const toAmountMinHuman = quote.estimate.destinationTokenMinAmount || toAmountHuman

      // Process EVM transaction data
      let transactionRequest = null
      let approvalAddress = quote.transaction?.approvalAddress
      let insufficientBalance = false

      // Deposit trades quote with id=null but still need the swap call to obtain
      // a deposit address; gate on the presence of an estimate instead.
      const shouldFetchTx = isNonEvmSource ? Boolean(quote.estimate) : Boolean(quote.id)

      if (shouldFetchTx) {
        try {
          if (isNonEvmSource) {
            // Non-EVM
            const swapResponse = await fetch(`${RUBIC_API_BASE}/routes/swapDepositTrade`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...commonParams,
                id: quote.id,
                receiver: request.toAddress || request.fromAddress,
                refundAddress: request.fromAddress,
              })
            })

            if (swapResponse.ok) {
              const swapData = await swapResponse.json()
              if (swapData.transaction?.depositAddress) {
                transactionRequest = {
                  depositAddress: swapData.transaction.depositAddress,
                  // Rubic returns amountToSend in HUMAN units; the executor does
                  // BigInt(amountToSend) expecting RAW base units. The deposit
                  // amount equals the source amount the user pays = request.fromAmount.
                  amountToSend: request.fromAmount,
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
                 id: quote.id
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

      // Drop non-executable quotes: Rubic cannot be executed without tx data.
      // EVM swaps need transactionRequest.to/data (from /routes/swap); deposit
      // trades need a depositAddress (from /routes/swapDepositTrade). When the
      // swap call fails (e.g. insufficient balance) these are absent, and the
      // quote would be unexecutable yet could still poison ranking as "best".
      const hasExecutableTx = isNonEvmSource
        ? Boolean(transactionRequest?.depositAddress)
        : Boolean(transactionRequest?.to && transactionRequest?.data)
      if (!hasExecutableTx) {
        console.log('Rubic: dropping quote with no executable transaction data')
        return []
      }

      // Calculate total fees
      const protocolFeeUSD = quote.fees?.gasTokenFees?.protocol?.fixedUsdAmount || 0
      const providerFeeUSD = quote.fees?.gasTokenFees?.provider?.fixedUsdAmount || 0
      const totalFeeUSD = (parseFloat(gasCostUSD) + protocolFeeUSD + providerFeeUSD).toFixed(4)

      return [{
        provider: 'rubic',
        id: quote.id || Math.random().toString(36).substring(7),
        fromAmount: request.fromAmount,
        toAmount: this.toWei(toAmountHuman, toDecimals),
        toAmountMin: this.toWei(toAmountMinHuman, toDecimals),
        toTokenDecimals: toDecimals,
        estimatedGas: gasCostUSD,
        estimatedDuration: quote.estimate.estimatedTime || 300,
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
          toolName: quote.providerName || underlyingProvider,
          action: {
            fromToken: {
              address: request.fromToken,
              chainId: request.fromChain,
              symbol: quote.tokens?.from?.symbol || 'UNKNOWN',
              decimals: quote.tokens?.from?.decimals || 18
            },
            toToken: {
              address: request.toToken,
              chainId: request.toChain,
              symbol: quote.tokens?.to?.symbol || 'UNKNOWN',
              decimals: quote.tokens?.to?.decimals || 18
            },
            fromAmount: request.fromAmount,
            toAmount: this.toWei(quote.estimate.destinationTokenAmount, toDecimals)
          },
          // TODO: Add support for platform fees
          estimate: {
            approvalAddress,
            executionDuration: quote.estimate.estimatedTime,
            feeCosts: [
              // Gas Fees
              ...(quote.fees?.gasTokenFees?.gas?.totalUsdAmount ? [{
                type: 'GAS' as const,
                name: 'Network Gas',
                description: 'Estimated gas fee for transaction',
                amount: quote.fees.gasTokenFees.gas.totalWeiAmount || '0',
                amountUSD: quote.fees.gasTokenFees.gas.totalUsdAmount.toString(),
                included: false,
                token: {
                  address: quote.fees.gasTokenFees.nativeToken?.address || '',
                  chainId: quote.fees.gasTokenFees.nativeToken?.blockchainId || request.fromChain,
                  symbol: quote.fees.gasTokenFees.nativeToken?.symbol || 'ETH',
                  decimals: quote.fees.gasTokenFees.nativeToken?.decimals || 18
                }
              }] : []),

              // Rubic Protocol Fee
              ...(quote.fees?.gasTokenFees?.protocol?.fixedUsdAmount ? [{
                type: 'PROTOCOL' as const,
                name: 'Rubic Protocol Fee',
                description: 'Fixed fee charged by Rubic',
                amount: quote.fees.gasTokenFees.protocol.fixedWeiAmount || '0',
                amountUSD: quote.fees.gasTokenFees.protocol.fixedUsdAmount.toString(),
                included: true
              }] : []),

              // Provider/Bridge Fee
              ...(quote.fees?.gasTokenFees?.provider?.fixedUsdAmount ? [{
                type: 'BRIDGE' as const,
                name: 'Provider Fee',
                description: 'Fee charged by the underlying bridge/provider',
                amount: quote.fees.gasTokenFees.provider.fixedWeiAmount || '0',
                amountUSD: quote.fees.gasTokenFees.provider.fixedUsdAmount.toString(),
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
