import { getTokenConfigsForUnclaimedData, type TokenConfig } from './client';
import { getCompoundTokenConfigs, type CompoundTokenConfig } from './compound-subgraph';
import { getMorphoTokenConfigs, type MorphoTokenConfig } from './morpho-subgraph';

// Re-export TokenConfig and CompoundTokenConfig for use in other components
export type { TokenConfig } from './client';
export type { CompoundTokenConfig } from './compound-subgraph';

// Type alias for protocol selection - matches Solidity Protocol enum
export type ProtocolType = 'AAVE' | 'COMPOUND' | 'FLUID' | 'MORPHO' | 'SPARK' | 'MAPPLE' | 'GEARBOX';

// Union type for protocol-specific token configs
export type ProtocolTokenConfig = TokenConfig | CompoundTokenConfig | MorphoTokenConfig;

// Map protocol name to enum value (matches Solidity Protocol enum)
export const getProtocolEnum = (protocol: ProtocolType): number => {
  const protocolMap: Record<ProtocolType, number> = {
    'AAVE': 0,
    'COMPOUND': 1,
    'FLUID': 2,
    'MORPHO': 3,
    'SPARK': 4,
    'MAPPLE': 5,
    'GEARBOX': 6,
  };
  return protocolMap[protocol];
};

// Protocol metadata including display names and image paths
interface ProtocolMetadata {
  displayName: string;
  image: string;
  description?: string;
}

export const getProtocolMetadata = (protocol: ProtocolType): ProtocolMetadata => {
  const protocolMetadata: Record<ProtocolType, ProtocolMetadata> = {
    'AAVE': {
      displayName: 'Aave',
      image: '/img/AAVE.png',
      description: 'The world\'s largest liquidity protocol',
    },
    'COMPOUND': {
      displayName: 'Compound',
      image: '/img/comp.png',
      description: 'Automated lending protocol',
    },
    'FLUID': {
      displayName: 'Fluid',
      image: '/img/fluid.jpeg',
      description: 'Financial system of the future',
    },
    'MORPHO': {
      displayName: 'Morpho',
      image: '/img/morpho-logo.png',
      description: 'Universal lending network',
    },
    'SPARK': {
      displayName: 'Spark',
      image: '/img/spark.png',
      description: 'DeFi infrastructure',
    },
    'MAPPLE': {
      displayName: 'Mapple Finance',
      image: '/img/mapple.png',
      description: 'Institutional lending',
    },
    'GEARBOX': {
      displayName: 'Gearbox',
      image: '/img/gearbox.png',
      description: 'Leverage protocol',
    },
  };
  return protocolMetadata[protocol];
};

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
export let tokensToProve: ProtocolTokenConfig[] = [];

// Function to load token configs from subgraph for a specific user
// Returns Aave TokenConfig[] or Compound CompoundTokenConfig[] based on protocol
export const loadTokensToProve = async (
  userAddress: string, 
  currentChainId?: number, 
  controllerAddress?: string,
  protocol: ProtocolType = 'AAVE'
): Promise<ProtocolTokenConfig[]> => {
  try {
    console.log(`Loading token configs for user: ${userAddress}, protocol: ${protocol}`);
    
    if (protocol === 'COMPOUND') {
      // Load Compound token configs (keep as CompoundTokenConfig)
      const compoundConfigs = await getCompoundTokenConfigs(userAddress, currentChainId, controllerAddress);
      tokensToProve = compoundConfigs;
      console.log(`Loaded ${tokensToProve.length} Compound token configs:`, tokensToProve);
    } else if (protocol === 'MORPHO') {
      const morphoConfigs = await getMorphoTokenConfigs(userAddress, currentChainId, controllerAddress);
      tokensToProve = morphoConfigs;
      console.log(`Loaded ${tokensToProve.length} Morpho token configs:`, tokensToProve);
    } else {
      // Load Aave token configs (keep as TokenConfig)
      const aaveConfigs = await getTokenConfigsForUnclaimedData(userAddress, currentChainId, controllerAddress);
      tokensToProve = aaveConfigs;
      console.log(`Loaded ${tokensToProve.length} Aave token configs:`, tokensToProve);
    }
    
    return tokensToProve;
  } catch (error) {
    console.error('Error loading token configs:', error);
    // Fallback to empty array or predefined configs if needed
    tokensToProve = [];
    return tokensToProve;
  }
};

// Get current token configs (for backward compatibility)
export const getTokensToProve = (): ProtocolTokenConfig[] => {
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

export const parseProverResult = (proverResult: string) => {
  const parsed = JSON.parse(proverResult) as [
    unknown,
    `0x${string}`,
    `0x${string}`, // bytes4 selector
    `0x${string}`, // bytes encodedData
  ];
  
  return {
    proof: parsed[0],
    claimer: parsed[1],
    selector: parsed[2],
    encodedData: parsed[3],
  };
};
