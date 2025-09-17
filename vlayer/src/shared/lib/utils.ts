import { getTokenConfigsForUser, type TokenConfig } from './client';

// Re-export TokenConfig for use in other components
export type { TokenConfig } from './client';

export const shortenAndFormatHash = (hash: string | null) =>
  hash ? `${hash.slice(0, 4)}...${hash.slice(-4)}` : ""; // 0x00...012 instead of long hash

const chainIdToName = {
  "1": "Ethereum Mainnet",
  "10": "Optimism Mainnet",
  "8453": "Base Mainnet",
  "84532": "Base Sepolia",
  "11155111": "Ethereum Sepolia",
  "11155420": "OP Sepolia",
  "31338": "Anvil#2",
  "31337": "Anvil#1",
} as const;

export const getChainName = (chainId: string): string => {
  return (
    chainIdToName[chainId as keyof typeof chainIdToName] || `Chain ${chainId}`
  );
};

// Dynamic token configuration - will be populated from subgraph data
export let tokensToProve: TokenConfig[] = [];

// Function to load token configs from subgraph for a specific user
export const loadTokensToProve = async (userAddress: string, currentChainId?: number): Promise<TokenConfig[]> => {
  try {
    console.log(`Loading token configs for user: ${userAddress}`);
    tokensToProve = await getTokenConfigsForUser(userAddress, currentChainId);
    console.log(`Loaded ${tokensToProve.length} token configs:`, tokensToProve);
    return tokensToProve;
  } catch (error) {
    console.error('Error loading token configs:', error);
    // Fallback to empty array or predefined configs if needed
    tokensToProve = [];
    return tokensToProve;
  }
};

// Get current token configs (for backward compatibility)
export const getTokensToProve = (): TokenConfig[] => {
  return tokensToProve;
};

// Fallback to predefined configs if dynamic loading fails
export const getFallbackTokensToProve = (): TokenConfig[] => {
  try {
    return JSON.parse(
      import.meta.env.VITE_TOKENS_TO_CHECK || '[]',
    ) as TokenConfig[];
  } catch {
    return [];
  }
};

export const parseProverResult = (proverResult: string) =>
  JSON.parse(proverResult) as [
    unknown,
    `0x${string}`,
    { addr: string; chainId: string; blockNumber: string; balance: string }[],
  ];
