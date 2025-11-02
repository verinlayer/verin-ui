import { FormEvent, useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { useNavigate } from "react-router";
import { getStepPath } from "../../app/router/steps";
import { StepKind } from "../../app/router/types";
import { SupplyBorrowDisplay } from "../../shared/components/SupplyBorrowDisplay";
import { ClaimSupplyBorrowDisplay } from "../../shared/components/ClaimSupplyBorrowDisplay";
import { HodlerForm } from "../../shared/forms/HodlerForm";
import { useProver } from "../../shared/hooks/useProver";
import { type SupplyBorrowData } from "../../shared/lib/aave-subgraph";
import { type ProtocolType, getProtocolMetadata, loadTokensToProve, getTokensToProve, getFallbackTokensToProve, type ProtocolTokenConfig } from "../../shared/lib/utils";
import { getUnclaimedSupplyBorrowDataWithProtocol, getSupplyBorrowDataForUser } from "../../shared/lib/aave-subgraph";
import { getContractAddresses } from "../../../config-global";

// Network type and constants
type NetworkType = {
  id: number;
  name: string;
  icon: React.ReactNode;
};

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

const NETWORKS: NetworkType[] = [
  { id: 8453, name: 'Base Mainnet', icon: <img src="/img/base-logo.svg" alt="Base" className="h-6 w-6" /> },
  { id: 10, name: 'OP Mainnet', icon: <img src="/img/OP-logo.svg" alt="Optimism" className="h-6 w-6" /> },
];

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="text-sm font-semibold text-slate-400 mb-3 tracking-wider uppercase">{children}</h3>
);

