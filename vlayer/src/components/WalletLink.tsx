import React from 'react';
import { Link } from 'react-router';

export const WalletLink: React.FC = () => {
  return (
    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">Wallet Connect</h3>
        <p className="text-blue-700 mb-4">
          Try our standalone wallet connection following the{' '}
          <a 
            href="https://wagmi.sh/react/guides/connect-wallet" 
            target="_blank" 
            rel="noopener noreferrer"
            className="underline hover:text-blue-800"
          >
            Wagmi Connect Wallet Guide
          </a>
        </p>
        <Link
          to="/wallet-connect"
          className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          View Wallet Connect
        </Link>
      </div>
    </div>
  );
};
