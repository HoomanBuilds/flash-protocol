import {
  IProvider,
  QuoteRequest,
  QuoteResponse,
  StatusRequest,
  StatusResponse,
  TransactionStatus,
} from '@/types/provider'
import { SYMBIOSIS_GATEWAY_MAP, SYMBIOSIS_CHAIN_IDS } from './symbiosis-config'
import { SYMBIOSIS_CONFIG } from './symbiosis-data'
import { ChainTokenService } from '../chain-token-service'

/**
 * Resolve the REAL destination-token decimals. Symbiosis echoes back the `decimals`
 * hint we send in `tokenOut` (we send 18), so `data.tokenAmountOut.decimals` is NOT
 * authoritative for 6/8-decimal tokens like USDC/WBTC. Prefer the caller-supplied
 * authoritative decimals, then the live token registry, then the API value.
 */
export async function resolveToTokenDecimals(
  request: QuoteRequest,
  toChain: number,
  apiDecimals: number | undefined,
): Promise<number | undefined> {
  if (typeof request.toTokenDecimals === 'number') return request.toTokenDecimals
  try {
    const tokens = await ChainTokenService.getTokens(String(toChain))
    const target = request.toToken.toLowerCase()
    const match = tokens.find((t) => t.address.toLowerCase() === target)
    if (match?.decimals !== undefined) return match.decimals
  } catch {
    // fall through to API value
  }
  return apiDecimals
}

/**
 * Compute the REAL fee in USD. Symbiosis returns the fee as
 * `{ amount, decimals, priceUsd }` (NOT `fee.usd`). Convert it to a human USD
 * value. Returns undefined when `data.fee` is absent so callers can fall back.
 */
export function computeSymbiosisFeeUSD(fee: unknown): string | undefined {
  if (!fee || typeof fee !== 'object') return undefined
  const f = fee as { amount?: string | number; decimals?: number; priceUsd?: number }
  if (f.amount === undefined || f.decimals === undefined) return undefined
  const human = Number(f.amount) / Math.pow(10, f.decimals)
  if (!isFinite(human)) return undefined
  return (human * (f.priceUsd ?? 1)).toFixed(2)
}

const SYMBIOSIS_API_BASE = 'https://api.symbiosis.finance/crosschain/v1'
const SYMBIOSIS_BTC_CHAIN_ID = 3652501241
const SYMBIOSIS_BTC_FORWARDER_URL =
  SYMBIOSIS_CONFIG.btcConfigs?.[0]?.forwarderUrl ||
  'https://btc-forwarder.symbiosis.finance/bsc-v2/forwarder/api/v1'

export class SymbiosisProvider implements IProvider {
  name = 'symbiosis'

