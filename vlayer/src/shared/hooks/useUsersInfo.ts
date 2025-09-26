import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { 
  getUserInfo, 
  getAllUserInfo, 
  getUserTotalActivity, 
  formatUserInfo, 
  hasActivity,
  type UserInfo 
} from '../../../getUsersInfo';

export interface FormattedUserInfo {
  borrowedAmount: string;
  suppliedAmount: string;
  repaidAmount: string;
  latestBlock: string;
  latestBalance: string;
  borrowTimes: string;
  supplyTimes: string;
  repayTimes: string;
  firstActivityBlock: string;
  liquidations: string;
}

export interface AllUserInfo {
  aave: UserInfo | null;
  morpho: UserInfo | null;
  compound: UserInfo | null;
}

export interface TotalActivity {
  totalBorrowed: bigint;
  totalSupplied: bigint;
  totalRepaid: bigint;
  totalBorrowTimes: bigint;
  totalSupplyTimes: bigint;
  totalRepayTimes: bigint;
  protocols: AllUserInfo;
}

export const useUsersInfo = (userAddress?: `0x${string}`) => {
  const { address } = useAccount();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<{
    aave: FormattedUserInfo | null;
    morpho: FormattedUserInfo | null;
    compound: FormattedUserInfo | null;
  } | null>(null);
  const [totalActivity, setTotalActivity] = useState<TotalActivity | null>(null);

  const targetAddress = userAddress || address;

  const fetchUserInfo = async (address: `0x${string}`) => {
    if (!address) return;

    setLoading(true);
    setError(null);

    try {
      const [allInfo, totalActivityData] = await Promise.all([
        getAllUserInfo(address),
        getUserTotalActivity(address),
      ]);

      const formattedInfo = {
        aave: allInfo.aave ? formatUserInfo(allInfo.aave) : null,
        morpho: allInfo.morpho ? formatUserInfo(allInfo.morpho) : null,
        compound: allInfo.compound ? formatUserInfo(allInfo.compound) : null,
      };

      setUserInfo(formattedInfo);
      setTotalActivity(totalActivityData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to fetch user info: ${errorMessage}`);
      console.error('Error fetching user info:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshUserInfo = () => {
    if (targetAddress) {
      fetchUserInfo(targetAddress);
    }
  };

  useEffect(() => {
    if (targetAddress) {
      fetchUserInfo(targetAddress);
    }
  }, [targetAddress]);

  const getProtocolActivity = (protocol: 'aave' | 'morpho' | 'compound') => {
    if (!userInfo) return null;
    
    const info = userInfo[protocol];
    if (!info) return null;

    return {
      ...info,
      hasActivity: hasActivity({
        borrowedAmount: BigInt(info.borrowedAmount),
        suppliedAmount: BigInt(info.suppliedAmount),
        repaidAmount: BigInt(info.repaidAmount),
        latestBlock: BigInt(info.latestBlock),
        latestBalance: BigInt(info.latestBalance),
        borrowTimes: BigInt(info.borrowTimes),
        supplyTimes: BigInt(info.supplyTimes),
        repayTimes: BigInt(info.repayTimes),
      }),
    };
  };

  const getTotalActivityFormatted = () => {
    if (!totalActivity) return null;

    return {
      totalBorrowed: formatUserInfo({
        borrowedAmount: totalActivity.totalBorrowed,
        suppliedAmount: 0n,
        repaidAmount: 0n,
        latestBlock: 0n,
        latestBalance: 0n,
        borrowTimes: 0n,
        supplyTimes: 0n,
        repayTimes: 0n,
      }).borrowedAmount,
      totalSupplied: formatUserInfo({
        borrowedAmount: 0n,
        suppliedAmount: totalActivity.totalSupplied,
        repaidAmount: 0n,
        latestBlock: 0n,
        latestBalance: 0n,
        borrowTimes: 0n,
        supplyTimes: 0n,
        repayTimes: 0n,
      }).suppliedAmount,
      totalRepaid: formatUserInfo({
        borrowedAmount: 0n,
        suppliedAmount: 0n,
        repaidAmount: totalActivity.totalRepaid,
        latestBlock: 0n,
        latestBalance: 0n,
        borrowTimes: 0n,
        supplyTimes: 0n,
        repayTimes: 0n,
      }).repaidAmount,
      totalBorrowTimes: totalActivity.totalBorrowTimes.toString(),
      totalSupplyTimes: totalActivity.totalSupplyTimes.toString(),
      totalRepayTimes: totalActivity.totalRepayTimes.toString(),
    };
  };

  return {
    userInfo,
    totalActivity: getTotalActivityFormatted(),
    loading,
    error,
    refreshUserInfo,
    getProtocolActivity,
    hasAnyActivity: totalActivity ? (
      totalActivity.totalBorrowed > 0n ||
      totalActivity.totalSupplied > 0n ||
      totalActivity.totalRepaid > 0n
    ) : false,
  };
};

// Hook for getting info for a specific protocol
export const useProtocolInfo = (
  userAddress: `0x${string}` | undefined,
  protocol: 'AAVE' | 'MORPHO' | 'COMPOUND'
) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [protocolInfo, setProtocolInfo] = useState<FormattedUserInfo | null>(null);

  const fetchProtocolInfo = async (address: `0x${string}`) => {
    setLoading(true);
    setError(null);

    try {
      const info = await getUserInfo(address, protocol);
      setProtocolInfo(formatUserInfo(info));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to fetch ${protocol} info: ${errorMessage}`);
      console.error(`Error fetching ${protocol} info:`, err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userAddress) {
      fetchProtocolInfo(userAddress);
    }
  }, [userAddress, protocol]);

  return {
    protocolInfo,
    loading,
    error,
    refresh: () => userAddress && fetchProtocolInfo(userAddress),
  };
};
