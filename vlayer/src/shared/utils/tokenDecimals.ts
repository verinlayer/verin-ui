// Token decimal mappings for consistent handling across the application
// This file centralizes token decimal information to avoid duplication

export interface TokenDecimalInfo {
  address: string;
  decimals: number;
  symbol: string;
  name: string;
  chainId: number;
}

// Comprehensive token decimal mappings
export const TOKEN_DECIMALS: Record<string, TokenDecimalInfo> = {
  // USDT tokens (6 decimals)
  '0xd7bfa30ca5cbb252f228ab6ba3b1b2814d752081': {
    address: '0xd7bfa30ca5cbb252f228ab6ba3b1b2814d752081',
    decimals: 6,
    symbol: 'USDT',
    name: 'Tether USD',
    chainId: 11155420, // Optimism Sepolia
  },
  '0xdac17f958d2ee523a2206206994597c13d831ec7': {
    address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    decimals: 6,
    symbol: 'USDT',
    name: 'Tether USD',
    chainId: 1, // Ethereum Mainnet
  },
  '0x94b008aa00579c1307b0ef2c499ad98a8ce58e58': {
    address: '0x94b008aa00579c1307b0ef2c499ad98a8ce58e58',
    decimals: 6,
    symbol: 'USDT',
    name: 'Tether USD',
    chainId: 10, // Optimism
  },

  // USDC tokens (6 decimals)
  '0x64dff24d36d68583766aeeed77f05ea6d9f399378': {
    address: '0x64dff24d36d68583766aeeed77f05ea6d9f399378',
    decimals: 6,
    symbol: 'USDC',
    name: 'USD Coin',
    chainId: 11155420, // Optimism Sepolia
  },
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': {
    address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    decimals: 6,
    symbol: 'USDC',
    name: 'USD Coin',
    chainId: 1, // Ethereum Mainnet
  },
  '0x7f5c764cbc14f9669b88837ca1490cca17c31607': {
    address: '0x7f5c764cbc14f9669b88837ca1490cca17c31607',
    decimals: 6,
    symbol: 'USDC',
    name: 'USD Coin',
    chainId: 10, // Optimism
  },
  '0x0b2c639c533813f4aa9d7837caf62653d097ff85': {
    address: '0x0b2c639c533813f4aa9d7837caf62653d097ff85',
    decimals: 6,
    symbol: 'USDC',
    name: 'USD Coin',
    chainId: 10, // Optimism (Circle's native USDC)
  },
  '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': {
    address: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
    decimals: 6,
    symbol: 'USDC',
    name: 'USD Coin',
    chainId: 8453, // Base Mainnet
  },
  
  // Base Mainnet tokens
  // Note: WETH uses same address as Optimism (0x4200...0006), using chain-agnostic approach
  '0x50c5725949a6f0c72e6c4a641f24049a917db0cb': {
    address: '0x50c5725949a6f0c72e6c4a641f24049a917db0cb',
    decimals: 18,
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    chainId: 8453, // Base Mainnet
  },
  '0xd9aaec86b65d86f6a7b5b1b0c42ffa531710b6ca': {
    address: '0xd9aaec86b65d86f6a7b5b1b0c42ffa531710b6ca',
    decimals: 6,
    symbol: 'USDbC',
    name: 'USD Base Coin',
    chainId: 8453, // Base Mainnet (bridged USDC)
  },
  '0x2ae3f1ec7f1f5012cfeab0185bfc7aa3cf0dec22': {
    address: '0x2ae3f1ec7f1f5012cfeab0185bfc7aa3cf0dec22',
    decimals: 8,
    symbol: 'cbETH',
    name: 'Coinbase Wrapped Staked ETH',
    chainId: 8453, // Base Mainnet
  },
  '0xc1cba3fcea344f92d9239c08c0568f6f2f0ee452': {
    address: '0xc1cba3fcea344f92d9239c08c0568f6f2f0ee452',
    decimals: 8,
    symbol: 'wstETH',
    name: 'Wrapped liquid staked Ether 2.0',
    chainId: 8453, // Base Mainnet
  },
  
  // 18-decimal tokens
  '0x4200000000000000000000000000000000000042': {
    address: '0x4200000000000000000000000000000000000042',
    decimals: 18,
    symbol: 'OP',
    name: 'Optimism',
    chainId: 10, // Optimism
  },
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': {
    address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    decimals: 18,
    symbol: 'WETH',
    name: 'Wrapped Ether',
    chainId: 1, // Ethereum Mainnet
  },
  '0x6b175474e89094c44da98b954eedeac495271d0f': {
    address: '0x6b175474e89094c44da98b954eedeac495271d0f',
    decimals: 18,
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    chainId: 1, // Ethereum Mainnet
  },
  '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': {
    address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
    decimals: 8,
    symbol: 'WBTC',
    name: 'Wrapped Bitcoin',
    chainId: 1, // Ethereum Mainnet
  },
  '0x4200000000000000000000000000000000000006': {
    address: '0x4200000000000000000000000000000000000006',
    decimals: 18,
    symbol: 'WETH',
    name: 'Wrapped Ether',
    chainId: 10, // Optimism
  },
  '0xda10009cbd5d07dd0cecc66161fc93d7c9000da1': {
    address: '0xda10009cbd5d07dd0cecc66161fc93d7c9000da1',
    decimals: 18,
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    chainId: 10, // Optimism
  },
};

/**
 * Get the number of decimals for a given token address
 * @param tokenAddress The token contract address
 * @returns Number of decimals (defaults to 18 if not found)
 */
export function getTokenDecimals(tokenAddress?: string): number {
  if (!tokenAddress) return 18;
  
  const tokenInfo = TOKEN_DECIMALS[tokenAddress.toLowerCase()];
  return tokenInfo?.decimals || 18;
}

/**
 * Get full token information for a given token address
 * @param tokenAddress The token contract address
 * @returns Token information object or null if not found
 */
export function getTokenInfo(tokenAddress?: string): TokenDecimalInfo | null {
  if (!tokenAddress) return null;
  
  return TOKEN_DECIMALS[tokenAddress.toLowerCase()] || null;
}

/**
 * Get token symbol for a given token address
 * @param tokenAddress The token contract address
 * @returns Token symbol or shortened address if not found
 */
export function getTokenSymbol(tokenAddress?: string): string {
  if (!tokenAddress) return 'UNKNOWN';
  
  const tokenInfo = getTokenInfo(tokenAddress);
  if (tokenInfo?.symbol) {
    return tokenInfo.symbol;
  }
  
  // If token not found, log it for debugging and return shortened address
  console.warn('Unknown token address:', tokenAddress);
  return `${tokenAddress.slice(0, 6)}...${tokenAddress.slice(-4)}`;
}

/**
 * Check if a token uses 6 decimals (like USDT/USDC)
 * @param tokenAddress The token contract address
 * @returns True if token uses 6 decimals
 */
export function isSixDecimalToken(tokenAddress?: string): boolean {
  return getTokenDecimals(tokenAddress) === 6;
}

/**
 * Check if a token uses 18 decimals (standard ERC20)
 * @param tokenAddress The token contract address
 * @returns True if token uses 18 decimals
 */
export function isEighteenDecimalToken(tokenAddress?: string): boolean {
  return getTokenDecimals(tokenAddress) === 18;
}
