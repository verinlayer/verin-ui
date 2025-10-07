import React from "react";
import { useNavigate } from "react-router";

export const ConnectWalletButton = () => {
  const navigate = useNavigate();

  const handleConnect = () => {
    // Redirect to wallet connect page
    navigate('/wallet-connect');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[200px]">
      <div className="text-center max-w-md">
        {/* <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div> */}
        
        {/* <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Connect Your Wallet
        </h2> */}
        
        <button
          onClick={handleConnect}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span>Connect Wallet</span>
        </button>
      </div>
    </div>
  );
};
