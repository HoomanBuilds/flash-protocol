import { useState, useCallback, useEffect } from 'react'
import { useWalletClient, usePublicClient, useSwitchChain, useConfig } from 'wagmi'
import { getWalletClient } from '@wagmi/core'
import { executeRoute, Route, createConfig, EVM } from '@lifi/sdk'
import { RangoClient } from 'rango-sdk-basic'
import { QuoteResponse } from '@/types/provider'
import { OneClickService, OpenAPI } from '@defuse-protocol/one-click-sdk-typescript'
import { parseAbi } from 'viem'

OpenAPI.BASE = 'https://1click.chaindefuser.com'

// Initialize Rango Client
const RANGO_API_KEY = process.env.NEXT_PUBLIC_RANGO_API_KEY || 'c6381a79-2817-4602-83bf-6a641a409e32' 
const rangoClient = new RangoClient(RANGO_API_KEY)

const erc20Abi = parseAbi([
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
])

// Define Rango Enums locally to avoid import issues
enum TransactionStatus {
  FAILED = 'FAILED',
  SUCCESS = 'SUCCESS',
  RUNNING = 'RUNNING'
}

enum TransactionType {
  EVM = 'EVM',
  TRANSFER = 'TRANSFER',
  COSMOS = 'COSMOS',
  SOLANA = 'SOLANA',
  TRON = 'TRON',
  STARKNET = 'STARKNET',
  TON = 'TON'
}

export type ExecutorStatus = 'idle' | 'approving' | 'executing' | 'completed' | 'failed'