  async getQuote(request: QuoteRequest): Promise<QuoteResponse[]> {
    try {
      const resolveChainId = (chain: number | string): number => {
        if (typeof chain === 'string' && chain.toLowerCase() === 'bitcoin')
          return SYMBIOSIS_BTC_CHAIN_ID
        return typeof chain === 'number' ? chain : Number(chain)
      }
      const fromChainId = resolveChainId(request.fromChain)
      const toChainId = resolveChainId(request.toChain)
      if (isNaN(fromChainId) || isNaN(toChainId)) return []

      const isFromSupported =
        SYMBIOSIS_CHAIN_IDS.includes(fromChainId) || fromChainId === SYMBIOSIS_BTC_CHAIN_ID
      const isToSupported =
        SYMBIOSIS_CHAIN_IDS.includes(toChainId) || toChainId === SYMBIOSIS_BTC_CHAIN_ID

      if (!isFromSupported || !isToSupported) {
        return []
      }

      const isFromBTC = fromChainId === SYMBIOSIS_BTC_CHAIN_ID
      const isToBTC = toChainId === SYMBIOSIS_BTC_CHAIN_ID

      const swapBody: any = {
        tokenAmountIn: {
          chainId: fromChainId,
          address: request.fromToken,
          amount: request.fromAmount,
          // Real source-token decimals (hardcoding 18 mis-prices 6/8-dec tokens like USDC/WBTC)
          decimals: request.fromTokenDecimals ?? 18,
        },
        tokenOut: {
          chainId: toChainId,
          address: request.toToken,
          // Hint only — Symbiosis resolves real decimals from the address; response is authoritative
          decimals: 18,
        },
        from: request.fromAddress,
        to: request.toAddress || request.fromAddress,
        slippage: (request.slippage || 0.5) * 100,
      }

      // BTC -> Token needs a refund address on the Bitcoin network
      if (isFromBTC && request.fromAddress) {
        swapBody.refundAddress = request.fromAddress
      }
      // Token -> BTC: 'to' is the BTC address
      if (isToBTC && request.toAddress) {
        swapBody.to = request.toAddress
      }

      const response = await fetch(`${SYMBIOSIS_API_BASE}/swap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(swapBody),
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

      // Resolve the REAL dest-token decimals (do NOT trust the echoed 18 hint).
      const resolvedToDecimals =
        (await resolveToTokenDecimals(request, toChainId, data.tokenAmountOut?.decimals)) ?? 18

      // Symbiosis embeds fees in the output. The implied-fee heuristic must use the
      // RESOLVED output decimals (not the echoed 18 hint) or it computes a garbage
      // fee (output reads as ~0 → implied fee ≈ full input).
      const inputAmountRaw = request.fromAmount
      const outputAmountRaw = data.tokenAmountOut.amount

      const inputDecimals = data.tokenAmountIn?.decimals || 18
      const outputDecimals = resolvedToDecimals

      const inputHuman = parseFloat(inputAmountRaw) / Math.pow(10, inputDecimals)
      const outputHuman = parseFloat(outputAmountRaw) / Math.pow(10, outputDecimals)

      const impliedFeeUSD = Math.max(0, inputHuman - outputHuman).toFixed(2)

      // REAL fee from data.fee = (amount / 10^decimals) * priceUsd. The implied
      // heuristic is only a last-resort fallback when data.fee is absent.
      const realFeeUSD = computeSymbiosisFeeUSD(data.fee)
      const bridgeFeeUSD = realFeeUSD ?? impliedFeeUSD
      const priceImpact = data.priceImpact?.toString()

      // Real gas if the response carries one, else '0'. The fee no longer goes here.
      const gasUSD = data.estimatedGas?.toString() || data.tx?.gasPrice?.toString() || '0'

      const approvalAddress = SYMBIOSIS_GATEWAY_MAP[fromChainId as number]

      let chainType: 'evm' | 'bitcoin' = 'evm'
      let isDepositTrade = false
      let depositAddress: string | undefined
      let amountToSend: string | undefined

      if (isFromBTC) {
        chainType = 'bitcoin'
        isDepositTrade = true
        amountToSend = request.fromAmount

        try {
          const forwarderRes = await fetch(`${SYMBIOSIS_BTC_FORWARDER_URL}/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              calldata: data.tx?.data,
              to: data.tx?.to,
              chainId: data.tx?.chainId || 56,
            }),
          })
          if (forwarderRes.ok) {
            const forwarderData = await forwarderRes.json()
            depositAddress = forwarderData.address || forwarderData.depositAddress
          } else {
            console.warn(
              'Symbiosis Forwarder failed, BTC deposit may not work:',
              await forwarderRes.text(),
            )
          }
        } catch (e) {
          console.warn('Symbiosis Forwarder API call failed:', e)
        }

        // Fail loudly: a BTC quote with no deposit address is unexecutable —
        // surfacing it would let the user "pay" with nowhere to send funds.
        if (!depositAddress) {
          console.warn('Symbiosis: BTC source but no deposit address resolved, dropping quote')
          return []
        }
      }

      return [
        {
          provider: 'symbiosis',
          id: data.id || Math.random().toString(36).substring(7),
          fromAmount: request.fromAmount,
          toAmount: data.tokenAmountOut.amount,
          toAmountMin: data.tokenAmountOutMin?.amount || data.tokenAmountOut.amount,
          toTokenDecimals: resolvedToDecimals,
          estimatedGas: gasUSD,
          estimatedDuration: data.estimatedTime || 65,
          transactionRequest: data.tx,
          metadata: {
            chainType,
            isDepositTrade,
            ...(depositAddress ? { depositAddress } : {}),
            ...(amountToSend ? { amountToSend } : {}),
          },
          fees: {
            totalFeeUSD: bridgeFeeUSD,
            bridgeFee: bridgeFeeUSD,
            slippage: priceImpact,
          },
          toolsUsed: ['Symbiosis'],
          routes: [
            {
              type: 'bridge' as const,
              tool: 'symbiosis',
              toolName: 'Symbiosis Bridge',
              action: {
                fromToken: {
                  address: request.fromToken,
                  chainId: request.fromChain,
                  symbol: data.tokenAmountIn?.symbol || 'UNKNOWN',
                  decimals: data.tokenAmountIn?.decimals || 18,
                },
                toToken: {
                  address: request.toToken,
                  chainId: request.toChain,
                  symbol:
                    data.tokenAmountOut?.symbol && data.tokenAmountOut.symbol !== 'tokenOut'
                      ? data.tokenAmountOut.symbol
                      : 'UNKNOWN',
                  decimals: resolvedToDecimals,
                },
                fromAmount: request.fromAmount,
                toAmount: data.tokenAmountOut.amount,
              },
              estimate: {
                executionDuration: data.estimatedTime,
                approvalAddress: approvalAddress,
                feeCosts: [
                  ...(parseFloat(bridgeFeeUSD) > 0
                    ? [
                        {
                          type: 'BRIDGE' as const,
                          name: 'Bridge Fee',
                          description: 'Symbiosis Protocol Fee',
                          amount: bridgeFeeUSD,
                          amountUSD: bridgeFeeUSD,
                          included: true,
                        },
                      ]
                    : []),
                ],
              },
            },
          ],
        },
      ]
    } catch (error) {
      console.error('Symbiosis Quote Error:', error)
      return []
    }
  }

  async getStatus(request: StatusRequest): Promise<StatusResponse> {
    try {
      const response = await fetch(
        `${SYMBIOSIS_API_BASE}/tx/${request.fromChainId}/${request.txHash}`,
      )

      if (!response.ok) return { status: 'NOT_FOUND' }

      const data = await response.json()

      let finalStatus: TransactionStatus = 'PENDING'
      if (data.status === 'success' || data.status === 'completed') finalStatus = 'DONE'
      else if (data.status === 'failed' || data.status === 'reverted') finalStatus = 'FAILED'

      return {
        status: finalStatus,
        subStatus: data.status,
        txLink: data.explorerUrl,
      }
    } catch (error) {
      console.error('Symbiosis Status Error:', error)
      return { status: 'NOT_FOUND' }
    }
  }
}

export const symbiosisProvider = new SymbiosisProvider()
