// Centralized Aave protocol configuration

// Aave subgraph configuration
export const AAVE_SUBGRAPH_ID = 'DSfLz8oQBUeU5atALgUFQKMTSYV9mZAVYp4noLSXAfvb';

export const getAaveSubgraphUrl = (): string => {
  const apiKey = import.meta.env.VITE_SUBGRAPH_API_KEY ?? '';
  return `https://gateway.thegraph.com/api/${apiKey}/subgraphs/id/${AAVE_SUBGRAPH_ID}`;
};


