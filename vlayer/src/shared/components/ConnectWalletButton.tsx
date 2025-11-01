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
        <button
          onClick={handleConnect}
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 flex items-center justify-center space-x-2"
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
