export type ChainId = number

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
}

export interface FeeCost {
  type: 'BRIDGE' | 'PROTOCOL' | 'LP' | 'GAS' | 'SLIPPAGE' | 'OTHER'
  name: string 
  amount: string 
  amountUSD: string 
  token?: Token
  percentage?: number 
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
  routes: QuoteStep[]
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
  metadata?: Record<string, any>  
}

export interface StatusRequest {
  txHash: string
  fromChainId: ChainId
  toChainId: ChainId
  bridge?: string 
  requestId?: string 
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
