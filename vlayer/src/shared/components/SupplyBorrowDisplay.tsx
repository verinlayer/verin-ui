import React from 'react';
import { formatUnits } from 'viem';
import { getChainName } from '../lib/utils';
import { TokenConfig, TokenType, getTokenTypeName, getTokenTypeColor, getTokenTypeIcon } from '../types/TeleportTypes';
import { type SupplyBorrowData, type SubgraphTransaction } from '../lib/aave-subgraph';
import { getTokenDecimals, getTokenSymbol } from '../utils/tokenDecimals';

interface SupplyBorrowDisplayProps {
  data: SupplyBorrowData[];
  isLoading?: boolean;
}

// Token decimal handling is now centralized in ../utils/tokenDecimals.ts

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
    if (!priceUSD || parseFloat(priceUSD) === 0) {
      return '';
    }
    
    // Check if priceUSD is already a total USD value (Compound) or price per token (Aave)
    // Compound's amountUsd is typically the total USD value
    // Aave's assetPriceUSD is the price per token
    const usdValueFromSubgraph = parseFloat(priceUSD);
    
    // If the USD value is very small (< 0.01), it's likely a price per token (Aave)
    // Otherwise, it's likely a total USD value (Compound)
    if (usdValueFromSubgraph < 0.01 && usdValueFromSubgraph > 0) {
      // This is likely a price per token, so multiply by amount
      const decimals = getTokenDecimals(asset);
      const amount = formatUnits(BigInt(value), decimals);
      const usdValue = parseFloat(amount) * usdValueFromSubgraph;
      return usdValue > 0.01 ? `$${usdValue.toFixed(2)}` : '';
    } else {
      // This is likely already a total USD value, use it directly
      return usdValueFromSubgraph > 0.01 ? `$${usdValueFromSubgraph.toFixed(2)}` : '';
    }
  } catch {
    return '';
  }
};

// Token symbol handling is now centralized in ../utils/tokenDecimals.ts

// New component for displaying TokenConfig structures
interface TokenConfigDisplayProps {
  tokens: TokenConfig[];
  isLoading?: boolean;
}

