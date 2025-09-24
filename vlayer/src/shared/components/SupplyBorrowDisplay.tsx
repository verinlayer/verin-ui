import React from 'react';
import { formatUnits } from 'viem';
import { getChainName } from '../lib/utils';

export interface SupplyBorrowData {
  asset: string;
  chainId: string;
  supplyAmount: string;
  borrowAmount: string;
  repayAmount: string;
  totalBorrowAmount: string;
  assetPriceUSD?: string;
  stableTokenDebt?: string;
  variableTokenDebt?: string;
}

interface SupplyBorrowDisplayProps {
  data: SupplyBorrowData[];
  isLoading?: boolean;
}

const getTokenDecimals = (asset: string): number => {
  // Token decimal mappings
  const tokenDecimals: Record<string, number> = {
    '0xd7bfa30ca5cbb252f228ab6ba3b1b2814d752081': 6, // USDT on OP Sepolia
    '0xdac17f958d2ee523a2206206994597c13d831ec7': 6, // USDT on Ethereum
    '0x94b008aa00579c1307b0ef2c499ad98a8ce58e58': 6, // USDT on Optimism
    '0x64dff24d36d68583766aeeed77f05ea6d9f399378': 6, // USDC on OP Sepolia
    '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 6, // USDC on Ethereum
    '0x7f5c764cbc14f9669b88837ca1490cca17c31607': 6, // USDC on Optimism
    '0x4200000000000000000000000000000000000042': 18, // OP on Optimism
    '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': 18, // WETH on Ethereum
    '0x4200000000000000000000000000000000000006': 18, // WETH on Optimism
    '0x6b175474e89094c44da98b954eedeac495271d0f': 18, // DAI on Ethereum
    '0xda10009cbd5d07dd0cecc66161fc93d7c9000da1': 18, // DAI on Optimism
  };
  
  return tokenDecimals[asset.toLowerCase()] || 18; // Default to 18 decimals
};

const formatTokenAmount = (value: string, asset: string) => {
  try {
    const decimals = getTokenDecimals(asset);
    const formatted = formatUnits(BigInt(value), decimals);
    const num = parseFloat(formatted);
    
    // Format with appropriate precision based on token type
    if (decimals === 6) {
      // For USDT/USDC, show up to 2 decimal places
      return num.toFixed(2).replace(/\.?0+$/, '');
    } else {
      // For 18-decimal tokens, show up to 4 decimal places
      return num.toFixed(4).replace(/\.?0+$/, '');
    }
  } catch {
    return '0';
  }
};

const formatUSD = (value: string, asset: string, priceUSD?: string) => {
  try {
    const decimals = getTokenDecimals(asset);
    const amount = formatUnits(BigInt(value), decimals);
    const price = priceUSD ? parseFloat(priceUSD) : 0;
    const usdValue = parseFloat(amount) * price;
    return usdValue > 0.01 ? `$${usdValue.toFixed(2)}` : '';
  } catch {
    return '';
  }
};

const getTokenSymbol = (asset: string): string => {
  // Common token mappings
  const tokenMap: Record<string, string> = {
    '0xd7bfa30ca5cbb252f228ab6ba3b1b2814d752081': 'USDT', // OP Sepolia
    '0xdac17f958d2ee523a2206206994597c13d831ec7': 'USDT', // Ethereum Mainnet
    '0x64dff24d36d68583766aeeed77f05ea6d9f399378': 'USDC', // OP Sepolia
    '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 'USDC', // Ethereum Mainnet
    '0x94b008aa00579c1307b0ef2c499ad98a8ce58e58': 'USDT', // Optimism
    '0x4200000000000000000000000000000000000042': 'OP', // Optimism
  };
  
  return tokenMap[asset.toLowerCase()] || 'UNKNOWN';
};

