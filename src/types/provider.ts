export type ChainId = number | string

export interface Token {
  address: string
  chainId: ChainId
  symbol: string
  decimals: number
}

export interface QuoteRequest {
  fromChain: ChainId
  toChain: ChainId
  fromToken: string 
  toToken: string   
  fromAmount: string 
  fromAddress: string 
  toAddress?: string  
  slippage?: number
  fromTokenDecimals?: number // Required for Rubic
  /** Authoritative destination-token decimals — used to rank quotes fairly
   *  (a provider that mislabels the dest token's decimals can't win). */
  toTokenDecimals?: number
}

export interface FeeCost {
  type: 'BRIDGE' | 'PROTOCOL' | 'LP' | 'GAS' | 'SLIPPAGE' | 'OTHER'
  name: string 
  description?: string
  amount: string 
  amountUSD: string 
  token?: Token
  percentage?: number 
  included?: boolean // true if deducted from output, false if paid on top
}

export interface QuoteStep {
  type: 'swap' | 'bridge' | 'cross' | 'custom'
  tool: string 
  toolName?: string 
  toolLogoURI?: string
  action: {
    fromToken: Token
    toToken: Token
    fromAmount: string
    toAmount: string
  }
  estimate: {
    approvalAddress?: string
    executionDuration?: number 
    gasCosts?: {
      amount: string
      amountUSD?: string
      token: Token
    }[]
    feeCosts?: FeeCost[]
  }
}

export interface QuoteResponse {
  provider: string
  id: string
  fromAmount: string
  toAmount: string
  toAmountMin: string
  estimatedGas: string
  estimatedDuration: number
  /** REAL decimals of the destination token. Providers MUST set this from the
   *  live response (never hardcode). Used to normalize toAmount for fair ranking. */
  toTokenDecimals?: number
  /** OPTIONAL refinement — USD price of 1 whole destination token (only some providers expose it). */
  toTokenPriceUSD?: number
  /** OPTIONAL — provider-supplied USD value of the output (LiFi/NEAR have it; Rubic/Symbiosis do not). */
  toAmountUSD?: string
  routes: QuoteStep[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  transactionRequest?: any 
  bridgeFee?: string        
  bridgeFeeUSD?: string     
  fees?: {
    totalFeeUSD: string 
    bridgeFee?: string 
    lpFee?: string 
    gasCost?: string 
    slippage?: string 
  }
  toolsUsed?: string[] 
  metadata?: {
    chainType?: 'evm' | 'solana' | 'bitcoin' | 'other'
    isDepositTrade?: boolean
    depositAddress?: string
    depositMemo?: string
    amountToSend?: string
    [key: string]: unknown
  }
}

export interface StatusRequest {
  txHash: string
  fromChainId: ChainId
  toChainId: ChainId
  bridge?: string
  requestId?: string
  depositAddress?: string
  /** Memo/tag for deposit chains that require it (NEAR Intents status lookup). */
  depositMemo?: string
}

export type TransactionStatus = 'PENDING' | 'DONE' | 'FAILED' | 'NOT_FOUND'

export interface StatusResponse {
  status: TransactionStatus
  subStatus?: string
  txLink?: string
}

export interface IProvider {
  name: string
  getQuote(request: QuoteRequest): Promise<QuoteResponse[]>
  getStatus(request: StatusRequest): Promise<StatusResponse>
}
