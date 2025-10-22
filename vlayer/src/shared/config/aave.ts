// Centralized Aave protocol configuration

// Aave subgraph configuration by chain ID
export const AAVE_SUBGRAPH_IDS: Record<number, string> = {
  10: 'DSfLz8oQBUeU5atALgUFQKMTSYV9mZAVYp4noLSXAfvb', // OP mainnet
  8453: 'GQFbb95cE6d8mV989mL5figjaGaKCQB3xqYrr1bRyXqF', // BASE mainnet
  1: '8wR23o4zkp4wUPk2yeExFkjSu9SFzLb8KKmR8mLQ8dNZ', // Ethereum mainnet (example, update if needed)
  11155420: '', // OP Sepolia (add if available)
  84532: '', // Base Sepolia (add if available)
};

// Legacy: default to Base for backwards compatibility
export const AAVE_SUBGRAPH_ID = AAVE_SUBGRAPH_IDS[8453];

export const getAaveSubgraphUrl = (chainId?: number): string => {
  const apiKey = import.meta.env.VITE_SUBGRAPH_API_KEY ?? '';
  
  // If chainId provided, use the specific subgraph for that chain
  if (chainId && AAVE_SUBGRAPH_IDS[chainId]) {
    console.log(`Using Aave subgraph for chain ${chainId}`);
    return `https://gateway.thegraph.com/api/${apiKey}/subgraphs/id/${AAVE_SUBGRAPH_IDS[chainId]}`;
  }
  
  // Fallback to Base mainnet
  console.warn(`No Aave subgraph configured for chain ${chainId}, falling back to Base`);
  return `https://gateway.thegraph.com/api/${apiKey}/subgraphs/id/${AAVE_SUBGRAPH_ID}`;
};


