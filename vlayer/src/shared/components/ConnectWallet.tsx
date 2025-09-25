import { useConnect, useAccount, useDisconnect } from "wagmi";
import { injected, metaMask } from "wagmi/connectors";
import { useState } from "react";

export const ConnectWallet = () => {
  const { connect, connectors, isPending } = useConnect();
  const { isConnected, address, chain, isConnecting } = useAccount();
  const { disconnect } = useDisconnect();
  const [showDropdown, setShowDropdown] = useState(false);

  // Show loading state while connecting
  if (isConnecting || isPending) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Connecting Wallet...
          </h2>
          <p className="text-gray-600">
            Please approve the connection in your wallet.
          </p>
        </div>
      </div>
    );
  }

  if (isConnected && address) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center space-x-2 bg-white border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors"
        >
          <div className="flex flex-col items-end">
            <div className="text-sm font-medium text-gray-900">
              {chain?.name || "Unknown Network"}
            </div>
            <div className="text-xs text-gray-500">
              {address.slice(0, 6)}...{address.slice(-4)}
            </div>
          </div>
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
        </button>
        
        {showDropdown && (
          <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
            <div className="p-2">
              <div className="px-3 py-2 text-sm text-gray-700 border-b">
                <div className="font-medium">{chain?.name}</div>
                <div className="text-xs text-gray-500">{address}</div>
              </div>
              <button
                onClick={() => {
                  disconnect();
                  setShowDropdown(false);
                }}
                className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded"
              >
                Disconnect
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px]">
      <div className="text-center max-w-md">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Connect Your Wallet
        </h2>
        <p className="text-gray-600 mb-8">
          Connect your wallet to view your DeFi activity and generate proofs
        </p>
        
        <div className="space-y-3">
          {connectors.map((connector) => (
            <button
              key={connector.uid}
              onClick={() => connect({ connector })}
              disabled={isPending}
              className="w-full flex items-center justify-center space-x-3 bg-white border border-gray-200 rounded-lg px-4 py-3 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <div className="w-6 h-6">
                {connector.name === "MetaMask" ? (
                  <svg viewBox="0 0 24 24" className="w-6 h-6">
                    <path fill="#F6851B" d="M22.56 2.44L12.3 8.8l-1.97-3.4L22.56 2.44z"/>
                    <path fill="#F6851B" d="M1.44 2.44l9.89 6.36-1.97 3.4L1.44 2.44z"/>
                    <path fill="#F6851B" d="M18.8 17.2l-2.4 3.9 5.2 1.4 1.5-5.1-4.3-.2z"/>
                    <path fill="#F6851B" d="M1.2 17.2l4.3.2L4 22.5l5.2-1.4-2.4-3.9-5.6-.2z"/>
                    <path fill="#F6851B" d="M7.2 10.4l-1.4 2.1 5 2.2.2-2.8-3.8-1.5z"/>
                    <path fill="#F6851B" d="M16.8 10.4l-3.8 1.5.2 2.8 5-2.2-1.4-2.1z"/>
                  </svg>
                ) : connector.name === "Injected" ? (
                  <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded"></div>
                ) : (
                  <div className="w-6 h-6 bg-gray-400 rounded"></div>
                )}
              </div>
              <span className="font-medium text-gray-900">
                {connector.name === "Injected" ? "Browser Wallet" : connector.name}
              </span>
            </button>
          ))}
        </div>
        
        <p className="text-xs text-gray-500 mt-4">
          Supports MetaMask, Rabby, and other browser wallets
        </p>
      </div>
    </div>
  );
};
