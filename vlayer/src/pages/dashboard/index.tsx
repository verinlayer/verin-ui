import { FormEvent, useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { useNavigate } from "react-router";
import { ConnectWalletButton } from "../../shared/components/ConnectWalletButton";
import { SupplyBorrowDisplay } from "../../shared/components/SupplyBorrowDisplay";
import { ClaimSupplyBorrowDisplay } from "../../shared/components/ClaimSupplyBorrowDisplay";
import { HodlerForm } from "../../shared/forms/HodlerForm";
import { useProver } from "../../shared/hooks/useProver";
import { type SupplyBorrowData } from "../../shared/lib/aave-subgraph";
import { type ProtocolType, getProtocolMetadata, loadTokensToProve, getTokensToProve, getFallbackTokensToProve, type ProtocolTokenConfig } from "../../shared/lib/utils";
import { getUnclaimedSupplyBorrowDataWithProtocol } from "../../shared/lib/aave-subgraph";
import { getContractAddresses } from "../../../config-global";
import { getStepPath } from "../../app/router/steps";
import { StepKind } from "../../app/router/types";

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="text-sm font-semibold text-slate-400 mb-3 tracking-wider uppercase">{children}</h3>
);

export const DashboardPage = () => {
  const { address, chain, isConnected } = useAccount();
  const navigate = useNavigate();
  const [selectedProtocol, setSelectedProtocol] = useState<ProtocolType | null>(null);
  const [unclaimedSupplyBorrowData, setUnclaimedSupplyBorrowData] = useState<SupplyBorrowData[]>([]);
  const [tokensToProve, setTokensToProve] = useState<ProtocolTokenConfig[]>([]);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);
  const [isLoadingUnclaimed, setIsLoadingUnclaimed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNoDataWarning, setShowNoDataWarning] = useState(false);
  const { callProver, result } = useProver();

  const availableProtocols: ProtocolType[] = ['AAVE', 'COMPOUND', 'MORPHO'];
  
  // Check if connected to a supported chain
  const supportedChainIds = [10, 8453, 1, 11155420, 84532, 31337, 31338];
  const isSupportedChain = chain?.id ? supportedChainIds.includes(chain.id) : null;
  const isWrongChain = isConnected && chain?.id && isSupportedChain === false;

  // Restore selected protocol from localStorage on mount
  useEffect(() => {
    const savedProtocol = localStorage.getItem('selectedProtocol') as ProtocolType | null;
    if (savedProtocol && availableProtocols.includes(savedProtocol)) {
      setSelectedProtocol(savedProtocol);
    } else {
      // Default to first protocol if none saved
      setSelectedProtocol(availableProtocols[0]);
    }
  }, []);

  // Load tokens and unclaimed data when protocol or wallet changes
  useEffect(() => {
    const loadWalletData = async () => {
      if (!address || !chain?.id || !selectedProtocol || !isConnected) {
        setUnclaimedSupplyBorrowData([]);
        setTokensToProve([]);
        return;
      }

      if (isWrongChain) {
        setError('Please connect to a supported network (Optimism, Base, or Ethereum Mainnet)');
        return;
      }

      setIsLoadingTokens(true);
      setIsLoadingUnclaimed(true);
      setError(null);

      try {
        // Map chain names to config keys
        let chainName = 'optimism';
        if (chain?.name) {
          const chainNameLower = chain.name.toLowerCase();
          if (chainNameLower.includes('optimism') && !chainNameLower.includes('sepolia')) {
            chainName = 'optimism';
          } else if (chainNameLower.includes('base') && !chainNameLower.includes('sepolia')) {
            chainName = 'base';
          } else if (chainNameLower.includes('base') && chainNameLower.includes('sepolia')) {
            chainName = 'baseSepolia';
          } else if (chainNameLower.includes('optimism') && chainNameLower.includes('sepolia')) {
            chainName = 'optimismSepolia';
          } else if (chainNameLower.includes('ethereum') && !chainNameLower.includes('sepolia')) {
            chainName = 'mainnet';
          } else if (chainNameLower.includes('anvil') || chainNameLower.includes('localhost')) {
            chainName = 'anvil';
          }
        }
        
        const addresses = getContractAddresses(chainName);
        const controllerAddress = addresses.controller;
        
        const [tokens, unclaimedData] = await Promise.all([
          loadTokensToProve(address, chain.id, controllerAddress, selectedProtocol),
          getUnclaimedSupplyBorrowDataWithProtocol(address, chain.id, controllerAddress, selectedProtocol)
        ]);
        
        console.log('🔑 Dashboard: Loaded tokens for proof:', tokens.length, tokens);
        console.log('📊 Dashboard: Unclaimed data:', unclaimedData.length, unclaimedData);
        
        setTokensToProve(tokens);
        setUnclaimedSupplyBorrowData(unclaimedData);
        
        if (tokens.length === 0) {
          const fallbackTokens = getFallbackTokensToProve();
          console.log('⚠️ Dashboard: No tokens found, using fallback tokens:', fallbackTokens.length);
          setTokensToProve(fallbackTokens);
        }
      } catch (err) {
        console.error("Error loading wallet data:", err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(`Failed to load data: ${errorMessage}`);
        const fallbackTokens = getFallbackTokensToProve();
        setTokensToProve(fallbackTokens);
        setUnclaimedSupplyBorrowData([]);
      } finally {
        setIsLoadingTokens(false);
        setIsLoadingUnclaimed(false);
      }
    };

    loadWalletData();
  }, [address, chain?.id, chain?.name, isWrongChain, selectedProtocol, isConnected]);

  // Update localStorage when protocol changes
  useEffect(() => {
    if (selectedProtocol) {
      localStorage.setItem('selectedProtocol', selectedProtocol);
    }
  }, [selectedProtocol]);

  // Handle prover result
  useEffect(() => {
    if (result) {
      void navigate(`/${getStepPath(StepKind.showBalance)}`);
      setIsLoading(false);
    }
  }, [result, navigate]);

  // Handle submit for proof generation
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setShowNoDataWarning(false);
    
    try {
      const formData = new FormData(e.target as HTMLFormElement);
      const holderAddress = formData.get("holderAddress") as `0x${string}`;
      
      const currentTokens = getTokensToProve();
      
      if (currentTokens.length === 0) {
        setError('No data for proof generation');
        setShowNoDataWarning(true);
        setIsLoading(false);
        return;
      }
      
      await callProver([holderAddress, currentTokens]);
    } catch (err) {
      console.error('Error generating proof:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to generate proof: ${errorMessage}`);
      setIsLoading(false);
    }
  };


  if (!isConnected || !address) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[60vh] w-full">
        <ConnectWalletButton />
      </div>
    );
  }

  if (isWrongChain) {
    return (
      <div className="mb-4 p-4 bg-red-900/20 border border-red-500/50 text-red-400 rounded-lg backdrop-blur-sm">
        <div className="flex items-start">
          <svg className="w-6 h-6 text-red-400 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div className="flex-1">
            <h3 className="text-lg font-bold mb-2">⚠️ Unsupported Network</h3>
            <p className="text-sm mb-2">
              Current network: <strong>{chain?.name || 'Unknown'} (ID: {chain?.id})</strong>
            </p>
            <p className="text-sm">Please connect to Optimism, Base, or Ethereum Mainnet to view your dashboard.</p>
          </div>
        </div>
      </div>
    );
  }

  // Show protocol selection if no protocol selected
  if (!selectedProtocol) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-4 sm:p-6 lg:p-8 shadow-2xl shadow-slate-950/50 max-w-4xl mx-auto">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">
            Dashboard
          </h1>
          <p className="text-sm sm:text-base text-slate-400 mt-2">Select a protocol to view your claimed and unclaimed data</p>
        </div>
        <div>
          <SectionTitle>Select Protocol</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {availableProtocols.map((protocol) => {
              const metadata = getProtocolMetadata(protocol);
              return (
                <button
                  key={protocol}
                  onClick={() => setSelectedProtocol(protocol)}
                  className="w-full flex flex-col items-center justify-center p-4 sm:p-6 rounded-lg transition-all duration-300 transform hover:scale-105 bg-slate-700/50 border-2 border-slate-600 hover:border-slate-500 min-h-[120px] sm:min-h-[140px]"
                >
                  <img 
                    src={metadata.image} 
                    alt={metadata.displayName} 
                    className="w-12 h-12 sm:w-16 sm:h-16 object-contain mb-2 sm:mb-3" 
                  />
                  <span className="text-sm sm:text-base font-semibold text-slate-100 text-center">{metadata.displayName}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Show dashboard with claimed and unclaimed data
  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6">
      <div className="text-center mb-4 sm:mb-6">
        {/* <h1 className="text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">
          Dashboard
        </h1> */}
        <p className="text-sm sm:text-base text-slate-400 mt-2">Choose a protocol to view your claimed and unclaimed DeFi activity</p>
      </div>

      {error && (
        <div className={`mb-4 p-3 text-xs sm:text-sm border rounded backdrop-blur-sm ${
          error.includes('✅') 
            ? 'bg-green-900/20 border-green-500/50 text-green-400' 
            : error.includes('❌')
            ? 'bg-red-900/20 border-red-500/50 text-red-400'
            : 'bg-yellow-900/20 border-yellow-500/50 text-yellow-400'
        }`}>
          {error}
        </div>
      )}

      {/* Protocol selector */}
      <div className="mb-4 sm:mb-6 flex flex-wrap items-center justify-center gap-2 sm:gap-4">
        {availableProtocols.map((protocol) => {
          const metadata = getProtocolMetadata(protocol);
          const isSelected = selectedProtocol === protocol;
          return (
            <button
              key={protocol}
              onClick={() => setSelectedProtocol(protocol)}
              className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-all duration-300 ${
                isSelected
                  ? 'bg-cyan-500/10 border-2 border-cyan-400 shadow-lg shadow-cyan-500/10'
                  : 'bg-slate-700/50 border-2 border-slate-600 hover:border-slate-500'
              }`}
            >
              <img 
                src={metadata.image} 
                alt={metadata.displayName} 
                className="w-4 h-4 sm:w-6 sm:h-6 object-contain" 
              />
              <span className={`text-xs sm:text-sm font-semibold ${isSelected ? 'text-cyan-300' : 'text-slate-200'}`}>
                {metadata.displayName}
              </span>
            </button>
          );
        })}
      </div>

      {/* Display claimed supply and borrow data */}
      <div className="mb-6">
        <ClaimSupplyBorrowDisplay 
          isLoading={false}
          protocol={selectedProtocol}
          onChangeProtocol={() => {
            // Reset protocol selection to show protocol selector
            setSelectedProtocol(null);
          }}
        />
      </div>
      
      {/* Display unclaimed supply and borrow data */}
      <div className="mb-6">
        <SupplyBorrowDisplay 
          data={unclaimedSupplyBorrowData} 
          isLoading={isLoadingUnclaimed}
          showTitle={true}
          title="Summary of Unclaimed Data"
        />
      </div>
      
      {/* Get Proof button */}
      <div className="mt-8 mb-6 flex flex-col items-center justify-center w-full px-4" style={{ minHeight: '80px' }}>
        {showNoDataWarning && (
          <p className="mb-3 text-sm text-yellow-400 text-center max-w-md bg-yellow-900/20 px-3 py-2 rounded border border-yellow-500/30">
            ⚠️ No data for proof generation.
          </p>
        )}
        <div 
          onClick={(e) => {
            if (tokensToProve.length === 0 && !isLoadingTokens && unclaimedSupplyBorrowData.length === 0) {
              e.preventDefault();
              e.stopPropagation();
              setShowNoDataWarning(true);
            }
          }}
          className="cursor-pointer"
        >
          <HodlerForm
            holderAddress={address!}
            onSubmit={handleSubmit}
            isLoading={isLoading || isLoadingTokens}
            loadingLabel={isLoadingTokens ? "Loading tokens..." : "Generating proof..."}
            submitLabel="Get proof"
            isEditable={true}
            isDisabled={tokensToProve.length === 0 && !isLoadingTokens}
          />
        </div>
      </div>
    </div>
  );
};

