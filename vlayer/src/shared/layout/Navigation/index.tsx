import * as React from "react";
import { ChevronLeftIcon } from "@heroicons/react/24/outline";
import { useCurrentStep } from "../../hooks/useCurrentStep";
import { useNavigate } from "react-router";
import { useAccount, useDisconnect } from "wagmi";
import { useState } from "react";

export const Navigation: React.FC = () => {
  return (
    <Navbar>
      <div className="flex items-center">
        <BackButton />
      </div>
      <div className="flex items-center">
        <WalletInfo />
      </div>
    </Navbar>
  );
};

export const Navbar: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { currentStep } = useCurrentStep();
  const { isConnected } = useAccount();

  // Always show navigation if wallet is connected, or if there's a back button
  const shouldShow = currentStep?.backUrl || isConnected;

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 px-4 py-3"
      style={{ opacity: shouldShow ? 1 : 0 }}
    >
      <div className="flex gap-10 justify-between w-full max-w-7xl mx-auto">
        {children}
      </div>
    </nav>
  );
};

export const BackButton: React.FC = () => {
  const { currentStep } = useCurrentStep();
  const navigate = useNavigate();

  // Only show back button if there's a backUrl
  if (!currentStep?.backUrl) {
    return null;
  }

  return (
    <button
      onClick={() => {
        void navigate(currentStep.backUrl!);
      }}
      className="flex gap-1.5 justify-center items-center px-2 py-0 my-auto h-8 text-xs leading-3 text-center text-gray-800 whitespace-nowrap rounded-lg shadow-sm min-h-[32px]"
    >
      <ChevronLeftIcon className="w-4 h-4" />
      <span className="self-stretch my-auto">Back</span>
    </button>
  );
};

export const WalletInfo: React.FC = () => {
  const { isConnected, address, chain } = useAccount();
  const { disconnect } = useDisconnect();
  const [showDropdown, setShowDropdown] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  console.log("WalletInfo state:", { isConnected, address, chain: chain?.name, chainId: chain?.id });

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  // Early return after all hooks
  if (!isConnected || !address) {
    return null;
  }

  const handleDisconnect = async () => {
    console.log('Attempting to disconnect wallet from Navigation...');
    setIsDisconnecting(true);
    
    // Close dropdown immediately for better UX
    setShowDropdown(false);
    
    // Try to call disconnect first
    try {
      await disconnect();
      console.log('Wagmi disconnect successful');
    } catch (disconnectError) {
      console.warn('Wagmi disconnect failed:', disconnectError);
    }
    
    // Immediate cleanup and redirect
    try {
      // Clear all possible WalletConnect and wagmi storage
      const allKeys = [...Object.keys(localStorage), ...Object.keys(sessionStorage)];
      allKeys.forEach(key => {
        if (key.includes('walletconnect') || key.includes('wc@') || key.includes('wagmi') || key.includes('reown')) {
          localStorage.removeItem(key);
          sessionStorage.removeItem(key);
          console.log('Removed storage key:', key);
        }
      });
    } catch (cleanupError) {
      console.warn('Error during cleanup:', cleanupError);
    }
    
    // Force immediate page reload
    window.location.href = '/';
  };

  // Better chain name detection
  const getChainName = () => {
    if (chain?.name) {
      return chain.name;
    }
    
    // Fallback to chain ID mapping
    const chainIdToName: Record<number, string> = {
      1: "Ethereum Mainnet",
      10: "Optimism",
      11155420: "Optimism Sepolia",
      8453: "Base",
      84532: "Base Sepolia",
      42161: "Arbitrum One",
      421614: "Arbitrum Sepolia",
    };
    
    return chainIdToName[chain?.id || 0] || `Chain ${chain?.id || 'Unknown'}`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center space-x-2 bg-white border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50 transition-colors max-w-xs"
      >
        <div className="flex items-center space-x-2 min-w-0 flex-1">
          <div className="text-sm font-medium text-gray-900 truncate">
            {getChainName()}
          </div>
          <div className="text-xs text-gray-500 flex-shrink-0">
            {address.slice(0, 6)}...{address.slice(-4)}
          </div>
        </div>
        <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
      </button>
      
      {showDropdown && (
        <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-2">
            <div className="px-3 py-2 text-sm text-gray-700 border-b">
              <div className="font-medium">{getChainName()}</div>
              <div className="text-xs text-gray-500 font-mono break-all">{address}</div>
            </div>
            <button
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between"
            >
              <span>Disconnect</span>
              {isDisconnecting && (
                <div className="w-4 h-4 border-2 border-red-300 border-t-red-600 rounded-full animate-spin"></div>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
