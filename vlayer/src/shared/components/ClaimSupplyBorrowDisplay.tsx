import React, { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { createPublicClient, http, formatUnits } from 'viem';
import { optimismSepolia, mainnet, base, baseSepolia, optimism } from 'viem/chains';
import { getContractAddresses } from '../../../config-global';
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

// ABI for Controller contract
const CONTROLLER_ABI = [
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
      {"name": "user", "type": "address"}
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
    // transport: http(base.rpcUrls.default.http[0])
    transport: http('https://base-mainnet.g.alchemy.com/v2/FhJ11JHyRkXs33DwmEYN-fCazeWVm73C')
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
    // For Optimism and Base, try to determine the most likely token based on typical usage
    if (chainId === 10 || chainId === 8453) { // Optimism or Base
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

      // Check if connected to a supported chain
      const supportedChainIds = [10, 8453, 1, 11155420, 84532, 31337, 31338];
      if (!supportedChainIds.includes(chain.id)) {
        console.log('Skipping claimed data fetch - not connected to a supported chain:', chain.name);
        setError('Please connect to a supported network (Optimism, Base, or Ethereum Mainnet)');
        return;
      }

      setIsLoadingData(true);
      setError(null);

      try {
        // Map chain ID to config keys (more reliable than chain name)
        let chainName = 'optimism'; // default
        
        // First try by chain ID (most reliable)
        const chainIdToName: Record<number, string> = {
          1: 'mainnet',
          10: 'optimism',
          8453: 'base',
          11155420: 'optimismSepolia',
          84532: 'baseSepolia',
          31337: 'anvil',
          31338: 'anvil',
        };
        
        if (chain.id && chainIdToName[chain.id]) {
          chainName = chainIdToName[chain.id];
          console.log(`Mapped chain ID ${chain.id} to chainName: ${chainName}`);
        } else if (chain.name) {
          // Fallback to name-based detection
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
        const addresses = getContractAddresses(chainName);
        
        if (!addresses.verifier || addresses.verifier === "0x0000000000000000000000000000000000000000") {
          throw new Error(`Verifier contract not deployed on ${chain.name}`);
        }
        
        if (!addresses.controller || addresses.controller === "0x0000000000000000000000000000000000000000") {
          throw new Error(`Controller contract not deployed on ${chain.name}`);
        }

        // Get RPC client for the current chain
        const client = rpcClients[chain.id as keyof typeof rpcClients];
        if (!client) {
          throw new Error(`No RPC client configured for chain ID: ${chain.id}`);
        }

        // Map protocol to enum value
        const protocolEnum = getProtocolEnum(protocol);

        // Read user info from the Controller contract
        console.log(`Reading from Controller: ${addresses.controller} for user: ${address}, protocol: ${protocol} (enum: ${protocolEnum})`);
        
        const result = await client.readContract({
          address: addresses.controller as `0x${string}`,
          abi: CONTROLLER_ABI,
          functionName: 'usersInfo',
          args: [address as `0x${string}`, protocolEnum]
        });

        console.log('Raw contract result:', result);

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
        
        console.log('Parsed UserInfo:', userInfoData);

        setUserInfo(userInfoData);

        // Get timestamp of the latest block if it exists
        if (userInfoData.latestBlock > 0n) {
          const timestamp = await getBlockTimestamp(userInfoData.latestBlock, chain.id);
          setLatestBlockTimestamp(timestamp);
        }

        // Fetch totals across all protocols
        try {
          const totalsResult = await client.readContract({
            address: addresses.controller as `0x${string}`,
            abi: CONTROLLER_ABI,
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
            address: addresses.controller as `0x${string}`,
            abi: CONTROLLER_ABI,
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
      <div className="mb-4 p-4 bg-cyan-900/20 border border-cyan-500/50 text-cyan-400 rounded-lg backdrop-blur-sm">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-400"></div>
          <span className="text-cyan-400">Loading claimed DeFi data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-4 p-4 bg-red-900/20 border border-red-500/50 text-red-400 rounded-lg backdrop-blur-sm">
        <div>
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
  
  console.log('=== Claimed Data Status ===');
  console.log('userInfo (protocol-specific):', userInfo);
  console.log('totalsInfo (all protocols):', totalsInfo);
  console.log('hasProtocolActivity:', hasProtocolActivity);
  console.log('hasTotalActivity:', hasTotalActivity);
  console.log('========================');

  // If no activity at all, show a simple message
  if (!hasTotalActivity) {
    return (
      <>
        <div className="mb-4 p-4 bg-slate-800/50 border border-slate-700 rounded-lg backdrop-blur-sm">
          <p className="text-slate-400 text-sm">No claimed DeFi data found for this address.</p>
        </div>
        
        {/* Show protocol switch button even when there's no data */}
        {onChangeProtocol && (
          <div className="mt-4 flex items-center justify-between bg-slate-800/50 p-4 rounded-lg border border-slate-700 backdrop-blur-sm">
            <div className="flex items-center">
              <img 
                src={getProtocolMetadata(protocol).image} 
                alt={getProtocolMetadata(protocol).displayName} 
                className="w-10 h-10 mr-3 object-contain" 
              />
              <div>
                <div className="text-xl font-bold text-slate-100">{getProtocolMetadata(protocol).displayName}</div>
              </div>
            </div>
            <button
              onClick={onChangeProtocol}
              className="px-4 py-2 bg-slate-700/50 border border-slate-600 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-md transition-colors flex items-center"
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
          <h3 className="text-xl font-bold text-slate-100">Total Claimed Data Across All Protocols</h3>
          <div className="bg-slate-800/70 border-2 border-slate-700 rounded-xl p-5 shadow-2xl shadow-slate-950/50 backdrop-blur-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-emerald-900/30 rounded-lg p-3 border border-emerald-500/30">
                <div className="text-sm font-medium text-emerald-400">Total Supplied (USD)</div>
                <div className="text-xl font-bold text-emerald-300">{formatTokenAmountSmart(totalsInfo.suppliedAmount, chain?.id || 1, 'supply')}</div>
              </div>
              <div className="bg-orange-900/30 rounded-lg p-3 border border-orange-500/30">
                <div className="text-sm font-medium text-orange-400">Total Borrowed (USD)</div>
                <div className="text-xl font-bold text-orange-300">{formatTokenAmountSmart(totalsInfo.borrowedAmount, chain?.id || 1, 'borrow')}</div>
              </div>
              <div className="bg-cyan-900/30 rounded-lg p-3 border border-cyan-500/30">
                <div className="text-sm font-medium text-cyan-400">Total Repaid (USD)</div>
                <div className="text-xl font-bold text-cyan-300">{formatTokenAmountSmart(totalsInfo.repaidAmount, chain?.id || 1, 'repay')}</div>
              </div>
              <div className="bg-purple-900/30 rounded-lg p-3 border border-purple-500/30">
                <div className="text-sm font-medium text-purple-400">Credit Score</div>
                <div className="text-xl font-bold text-purple-300">
                  {creditScore ? creditScore.score.toString() : 'N/A'}
                </div>
              </div>
              <div className="bg-indigo-900/30 rounded-lg p-3 border border-indigo-500/30">
                <div className="text-sm font-medium text-indigo-400">Credit Tier</div>
                <div className="text-xl font-bold text-indigo-300">
                  {creditScore ? formatCreditTier(creditScore.tier) : 'N/A'}
                </div>
              </div>
            </div>
          </div>

          {/* Protocol Header with Change Button */}
          {onChangeProtocol && (
            <div className="mt-4 flex items-center justify-between bg-slate-800/50 p-4 rounded-lg border border-slate-700 backdrop-blur-sm">
              <div className="flex items-center">
                <img 
                  src={getProtocolMetadata(protocol).image} 
                  alt={getProtocolMetadata(protocol).displayName} 
                  className="w-10 h-10 mr-3 object-contain" 
                />
                <div>
                  <div className="text-xl font-bold text-slate-100">{getProtocolMetadata(protocol).displayName}</div>
                </div>
              </div>
              <button
                onClick={onChangeProtocol}
                className="px-4 py-2 bg-slate-700/50 border border-slate-600 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-md transition-colors flex items-center"
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
      {/* <h3 className="text-lg font-semibold text-slate-100 mt-6">Summary of Claimed {getProtocolMetadata(protocol).displayName} Data</h3> */}
      <h3 className="text-lg font-semibold text-slate-100 mt-6">Summary of Claimed Data</h3>
      
      {hasProtocolActivity ? (
        <div className="bg-slate-800/70 border border-slate-700 rounded-xl p-4 backdrop-blur-sm shadow-2xl shadow-slate-950/50">
          {/* Main Activity Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <div className="bg-emerald-900/30 rounded-lg p-3 border border-emerald-500/30">
              <div className="text-sm font-medium text-emerald-400">Supplied (USD)</div>
              <div className="text-lg font-bold text-emerald-300">{formatTokenAmountSmart(userInfo.suppliedAmount, chain?.id || 1, 'supply')}</div>
            </div>
            <div className="bg-orange-900/30 rounded-lg p-3 border border-orange-500/30">
              <div className="text-sm font-medium text-orange-400">Borrowed (USD)</div>
              <div className="text-lg font-bold text-orange-300">{formatTokenAmountSmart(userInfo.borrowedAmount, chain?.id || 1, 'borrow')}</div>
            </div>
            <div className="bg-cyan-900/30 rounded-lg p-3 border border-cyan-500/30">
              <div className="text-sm font-medium text-cyan-400">Repaid (USD)</div>
              <div className="text-lg font-bold text-cyan-300">{formatTokenAmountSmart(userInfo.repaidAmount, chain?.id || 1, 'repay')}</div>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-3 border border-slate-600">
              <div className="text-sm font-medium text-slate-300">Supply Txs</div>
              <div className="text-lg font-bold text-slate-100">{userInfo.supplyTimes.toString()}</div>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-3 border border-slate-600">
              <div className="text-sm font-medium text-slate-300">Borrow Txs</div>
              <div className="text-lg font-bold text-slate-100">{userInfo.borrowTimes.toString()}</div>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-3 border border-slate-600">
              <div className="text-sm font-medium text-slate-300">Repay Txs</div>
              <div className="text-lg font-bold text-slate-100">{userInfo.repayTimes.toString()}</div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <div className="text-sm font-medium text-slate-400">Liquidations</div>
                <div className="text-lg font-semibold text-red-400">{userInfo.liquidations.toString()}</div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <div className="text-sm font-medium text-slate-400">Latest Block</div>
                <div className="text-lg font-semibold text-slate-200">{userInfo.latestBlock.toString()}</div>
                {latestBlockTimestamp > 0 && (
                  <div className="text-xs text-slate-500">{formatDate(latestBlockTimestamp)}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-4 p-4 bg-slate-800/50 border border-slate-700 rounded-lg backdrop-blur-sm">
          {/* <p className="text-slate-400 text-sm">No {protocol} activity found for this address. Check the totals above to see activity on other protocols.</p> */}
          <p className="text-slate-400 text-sm">No activity found for this address. Check the totals above to see activity on other protocols.</p>
        </div>
      )}

    </div>
  );
};