export const TokenConfigDisplay: React.FC<TokenConfigDisplayProps> = ({ 
  tokens, 
  isLoading = false 
}) => {
  if (isLoading) {
    return (
      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-blue-700">Loading token data...</span>
        </div>
      </div>
    );
  }

  if (tokens.length === 0) {
    return (
      <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-gray-600 text-sm">No token data found for this address.</p>
      </div>
    );
  }

  return (
    <div className="mb-6 space-y-4">
      <h3 className="text-lg font-semibold text-slate-900">Token Activity Summary</h3>
      
      <div className="space-y-4">
        {tokens.map((token, index) => {
          const tokenTypeName = getTokenTypeName(token.tokenType, token.underlingTokenAddress);
          const tokenTypeColor = getTokenTypeColor(token.tokenType);
          const tokenTypeIcon = getTokenTypeIcon(token.tokenType);
          
          return (
            <div key={`${token.underlingTokenAddress}-${index}`} className={`bg-white border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow ${tokenTypeColor}`}>
              {/* Token Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border-2">
                    <span className="text-lg">{tokenTypeIcon}</span>
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900">{tokenTypeName}</div>
                    <div className="text-xs text-slate-500">{getChainName(token.chainId)}</div>
                  </div>
                </div>
                {/* <div className="text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded">
                  {token.underlingTokenAddress.slice(0, 6)}...{token.underlingTokenAddress.slice(-4)}
                </div> */}
              </div>
              
              {/* Token Details */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {/* <div>
                    <span className="text-slate-600">Underlying Token:</span>
                    <div className="font-mono text-xs break-all">{token.underlingTokenAddress}</div>
                  </div> */}
                  <div>
                    <span className="text-slate-600">Token Address:</span>
                    <div className="font-mono text-xs break-all">{token.aTokenAddress}</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-600">Chain ID:</span>
                    <div className="font-semibold">{token.chainId}</div>
                  </div>
                  <div>
                    <span className="text-slate-600">Block Number:</span>
                    <div className="font-semibold">{token.blockNumber}</div>
                  </div>
                </div>
                
                <div className="text-sm">
                  <span className="text-slate-600">Balance:</span>
                  <div className="font-semibold text-lg">{token.balance}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded">
        <p>💡 This data shows the Erc20Token structures that will be used for proving:</p>
        <ul className="mt-1 ml-4 space-y-1">
          <li>• <strong>ARESERVE:</strong> Supply positions (aTokens)</li>
          <li>• <strong>AVARIABLEDEBT:</strong> Variable debt positions</li>
          <li>• <strong>ASTABLEDEBT:</strong> Stable debt positions</li>
        </ul>
      </div> */}
    </div>
  );
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

  // Calculate totals in USD value
  const totalSupplyUSD = data.reduce((sum, item) => {
    // If direct USD value available (Compound), use it
    if (item.supplyAmountUSD) {
      return sum + parseFloat(item.supplyAmountUSD);
    }
    // Otherwise calculate from price (Aave)
    const decimals = getTokenDecimals(item.asset);
    const amount = formatUnits(BigInt(item.supplyAmount), decimals);
    const price = item.assetPriceUSD ? parseFloat(item.assetPriceUSD) : 0;
    return sum + (parseFloat(amount) * price);
  }, 0);

  const totalBorrowUSD = data.reduce((sum, item) => {
    // If direct USD value available (Compound), use it
    if (item.borrowAmountUSD) {
      return sum + parseFloat(item.borrowAmountUSD);
    }
    // Otherwise calculate from price (Aave)
    const decimals = getTokenDecimals(item.asset);
    const amount = formatUnits(BigInt(item.borrowAmount), decimals);
    const price = item.assetPriceUSD ? parseFloat(item.assetPriceUSD) : 0;
    return sum + (parseFloat(amount) * price);
  }, 0);

  const totalRepayUSD = data.reduce((sum, item) => {
    // If direct USD value available (Compound), use it
    if (item.repayAmountUSD) {
      return sum + parseFloat(item.repayAmountUSD);
    }
    // Otherwise calculate from price (Aave)
    const decimals = getTokenDecimals(item.asset);
    const amount = formatUnits(BigInt(item.repayAmount), decimals);
    const price = item.assetPriceUSD ? parseFloat(item.assetPriceUSD) : 0;
    return sum + (parseFloat(amount) * price);
  }, 0);

  return (
    <div className="mb-6 space-y-4">
      <h3 className="text-lg font-semibold text-slate-900">Summary of Unclaimed DeFi Data</h3>
      
      {/* Overall Totals */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
        {/* <h4 className="text-md font-semibold text-slate-800 mb-3">Total Activity Across All Assets</h4> */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-100 rounded-lg p-3">
            <div className="text-sm font-medium text-green-800">Total Supplied (USD)</div>
            <div className="text-lg font-bold text-green-900">${totalSupplyUSD.toFixed(2)}</div>
          </div>
          <div className="bg-orange-100 rounded-lg p-3">
            <div className="text-sm font-medium text-orange-800">Total Borrowed (USD)</div>
            <div className="text-lg font-bold text-orange-900">${totalBorrowUSD.toFixed(2)}</div>
          </div>
          <div className="bg-blue-100 rounded-lg p-3">
            <div className="text-sm font-medium text-blue-800">Total Repaid (USD)</div>
            <div className="text-lg font-bold text-blue-900">${totalRepayUSD.toFixed(2)}</div>
          </div>
        </div>
        {/* <div className="mt-3 text-xs text-slate-600 bg-slate-50 p-2 rounded">
          💡 Totals are shown in USD to avoid mixing different token decimals (e.g., USDT has 6 decimals, OP has 18 decimals)
        </div> */}
      </div>
      
      <div className="space-y-4">
        {data.map((item, index) => {
          const tokenSymbol = getTokenSymbol(item.asset);
          const supplyFormatted = formatTokenAmount(item.supplyAmount, item.asset);
          const totalBorrowFormatted = formatTokenAmount(item.totalBorrowAmount, item.asset);
          const repayFormatted = formatTokenAmount(item.repayAmount, item.asset);
          
          // Use direct USD values if available (Compound), otherwise calculate (Aave)
          const supplyUSD = item.supplyAmountUSD 
            ? `$${parseFloat(item.supplyAmountUSD).toFixed(2)}`
            : formatUSD(item.supplyAmount, item.asset, item.assetPriceUSD);
          const totalBorrowUSD = item.borrowAmountUSD 
            ? `$${parseFloat(item.borrowAmountUSD).toFixed(2)}`
            : formatUSD(item.totalBorrowAmount, item.asset, item.assetPriceUSD);
          const repayUSD = item.repayAmountUSD 
            ? `$${parseFloat(item.repayAmountUSD).toFixed(2)}`
            : formatUSD(item.repayAmount, item.asset, item.assetPriceUSD);
          
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
              
              {/* Horizontal Activity Summary - Same format as Total Activity */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                {/* Supplied */}
                <div className="bg-green-100 rounded-lg p-3">
                  <div className="text-sm font-medium text-green-800">Total Supplied</div>
                  <div className="text-lg font-bold text-green-900">{supplyFormatted} {tokenSymbol}</div>
                  {/* {supplyUSD && <div className="text-sm text-green-600 mt-1">{supplyUSD}</div>} */}
                </div>
                
                {/* Total Borrowed */}
                <div className="bg-orange-100 rounded-lg p-3">
                  <div className="text-sm font-medium text-orange-800">Total Borrowed</div>
                  <div className="text-lg font-bold text-orange-900">{totalBorrowFormatted} {tokenSymbol}</div>
                  {/* {totalBorrowUSD && <div className="text-sm text-orange-600 mt-1">{totalBorrowUSD}</div>} */}
                </div>
                
                {/* Total Repaid */}
                <div className="bg-blue-100 rounded-lg p-3">
                  <div className="text-sm font-medium text-blue-800">Total Repaid</div>
                  <div className="text-lg font-bold text-blue-900">{repayFormatted} {tokenSymbol}</div>
                  {/* {repayUSD && <div className="text-sm text-blue-600 mt-1">{repayUSD}</div>} */}
                </div>
              </div>
              
              {/* Health Factor (if available) */}
              {/* {item.stableTokenDebt && item.variableTokenDebt && (
                <div className="bg-slate-50 rounded-lg p-4 mb-4">
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
              )} */}
              
              {/* Transaction Details */}
              {item.transactions && item.transactions.length > 0 && (
                <div className="bg-slate-50 rounded-lg p-4 max-w-3xl mx-auto">
                  <div className="text-sm font-medium text-slate-700 mb-3">Transaction Details ({item.transactions.length} transactions)</div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {item.transactions.map((tx, txIndex) => (
                      <div key={txIndex} className="bg-white rounded border p-3 text-xs">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              tx.action === 'Supply' ? 'bg-green-100 text-green-800' :
                              tx.action === 'Borrow' ? 'bg-orange-100 text-orange-800' :
                              tx.action === 'Repay' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {tx.action}
                            </span>
                            <span className="font-mono text-slate-600">
                              {formatTokenAmount(tx.amount, item.asset)} {tokenSymbol}
                            </span>
                          </div>
                        </div>
                        <div className="space-y-1 text-slate-600">
                          <div className="flex justify-between">
                            <span>Tx Hash:</span>
                            <span className="font-mono text-xs">
                              <a 
                                href={`https://optimistic.etherscan.io/tx/${tx.txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 underline"
                              >
                                {tx.txHash.slice(0, 8)}...{tx.txHash.slice(-6)}
                              </a>
                            </span>
                          </div>
                          {/* {tx.assetPriceUSD && (
                            <div className="flex justify-between">
                              <span>Price:</span>
                              <span className="text-xs">${parseFloat(tx.assetPriceUSD).toFixed(4)}</span>
                            </div>
                          )} */}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded">
        <p>💡 This data is fetched from the Aave subgraph and shows your DeFi activity breakdown:</p>
        <ul className="mt-1 ml-4 space-y-1">
          <li>• <strong>Supplied:</strong> Sum of all supply transactions</li>
          <li>• <strong>Total Borrowed:</strong> Sum of all borrow transactions</li>
          <li>• <strong>Total Repaid:</strong> Sum of all repay transactions</li>
        </ul>
      </div> */}
    </div>
  );
};
