import * as React from "react";
import { ChevronLeftIcon } from "@heroicons/react/24/outline";
import { useCurrentStep } from "../../hooks/useCurrentStep";
import { useNavigate } from "react-router";
import { useAccount, useDisconnect } from "wagmi";
import { useState } from "react";
import { StepKind } from "../../../app/router/types";

const WalletIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
    ></path>
  </svg>
);

export const Navigation: React.FC = () => {
  const { currentStep } = useCurrentStep();
  const { isConnected, address } = useAccount();
  const navigate = useNavigate();
  const prevIsConnectedRef = React.useRef(isConnected);

  // Redirect to root page when wallet disconnects
  React.useEffect(() => {
    // Check if we transitioned from connected to disconnected
    if (prevIsConnectedRef.current && !isConnected) {
      const currentPath = window.location.pathname;
      if (currentPath !== '/' && currentPath !== '') {
        navigate('/');
      }
    }
    // Update ref for next comparison
    prevIsConnectedRef.current = isConnected;
  }, [isConnected, navigate]);

  const handleConnect = () => {
    navigate('/wallet-connect');
  };

  return (
    <Navbar>
      <div className="flex items-center gap-4">
        <BackButton />
        <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-slate-200 to-slate-400">
          VerinLayer
        </h1>
      </div>
      <div className="flex items-center">
        {isConnected && address ? (
          <WalletInfo />
        ) : (
          <button
            onClick={handleConnect}
            className="flex items-center gap-2 bg-slate-700/50 border border-slate-600 hover:bg-slate-700 text-slate-200 font-semibold py-2 px-4 rounded-lg transition-colors duration-300"
          >
            <WalletIcon className="h-5 w-5 text-cyan-400" />
            <span>Connect Wallet</span>
          </button>
        )}
      </div>
    </Navbar>
  );
};

export const Navbar: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { currentStep } = useCurrentStep();
  const { isConnected } = useAccount();

  // Always show navigation if wallet is connected, if there's a back button, or if it's the welcome page
  const shouldShow = currentStep?.backUrl || isConnected || currentStep?.kind === StepKind.welcome;

  return (
    <header 
      className="flex justify-between items-center w-full"
      style={{ opacity: shouldShow ? 1 : 0 }}
    >
      {children}
    </header>
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
      className="flex gap-1.5 justify-center items-center px-4 py-2 text-sm font-medium text-slate-200 bg-slate-700/50 border border-slate-600 hover:bg-slate-700 rounded-lg transition-colors duration-300 min-h-[32px]"
    >
      <ChevronLeftIcon className="w-4 h-4" />
      <span className="self-stretch my-auto">Back</span>
    </button>
  );
};

export const WalletInfo: React.FC = () => {
  const { isConnected, address, chain } = useAccount();
  const { disconnect } = useDisconnect();
  const navigate = useNavigate();
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
    
    // Redirect to root page
    navigate('/');
  };

  // Better chain name detection
  const getChainName = () => {
    if (chain?.name) {
      return chain.name;
    }
    
    // If we have chain ID, use mapping
    const chainIdToName: Record<number, string> = {
      1: "Ethereum",
      10: "Optimism",
      11155420: "OP Sepolia",
      8453: "Base",
      84532: "Base Sepolia",
      42161: "Arbitrum",
      421614: "Arbitrum Sepolia",
      31337: "Anvil",
      31338: "Anvil",
    };
    
    if (chain?.id) {
      return chainIdToName[chain.id] || `Chain ${chain.id}`;
    }
    
    return `Chain ${chain?.id || 'Unknown'}`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center space-x-2 bg-slate-700/50 border border-slate-600 hover:bg-slate-700 text-slate-200 font-semibold py-2 px-4 rounded-lg transition-colors duration-300 max-w-xs"
      >
        <div className="flex items-center space-x-2 min-w-0 flex-1">
          <div className="text-sm font-medium text-slate-200 truncate">
            {getChainName()}
          </div>
          <div className="text-xs text-slate-400 flex-shrink-0 font-mono">
            {address.slice(0, 6)}...{address.slice(-4)}
          </div>
        </div>
        <div className="w-2 h-2 bg-emerald-400 rounded-full flex-shrink-0"></div>
      </button>
      
      {showDropdown && (
        <div className="absolute right-0 mt-2 w-72 bg-slate-800/90 backdrop-blur-sm border border-slate-700 rounded-lg shadow-2xl z-50">
          <div className="p-2">
            <div className="px-3 py-2 text-sm text-slate-300 border-b border-slate-700">
              <div className="font-medium">{getChainName()}</div>
              <div className="text-xs text-slate-400 font-mono break-all">{address}</div>
            </div>
            <button
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-900/20 rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between transition-colors"
            >
              <span>Disconnect</span>
              {isDisconnecting && (
                <div className="w-4 h-4 border-2 border-red-500 border-t-red-600 rounded-full animate-spin"></div>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