export function useTransactionExecutor() {
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  const { switchChainAsync } = useSwitchChain()
  const config = useConfig()
  
  const [status, setStatus] = useState<ExecutorStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [step, setStep] = useState<string>('')

  // Configure LI.FI SDK when wallet is available
  useEffect(() => {
    if (walletClient) {
      createConfig({
        integrator: 'payment-gateway',
        providers: [
          EVM({
            getWalletClient: () => Promise.resolve(walletClient),
            switchChain: async (chainId) => {
              await switchChainAsync({ chainId })
              const client = await getWalletClient(config, { chainId })
              return client
            }
          })
        ]
      })
    }
  }, [walletClient, switchChainAsync])

  const executeLifi = useCallback(async (route: Route) => {
    if (!walletClient) throw new Error('Wallet not connected')
    
    setStatus('executing')
    setStep('Executing LI.FI Route...')
    
    try {
      // Execute route (signer is handled by global config)
      const executedRoute = await executeRoute(route)

      // The SDK returns the completed route. We extract the final TX hash from the last step.
      const lastStep = executedRoute.steps[executedRoute.steps.length - 1]
      const finalTx = lastStep.execution?.process.find(p => p.type === 'CROSS_CHAIN' || p.type === 'SWAP')?.txHash
      
      if (finalTx) {
        setTxHash(finalTx)
        setStatus('completed')
        return finalTx
      } else {
         // Fallback if SDK doesn't return explicit hash in expected place
         setStatus('completed')
         return '0x' 
      }
    } catch (e: any) {
      console.error('LI.FI Execution Error:', e)
      setError(e.message || 'LI.FI Execution Failed')
      setStatus('failed')
      throw e
    }
  }, [walletClient])

  const executeNearIntents = useCallback(async (quote: QuoteResponse) => {
    if (!walletClient) throw new Error('Wallet not connected')
    
    setStatus('executing')
    setStep('Executing Near Intents Deposit...')

    try {
      // 1. Extract Deposit Address
      const depositAddress = quote.transactionRequest?.depositAddress || quote.metadata?.depositAddress
      if (!depositAddress) throw new Error('Deposit address missing for Near Intents')

      const amount = BigInt(quote.fromAmount)
      const fromToken = quote.routes[0]?.action.fromToken

      let hash: `0x${string}`

      // 2. Send Transaction (Native vs ERC20)
      if (fromToken.address === '0x0000000000000000000000000000000000000000') {
         // Native Transfer
         hash = await walletClient.sendTransaction({
            to: depositAddress as `0x${string}`,
            value: amount
         })
      } else {
         // ERC20 Transfer
         hash = await walletClient.writeContract({
            address: fromToken.address as `0x${string}`,
            abi: erc20Abi,
            functionName: 'transfer',
            args: [depositAddress as `0x${string}`, amount]
         })
      }

      setTxHash(hash)
      setStep('Submitting Transaction Hash...')

      // 3. Submit Hash to Solver Network
      try {
        await OneClickService.submitDepositTx({
            txHash: hash,
            depositAddress
        })
      } catch (e) {
        console.warn('Failed to submit tx hash to Near Intents:', e)
        // Non-blocking error, solver will find it eventually
      }

      setStatus('completed')
      return hash

    } catch (e: any) {
      console.error('Near Intents Execution Error:', e)
      setError(e.message || 'Near Intents Execution Failed')
      setStatus('failed')
      throw e
    }
  }, [walletClient])

  const executeRango = useCallback(async (quote: QuoteResponse, recipientAddress?: string) => {
    if (!walletClient || !publicClient) throw new Error('Wallet not connected')
    const params = quote.metadata?.rangoParams as any
    if (!params) throw new Error('Rango params missing from quote metadata')

    try {
      // 1. Prepare Swap Request
      // Rango expects the full params again for the swap
      const swapRequest = {
        ...params,
        fromAddress: walletClient.account.address,
        toAddress: recipientAddress || walletClient.account.address,
        slippage: params.slippage || 1.0,
        disableEstimate: false
      }

      setStep('Requesting Swap Transaction...')
      setStatus('approving')

      // 2. Call Swap API (Step 1)
      // We pass the full request to get the tx data
      const swapResponse = await rangoClient.swap(swapRequest)

      if (swapResponse.error) throw new Error(swapResponse.error)
      
      const requestId = swapResponse.requestId
      let tx = swapResponse.tx
      
      if (!tx) throw new Error('Failed to get transaction data from Rango')

      // 3. Handle Approval if present
      // @ts-ignore - Local enum matching
      if (tx.type === TransactionType.EVM && tx.approveData && tx.approveTo) {
        setStep('Approving Token...')
        const approveHash = await walletClient.sendTransaction({
          to: tx.approveTo as `0x${string}`,
          data: tx.approveData as `0x${string}`,
        })

        setStep('Waiting for Approval...')
        await publicClient.waitForTransactionReceipt({ hash: approveHash })
        
        // Loop check isApproved from Rango
        let isApproved = false
        while (!isApproved) {
            await new Promise(r => setTimeout(r, 3000))
            const check = await rangoClient.isApproved(requestId, approveHash)
            if (check.isApproved) isApproved = true
        }

      }

      // 4. Execute Main Swap
      setStep('Executing Swap...')
      setStatus('executing')
      
      // @ts-ignore
      if (tx.type !== TransactionType.EVM) throw new Error('Only EVM transactions supported')

      const hash = await walletClient.sendTransaction({
        to: tx.txTo as `0x${string}`,
        data: tx.txData as `0x${string}`,
        value: tx.value ? BigInt(tx.value) : BigInt(0),
      })

      setTxHash(hash)
      setStep('Waiting for Confirmation...')
      
      // 5. Poll Status
      let finished = false
      while (!finished) {
          await new Promise(r => setTimeout(r, 5000))
          const statusRes = await rangoClient.status({ requestId, txId: hash })
          // @ts-ignore
          if (statusRes.status === TransactionStatus.SUCCESS || statusRes.status === TransactionStatus.FAILED) {
              finished = true
              // @ts-ignore
              if (statusRes.status === TransactionStatus.FAILED) {
                  throw new Error('Rango Transaction Failed on-chain')
              }
          }
      }

      setStatus('completed')
      return hash

    } catch (e: any) {
      console.error('Rango Execution Error:', e)
      setError(e.message || 'Rango Execution Failed')
      setStatus('failed')
      throw e
    }
  }, [walletClient, publicClient])

  // Main Entry Point
  const execute = useCallback(async (quote: QuoteResponse, recipientAddress?: string) => {
    setError(null)
    setTxHash(null)
    
    try {
      if (quote.provider === 'lifi') {
        const route = (quote.metadata?.lifiRoute as Route) || quote.routes[0] || quote.transactionRequest
        return await executeLifi(route) 
      } 
      else if (quote.provider === 'rango') {
        return await executeRango(quote, recipientAddress)
      }
      else if (quote.provider === 'near-intents') {
        return await executeNearIntents(quote)
      }
      else {
        // Atomic Providers (Symbiosis, Rubic)
        if (!quote.transactionRequest) throw new Error('No transaction request found')
        
        if (!walletClient || !publicClient) throw new Error('Wallet not connected')

        // 1. Handle Approvals if needed
        const approvalAddress = quote.routes[0]?.estimate?.approvalAddress
        if (approvalAddress && quote.routes[0]?.action?.fromToken?.address !== '0x0000000000000000000000000000000000000000') {
           const tokenAddress = quote.routes[0].action.fromToken.address as `0x${string}`
           const amount = BigInt(quote.fromAmount)
           
           try {
             // Check allowance
             const allowance = await publicClient.readContract({
               address: tokenAddress,
               abi: erc20Abi,
               functionName: 'allowance',
               args: [walletClient.account.address, approvalAddress as `0x${string}`]
             }) as bigint

             if (allowance < amount) {
               setStep('Approving Token...')
               setStatus('approving')
               const approveHash = await walletClient.writeContract({
                 address: tokenAddress,
                 abi: erc20Abi,
                 functionName: 'approve',
                 args: [approvalAddress as `0x${string}`, amount]
               })
               
               setStep('Waiting for Approval...')
               await publicClient.waitForTransactionReceipt({ hash: approveHash })
             }
           } catch (e) {
             console.warn('Approval check failed, proceeding to tx (might fail):', e)
           }
        }
        
        setStatus('executing')
        setStep('Sending Transaction...')
        
        const hash = await walletClient.sendTransaction({
          to: quote.transactionRequest.to as `0x${string}`,
          data: quote.transactionRequest.data as `0x${string}`,
          value: BigInt(quote.transactionRequest.value || 0),
        })
        
        setTxHash(hash)
        setStatus('completed')
        return hash
      }
    } catch (e: any) {
       setError(e.message)
       setStatus('failed')
       throw e
    }
  }, [executeLifi, executeRango, executeNearIntents, walletClient])

  return { execute, status, error, txHash, step }
}
