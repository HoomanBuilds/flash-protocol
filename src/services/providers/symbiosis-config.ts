import { SYMBIOSIS_CONFIG } from './symbiosis-data';

export const SYMBIOSIS_GATEWAY_MAP: Record<number, string> = {};

SYMBIOSIS_CONFIG.chains.forEach(chain => {
  if (chain.metaRouterGateway && chain.metaRouterGateway !== '0x0000000000000000000000000000000000000000') {
    SYMBIOSIS_GATEWAY_MAP[chain.id] = chain.metaRouterGateway;
  }
});
 

export const SYMBIOSIS_CHAIN_IDS = Object.keys(SYMBIOSIS_GATEWAY_MAP).map(Number);
