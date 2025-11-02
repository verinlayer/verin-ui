import * as React from "react";
import { ChevronLeftIcon } from "@heroicons/react/24/outline";
import { useCurrentStep } from "../../hooks/useCurrentStep";
import { useNavigate, useLocation } from "react-router";
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
  const location = useLocation();
  const prevIsConnectedRef = React.useRef(isConnected);
  
  // Determine active navigation button based on current path
  const isHomeActive = location.pathname === '/';
  const isDashboardActive = location.pathname === '/dashboard';

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

  const handleHome = () => {
    // Clear manual fetch data when navigating to home if wallet is not connected
    if (!isConnected) {
      localStorage.removeItem('fetchedUnclaimedData');
      localStorage.removeItem('fetchedWalletAddress');
      localStorage.removeItem('fetchedNetwork');
    }
    navigate('/');
  };

  const handleDashboard = () => {
    if (!isConnected) {
      navigate('/app');
    } else {
      navigate('/dashboard');
    }
  };

  const handleCLending = () => {
    window.open('https://c-lending-ui.vercel.app/#/', '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      <Navbar>
        {/* Left Section */}
        <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0 z-20">
          <BackButton />
          <h1 className="text-base sm:text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-slate-200 to-slate-400 whitespace-nowrap">
            VerinLayer
          </h1>
        </div>
        
        {/* Desktop Navigation - Centered */}
        <div className="hidden md:flex absolute left-1/2 transform -translate-x-1/2 items-center gap-2 lg:gap-3 xl:gap-4 z-10 pointer-events-none">
          <div className="flex items-center gap-2 lg:gap-3 xl:gap-4 pointer-events-auto">
            <button
              onClick={handleHome}
              className={`px-3 lg:px-4 xl:px-6 py-2 lg:py-2.5 xl:py-3 text-sm lg:text-base xl:text-lg font-semibold rounded-lg transition-colors duration-300 whitespace-nowrap ${
                isHomeActive
                  ? 'text-white bg-cyan-500 border-2 border-cyan-400 shadow-lg shadow-cyan-500/20'
                  : 'text-slate-200 bg-slate-700/50 border border-slate-600 hover:bg-slate-700'
              }`}
            >
              Home
            </button>
            <button
              onClick={handleDashboard}
              className={`px-3 lg:px-4 xl:px-6 py-2 lg:py-2.5 xl:py-3 text-sm lg:text-base xl:text-lg font-semibold rounded-lg transition-colors duration-300 whitespace-nowrap ${
                isDashboardActive
                  ? 'text-white bg-cyan-500 border-2 border-cyan-400 shadow-lg shadow-cyan-500/20'
                  : 'text-slate-200 bg-slate-700/50 border border-slate-600 hover:bg-slate-700'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={handleCLending}
              className="px-3 lg:px-4 xl:px-6 py-2 lg:py-2.5 xl:py-3 text-sm lg:text-base xl:text-lg font-semibold text-slate-200 bg-slate-700/50 border border-slate-600 hover:bg-slate-700 rounded-lg transition-colors duration-300 whitespace-nowrap"
            >
              CLending
            </button>
          </div>
        </div>
        
        {/* Right Section */}
        <div className="flex items-center flex-shrink-0 z-20">
          {isConnected && address ? (
            <WalletInfo />
          ) : (
            <button
              onClick={handleConnect}
              className="flex items-center gap-1 sm:gap-2 bg-slate-700/50 border border-slate-600 hover:bg-slate-700 text-slate-200 font-semibold py-1.5 sm:py-2 px-2 sm:px-4 rounded-lg transition-colors duration-300 text-xs sm:text-sm whitespace-nowrap"
            >
              <WalletIcon className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-400 flex-shrink-0" />
              <span className="hidden sm:inline">Connect Wallet</span>
              <span className="sm:hidden">Connect</span>
            </button>
          )}
        </div>
      </Navbar>
      
      {/* Mobile Navigation - Below the nav bar */}
      <div className="md:hidden w-full flex items-center justify-center gap-2 px-2 py-2 border-t border-slate-700/50 bg-slate-800/30">
        <button
          onClick={handleHome}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors duration-300 whitespace-nowrap ${
            isHomeActive
              ? 'text-white bg-cyan-500 border-2 border-cyan-400 shadow-lg shadow-cyan-500/20'
              : 'text-slate-200 bg-slate-700/50 border border-slate-600 hover:bg-slate-700'
          }`}
        >
          Home
        </button>
        <button
          onClick={handleDashboard}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors duration-300 whitespace-nowrap ${
            isDashboardActive
              ? 'text-white bg-cyan-500 border-2 border-cyan-400 shadow-lg shadow-cyan-500/20'
              : 'text-slate-200 bg-slate-700/50 border border-slate-600 hover:bg-slate-700'
          }`}
        >
          Dashboard
        </button>
        <button
          onClick={handleCLending}
          className="px-4 py-2 text-sm font-semibold text-slate-200 bg-slate-700/50 border border-slate-600 hover:bg-slate-700 rounded-lg transition-colors duration-300 whitespace-nowrap"
        >
          CLending
        </button>
      </div>
    </>
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
      className="relative flex justify-between items-center w-full gap-2 sm:gap-4 px-2 sm:px-4 md:mb-0 mb-2"
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
      className="flex gap-1 sm:gap-1.5 justify-center items-center px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-slate-200 bg-slate-700/50 border border-slate-600 hover:bg-slate-700 rounded-lg transition-colors duration-300 min-h-[28px] sm:min-h-[32px]"
    >
      <ChevronLeftIcon className="w-3 h-3 sm:w-4 sm:h-4" />
      <span className="hidden sm:inline self-stretch my-auto">Back</span>
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
        className="flex items-center space-x-1 sm:space-x-2 bg-slate-700/50 border border-slate-600 hover:bg-slate-700 text-slate-200 font-semibold py-1.5 sm:py-2 px-2 sm:px-4 rounded-lg transition-colors duration-300 max-w-[140px] sm:max-w-xs"
      >
        <div className="flex items-center space-x-1 sm:space-x-2 min-w-0 flex-1">
          <div className="text-xs sm:text-sm font-medium text-slate-200 truncate hidden sm:block">
            {getChainName()}
          </div>
          <div className="text-xs text-slate-400 flex-shrink-0 font-mono">
            {address.slice(0, 4)}...{address.slice(-3)}
          </div>
        </div>
        <div className="w-2 h-2 bg-emerald-400 rounded-full flex-shrink-0"></div>
      </button>
      
      {showDropdown && (
        <div className="absolute right-0 mt-2 w-64 sm:w-72 bg-slate-800/90 backdrop-blur-sm border border-slate-700 rounded-lg shadow-2xl z-50">
          <div className="p-2">
            <div className="px-3 py-2 text-xs sm:text-sm text-slate-300 border-b border-slate-700">
              <div className="font-medium">{getChainName()}</div>
              <div className="text-xs text-slate-400 font-mono break-all">{address}</div>
            </div>
            <button
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className="w-full text-left px-3 py-2 text-xs sm:text-sm text-red-400 hover:bg-red-900/20 rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between transition-colors"
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
