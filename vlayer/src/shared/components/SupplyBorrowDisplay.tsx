import React from 'react';
import { formatUnits } from 'viem';
import { getChainName, type CompoundTokenConfig } from '../lib/utils';
import { type MorphoTokenConfig } from '../lib/morpho-subgraph';
import { TokenConfig, TokenType, getTokenTypeName, getTokenTypeColor, getTokenTypeIcon } from '../types/TeleportTypes';
import { type SupplyBorrowData, type SubgraphTransaction } from '../lib/aave-subgraph';
import { getTokenDecimals, getTokenSymbol } from '../utils/tokenDecimals';

interface SupplyBorrowDisplayProps {
  data: SupplyBorrowData[];
  isLoading?: boolean;
  showTitle?: boolean;
  title?: string;
}

// Token decimal handling is now centralized in ../utils/tokenDecimals.ts

// Get block explorer URL for a given chain ID
const getBlockExplorerUrl = (chainId: string): string => {
  const chainIdNum = parseInt(chainId);
  const explorerUrls: Record<number, string> = {
    1: 'https://etherscan.io',           // Ethereum Mainnet
    10: 'https://optimistic.etherscan.io', // Optimism Mainnet
    8453: 'https://basescan.org',          // Base Mainnet
    11155420: 'https://sepolia-optimism.etherscan.io', // Optimism Sepolia
    84532: 'https://sepolia.basescan.org', // Base Sepolia
    31337: 'http://localhost:8545',        // Anvil
    31338: 'http://localhost:8545',        // Anvil
  };
  
  return explorerUrls[chainIdNum] || 'https://etherscan.io'; // Default to Ethereum
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
  tokens: (TokenConfig | CompoundTokenConfig | MorphoTokenConfig)[];
  isLoading?: boolean;
}

