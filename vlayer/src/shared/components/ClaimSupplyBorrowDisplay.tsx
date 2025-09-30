import React, { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { createPublicClient, http, formatUnits } from 'viem';
import { optimismSepolia, mainnet, base, baseSepolia, optimism } from 'viem/chains';
import { getAaveContractAddresses } from '../../../config-aave';
import { getTokenDecimals } from '../utils/tokenDecimals';

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
      {"name": "user", "type": "address"},
      {"name": "protocol", "type": "uint8"}
    ],
    "name": "calculateCreditScore",
    "outputs": [
      {"name": "score", "type": "uint256"},
      {"name": "tier", "type": "uint8"}
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
  isLoading = false 
}) => {
  const { address, chain } = useAccount();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [creditScore, setCreditScore] = useState<CreditScore | null>(null);
  const [latestBlockTimestamp, setLatestBlockTimestamp] = useState<number>(0);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserInfo = async () => {
      if (!address || !chain) return;

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
        
        console.log(`Using chain config: ${chainName} for chain: ${chain.name}`);
        const addresses = getAaveContractAddresses(chainName);
        
        if (!addresses.verifier || addresses.verifier === "0x0000000000000000000000000000000000000000") {
          throw new Error(`Verifier contract not deployed on ${chain.name}`);
        }

        // Get RPC client for the current chain
        const client = rpcClients[chain.id as keyof typeof rpcClients];
        if (!client) {
          throw new Error(`No RPC client configured for chain ID: ${chain.id}`);
        }

        // Read user info from the contract (Protocol.AAVE = 0)
        const result = await client.readContract({
          address: addresses.verifier as `0x${string}`,
          abi: VERIFIER_ABI,
          functionName: 'usersInfo',
          args: ['0x05e14e44e3b296f12b21790cde834bce5be5b8e0' as `0x${string}`, 0] // 0 = Protocol.AAVE
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

        // Fetch credit score
        try {
          const creditScoreResult = await client.readContract({
            address: addresses.verifier as `0x${string}`,
            abi: VERIFIER_ABI,
            functionName: 'calculateCreditScore',
            args: ['0x05e14e44e3b296f12b21790cde834bce5be5b8e0' as `0x${string}`, 0] // 0 = Protocol.AAVE
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
  }, [address, chain]);

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

  if (!userInfo) {
    return (
      <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-gray-600 text-sm">No claimed DeFi data found for this address.</p>
      </div>
    );
  }

  // Check if user has any activity
  const hasActivity = userInfo.borrowedAmount > 0n || userInfo.suppliedAmount > 0n || userInfo.repaidAmount > 0n;
  console.log('userInfo', userInfo);

  if (!hasActivity) {
    return (
      <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-gray-600 text-sm">No claimed DeFi activity found for this address.</p>
      </div>
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
      <h3 className="text-lg font-semibold text-slate-900">Summary of Claimed DeFi Data</h3>
      
      {/* Overall Summary */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl p-4">
        {/* <h4 className="text-md font-semibold text-slate-800 mb-3">Claimed Activity Summary</h4> */}
        
        {/* Main Activity Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-green-100 rounded-lg p-3">
            <div className="text-sm font-medium text-green-800">Total Supplied (USD)</div>
            <div className="text-lg font-bold text-green-900">{formatTokenAmountSmart(userInfo.suppliedAmount, chain?.id || 1, 'supply')}</div>
            {/* <div className="text-xs text-green-600">{userInfo.supplyTimes.toString()} transactions</div> */}
          </div>
          <div className="bg-orange-100 rounded-lg p-3">
            <div className="text-sm font-medium text-orange-800">Total Borrowed (USD)</div>
            <div className="text-lg font-bold text-orange-900">{formatTokenAmountSmart(userInfo.borrowedAmount, chain?.id || 1, 'borrow')}</div>
            {/* <div className="text-xs text-orange-600">{userInfo.borrowTimes.toString()} transactions</div> */}
          </div>
          <div className="bg-blue-100 rounded-lg p-3">
            <div className="text-sm font-medium text-blue-800">Total Repaid (USD)</div>
            <div className="text-lg font-bold text-blue-900">{formatTokenAmountSmart(userInfo.repaidAmount, chain?.id || 1, 'repay')}</div>
            {/* <div className="text-xs text-blue-600">{userInfo.repayTimes.toString()} transactions</div> */}
          </div>
          <div className="bg-purple-100 rounded-lg p-3">
            <div className="text-sm font-medium text-purple-800">Credit Score</div>
            <div className="text-lg font-bold text-purple-900">
              {creditScore ? creditScore.score.toString() : 'N/A'}
            </div>
          </div>
          <div className="bg-indigo-100 rounded-lg p-3">
            <div className="text-sm font-medium text-indigo-800">Credit Tier</div>
            <div className="text-lg font-bold text-indigo-900">
              {creditScore ? formatCreditTier(creditScore.tier) : 'N/A'}
            </div>
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

        {/* <div className="mt-3 text-xs text-slate-600 bg-slate-50 p-2 rounded">
          💡 Amounts are automatically formatted using smart decimal detection (6 decimals for USDT/USDC, 18 decimals for other tokens)
        </div> */}
      </div>


      {/* Credit Score Information */}
      {/* <div className="bg-slate-50 rounded-lg p-4">
        <div className="text-sm font-medium text-slate-700 mb-2">Credit Score Data</div>
        <div className="text-xs text-slate-600">
          <p>This data is used to calculate your credit score based on:</p>
          <ul className="mt-1 ml-4 space-y-1">
            <li>• Repayment rate: {userInfo.borrowedAmount > 0n ? `${((Number(userInfo.repaidAmount) / Number(userInfo.borrowedAmount)) * 100).toFixed(1)}%` : 'N/A'}</li>
            <li>• Activity frequency: {Number(userInfo.borrowTimes + userInfo.supplyTimes + userInfo.repayTimes)} total transactions</li>
            <li>• Liquidation history: {userInfo.liquidations.toString()} liquidations</li>
          </ul>
        </div>
      </div> */}
    </div>
  );
};
