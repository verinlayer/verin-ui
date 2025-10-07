// Types matching the smart contract structure
// Import the token symbol function from the centralized utility
import { getTokenSymbol } from '../utils/tokenDecimals';
export interface TokenConfig {
  underlingTokenAddress: string;
  aTokenAddress: string;
  chainId: string;
  blockNumber: string;
  balance: string;
  tokenType: number; // 0 = ARESERVE, 1 = AVARIABLEDEBT, 2 = ASTABLEDEBT
}

export enum Protocol {
  AAVE = 0,
  MORPHO = 1,
  COMPOUND = 2,
}

export enum TokenType {
  ARESERVE = 0,
  AVARIABLEDEBT = 1,
  ASTABLEDEBT = 2,
}

// Helper function to get token symbol based on underlying asset address
export const getTokenTypeName = (tokenType: number, underlyingTokenAddress?: string): string => {
  // If we have the underlying token address, try to get the actual token symbol
  if (underlyingTokenAddress) {
    const symbol = getTokenSymbol(underlyingTokenAddress);
    
    // If we found a valid symbol, return it with the token type context
    if (symbol && symbol !== 'UNKNOWN') {
      // switch (tokenType) {
      //   case TokenType.ARESERVE:
      //     return `${symbol} Supply`;
      //   case TokenType.AVARIABLEDEBT:
      //     return `${symbol} Debt`;
      //   case TokenType.ASTABLEDEBT:
      //     return `${symbol} Stable Debt`;
      //   default:
      //     return symbol;
      // }
      return symbol;
    }
  }
  
  // Fallback to generic token type names
  switch (tokenType) {
    case TokenType.ARESERVE:
      return 'Supply';
    case TokenType.AVARIABLEDEBT:
      return 'Variable Debt';
    case TokenType.ASTABLEDEBT:
      return 'Stable Debt';
    default:
      return 'UNKNOWN';
  }
};

// Helper function to get token type color
export const getTokenTypeColor = (tokenType: number): string => {
  switch (tokenType) {
    case TokenType.ARESERVE:
      return 'border-green-300 bg-green-50 text-green-800';
    case TokenType.AVARIABLEDEBT:
      return 'border-orange-300 bg-orange-50 text-orange-800';
    case TokenType.ASTABLEDEBT:
      return 'border-blue-300 bg-blue-50 text-blue-800';
    default:
      return 'border-gray-300 bg-gray-50 text-gray-800';
  }
};

// Helper function to get token type icon
export const getTokenTypeIcon = (tokenType: number): string => {
  switch (tokenType) {
    case TokenType.ARESERVE:
      return '💰'; // Supply
    case TokenType.AVARIABLEDEBT:
      return '📈'; // Variable debt
    case TokenType.ASTABLEDEBT:
      return '📊'; // Stable debt
    default:
      return '❓';
  }
};
