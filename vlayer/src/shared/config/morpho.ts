// Centralized Morpho protocol configuration

import { createPublicClient, http } from 'viem';
import { optimismSepolia, mainnet, base, baseSepolia, optimism } from 'viem/chains';

// Morpho subgraph configuration by chain ID
export const MORPHO_SUBGRAPH_IDS: Record<number, string> = {
  10: '', // OP mainnet (no data yet)
  8453: '71ZTy1veF9twER9CLMnPWeLQ7GZcwKsjmygejrgKirqs', // Base mainnet
  1: '', // Ethereum mainnet (no data yet)
  11155420: '', // OP Sepolia (add if available)
  84532: '', // Base Sepolia (add if available)
};

// Legacy: default to Base for backwards compatibility
export const MORPHO_SUBGRAPH_ID = MORPHO_SUBGRAPH_IDS[8453];

export const getMorphoSubgraphUrl = (chainId?: number): string => {
  const apiKey = import.meta.env.VITE_SUBGRAPH_API_KEY ?? '';
  if (chainId && MORPHO_SUBGRAPH_IDS[chainId]) {
    console.log(`Using Morpho subgraph for chain ${chainId}`);
    return `https://gateway.thegraph.com/api/${apiKey}/subgraphs/id/${MORPHO_SUBGRAPH_IDS[chainId]}`;
  }
  console.warn(`No Morpho subgraph configured for chain ${chainId}, falling back to Base`);
  return `https://gateway.thegraph.com/api/${apiKey}/subgraphs/id/${MORPHO_SUBGRAPH_ID}`;
};

// Morpho contract address by chain (Base provided)
export const MORPHO_ADDRESS_BY_CHAIN: Record<number, `0x${string}`> = {
  8453: '0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb',
};

export const getMorphoAddressForChain = (chainId?: number): `0x${string}` | null => {
  if (!chainId) return null;
  return MORPHO_ADDRESS_BY_CHAIN[chainId] ?? null;
};

// Reuse RPC clients
export const rpcClients = {
  [optimismSepolia.id]: createPublicClient({ chain: optimismSepolia, transport: http(optimismSepolia.rpcUrls.default.http[0]) }),
  [mainnet.id]: createPublicClient({ chain: mainnet, transport: http(mainnet.rpcUrls.default.http[0]) }),
  [base.id]: createPublicClient({ chain: base, transport: http(base.rpcUrls.default.http[0]) }),
  [baseSepolia.id]: createPublicClient({ chain: baseSepolia, transport: http(baseSepolia.rpcUrls.default.http[0]) }),
  [optimism.id]: createPublicClient({ chain: optimism, transport: http(optimism.rpcUrls.default.http[0]) })
};


