import { FormEvent, useEffect, useState } from "react";
import { useProver } from "../../shared/hooks/useProver";
import { useNavigate } from "react-router";
import { getStepPath } from "../../app/router/steps";
import { StepKind } from "../../app/router/types";
import { HodlerForm } from "../../shared/forms/HodlerForm";
import { ConnectWalletButton } from "../../shared/components/ConnectWalletButton";
import { SupplyBorrowDisplay } from "../../shared/components/SupplyBorrowDisplay";
import { ClaimSupplyBorrowDisplay } from "../../shared/components/ClaimSupplyBorrowDisplay";
import { type SupplyBorrowData } from "../../shared/lib/aave-subgraph";
import { loadTokensToProve, getTokensToProve, getFallbackTokensToProve, type ProtocolTokenConfig, type ProtocolType, getProtocolMetadata } from "../../shared/lib/utils";
import { getSupplyBorrowDataForUser, getUnclaimedSupplyBorrowDataWithProtocol, getTokenConfigsForUnclaimedData } from "../../shared/lib/aave-subgraph";
import { useAccount } from "wagmi";
import { getContractAddresses } from "../../../config-global";

export const WelcomePage = () => {
  const { address, chain, isConnected, isConnecting } = useAccount();
  console.log("Wallet state:", { address, isConnected, isConnecting, chain: chain?.name });
  
  // Check if connected to a supported chain
  const supportedChainIds = [
    10, // Optimism Mainnet
    8453, // Base Mainnet
    1, // Ethereum Mainnet
    11155420, // Optimism Sepolia
    84532, // Base Sepolia
    31337, 31338 // Anvil
  ];
  
  // Only check for wrong chain if we have a valid chain ID
  // During network switches, chain.id can be temporarily undefined
  const isSupportedChain = chain?.id ? supportedChainIds.includes(chain.id) : null;
  const isWrongChain = isConnected && chain?.id && isSupportedChain === false;
  
  console.log("Chain validation:", {
    chainId: chain?.id,
    chainName: chain?.name,
    isSupportedChain,
    isWrongChain,
    isConnected,
    supportedChainIds
  });
  const navigate = useNavigate();
  const [selectedProtocol, setSelectedProtocol] = useState<ProtocolType | null>(null);
  
  // Define available protocols (only AAVE and COMPOUND are currently supported)
  const availableProtocols: ProtocolType[] = ['AAVE', 'COMPOUND'];
  
  // Define coming soon protocols
  const comingSoonProtocols: ProtocolType[] = ['FLUID', 'MORPHO'];
  
  // Define protocol border colors for UI
  const protocolBorderColors: Record<ProtocolType, { default: string; hover: string }> = {
    'AAVE': { default: 'border-blue-400', hover: 'hover:border-blue-600' },
    'COMPOUND': { default: 'border-green-400', hover: 'hover:border-green-600' },
    'FLUID': { default: 'border-purple-400', hover: 'hover:border-purple-600' },
    'MORPHO': { default: 'border-indigo-400', hover: 'hover:border-indigo-600' },
    'SPARK': { default: 'border-orange-400', hover: 'hover:border-orange-600' },
    'MAPPLE': { default: 'border-pink-400', hover: 'hover:border-pink-600' },
    'GEARBOX': { default: 'border-red-400', hover: 'hover:border-red-600' },
  };
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);
  const [tokensToProve, setTokensToProve] = useState<ProtocolTokenConfig[]>([]);
  const [supplyBorrowData, setSupplyBorrowData] = useState<SupplyBorrowData[]>([]);
  const [unclaimedSupplyBorrowData, setUnclaimedSupplyBorrowData] = useState<SupplyBorrowData[]>([]);
  const [isLoadingSupplyBorrow, setIsLoadingSupplyBorrow] = useState(false);
  const [isLoadingUnclaimed, setIsLoadingUnclaimed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const defaultTokenHolder = import.meta.env
    .VITE_DEFAULT_TOKEN_HOLDER as `0x${string}`;
  const { callProver, result } = useProver();

  // Restore selected protocol from localStorage on mount
  useEffect(() => {
    const savedProtocol = localStorage.getItem('selectedProtocol') as ProtocolType | null;
    if (savedProtocol && availableProtocols.includes(savedProtocol)) {
      setSelectedProtocol(savedProtocol);
    }
  }, []); // Run only on mount

  // Update localStorage when selectedProtocol changes
  useEffect(() => {
    console.log('selectedProtocol changed to:', selectedProtocol);
    if (selectedProtocol) {
      localStorage.setItem('selectedProtocol', selectedProtocol);
      console.log('Updated localStorage with:', selectedProtocol);
    } else {
      // Clear localStorage when protocol is unselected
      localStorage.removeItem('selectedProtocol');
      console.log('Removed selectedProtocol from localStorage');
    }
  }, [selectedProtocol]);

  // Load token configs and supply/borrow data when protocol is selected or address/chain changes
  useEffect(() => {
    const loadData = async () => {
      if (!address || !selectedProtocol) return;
      
      // Don't load data if connected to wrong chain
      if (isWrongChain) {
        console.log('Skipping data load - connected to wrong chain:', chain?.name);
        return;
      }
      
      // Clear previous tokens when protocol changes
      setTokensToProve([]);
      
      setIsLoadingTokens(true);
      setIsLoadingSupplyBorrow(true);
      setIsLoadingUnclaimed(true);
      setError(null);
      
      try {
        console.log(`🔄 Loading ${selectedProtocol} data for address:`, address);
        console.log("🌐 Current chain:", chain?.name, "ID:", chain?.id);
        
        // Get contract addresses for the current chain based on protocol
        let verifierAddress: string | undefined;
        let controllerAddress: string | undefined;
        try {
          // Map chain names to our config keys
          let chainName = 'optimism'; // default
          if (chain?.name) {
            const chainNameLower = chain.name.toLowerCase();
            if (chainNameLower.includes('optimism') && !chainNameLower.includes('sepolia')) {
              chainName = 'optimism';
            } else if (chainNameLower.includes('optimism') && chainNameLower.includes('sepolia')) {
              chainName = 'optimismSepolia';
            } else if (chainNameLower.includes('ethereum') && !chainNameLower.includes('sepolia')) {
              chainName = 'mainnet';
            } else if (chainNameLower.includes('base') && !chainNameLower.includes('sepolia')) {
              chainName = 'base';
            } else if (chainNameLower.includes('base') && chainNameLower.includes('sepolia')) {
              chainName = 'baseSepolia';
            } else if (chainNameLower.includes('anvil') || chainNameLower.includes('localhost')) {
              chainName = 'anvil';
            }
          }
          
          console.log(`Using chain config: ${chainName} for chain: ${chain?.name}`);
          
          // Get addresses (same for both protocols)
          const addresses = getContractAddresses(chainName);
          verifierAddress = addresses.verifier;
          controllerAddress = addresses.controller;
        } catch (err) {
          console.warn("Could not get contract addresses:", err);
        }
        
        // Load token configs, claimed data, and unclaimed data in parallel
        // const [tokens, supplyBorrow, unclaimedData] = await Promise.all([
        const [tokens, unclaimedData] = await Promise.all([
          loadTokensToProve(address, chain?.id, controllerAddress, selectedProtocol),
          // getTokenConfigsForUnclaimedData(address, chain?.id, controllerAddress),
          // getSupplyBorrowDataForUser(address, chain?.id),
          getUnclaimedSupplyBorrowDataWithProtocol(address, chain?.id, controllerAddress, selectedProtocol)
        ]);
        
        setTokensToProve(tokens);
        // setSupplyBorrowData(supplyBorrow);
        setUnclaimedSupplyBorrowData(unclaimedData);
        
        // If no tokens found from subgraph, try fallback
        if (tokens.length === 0) {
          console.log("⚠️ No tokens found from subgraph, trying fallback...");
          const fallbackTokens = getFallbackTokensToProve();
          setTokensToProve(fallbackTokens);
          // setError(`No ${selectedProtocol} activity found for this address.`);
        } else {
          setError(null); // Clear any previous errors
        }
      } catch (err) {
        console.error("❌ Error loading data:", err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(`Failed to load token data: ${errorMessage}. Using fallback configuration.`);
        // Use fallback tokens on error
        const fallbackTokens = getFallbackTokensToProve();
        setTokensToProve(fallbackTokens);
        // setSupplyBorrowData([]);
        setUnclaimedSupplyBorrowData([]);
      } finally {
        setIsLoadingTokens(false);
        setIsLoadingSupplyBorrow(false);
        setIsLoadingUnclaimed(false);
      }
    };

    loadData();
  }, [address, chain?.id, isWrongChain, selectedProtocol]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      const formData = new FormData(e.target as HTMLFormElement);
      const holderAddress = formData.get("holderAddress") as `0x${string}`;
      
      // Get current token configs (either loaded or fallback)
      const currentTokens = getTokensToProve();
      
      if (currentTokens.length === 0) {
        setError("No token configurations available. Please try again.");
        setIsLoading(false);
        return;
      }
      
      // Note: selectedProtocol is already stored in localStorage via useEffect
      
      console.log("=== PROVER CALL DEBUG ===");
      console.log("Selected Protocol:", selectedProtocol);
      console.log("Number of tokens:", currentTokens.length);
      console.log("Token type:", currentTokens[0] && ('aTokenAddress' in currentTokens[0] ? 'AAVE' : 'COMPOUND'));
      console.log("All tokens:", currentTokens);
      console.log("=========================");
      
      await callProver([holderAddress, currentTokens]);
    } catch (err) {
      console.error("Error calling prover:", err);
      setError("Failed to generate proof. Please try again.");
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (result) {
      void navigate(`/${getStepPath(StepKind.showBalance)}`);
      setIsLoading(false);
    }
  }, [result]);

  // Show loading state while checking wallet connection

  // Show connect wallet if not connected
  if (!isConnected || !address) {
    return (
      <div>
        {/* Project Cards Section */}
        <div className="mb-4">
          <div className="text-2xl font-bold mb-3 text-gray-900 text-center">
            Supporting projects
          </div>
          <div className="flex flex-wrap gap-4 mb- justify-center">
            {availableProtocols.map((protocol) => {
              const metadata = getProtocolMetadata(protocol);
              return (
                <div 
                  key={protocol}
                  className="bg-white border border-gray-200 rounded-lg p-4 w-full max-w-md flex items-center shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div>
                    <img 
                      src={metadata.image} 
                      alt={metadata.displayName} 
                      className="w-12 h-12 object-contain" 
                    />
                  </div>
                  <div className="ml-4">
                    <div className="text-xl font-bold text-gray-900">{metadata.displayName}</div>
                    {metadata.description && (
                      <div className="text-sm text-gray-600 mt-1">
                        {metadata.description}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-2xl font-bold mb-4 mt-12 text-gray-900 text-center">Coming soon</div>
          <div className="flex flex-wrap gap-4 justify-center">
            {comingSoonProtocols.map((protocol) => {
              const metadata = getProtocolMetadata(protocol);
              return (
                <div 
                  key={protocol}
                  className="bg-white border border-gray-200 rounded-lg p-4 w-full max-w-md flex items-center shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div>
                    <img 
                      src={metadata.image} 
                      alt={metadata.displayName} 
                      className="w-12 h-12 object-contain" 
                    />
                  </div>
                  <div className="ml-4">
                    <div className="text-xl font-bold text-gray-900">{metadata.displayName}</div>
                    {metadata.description && (
                      <div className="text-sm text-gray-600 mt-1">
                        {metadata.description}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        <ConnectWalletButton />
      </div>
    );
  }

  // If no protocol selected yet, show protocol selection
  if (!selectedProtocol) {
    return (
      <div>
        {/* Wrong Chain Warning */}
        {isWrongChain && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            <div className="flex items-start">
              <svg className="w-6 h-6 text-red-500 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <h3 className="text-lg font-bold mb-2">⚠️ Unsupported Network</h3>
                <p className="text-sm mb-2">
                  Current network: <strong>{chain?.name || 'Unknown'} (ID: {chain?.id})</strong>
                </p>
                <div className="bg-white border border-red-300 rounded p-3 mb-3">
                  <p className="text-sm font-semibold mb-2">Please switch to a supported network:</p>
                  <ul className="text-sm space-y-1 list-disc list-inside">
                    <li>Base Mainnet (ID: 8453)</li>
                    <li>Optimism Mainnet (ID: 10)</li>
                  </ul>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
                  >
                    Refresh Page
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Protocol Selection */}
        <div className="mb-6">
          <div className="text-2xl font-bold mb-4 text-gray-900 text-center">
            Select a Protocol
          </div>
          <div className="flex flex-wrap gap-4 justify-center">
            {availableProtocols.map((protocol) => {
              const metadata = getProtocolMetadata(protocol);
              const borderColors = protocolBorderColors[protocol];
              return (
                <div 
                  key={protocol}
                  onClick={() => {
                    if (!isWrongChain) {
                      console.log('Selecting protocol:', protocol);
                      setSelectedProtocol(protocol);
                    }
                  }}
                  className={`bg-white border-2 rounded-lg p-6 w-full max-w-md flex items-center shadow-md transition-all cursor-pointer ${
                    isWrongChain 
                      ? 'opacity-50 cursor-not-allowed border-gray-200' 
                      : `${borderColors.default} ${borderColors.hover} hover:shadow-lg`
                  }`}
                >
                  <div>
                    <img 
                      src={metadata.image} 
                      alt={metadata.displayName} 
                      className="w-16 h-16 object-contain" 
                    />
                  </div>
                  <div className="ml-4 flex-1">
                    <div className="text-2xl font-bold text-gray-900">{metadata.displayName}</div>
                    {metadata.description && (
                      <div className="text-sm text-gray-600 mt-1">
                        {metadata.description}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Wrong Chain Error */}
      {isWrongChain && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          <div className="flex items-start">
            <svg className="w-6 h-6 text-red-500 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <h3 className="text-lg font-bold mb-2">⚠️ Unsupported Network</h3>
              <p className="text-sm mb-2">
                Current network: <strong>{chain?.name || 'Unknown'} (ID: {chain?.id})</strong>
              </p>
              <div className="bg-white border border-red-300 rounded p-3 mb-3">
                <p className="text-sm font-semibold mb-2">Please switch to a supported network:</p>
                <ul className="text-sm space-y-1 list-disc list-inside">
                  <li>Base Mainnet (ID: 8453)</li>
                  <li>Optimism Mainnet (ID: 10)</li>
                </ul>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
                >
                  Refresh Page
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {error && (
        <div className={`mb-3 p-3 border rounded ${
          error.includes('✅') 
            ? 'bg-green-100 border-green-400 text-green-700' 
            : error.includes('❌')
            ? 'bg-red-100 border-red-400 text-red-700'
            : 'bg-yellow-100 border-yellow-400 text-yellow-700'
        }`}>
          {error}
        </div>
      )}
      
      {isLoadingTokens && (
        <div className="mb-3 p-3 bg-blue-100 border border-blue-400 text-blue-700 rounded">
          Loading {selectedProtocol} token configurations from subgraph...
        </div>
      )}
      
      {/* Display claimed supply and borrow data */}
      <div className="mb-3">
        <ClaimSupplyBorrowDisplay 
          isLoading={isLoadingSupplyBorrow}
          protocol={selectedProtocol}
          onChangeProtocol={() => setSelectedProtocol(null)}
        />
      </div>
      
      {/* Display unclaimed supply and borrow data */}
      <div className="mb-3">
        <SupplyBorrowDisplay 
          data={unclaimedSupplyBorrowData} 
          isLoading={isLoadingUnclaimed} 
        />
      </div>
      
      <HodlerForm
        holderAddress={address}
        onSubmit={handleSubmit}
        isLoading={isLoading || isLoadingTokens}
        loadingLabel={isLoadingTokens ? "Loading tokens..." : "Generating proof..."}
        submitLabel="Get proof"
        isEditable={true}
        isDisabled={tokensToProve.length === 0}
      />
      
      {/* {tokensToProve.length > 0 && (
        <div className="mt-4 p-3 bg-gray-100 rounded text-sm">
          <p>Found {tokensToProve.length} token(s) to prove:</p>
          <ul className="mt-2 space-y-1">
            {tokensToProve.map((token, index) => (
              <li key={index} className="text-xs">
                {token.underlingTokenAddress.slice(0, 6)}...{token.underlingTokenAddress.slice(-4)} on Chain {token.chainId}
              </li>
            ))}
          </ul>
        </div>
      )} */}
    </div>
  );
};
