// Centralized Compound protocol configuration

// cWETH v3 market addresses by chain
// 1    - Ethereum Mainnet
// 10   - Optimism Mainnet
// 8453 - Base Mainnet
export const CWETH_V3_BY_CHAIN: Record<number, `0x${string}`> = {
  1: '0xA17581A9E3356d9A858b789D68B4d866e593aE94',
  10: '0xE36A30D249f7761327fd973001A32010b521b6Fd',
  8453: '0x46e6b214b524310239732D51387075E0e70970bf',
};

export const getCwethAddressForChain = (chainId?: number): `0x${string}` | null => {
  if (!chainId) return null;
  return CWETH_V3_BY_CHAIN[chainId] ?? null;
};

// WETH resolver (via token decimals registry)
import { TOKEN_DECIMALS } from '../utils/tokenDecimals';
import { createPublicClient, http } from 'viem';
import { optimismSepolia, mainnet, base, baseSepolia, optimism } from 'viem/chains';

export const WETH_MAINNET: `0x${string}` = (Object.values(TOKEN_DECIMALS).find(
  token => token.symbol === 'WETH' && token.chainId === 1
)?.address as `0x${string}`) || '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';

export const getWethAddressForChain = (chainId?: number): `0x${string}` => {
  if (!chainId) return WETH_MAINNET;
  const match = Object.values(TOKEN_DECIMALS).find(
    token => token.symbol === 'WETH' && token.chainId === chainId
  );
  return (match?.address as `0x${string}`) || WETH_MAINNET;
};

// Compound subgraph configuration by chain ID
export const COMPOUND_SUBGRAPH_IDS: Record<number, string> = {
  10: 'FhHNkfh5z6Z2WCEBxB6V3s8RPxnJfWZ9zAfM5bVvbvbb', // OP mainnet
  8453: '2hcXhs36pTBDVUmk5K2Zkr6N4UYGwaHuco2a6jyTsijo', // Base mainnet
  1: '', // Ethereum mainnet (add if available)
  11155420: '', // OP Sepolia (add if available)
  84532: '', // Base Sepolia (add if available)
};

// Legacy: default to Base for backwards compatibility
export const COMPOUND_SUBGRAPH_ID = COMPOUND_SUBGRAPH_IDS[8453];

export const getCompoundSubgraphUrl = (chainId?: number): string => {
  const apiKey = import.meta.env.VITE_SUBGRAPH_API_KEY ?? '';
  
  // If chainId provided, use the specific subgraph for that chain
  if (chainId && COMPOUND_SUBGRAPH_IDS[chainId]) {
    console.log(`Using Compound subgraph for chain ${chainId}`);
    return `https://gateway.thegraph.com/api/${apiKey}/subgraphs/id/${COMPOUND_SUBGRAPH_IDS[chainId]}`;
  }
  
  // Fallback to Base mainnet
  console.warn(`No Compound subgraph configured for chain ${chainId}, falling back to Base`);
  return `https://gateway.thegraph.com/api/${apiKey}/subgraphs/id/${COMPOUND_SUBGRAPH_ID}`;
};

// RPC client configuration for different chains
export const rpcClients = {
  [optimismSepolia.id]: createPublicClient({
    chain: optimismSepolia,
    transport: http(optimismSepolia.rpcUrls.default.http[0])
  }),
  [mainnet.id]: createPublicClient({
    chain: mainnet,
    transport: http(mainnet.rpcUrls.default.http[0])
  }),
  [base.id]: createPublicClient({
    chain: base,
    transport: http(base.rpcUrls.default.http[0])
  }),
  [baseSepolia.id]: createPublicClient({
    chain: baseSepolia,
    transport: http(baseSepolia.rpcUrls.default.http[0])
  }),
  [optimism.id]: createPublicClient({
    chain: optimism,
    transport: http(optimism.rpcUrls.default.http[0])
  })
};