export const WelcomePage = () => {
  const { address, chain, isConnected, isConnecting } = useAccount();
  const navigate = useNavigate();
  
  // Manual fetch state (when wallet not connected)
  const [selectedProtocol, setSelectedProtocol] = useState<ProtocolType | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<number | null>(null);
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [isFetchingData, setIsFetchingData] = useState(false);
  const [manualFetchedUnclaimedData, setManualFetchedUnclaimedData] = useState<SupplyBorrowData[] | null>(null);
  
  // Wallet-connected state
  const [walletSelectedProtocol, setWalletSelectedProtocol] = useState<ProtocolType | null>(null);
  const [tokensToProve, setTokensToProve] = useState<ProtocolTokenConfig[]>([]);
  const [supplyBorrowData, setSupplyBorrowData] = useState<SupplyBorrowData[]>([]);
  const [unclaimedSupplyBorrowData, setUnclaimedSupplyBorrowData] = useState<SupplyBorrowData[]>([]);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);
  const [isLoadingSupplyBorrow, setIsLoadingSupplyBorrow] = useState(false);
  const [isLoadingUnclaimed, setIsLoadingUnclaimed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  const { callProver, result } = useProver();
  
  // Define available protocols
  const availableProtocols: ProtocolType[] = ['AAVE', 'COMPOUND', 'MORPHO'];
  
  // Check if connected to a supported chain
  const supportedChainIds = [10, 8453, 1, 11155420, 84532, 31337, 31338];
  const isSupportedChain = chain?.id ? supportedChainIds.includes(chain.id) : null;
  const isWrongChain = isConnected && chain?.id && isSupportedChain === false;

  // When wallet connects while viewing manual fetch data, redirect to Dashboard
  useEffect(() => {
    if (isConnected && address && manualFetchedUnclaimedData) {
      // Redirect to dashboard when wallet connects after manual fetch
      navigate('/dashboard');
    }
  }, [isConnected, address, manualFetchedUnclaimedData, navigate]);

  // Restore selected protocol from localStorage on mount
  useEffect(() => {
    const savedProtocol = localStorage.getItem('selectedProtocol') as ProtocolType | null;
    if (savedProtocol && availableProtocols.includes(savedProtocol)) {
      if (isConnected) {
        setWalletSelectedProtocol(savedProtocol);
      } else {
        setSelectedProtocol(savedProtocol);
      }
    }

    // Only restore manual fetch data if wallet is NOT connected
    if (!isConnected) {
      const savedUnclaimedData = localStorage.getItem('fetchedUnclaimedData');
      if (savedUnclaimedData) {
        try {
          const parsed = JSON.parse(savedUnclaimedData);
          setManualFetchedUnclaimedData(parsed);
          const savedWalletAddress = localStorage.getItem('fetchedWalletAddress');
          const savedNetwork = localStorage.getItem('fetchedNetwork');
          if (savedWalletAddress) setWalletAddress(savedWalletAddress);
          if (savedNetwork) setSelectedNetwork(parseInt(savedNetwork));
        } catch (e) {
          console.warn('Failed to restore saved data:', e);
        }
      }
    }
  }, []); // Run only on mount

  // Load wallet data when wallet is connected
  useEffect(() => {
    const loadWalletData = async () => {
      if (!address || !walletSelectedProtocol || !isConnected) return;
      if (isWrongChain) return;
      
      setTokensToProve([]);
      setIsLoadingTokens(true);
      setIsLoadingSupplyBorrow(true);
      setIsLoadingUnclaimed(true);
      setError(null);
      
      try {
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
          loadTokensToProve(address, chain?.id, controllerAddress, walletSelectedProtocol),
          getUnclaimedSupplyBorrowDataWithProtocol(address, chain?.id, controllerAddress, walletSelectedProtocol)
        ]);
        
        setTokensToProve(tokens);
        setUnclaimedSupplyBorrowData(unclaimedData);
        
        if (tokens.length === 0) {
          const fallbackTokens = getFallbackTokensToProve();
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
        setIsLoadingSupplyBorrow(false);
        setIsLoadingUnclaimed(false);
      }
    };

    loadWalletData();
  }, [address, chain?.id, isWrongChain, walletSelectedProtocol, isConnected]);

  // Update localStorage when protocol changes
  useEffect(() => {
    const protocolToSave = isConnected ? walletSelectedProtocol : selectedProtocol;
    if (protocolToSave) {
      localStorage.setItem('selectedProtocol', protocolToSave);
    } else {
      localStorage.removeItem('selectedProtocol');
    }
  }, [selectedProtocol, walletSelectedProtocol, isConnected]);

  // Handle prover result
  useEffect(() => {
    if (result) {
      void navigate(`/${getStepPath(StepKind.showBalance)}`);
      setIsLoading(false);
    }
  }, [result, navigate]);

  // Handle submit for wallet-connected flow
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      const formData = new FormData(e.target as HTMLFormElement);
      const holderAddress = formData.get("holderAddress") as `0x${string}`;
      
      const currentTokens = getTokensToProve();
      
      if (currentTokens.length === 0) {
        setError("No token configurations available. Please try again.");
        setIsLoading(false);
        return;
      }
      
      await callProver([holderAddress, currentTokens]);
    } catch (err) {
      console.error("Error calling prover:", err);
      setError("Failed to generate proof. Please try again.");
      setIsLoading(false);
    }
  };

  const handleFetchData = async () => {
    if (!walletAddress || !selectedProtocol || !selectedNetwork) {
      setError('Please select protocol, network, and enter wallet address.');
      return;
    }

    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      setError('Please enter a valid wallet address (0x...).');
      return;
    }

    setIsFetchingData(true);
    setError(null);
    setManualFetchedUnclaimedData(null);

    try {
      // Map network ID to chain name for contract addresses
      let chainName = 'optimism'; // default
      if (selectedNetwork === 10) {
        chainName = 'optimism';
      } else if (selectedNetwork === 8453) {
        chainName = 'base';
      }

      const addresses = getContractAddresses(chainName);
      const controllerAddress = addresses.controller;

      console.log(`Fetching ${selectedProtocol} data for ${walletAddress} on chain ${selectedNetwork}`);

      // Fetch only unclaimed data
      const unclaimedData = await getUnclaimedSupplyBorrowDataWithProtocol(walletAddress, selectedNetwork, controllerAddress, selectedProtocol);

      setManualFetchedUnclaimedData(unclaimedData);
      
      // Save to localStorage to persist across wallet connection/disconnection
      localStorage.setItem('fetchedUnclaimedData', JSON.stringify(unclaimedData));
      localStorage.setItem('fetchedWalletAddress', walletAddress);
      localStorage.setItem('fetchedNetwork', selectedNetwork.toString());
      
      if (unclaimedData.length === 0) {
        setError(`No ${selectedProtocol} unclaimed activity found for this address on the selected network.`);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to fetch data: ${errorMessage}`);
    } finally {
      setIsFetchingData(false);
    }
  };

  // If manual fetch data exists, show it even when wallet is connected
  // User can see their manually fetched data and optionally switch to wallet flow
  if (manualFetchedUnclaimedData && manualFetchedUnclaimedData.length > 0) {
    return (
      <div>
        {/* Show option to view wallet data if connected */}
        {isConnected && address && (
          <div className="mb-4 p-4 bg-cyan-900/20 border border-cyan-500/50 rounded-lg backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-cyan-300 mb-1">Wallet Connected</h3>
                <p className="text-sm text-cyan-200/80">
                  You can view your connected wallet data by selecting a protocol below, or continue viewing manually fetched data.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Back button to fetch new data */}
        <div className="mb-4">
          <button
            onClick={() => {
              setManualFetchedUnclaimedData(null);
              setError(null);
              // Clear saved data from localStorage
              localStorage.removeItem('fetchedUnclaimedData');
              localStorage.removeItem('fetchedWalletAddress');
              localStorage.removeItem('fetchedNetwork');
            }}
            className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Fetch Another Address</span>
          </button>
        </div>

        {error && (
          <div className="mb-3 p-3 bg-red-900/20 border border-red-500/50 text-red-400 rounded backdrop-blur-sm">
            {error}
          </div>
        )}

        {/* Display only unclaimed data from manual fetch */}
        <div className="mb-6">
          <SupplyBorrowDisplay 
            data={manualFetchedUnclaimedData} 
            isLoading={false} 
          />
        </div>

        {/* Show wallet protocol selection if wallet is connected */}
        {isConnected && address && !walletSelectedProtocol && (
          <div className="mt-8 p-6 bg-slate-800/50 border border-slate-700 rounded-xl">
            <h3 className="text-xl font-semibold text-slate-100 mb-4 text-center">
              Or view your connected wallet data
            </h3>
            <div className="flex flex-wrap gap-4 justify-center">
              {availableProtocols.map((protocol) => {
                const metadata = getProtocolMetadata(protocol);
                return (
                  <button
                    key={protocol}
                    onClick={() => {
                      if (!isWrongChain) {
                        setWalletSelectedProtocol(protocol);
                      }
                    }}
                    className="bg-slate-700/50 border-2 border-slate-600 hover:border-cyan-400 rounded-xl p-4 transition-all duration-300 hover:scale-105"
                  >
                    <img 
                      src={metadata.image} 
                      alt={metadata.displayName} 
                      className="w-12 h-12 mx-auto mb-2 object-contain" 
                    />
                    <span className="text-sm font-semibold text-slate-100">{metadata.displayName}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // WALLET CONNECTED FLOW - Show protocol selection and wallet data
  if (isConnected && address) {
    // If no protocol selected yet, show protocol selection
    if (!walletSelectedProtocol) {
      return (
        <div>
          {isWrongChain && (
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
                  <div className="bg-slate-800/50 border border-red-500/30 rounded p-3 mb-3">
                    <p className="text-sm font-semibold mb-2 text-slate-200">Please switch to a supported network:</p>
                    <ul className="text-sm space-y-1 list-disc list-inside text-slate-300">
                      <li>Base Mainnet (ID: 8453)</li>
                      <li>Optimism Mainnet (ID: 10)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mb-6">
            <div className="text-2xl font-bold mb-4 text-slate-100 text-center">
              Select a Protocol
            </div>
            <div className="flex flex-wrap gap-4 justify-center">
              {availableProtocols.map((protocol) => {
                const metadata = getProtocolMetadata(protocol);
                return (
                  <div 
                    key={protocol}
                    onClick={() => {
                      if (!isWrongChain) {
                        setWalletSelectedProtocol(protocol);
                      }
                    }}
                    className={`bg-slate-800/50 backdrop-blur-sm border-2 rounded-2xl p-6 w-full max-w-md flex items-center shadow-2xl shadow-slate-950/50 transition-all duration-300 cursor-pointer transform hover:scale-105 ${
                      isWrongChain 
                        ? 'opacity-50 cursor-not-allowed border-slate-700' 
                        : walletSelectedProtocol === protocol
                        ? 'bg-cyan-500/10 border-cyan-400 shadow-lg shadow-cyan-500/10'
                        : 'border-slate-600 hover:border-slate-500'
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
                      <div className="text-2xl font-bold text-slate-100">{metadata.displayName}</div>
                      {metadata.description && (
                        <div className="text-sm text-slate-400 mt-1">
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

    // Protocol selected - show wallet data
    return (
      <div>
        {isWrongChain && (
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
              </div>
            </div>
          </div>
        )}
        
        {error && (
          <div className={`mb-3 p-3 border rounded backdrop-blur-sm ${
            error.includes('✅') 
              ? 'bg-green-900/20 border-green-500/50 text-green-400' 
              : error.includes('❌')
              ? 'bg-red-900/20 border-red-500/50 text-red-400'
              : 'bg-yellow-900/20 border-yellow-500/50 text-yellow-400'
          }`}>
            {error}
          </div>
        )}
        
        {isLoadingTokens && (
          <div className="mb-3 p-3 bg-cyan-900/20 border border-cyan-500/50 text-cyan-400 rounded backdrop-blur-sm">
            Loading {walletSelectedProtocol} token configurations from subgraph...
          </div>
        )}
        
        {/* Display claimed supply and borrow data */}
        <div className="mb-3">
          <ClaimSupplyBorrowDisplay 
            isLoading={isLoadingSupplyBorrow}
            protocol={walletSelectedProtocol}
            onChangeProtocol={() => setWalletSelectedProtocol(null)}
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
      </div>
    );
  }

  // MANUAL FETCH FLOW - Show form when wallet not connected
  // Show form if no data fetched yet or if user wants to search again
  if (!manualFetchedUnclaimedData) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-slate-950/50 max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-1xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">
          Fetch your lending and borrowing data from top protocols
          </h1>
          {/* <p className="text-slate-400 mt-2">
            Fetch your lending and borrowing data from top protocols.
          </p> */}
        </div>

        <div className="space-y-8">
          <div>
            <SectionTitle>1. Select Protocol</SectionTitle>
            <div className="grid grid-cols-2 gap-4">
              {availableProtocols.map((protocol) => {
                const metadata = getProtocolMetadata(protocol);
                return (
                  <button
                    key={protocol}
                    onClick={() => setSelectedProtocol(protocol)}
                    className={`flex flex-col items-center justify-center p-6 rounded-lg transition-all duration-300 transform hover:scale-105 ${
                      selectedProtocol === protocol
                        ? 'bg-cyan-500/10 border-2 border-cyan-400 shadow-lg shadow-cyan-500/10'
                        : 'bg-slate-700/50 border-2 border-slate-600 hover:border-slate-500'
                    }`}
                  >
                    <img 
                      src={metadata.image} 
                      alt={metadata.displayName} 
                      className="w-12 h-12 object-contain mb-3" 
                    />
                    <span className="font-semibold text-slate-100">{metadata.displayName}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <SectionTitle>2. Select Network</SectionTitle>
            <div className="flex flex-wrap gap-3">
              {NETWORKS.map((network) => (
                <button
                  key={network.id}
                  onClick={() => setSelectedNetwork(network.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors duration-300 ${
                    selectedNetwork === network.id
                      ? 'bg-cyan-500 text-slate-900'
                      : 'bg-slate-700/50 hover:bg-slate-700 text-slate-200'
                  }`}
                >
                  {network.icon}
                  <span>{network.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <SectionTitle>3. Enter Wallet Address</SectionTitle>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <WalletIcon className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder="0x..."
                className="w-full bg-slate-700/50 border-2 border-slate-600 rounded-lg py-3 pl-10 pr-4 focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 outline-none transition-colors text-slate-100"
              />
            </div>
          </div>

          {error && <div className="text-red-400 text-center text-sm">{error}</div>}

          <button
            onClick={handleFetchData}
            disabled={isFetchingData || !selectedProtocol || !selectedNetwork || !walletAddress}
            className="w-full flex items-center justify-center bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg text-lg transition-all duration-300 transform hover:scale-105 disabled:scale-100"
          >
            {isFetchingData ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Fetching Data...
              </>
            ) : (
              'Fetch On-Chain Data'
            )}
          </button>
        </div>
      </div>
    );
  }

  // This should never be reached, but return null as fallback
  return null;
};