export const SupplyBorrowDisplay: React.FC<SupplyBorrowDisplayProps> = ({ 
  data, 
  isLoading = false 
}) => {
  if (isLoading) {
    return (
      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-blue-700">Loading supply and borrow data...</span>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-gray-600 text-sm">No supply or borrow activity found for this address.</p>
      </div>
    );
  }

  return (
    <div className="mb-6 space-y-4">
      <h3 className="text-lg font-semibold text-slate-900">DeFi Activity Summary</h3>
      
      <div className="space-y-4">
        {data.map((item, index) => {
          const tokenSymbol = getTokenSymbol(item.asset);
          const supplyFormatted = formatTokenAmount(item.supplyAmount, item.asset);
          const totalBorrowFormatted = formatTokenAmount(item.totalBorrowAmount, item.asset);
          const repayFormatted = formatTokenAmount(item.repayAmount, item.asset);
          const supplyUSD = formatUSD(item.supplyAmount, item.asset, item.assetPriceUSD);
          const totalBorrowUSD = formatUSD(item.totalBorrowAmount, item.asset, item.assetPriceUSD);
          const repayUSD = formatUSD(item.repayAmount, item.asset, item.assetPriceUSD);
          
          return (
            <div key={`${item.asset}-${index}`} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
              {/* Token Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-semibold text-sm">{tokenSymbol}</span>
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">{tokenSymbol}</div>
                    <div className="text-xs text-slate-500">{getChainName(item.chainId)}</div>
                  </div>
                </div>
                <div className="text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded">
                  {item.asset.slice(0, 6)}...{item.asset.slice(-4)}
                </div>
              </div>
              
              {/* Vertical Activity Summary */}
              <div className="space-y-4">
                {/* Supplied */}
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full flex-shrink-0"></div>
                    <span className="text-sm font-medium text-green-800">Supplied</span>
                  </div>
                  <div className="ml-6">
                    <div className="font-semibold text-green-900 text-lg">{supplyFormatted} {tokenSymbol}</div>
                    {supplyUSD && <div className="text-sm text-green-600 mt-1">{supplyUSD}</div>}
                  </div>
                </div>
                
                {/* Total Borrowed */}
                {totalBorrowFormatted !== '0' && (
                  <div className="bg-orange-50 rounded-lg p-4">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="w-3 h-3 bg-orange-500 rounded-full flex-shrink-0"></div>
                      <span className="text-sm font-medium text-orange-800">Total Borrowed</span>
                    </div>
                    <div className="ml-6">
                      <div className="font-semibold text-orange-900 text-lg">{totalBorrowFormatted} {tokenSymbol}</div>
                      {totalBorrowUSD && <div className="text-sm text-orange-600 mt-1">{totalBorrowUSD}</div>}
                    </div>
                  </div>
                )}
                
                {/* Total Repaid */}
                {repayFormatted !== '0' && (
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full flex-shrink-0"></div>
                      <span className="text-sm font-medium text-green-800">Total Repaid</span>
                    </div>
                    <div className="ml-6">
                      <div className="font-semibold text-green-900 text-lg">{repayFormatted} {tokenSymbol}</div>
                      {repayUSD && <div className="text-sm text-green-600 mt-1">{repayUSD}</div>}
                    </div>
                  </div>
                )}
                
                {/* Health Factor (if available) */}
                {item.stableTokenDebt && item.variableTokenDebt && (
                  <div className="bg-slate-50 rounded-lg p-4">
                    <div className="text-sm font-medium text-slate-700 mb-2">Debt Details</div>
                    <div className="space-y-1 ml-4">
                      <div className="flex justify-between text-xs text-slate-600">
                        <span>Stable Debt:</span>
                        <span>{formatTokenAmount(item.stableTokenDebt, item.asset)} {tokenSymbol}</span>
                      </div>
                      <div className="flex justify-between text-xs text-slate-600">
                        <span>Variable Debt:</span>
                        <span>{formatTokenAmount(item.variableTokenDebt, item.asset)} {tokenSymbol}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded">
        <p>💡 This data is fetched from the Aave subgraph and shows your DeFi activity breakdown:</p>
        <ul className="mt-1 ml-4 space-y-1">
          <li>• <strong>Supplied:</strong> Sum of all supply transactions</li>
          <li>• <strong>Total Borrowed:</strong> Sum of all borrow transactions</li>
          <li>• <strong>Total Repaid:</strong> Sum of all repay transactions</li>
        </ul>
      </div>
    </div>
  );
};
