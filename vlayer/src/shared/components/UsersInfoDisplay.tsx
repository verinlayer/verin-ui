import React from 'react';
import { useUsersInfo } from '../hooks/useUsersInfo';

interface UsersInfoDisplayProps {
  userAddress?: `0x${string}`;
  className?: string;
}

export const UsersInfoDisplay: React.FC<UsersInfoDisplayProps> = ({ 
  userAddress, 
  className = '' 
}) => {
  const { 
    userInfo, 
    totalActivity, 
    loading, 
    error, 
    refreshUserInfo,
    hasAnyActivity 
  } = useUsersInfo(userAddress);

  if (loading) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
            <div className="h-3 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 bg-red-100 border border-red-400 text-red-700 rounded ${className}`}>
        <div className="flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={refreshUserInfo}
            className="ml-2 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!userInfo || !hasAnyActivity) {
    return (
      <div className={`p-4 bg-gray-100 border border-gray-300 text-gray-600 rounded ${className}`}>
        <h3 className="text-lg font-semibold mb-2">User Activity</h3>
        <p>No activity found for this address.</p>
      </div>
    );
  }

  const ProtocolCard: React.FC<{
    title: string;
    data: any;
    color: string;
  }> = ({ title, data, color }) => {
    if (!data) return null;

    return (
      <div className={`p-4 border rounded-lg ${color}`}>
        <h4 className="font-semibold text-lg mb-3">{title}</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="font-medium">Borrowed:</span>
            <span className="ml-2">{data.borrowedAmount}</span>
          </div>
          <div>
            <span className="font-medium">Supplied:</span>
            <span className="ml-2">{data.suppliedAmount}</span>
          </div>
          <div>
            <span className="font-medium">Repaid:</span>
            <span className="ml-2">{data.repaidAmount}</span>
          </div>
          <div>
            <span className="font-medium">Latest Balance:</span>
            <span className="ml-2">{data.latestBalance}</span>
          </div>
          <div>
            <span className="font-medium">Borrow Times:</span>
            <span className="ml-2">{data.borrowTimes}</span>
          </div>
          <div>
            <span className="font-medium">Supply Times:</span>
            <span className="ml-2">{data.supplyTimes}</span>
          </div>
          <div>
            <span className="font-medium">Repay Times:</span>
            <span className="ml-2">{data.repayTimes}</span>
          </div>
          <div>
            <span className="font-medium">Latest Block:</span>
            <span className="ml-2">{data.latestBlock}</span>
          </div>
          <div>
            <span className="font-medium">First Activity Block:</span>
            <span className="ml-2">{data.firstActivityBlock}</span>
          </div>
          <div>
            <span className="font-medium">Liquidations:</span>
            <span className="ml-2">{data.liquidations}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold">User DeFi Activity</h3>
        <button
          onClick={refreshUserInfo}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Refresh
        </button>
      </div>

      {/* Total Activity Summary */}
      {totalActivity && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-semibold text-lg mb-3 text-blue-800">Total Activity Summary</h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-medium">Total Borrowed:</span>
              <span className="ml-2 text-blue-600">{totalActivity.totalBorrowed}</span>
            </div>
            <div>
              <span className="font-medium">Total Supplied:</span>
              <span className="ml-2 text-blue-600">{totalActivity.totalSupplied}</span>
            </div>
            <div>
              <span className="font-medium">Total Repaid:</span>
              <span className="ml-2 text-blue-600">{totalActivity.totalRepaid}</span>
            </div>
            <div>
              <span className="font-medium">Total Borrow Times:</span>
              <span className="ml-2 text-blue-600">{totalActivity.totalBorrowTimes}</span>
            </div>
            <div>
              <span className="font-medium">Total Supply Times:</span>
              <span className="ml-2 text-blue-600">{totalActivity.totalSupplyTimes}</span>
            </div>
            <div>
              <span className="font-medium">Total Repay Times:</span>
              <span className="ml-2 text-blue-600">{totalActivity.totalRepayTimes}</span>
            </div>
          </div>
        </div>
      )}

      {/* Protocol-specific data */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ProtocolCard
          title="Aave Protocol"
          data={userInfo.aave}
          color="bg-green-50 border-green-200"
        />
        <ProtocolCard
          title="Morpho Protocol"
          data={userInfo.morpho}
          color="bg-purple-50 border-purple-200"
        />
        <ProtocolCard
          title="Compound Protocol"
          data={userInfo.compound}
          color="bg-orange-50 border-orange-200"
        />
      </div>
    </div>
  );
};

export default UsersInfoDisplay;

