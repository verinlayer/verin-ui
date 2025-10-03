import { createPublicClient, http, formatUnits } from 'viem';
import { optimism } from 'viem/chains';
import { getTokenDecimals } from './src/shared/utils/tokenDecimals';
import { getAaveContractAddresses } from './config-aave';

// Get contract addresses from config
const getVerifierAddress = (): `0x${string}` => {
  const addresses = getAaveContractAddresses('optimism');
  return addresses.verifier;
};

// Simple ABI for usersInfo function - replace with full ABI from compiled contract
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
  }
] as const;

// Protocol enum values (uint8)
const PROTOCOLS = {
  AAVE: 0,
  MORPHO: 1,
  COMPOUND: 2,
} as const;

// UserInfo struct interface
export interface UserInfo {
  borrowedAmount: bigint;
  suppliedAmount: bigint;
  repaidAmount: bigint;
  latestBlock: bigint;
  latestBalance: bigint;
  borrowTimes: bigint;
  supplyTimes: bigint;
  repayTimes: bigint;
  firstActivityBlock: bigint; // For credit score calculation
  liquidations: bigint;       // For credit score penalty
}

// Create public client for Optimism
const publicClient = createPublicClient({
  chain: optimism,
  transport: http(),
});

// Get UserInfo from SimpleTeleportVerifier contract
export const getUserInfo = async (userAddress: string, protocol: keyof typeof PROTOCOLS): Promise<UserInfo | null> => {
  try {
    const verifierAddress = getVerifierAddress();
    const protocolId = PROTOCOLS[protocol];
    
    const result = await publicClient.readContract({
      address: verifierAddress as `0x${string}`,
      abi: VERIFIER_ABI,
      functionName: 'usersInfo',
      args: [userAddress as `0x${string}`, protocolId],
    });

    return {
      borrowedAmount: result[0],
      suppliedAmount: result[1],
      repaidAmount: result[2],
      latestBlock: result[3],
      latestBalance: result[4],
      borrowTimes: result[5],
      supplyTimes: result[6],
      repayTimes: result[7],
      firstActivityBlock: result[8],
      liquidations: result[9],
    };
  } catch (error) {
    console.error(`Error fetching user info for ${protocol}:`, error);
    return null;
  }
};

// Get all user info for all protocols
export const getAllUserInfo = async (userAddress: string) => {
  const [aave, morpho, compound] = await Promise.all([
    getUserInfo(userAddress, 'AAVE'),
    getUserInfo(userAddress, 'MORPHO'),
    getUserInfo(userAddress, 'COMPOUND'),
  ]);

  return { aave, morpho, compound };
};

// Calculate total activity across all protocols
export const getUserTotalActivity = async (userAddress: string) => {
  const allInfo = await getAllUserInfo(userAddress);
  
  let totalBorrowed = 0n;
  let totalSupplied = 0n;
  let totalRepaid = 0n;
  let totalBorrowTimes = 0n;
  let totalSupplyTimes = 0n;
  let totalRepayTimes = 0n;

  Object.values(allInfo).forEach(info => {
    if (info) {
      totalBorrowed += info.borrowedAmount;
      totalSupplied += info.suppliedAmount;
      totalRepaid += info.repaidAmount;
      totalBorrowTimes += info.borrowTimes;
      totalSupplyTimes += info.supplyTimes;
      totalRepayTimes += info.repayTimes;
    }
  });

  return {
    totalBorrowed,
    totalSupplied,
    totalRepaid,
    totalBorrowTimes,
    totalSupplyTimes,
    totalRepayTimes,
  };
};

// Format UserInfo for display
export const formatUserInfo = (userInfo: UserInfo) => {
  return {
    borrowedAmount: formatUnits(userInfo.borrowedAmount, 18),
    suppliedAmount: formatUnits(userInfo.suppliedAmount, 18),
    repaidAmount: formatUnits(userInfo.repaidAmount, 18),
    latestBlock: userInfo.latestBlock.toString(),
    latestBalance: formatUnits(userInfo.latestBalance, 18),
    borrowTimes: userInfo.borrowTimes.toString(),
    supplyTimes: userInfo.supplyTimes.toString(),
    repayTimes: userInfo.repayTimes.toString(),
    firstActivityBlock: userInfo.firstActivityBlock.toString(),
    liquidations: userInfo.liquidations.toString(),
  };
};

// Check if user has any activity
export const hasActivity = (userInfo: UserInfo): boolean => {
  return (
    userInfo.borrowedAmount > 0n ||
    userInfo.suppliedAmount > 0n ||
    userInfo.repaidAmount > 0n ||
    userInfo.borrowTimes > 0n ||
    userInfo.supplyTimes > 0n ||
    userInfo.repayTimes > 0n
  );
};
