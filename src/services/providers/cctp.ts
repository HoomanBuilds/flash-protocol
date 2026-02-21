import { IProvider, QuoteRequest, QuoteResponse, StatusRequest, StatusResponse, TransactionStatus, FeeCost } from '@/types/provider'

/**
 * CCTP Provider - Circle Cross-Chain Transfer Protocol
 */

// USDC contract addresses on supported chains
const USDC_ADDRESSES: Record<number, string> = {
  1: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',      // Ethereum
  42161: '0xaf88d065e77c8cc2239327c5edb3a432268e5831',  // Arbitrum
  8453: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',   // Base
  137: '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359',    // Polygon
  10: '0x0b2c639c533813f4aa9d7837caf62653d097ff85',     // Optimism
  43114: '0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e',  // Avalanche
  59144: '0x176211869ca2b568f2a7d4ee941e073a821ee1ff',  // Linea
  146: '0x29219dd400f2bf60e5a23d13be72b486d4038894',    // Sonic
}

// Bridge Kit chain name mapping
const CHAIN_TO_BRIDGE_KIT: Record<number, string> = {
  1: 'Ethereum',
  42161: 'Arbitrum',
  8453: 'Base',
  137: 'Polygon_PoS',
  10: 'OP_Mainnet',
  43114: 'Avalanche',
  59144: 'Linea',
  146: 'Sonic',
}

// Iris API for attestation status
const IRIS_API = 'https://iris-api.circle.com'

export class CCTPProvider implements IProvider {
  name = 'cctp'

  private isUSDC(chainId: number | string, tokenAddress: string): boolean {
    const numId = typeof chainId === 'number' ? chainId : Number(chainId)
    if (isNaN(numId)) return false
    const usdcAddress = USDC_ADDRESSES[numId]
    if (!usdcAddress) return false
    return tokenAddress.toLowerCase() === usdcAddress.toLowerCase()
  }

  private isSupportedChain(chainId: number | string): boolean {
    const numId = typeof chainId === 'number' ? chainId : Number(chainId)
    if (isNaN(numId)) return false
    return numId in CHAIN_TO_BRIDGE_KIT
  }

  async getQuote(request: QuoteRequest): Promise<QuoteResponse[]> {
    try {
      if (!this.isUSDC(request.fromChain, request.fromToken)) {
        console.log('CCTP: Source token is not USDC')
        return []
      }

      if (!this.isUSDC(request.toChain, request.toToken)) {
        console.log('CCTP: Destination token is not USDC')
        return []
      }

      if (!this.isSupportedChain(request.fromChain)) {
        console.log(`CCTP: Source chain ${request.fromChain} not supported`)
        return []
      }

      if (!this.isSupportedChain(request.toChain)) {
        console.log(`CCTP: Destination chain ${request.toChain} not supported`)
        return []
      }

      if (request.fromChain === request.toChain) {
        console.log('CCTP: Same chain transfer not applicable')
        return []
      }

      const fromNum = typeof request.fromChain === 'number' ? request.fromChain : Number(request.fromChain)
      const toNum = typeof request.toChain === 'number' ? request.toChain : Number(request.toChain)
      if (isNaN(fromNum) || isNaN(toNum)) return []

      const sourceChain = CHAIN_TO_BRIDGE_KIT[fromNum]
      const destChain = CHAIN_TO_BRIDGE_KIT[toNum]

      
      const domainIds: Record<number, number> = {
        1: 0,      // Ethereum
        43114: 1,  // Avalanche
        10: 2,     // Optimism
        42161: 3,  // Arbitrum
        8453: 6,   // Base
        137: 7,    // Polygon
        59144: 11, // Linea
        146: 14,   // Sonic
      }

      const sourceDomain = domainIds[fromNum]
      const destDomain = domainIds[toNum]

      let feePercentage = 0
      try {
        const feeResponse = await fetch(
          `${IRIS_API}/v2/burn/USDC/fees/${sourceDomain}/${destDomain}`
        )
        if (feeResponse.ok) {
          const feeData = await feeResponse.json()
          if (feeData && feeData.length > 0) {
            feePercentage = feeData[0].minimumFee / 10000
          }
        }
      } catch (e) {
        console.warn('CCTP: Could not fetch fee estimate:', e)
      }

      const inputAmount = BigInt(request.fromAmount)
      const feeAmount = BigInt(Math.floor(Number(inputAmount) * feePercentage))
      const outputAmount = inputAmount - feeAmount

      // Fast Transfer: 20s, Standard: 900s (15 min)
      const estimatedDuration = 20

      return [{
        provider: 'cctp',
        id: `cctp-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        fromAmount: request.fromAmount,
        toAmount: outputAmount.toString(),
        toAmountMin: outputAmount.toString(),
        estimatedGas: '0',
        estimatedDuration,
        bridgeFee: feeAmount.toString(),
        bridgeFeeUSD: (Number(feeAmount) / 1e6).toFixed(2),
        transactionRequest: null,
        routes: [{
          type: 'bridge' as const,
          tool: 'cctp',
          action: {
            fromToken: {
              address: request.fromToken,
              chainId: request.fromChain,
              symbol: 'USDC',
              decimals: 6
            },
            toToken: {
              address: request.toToken,
              chainId: request.toChain,
              symbol: 'USDC',
              decimals: 6
            },
            fromAmount: request.fromAmount,
            toAmount: outputAmount.toString()
          },
          estimate: {
            executionDuration: estimatedDuration,
            feeCosts: [{
              type: 'GAS',
              name: 'Network Gas',
              description: 'Gas for Burn (Source) + Mint (Dest)',
              amount: '0.005', // Rough estimate/placeholder
              amountUSD: '0.10', // Rough estimate
              included: false
            }]
          }
        }],
        metadata: {
          sourceChain,
          destChain,
          sourceDomain,
          destDomain,
          fastTransfer: true
        }
      }]

    } catch (error) {
      console.error('CCTP Quote Error:', error)
      return []
    }
  }

  async getStatus(request: StatusRequest): Promise<StatusResponse> {
    try {
      const response = await fetch(
        `${IRIS_API}/v2/messages?transactionHash=${request.txHash}`
      )

      if (!response.ok) {
        return { status: 'NOT_FOUND' }
      }

      const data = await response.json()

      if (!data.messages || data.messages.length === 0) {
        return { status: 'PENDING', subStatus: 'Waiting for attestation' }
      }

      const message = data.messages[0]
      let status: TransactionStatus = 'PENDING'
      let subStatus = ''

      // CCTP message states
      switch (message.status) {
        case 'complete':
          status = 'DONE'
          subStatus = 'Transfer complete'
          break
        case 'attestation_complete':
          status = 'PENDING'
          subStatus = 'Attestation complete, ready to mint'
          break
        case 'attestation_pending':
          status = 'PENDING'
          subStatus = 'Waiting for attestation'
          break
        case 'source_finalized':
          status = 'PENDING'
          subStatus = 'Burn confirmed, minting on destination'
          break
        case 'failed':
          status = 'FAILED'
          subStatus = message.error || 'Transfer failed'
          break
        default:
          status = 'PENDING'
          subStatus = message.status || 'Processing'
      }

      return {
        status,
        subStatus,
        txLink: message.destinationTransactionHash 
          ? `https://blockscan.com/tx/${message.destinationTransactionHash}`
          : undefined
      }
    } catch (error) {
      console.error('CCTP Status Error:', error)
      return { status: 'NOT_FOUND' }
    }
  }
}

export const cctpProvider = new CCTPProvider()