export const TokenConfigDisplay: React.FC<TokenConfigDisplayProps> = ({ 
  tokens, 
  isLoading = false 
}) => {
  if (isLoading) {
    return (
      <div className="mb-4 p-4 bg-slate-800/50 border border-slate-700 rounded-lg backdrop-blur-sm">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-400"></div>
          <span className="text-cyan-400">Loading token data...</span>
        </div>
      </div>
    );
  }

  if (tokens.length === 0) {
    return (
      <div className="mb-4 p-4 bg-slate-800/50 border border-slate-700 rounded-lg backdrop-blur-sm">
        <p className="text-slate-400 text-sm">No token data found for this address.</p>
      </div>
    );
  }

  return (
    <div className="mb-6 space-y-4">
      <h3 className="text-lg font-semibold text-slate-100">Summary</h3>
      
      <div className="space-y-4">
        {tokens.map((token, index) => {
          // Morpho branch
          if ('marketId' in token) {
            const morpho = token as MorphoTokenConfig;
            return (
              <div key={`${morpho.marketId}-${index}`} className="bg-slate-800/70 border border-slate-700 rounded-xl p-5 shadow-2xl shadow-slate-950/50 hover:shadow-lg transition-all duration-300 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-cyan-500/20 rounded-full flex items-center justify-center border-2 border-cyan-500/30">
                      <span className="text-lg text-cyan-400 font-bold">M</span>
                    </div>
                    <div>
                      <div className="font-semibold text-slate-100">Morpho</div>
                      <div className="text-xs text-slate-400">{getChainName(morpho.chainId.toString())}</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-400">Morpho Address:</span>
                      <div className="font-mono text-xs break-all text-slate-300">{morpho.morphoAddress}</div>
                    </div>
                    <div>
                      <span className="text-slate-400">Market ID:</span>
                      <div className="font-mono text-xs break-all text-slate-300">{morpho.marketId}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-400">Chain ID:</span>
                      <div className="font-semibold text-slate-200">{morpho.chainId}</div>
                    </div>
                    <div>
                      <span className="text-slate-400">Block Number:</span>
                      <div className="font-semibold text-slate-200">{morpho.blockNumber}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-400">Supply Shares:</span>
                      <div className="font-semibold text-emerald-400">{morpho.supplyShares}</div>
                    </div>
                    <div>
                      <span className="text-slate-400">Borrow Shares:</span>
                      <div className="font-semibold text-orange-400">{morpho.borrowShares}</div>
                    </div>
                    <div>
                      <span className="text-slate-400">Collateral:</span>
                      <div className="font-semibold text-cyan-400">{morpho.collateral}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-400">Total Borrow Assets:</span>
                      <div className="font-semibold text-slate-200">{morpho.totalBorrowAssets}</div>
                    </div>
                    <div>
                      <span className="text-slate-400">Total Borrow Shares:</span>
                      <div className="font-semibold text-slate-200">{morpho.totalBorrowShares}</div>
                    </div>
                    <div>
                      <span className="text-slate-400">Total Supply Assets:</span>
                      <div className="font-semibold text-slate-200">{morpho.totalSupplyAssets}</div>
                    </div>
                    <div>
                      <span className="text-slate-400">Total Supply Shares:</span>
                      <div className="font-semibold text-slate-200">{morpho.totalSupplyShares}</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          // Aave/Compound branch
          const underlyingAddress = 'underlingTokenAddress' in token 
            ? token.underlingTokenAddress 
            : (token as CompoundTokenConfig).collateralAddress;
          const tokenAddress = 'aTokenAddress' in token 
            ? (token as TokenConfig).aTokenAddress 
            : (token as CompoundTokenConfig).cTokenAddress;

          const tokenTypeName = getTokenTypeName((token as TokenConfig | CompoundTokenConfig).tokenType, underlyingAddress);
          const tokenTypeColor = getTokenTypeColor((token as TokenConfig | CompoundTokenConfig).tokenType);
          const tokenTypeIcon = getTokenTypeIcon((token as TokenConfig | CompoundTokenConfig).tokenType);
          
          return (
            <div key={`${underlyingAddress}-${index}`} className="bg-slate-800/70 border border-slate-700 rounded-xl p-5 shadow-2xl shadow-slate-950/50 hover:shadow-lg transition-all duration-300 backdrop-blur-sm">
              {/* Token Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-cyan-500/20 rounded-full flex items-center justify-center border-2 border-cyan-500/30">
                    <span className="text-lg text-cyan-400">{tokenTypeIcon}</span>
                  </div>
                  <div>
                    <div className="font-semibold text-slate-100">{tokenTypeName}</div>
                    <div className="text-xs text-slate-400">{getChainName(token.chainId)}</div>
                  </div>
                </div>
              </div>
              
              {/* Token Details */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-400">Token Address:</span>
                    <div className="font-mono text-xs break-all text-slate-300">{tokenAddress}</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-400">Chain ID:</span>
                    <div className="font-semibold text-slate-200">{token.chainId}</div>
                  </div>
                  <div>
                    <span className="text-slate-400">Block Number:</span>
                    <div className="font-semibold text-slate-200">{token.blockNumber}</div>
                  </div>
                </div>
                
                <div className="text-sm">
                  <span className="text-slate-400">Balance:</span>
                  <div className="font-semibold text-lg text-emerald-400">{token.balance}</div>
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
  isLoading = false,
  showTitle = true,
  title = "Summary of Unclaimed Data"
}) => {
  if (isLoading) {
    return (
      <div className="mb-4 p-4 bg-slate-800/50 border border-slate-700 rounded-lg backdrop-blur-sm">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-400"></div>
          <span className="text-cyan-400">Loading supply and borrow data...</span>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="mb-4 p-4 bg-slate-800/50 border border-slate-700 rounded-lg backdrop-blur-sm">
        <p className="text-slate-400 text-sm">No unclaimed supply or borrow activity found for this address.</p>
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
      {showTitle && (
        <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
      )}
      
      {/* Overall Totals */}
      <div className="bg-slate-800/70 border border-slate-700 rounded-xl p-4 backdrop-blur-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-emerald-900/30 border border-emerald-500/30 rounded-lg p-3">
            <div className="text-sm font-medium text-emerald-400">Total Supplied (USD)</div>
            <div className="text-lg font-bold text-emerald-300">${totalSupplyUSD.toFixed(2)}</div>
          </div>
          <div className="bg-orange-900/30 border border-orange-500/30 rounded-lg p-3">
            <div className="text-sm font-medium text-orange-400">Total Borrowed (USD)</div>
            <div className="text-lg font-bold text-orange-300">${totalBorrowUSD.toFixed(2)}</div>
          </div>
          <div className="bg-cyan-900/30 border border-cyan-500/30 rounded-lg p-3">
            <div className="text-sm font-medium text-cyan-400">Total Repaid (USD)</div>
            <div className="text-lg font-bold text-cyan-300">${totalRepayUSD.toFixed(2)}</div>
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
            <div key={`${item.asset}-${index}`} className="bg-slate-800/70 border border-slate-700 rounded-xl p-5 shadow-2xl shadow-slate-950/50 hover:shadow-lg transition-all duration-300 backdrop-blur-sm">
              {/* Token Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-cyan-500/20 rounded-full flex items-center justify-center border border-cyan-500/30">
                    <span className="text-cyan-400 font-semibold text-sm">{tokenSymbol}</span>
                  </div>
                  <div>
                    <div className="font-semibold text-slate-100">{tokenSymbol}</div>
                    <div className="text-xs text-slate-400">{getChainName(item.chainId)}</div>
                  </div>
                </div>
                <div className="text-xs text-slate-400 bg-slate-700/50 px-2 py-1 rounded font-mono">
                  {item.asset.slice(0, 6)}...{item.asset.slice(-4)}
                </div>
              </div>
              
              {/* Horizontal Activity Summary - Same format as Total Activity */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                {/* Supplied */}
                <div className="bg-emerald-900/30 border border-emerald-500/30 rounded-lg p-3">
                  <div className="text-sm font-medium text-emerald-400">Total Supplied</div>
                  <div className="text-lg font-bold text-emerald-300">{supplyFormatted} {tokenSymbol}</div>
                  {supplyUSD && <div className="text-sm text-emerald-400 mt-1">{supplyUSD}</div>}
                </div>
                
                {/* Total Borrowed */}
                <div className="bg-orange-900/30 border border-orange-500/30 rounded-lg p-3">
                  <div className="text-sm font-medium text-orange-400">Total Borrowed</div>
                  <div className="text-lg font-bold text-orange-300">{totalBorrowFormatted} {tokenSymbol}</div>
                  {totalBorrowUSD && <div className="text-sm text-orange-400 mt-1">{totalBorrowUSD}</div>}
                </div>
                
                {/* Total Repaid */}
                <div className="bg-cyan-900/30 border border-cyan-500/30 rounded-lg p-3">
                  <div className="text-sm font-medium text-cyan-400">Total Repaid</div>
                  <div className="text-lg font-bold text-cyan-300">{repayFormatted} {tokenSymbol}</div>
                  {repayUSD && <div className="text-sm text-cyan-400 mt-1">{repayUSD}</div>}
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
                <div className="bg-slate-800/50 rounded-lg p-4 max-w-3xl mx-auto border border-slate-700 backdrop-blur-sm">
                  <div className="text-sm font-medium text-slate-300 mb-3">Transaction Details ({item.transactions.length} transactions)</div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {item.transactions.map((tx, txIndex) => (
                      <div key={txIndex} className="bg-slate-700/50 rounded border border-slate-600 p-3 text-xs">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              tx.action === 'Supply' ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-500/30' :
                              tx.action === 'Borrow' ? 'bg-orange-900/30 text-orange-400 border border-orange-500/30' :
                              tx.action === 'Repay' ? 'bg-cyan-900/30 text-cyan-400 border border-cyan-500/30' :
                              'bg-slate-700 text-slate-300'
                            }`}>
                              {tx.action}
                            </span>
                            <span className="font-mono text-slate-300">
                              {formatTokenAmount(tx.amount, item.asset)} {tokenSymbol}
                            </span>
                          </div>
                        </div>
                        <div className="space-y-1 text-slate-400">
                          <div className="flex justify-between">
                            <span>Tx Hash:</span>
                            <span className="font-mono text-xs">
                              <a 
                                href={`${getBlockExplorerUrl(item.chainId)}/tx/${tx.txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-cyan-400 hover:text-cyan-300 underline"
                              >
                                {tx.txHash.slice(0, 8)}...{tx.txHash.slice(-6)}
                              </a>
                            </span>
                          </div>
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
