import { useEffect, useRef, useState } from "react";
import { useAccount, useConnectorClient } from "wagmi";
import {
  createViemAdapterFromProvider,
  type ViemAdapter,
} from "@circle-fin/adapter-viem-v2";

export function useEvmAdapter() {
  const { address } = useAccount();
  const { data: client } = useConnectorClient();
  const [adapter, setAdapter] = useState<ViemAdapter | null>(null);

  const lastProviderRef = useRef<any>(null);
  const lastAddressRef = useRef<string | null>(null);

  function pickProvider(): any | null {
    const provider = (client as any)?.transport?.value?.provider;
    if (provider) return provider;

    const eth = (globalThis as any)?.ethereum;
    if (!eth) return null;
    if (Array.isArray(eth.providers) && eth.providers.length > 0) {
      return eth.providers[0];
    }
    return eth;
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Don't check for provider until we have an address (wallet connected)
      if (!address) {
        if (!cancelled) {
          setAdapter(null);
          lastProviderRef.current = null;
          lastAddressRef.current = null;
        }
        return;
      }

      const provider = pickProvider();
      if (!provider) {
        if (!cancelled) {
          setAdapter(null);
          lastProviderRef.current = null;
          lastAddressRef.current = null;
        }
        return;
      }

      const providerChanged = provider !== lastProviderRef.current;
      if (providerChanged) {
        const adapter = await createViemAdapterFromProvider({ provider });
        if (!cancelled) {
          setAdapter(adapter);
          lastProviderRef.current = provider;
        }
      }
      if (!cancelled) {
        lastAddressRef.current = address;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [client, address]);

  return { evmAdapter: adapter, evmAddress: address ?? null };
}
