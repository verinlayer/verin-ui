import React, { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { createPublicClient, http, formatUnits } from 'viem';
import { optimismSepolia, mainnet, base, baseSepolia, optimism } from 'viem/chains';
import { getAaveContractAddresses } from '../../../config-aave';
import { getTokenDecimals } from '../utils/tokenDecimals';
import { type ProtocolType, getProtocolEnum, getProtocolMetadata } from '../lib/utils';

// ABI for SimpleTeleportVerifier contract
const VERIFIER_ABI = [
  {
    "inputs": [
      {"name": "user", "type": "address"},
      {"name": "protocol", "type": "uint8"}
    ],
    "name": "usersInfo",
    "outputs": [
      {"name": "borrowedAmount", "type": "uint256"},
      {"name": "suppliedAmount", "type": "uint256"},
      {"name": "repaidAmount", "type": "uint256"},
      {"name": "latestBlock", "type": "uint256"},
      {"name": "latestBalance", "type": "uint256"},
      {"name": "borrowTimes", "type": "uint256"},
      {"name": "supplyTimes", "type": "uint256"},
      {"name": "repayTimes", "type": "uint256"},
      {"name": "firstActivityBlock", "type": "uint256"},
      {"name": "liquidations", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "user", "type": "address"}
    ],
    "name": "calculateCreditScore",
    "outputs": [
      {"name": "score", "type": "uint256"},
      {"name": "tier", "type": "uint8"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "user", "type": "address"},
      {"name": "protocol", "type": "uint8"}
    ],
    "name": "calculateCreditScorePerProtocol",
    "outputs": [
      {"name": "score", "type": "uint256"},
      {"name": "tier", "type": "uint8"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "", "type": "address"}
    ],
    "name": "totals",
    "outputs": [
      {"name": "borrowedAmount", "type": "uint256"},
      {"name": "suppliedAmount", "type": "uint256"},
      {"name": "repaidAmount", "type": "uint256"},
      {"name": "latestBlock", "type": "uint256"},
      {"name": "latestBalance", "type": "uint256"},
      {"name": "borrowTimes", "type": "uint256"},
      {"name": "supplyTimes", "type": "uint256"},
      {"name": "repayTimes", "type": "uint256"},
      {"name": "firstActivityBlock", "type": "uint256"},
      {"name": "liquidations", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// RPC client configuration for different chains
const rpcClients = {
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

interface UserInfo {
  borrowedAmount: bigint;
  suppliedAmount: bigint;
  repaidAmount: bigint;
  latestBlock: bigint;
  latestBalance: bigint;
  borrowTimes: bigint;
  supplyTimes: bigint;
  repayTimes: bigint;
  firstActivityBlock: bigint;
  liquidations: bigint;
}

interface ClaimSupplyBorrowDisplayProps {
  isLoading?: boolean;
  protocol?: ProtocolType;
  onChangeProtocol?: () => void;
}

interface CreditScore {
  score: bigint;
  tier: number;
}

// Token decimal handling is now centralized in ../utils/tokenDecimals.ts

const formatTokenAmount = (value: bigint, asset?: string) => {
  try {
    const decimals = getTokenDecimals(asset);
    const formatted = formatUnits(value, decimals);
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

// Smart formatting that tries to determine the most appropriate decimals based on context
const formatTokenAmountSmart = (value: bigint, chainId: number, amountType: 'supply' | 'borrow' | 'repay' = 'supply') => {
  try {
    // For Optimism, try to determine the most likely token based on typical usage
    if (chainId === 10) { // Optimism
      // Check if the value looks like it could be USDT/USDC (6 decimals)
      // USDT/USDC typically have smaller raw values compared to 18-decimal tokens
      const valueStr = value.toString();
      
      // If the value is relatively small (less than 10^12), it might be USDT/USDC
      if (value < BigInt(10 ** 12)) {
        const formatted6 = formatUnits(value, 6);
        const num6 = parseFloat(formatted6);
        
        // If the 6-decimal formatting gives a reasonable number (between 0.01 and 1000000)
        if (num6 >= 0.01 && num6 <= 1000000) {
          return num6.toFixed(2).replace(/\.?0+$/, '');
        }
      }
    }
    
    // Default to 18 decimals for most cases
    return formatTokenAmount(value);
  } catch {
    return '0';
  }
};

const getBlockTimestamp = async (blockNumber: bigint, chainId: number): Promise<number> => {
  try {
    const client = rpcClients[chainId as keyof typeof rpcClients];
    if (!client) {
      throw new Error(`No RPC client configured for chain ID: ${chainId}`);
    }

    const block = await client.getBlock({ blockNumber });
    return Number(block.timestamp);
  } catch (error) {
    console.error(`Error getting block timestamp for block ${blockNumber}:`, error);
    return 0;
  }
};

export const ClaimSupplyBorrowDisplay: React.FC<ClaimSupplyBorrowDisplayProps> = ({ 
  isLoading = false,
  protocol = 'AAVE',
  onChangeProtocol
}) => {
  const { address, chain } = useAccount();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [totalsInfo, setTotalsInfo] = useState<UserInfo | null>(null);
  const [creditScore, setCreditScore] = useState<CreditScore | null>(null);
  const [latestBlockTimestamp, setLatestBlockTimestamp] = useState<number>(0);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserInfo = async () => {
      if (!address || !chain || !protocol) return;

      // Only fetch data if connected to Optimism (chain ID 10)
      if (chain.id !== 10) {
        console.log('Skipping claimed data fetch - not connected to Optimism:', chain.name);
        setError('Please connect to Optimism network to view claimed data');
        return;
      }

      setIsLoadingData(true);
      setError(null);

      try {
        // Map chain names to our config keys
        let chainName = 'optimism'; // default
        if (chain.name) {
          const chainNameLower = chain.name.toLowerCase();
          if (chainNameLower.includes('optimism') && !chainNameLower.includes('sepolia')) {
            chainName = 'optimism';
          } else if (chainNameLower.includes('optimism') && chainNameLower.includes('sepolia')) {
            chainName = 'optimismSepolia';
          } else if (chainNameLower.includes('ethereum') && !chainNameLower.includes('sepolia')) {
            chainName = 'mainnet';
          } else if (chainNameLower.includes('base') && !chainNameLower.includes('sepolia')) {
            chainName = 'base';
          } else if (chainNameLower.includes('base') && chainNameLower.includes('sepolia')) {
            chainName = 'baseSepolia';
          } else if (chainNameLower.includes('anvil') || chainNameLower.includes('localhost')) {
            chainName = 'anvil';
          }
        }
        
        console.log(`Using chain config: ${chainName} for chain: ${chain.name}, protocol: ${protocol}`);
        
        // Get contract addresses (same for both protocols)
        const addresses = getAaveContractAddresses(chainName);
        
        if (!addresses.verifier || addresses.verifier === "0x0000000000000000000000000000000000000000") {
          throw new Error(`Verifier contract not deployed on ${chain.name}`);
        }

        // Get RPC client for the current chain
        const client = rpcClients[chain.id as keyof typeof rpcClients];
        if (!client) {
          throw new Error(`No RPC client configured for chain ID: ${chain.id}`);
        }

        // Map protocol to enum value
        const protocolEnum = getProtocolEnum(protocol);

        // Read user info from the contract
        const result = await client.readContract({
          address: addresses.verifier as `0x${string}`,
          abi: VERIFIER_ABI,
          functionName: 'usersInfo',
          args: [address as `0x${string}`, protocolEnum]
        });

        // Convert the result to UserInfo interface
        const userInfoData: UserInfo = {
          borrowedAmount: result[0],
          suppliedAmount: result[1],
          repaidAmount: result[2],
          latestBlock: result[3],
          latestBalance: result[4],
          borrowTimes: result[5],
          supplyTimes: result[6],
          repayTimes: result[7],
          firstActivityBlock: result[8],
          liquidations: result[9]
        };

        setUserInfo(userInfoData);

        // Get timestamp of the latest block if it exists
        if (userInfoData.latestBlock > 0n) {
          const timestamp = await getBlockTimestamp(userInfoData.latestBlock, chain.id);
          setLatestBlockTimestamp(timestamp);
        }

        // Fetch totals across all protocols
        try {
          const totalsResult = await client.readContract({
            address: addresses.verifier as `0x${string}`,
            abi: VERIFIER_ABI,
            functionName: 'totals',
            args: [address as `0x${string}`]
          });

          const totalsData: UserInfo = {
            borrowedAmount: totalsResult[0],
            suppliedAmount: totalsResult[1],
            repaidAmount: totalsResult[2],
            latestBlock: totalsResult[3],
            latestBalance: totalsResult[4],
            borrowTimes: totalsResult[5],
            supplyTimes: totalsResult[6],
            repayTimes: totalsResult[7],
            firstActivityBlock: totalsResult[8],
            liquidations: totalsResult[9]
          };

          setTotalsInfo(totalsData);
        } catch (totalsError) {
          console.error('Error fetching totals:', totalsError);
          // Don't set error state for totals failure, just log it
        }

        // Fetch credit score (uses totals internally)
        try {
          const creditScoreResult = await client.readContract({
            address: addresses.verifier as `0x${string}`,
            abi: VERIFIER_ABI,
            functionName: 'calculateCreditScore',
            args: [address as `0x${string}`]
          });

          const creditScoreData: CreditScore = {
            score: creditScoreResult[0],
            tier: creditScoreResult[1]
          };

          setCreditScore(creditScoreData);
        } catch (creditError) {
          console.error('Error fetching credit score:', creditError);
          // Don't set error state for credit score failure, just log it
        }

      } catch (err) {
        console.error('Error fetching user info:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchUserInfo();
  }, [address, chain, protocol]);

  if (isLoading || isLoadingData) {
    return (
      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-blue-700">Loading claimed DeFi data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="text-red-700">
          <p className="font-medium">Error loading claimed data:</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  // Check if user has any activity across all protocols
  const hasTotalActivity = totalsInfo && (totalsInfo.borrowedAmount > 0n || totalsInfo.suppliedAmount > 0n || totalsInfo.repaidAmount > 0n);
  
  // Check if user has activity in the specific protocol
  const hasProtocolActivity = userInfo && (userInfo.borrowedAmount > 0n || userInfo.suppliedAmount > 0n || userInfo.repaidAmount > 0n);
  
  console.log('userInfo', userInfo);
  console.log('totalsInfo', totalsInfo);

  // If no activity at all, show a simple message
  if (!hasTotalActivity) {
    return (
      <>
        <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-gray-600 text-sm">No claimed DeFi data found for this address.</p>
        </div>
        
        {/* Show protocol switch button even when there's no data */}
        {onChangeProtocol && (
          <div className="mt-4 flex items-center justify-between bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-gray-200">
            <div className="flex items-center">
              <img 
                src={getProtocolMetadata(protocol).image} 
                alt={getProtocolMetadata(protocol).displayName} 
                className="w-10 h-10 mr-3 object-contain" 
              />
              <div>
                <div className="text-xl font-bold text-gray-900">{getProtocolMetadata(protocol).displayName}</div>
              </div>
            </div>
            <button
              onClick={onChangeProtocol}
              className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-md transition-colors flex items-center"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Switch to other Protocols
            </button>
          </div>
        )}
      </>
    );
  }

const formatDate = (timestamp: number) => {
  if (timestamp === 0) return 'Unknown';
  return new Date(timestamp * 1000).toLocaleString();
};

const formatCreditTier = (tier: number): string => {
  switch (tier) {
    case 0:
      return 'Bronze';
    case 1:
      return 'Silver';
    case 2:
      return 'Gold';
    case 3:
      return 'Platinum';
    case 4:
      return 'Diamond';
    default:
      return 'Unknown';
  }
};

  return (
    <div className="mb-6 space-y-4">
      {/* Total Summary Across All Protocols */}
      {totalsInfo && hasTotalActivity && (
        <>
          <h3 className="text-xl font-bold text-slate-900">Total Claimed Data Across All Protocols</h3>
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-300 rounded-xl p-5 shadow-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-green-100 rounded-lg p-3 border border-green-300">
                <div className="text-sm font-medium text-green-800">Total Supplied (USD)</div>
                <div className="text-xl font-bold text-green-900">{formatTokenAmountSmart(totalsInfo.suppliedAmount, chain?.id || 1, 'supply')}</div>
              </div>
              <div className="bg-orange-100 rounded-lg p-3 border border-orange-300">
                <div className="text-sm font-medium text-orange-800">Total Borrowed (USD)</div>
                <div className="text-xl font-bold text-orange-900">{formatTokenAmountSmart(totalsInfo.borrowedAmount, chain?.id || 1, 'borrow')}</div>
              </div>
              <div className="bg-blue-100 rounded-lg p-3 border border-blue-300">
                <div className="text-sm font-medium text-blue-800">Total Repaid (USD)</div>
                <div className="text-xl font-bold text-blue-900">{formatTokenAmountSmart(totalsInfo.repaidAmount, chain?.id || 1, 'repay')}</div>
              </div>
              <div className="bg-purple-100 rounded-lg p-3 border border-purple-300">
                <div className="text-sm font-medium text-purple-800">Credit Score</div>
                <div className="text-xl font-bold text-purple-900">
                  {creditScore ? creditScore.score.toString() : 'N/A'}
                </div>
              </div>
              <div className="bg-indigo-100 rounded-lg p-3 border border-indigo-300">
                <div className="text-sm font-medium text-indigo-800">Credit Tier</div>
                <div className="text-xl font-bold text-indigo-900">
                  {creditScore ? formatCreditTier(creditScore.tier) : 'N/A'}
                </div>
              </div>
            </div>
          </div>

          {/* Protocol Header with Change Button */}
          {onChangeProtocol && (
            <div className="mt-4 flex items-center justify-between bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-gray-200">
              <div className="flex items-center">
                <img 
                  src={getProtocolMetadata(protocol).image} 
                  alt={getProtocolMetadata(protocol).displayName} 
                  className="w-10 h-10 mr-3 object-contain" 
                />
                <div>
                  <div className="text-xl font-bold text-gray-900">{getProtocolMetadata(protocol).displayName}</div>
                </div>
              </div>
              <button
                onClick={onChangeProtocol}
                className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-md transition-colors flex items-center"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Switch to other Protocols
              </button>
            </div>
          )}
        </>
      )}

      {/* Protocol-Specific Data */}
      <h3 className="text-lg font-semibold text-slate-900 mt-6">Summary of Claimed {getProtocolMetadata(protocol).displayName} Data</h3>
      
      {hasProtocolActivity ? (
        <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl p-4">
          {/* Main Activity Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <div className="bg-green-100 rounded-lg p-3">
              <div className="text-sm font-medium text-green-800">Supplied (USD)</div>
              <div className="text-lg font-bold text-green-900">{formatTokenAmountSmart(userInfo.suppliedAmount, chain?.id || 1, 'supply')}</div>
            </div>
            <div className="bg-orange-100 rounded-lg p-3">
              <div className="text-sm font-medium text-orange-800">Borrowed (USD)</div>
              <div className="text-lg font-bold text-orange-900">{formatTokenAmountSmart(userInfo.borrowedAmount, chain?.id || 1, 'borrow')}</div>
            </div>
            <div className="bg-blue-100 rounded-lg p-3">
              <div className="text-sm font-medium text-blue-800">Repaid (USD)</div>
              <div className="text-lg font-bold text-blue-900">{formatTokenAmountSmart(userInfo.repaidAmount, chain?.id || 1, 'repay')}</div>
            </div>
            <div className="bg-slate-100 rounded-lg p-3">
              <div className="text-sm font-medium text-slate-800">Supply Txs</div>
              <div className="text-lg font-bold text-slate-900">{userInfo.supplyTimes.toString()}</div>
            </div>
            <div className="bg-slate-100 rounded-lg p-3">
              <div className="text-sm font-medium text-slate-800">Borrow Txs</div>
              <div className="text-lg font-bold text-slate-900">{userInfo.borrowTimes.toString()}</div>
            </div>
            <div className="bg-slate-100 rounded-lg p-3">
              <div className="text-sm font-medium text-slate-800">Repay Txs</div>
              <div className="text-lg font-bold text-slate-900">{userInfo.repayTimes.toString()}</div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <div className="text-sm font-medium text-slate-600">Liquidations</div>
                <div className="text-lg font-semibold text-red-600">{userInfo.liquidations.toString()}</div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <div className="text-sm font-medium text-slate-600">Latest Block</div>
                <div className="text-lg font-semibold text-slate-900">{userInfo.latestBlock.toString()}</div>
                {latestBlockTimestamp > 0 && (
                  <div className="text-xs text-slate-500">{formatDate(latestBlockTimestamp)}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-gray-600 text-sm">No {protocol} activity found for this address. Check the totals above to see activity on other protocols.</p>
        </div>
      )}

    </div>
  );
};
