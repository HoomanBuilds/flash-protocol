import { useState } from "react";
import { BridgeKit, type BridgeResult, type BridgeParams as BridgeKitParams, type EstimateResult } from "@circle-fin/bridge-kit";
import type { ViemAdapter } from "@circle-fin/adapter-viem-v2";
// import type { SolanaAdapter } from "@circle-fin/adapter-solana"; // Solana not used currently

export type SupportedChain = string;

export interface BridgeParams {
  fromChain: SupportedChain;
  toChain: SupportedChain;
  amount: string;
  recipientAddress?: string;
  fromAdapter: ViemAdapter; // | SolanaAdapter;
  toAdapter: ViemAdapter; // | SolanaAdapter;
}

export function useCCTPBridge() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<BridgeResult | null>(null);
  
  const [isEstimating, setIsEstimating] = useState(false);
  const [estimateError, setEstimateError] = useState<string | null>(null);
  const [estimateData, setEstimateData] = useState<EstimateResult | null>(null);

  function clear() {
    setError(null);
    setData(null);
    setIsLoading(false);
    setEstimateError(null);
    setEstimateData(null);
    setIsEstimating(false);
  }

  async function bridge(
    params: BridgeParams,
    options?: { onEvent?: (_evt: Record<string, unknown>) => void }
  ) {
    setIsLoading(true);
    setError(null);
    setData(null);

    try {
      const kit = new BridgeKit();
      const handler = (payload: Record<string, unknown>) => options?.onEvent?.(payload);
      kit.on("*", handler);

      try {
        const bridgeParams: BridgeKitParams = {
          from: { 
            adapter: params.fromAdapter, 
            chain: params.fromChain as BridgeKitParams['from']['chain']
          },
          to: params.recipientAddress 
            ? { 
                adapter: params.toAdapter, 
                chain: params.toChain as BridgeKitParams['to']['chain'],
                recipientAddress: params.recipientAddress
              }
            : { 
                adapter: params.toAdapter, 
                chain: params.toChain as BridgeKitParams['to']['chain']
              },
          amount: params.amount,
        };
        
        const result = await kit.bridge(bridgeParams);

        setData(result);
        return { ok: true, data: result };
      } finally {
        kit.off("*", handler);
      }
    } catch (error: unknown) {
      console.error("CCTP Bridge Error:", error);
      const message = error instanceof Error ? error.message : "Bridge failed";
      setError(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }

  async function retry(
    failedResult: BridgeResult,
    params: BridgeParams,
    options?: { onEvent?: (_evt: Record<string, unknown>) => void }
  ) {
    setIsLoading(true);
    setError(null);

    try {
      const kit = new BridgeKit();
      const handler = (payload: Record<string, unknown>) => options?.onEvent?.(payload);
      kit.on("*", handler);

      try {
        const result = await kit.retry(failedResult, {
          from: params.fromAdapter,
          to: params.toAdapter,
        });

        setData(result);
        return { ok: true, data: result };
      } finally {
        kit.off("*", handler);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Retry failed";
      setError(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }

  return { 
    bridge, 
    retry, 
    isLoading, 
    error, 
    data, 
    clear 
  };
}
