import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { ConnectWalletButton } from "../../shared/components/ConnectWalletButton";
import { SupplyBorrowDisplay } from "../../shared/components/SupplyBorrowDisplay";
import { ClaimSupplyBorrowDisplay } from "../../shared/components/ClaimSupplyBorrowDisplay";
import { type SupplyBorrowData } from "../../shared/lib/aave-subgraph";
import { type ProtocolType, getProtocolMetadata } from "../../shared/lib/utils";
import { getUnclaimedSupplyBorrowDataWithProtocol } from "../../shared/lib/aave-subgraph";
import { getContractAddresses } from "../../../config-global";

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="text-sm font-semibold text-slate-400 mb-3 tracking-wider uppercase">{children}</h3>
);

export const DashboardPage = () => {
  const { address, chain, isConnected } = useAccount();
  const [selectedProtocol, setSelectedProtocol] = useState<ProtocolType | null>(null);
  const [unclaimedSupplyBorrowData, setUnclaimedSupplyBorrowData] = useState<SupplyBorrowData[]>([]);
  const [isLoadingUnclaimed, setIsLoadingUnclaimed] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // Load unclaimed data when protocol or wallet changes
  useEffect(() => {
    const loadUnclaimedData = async () => {
      if (!address || !chain?.id || !selectedProtocol || !isConnected) {
        setUnclaimedSupplyBorrowData([]);
        return;
      }

      if (isWrongChain) {
        setError('Please connect to a supported network (Optimism, Base, or Ethereum Mainnet)');
        return;
      }

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
        
        const unclaimedData = await getUnclaimedSupplyBorrowDataWithProtocol(
          address,
          chain.id,
          controllerAddress,
          selectedProtocol
        );
        
        setUnclaimedSupplyBorrowData(unclaimedData);
      } catch (err) {
        console.error("Error loading unclaimed data:", err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(`Failed to load data: ${errorMessage}`);
        setUnclaimedSupplyBorrowData([]);
      } finally {
        setIsLoadingUnclaimed(false);
      }
    };

    loadUnclaimedData();
  }, [address, chain?.id, chain?.name, isWrongChain, selectedProtocol, isConnected]);

  // Update localStorage when protocol changes
  useEffect(() => {
    if (selectedProtocol) {
      localStorage.setItem('selectedProtocol', selectedProtocol);
    }
  }, [selectedProtocol]);

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
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-slate-950/50 max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">
            Dashboard
          </h1>
          <p className="text-slate-400 mt-2">Select a protocol to view your claimed and unclaimed data</p>
        </div>
        <div>
          <SectionTitle>Select Protocol</SectionTitle>
          <div className="grid grid-cols-3 gap-4">
            {availableProtocols.map((protocol) => {
              const metadata = getProtocolMetadata(protocol);
              return (
                <button
                  key={protocol}
                  onClick={() => setSelectedProtocol(protocol)}
                  className="flex flex-col items-center justify-center p-6 rounded-lg transition-all duration-300 transform hover:scale-105 bg-slate-700/50 border-2 border-slate-600 hover:border-slate-500"
                >
                  <img 
                    src={metadata.image} 
                    alt={metadata.displayName} 
                    className="w-16 h-16 object-contain mb-3" 
                  />
                  <span className="font-semibold text-slate-100">{metadata.displayName}</span>
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
    <div className="w-full max-w-6xl mx-auto">
      <div className="text-center mb-6">
        {/* <h1 className="text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">
          Dashboard
        </h1> */}
        <p className="text-slate-400 mt-2">Choose a protocol to view your claimed and unclaimed DeFi activity</p>
      </div>

      {error && (
        <div className={`mb-4 p-3 border rounded backdrop-blur-sm ${
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
      <div className="mb-6 flex items-center justify-center gap-4">
        {availableProtocols.map((protocol) => {
          const metadata = getProtocolMetadata(protocol);
          const isSelected = selectedProtocol === protocol;
          return (
            <button
              key={protocol}
              onClick={() => setSelectedProtocol(protocol)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 ${
                isSelected
                  ? 'bg-cyan-500/10 border-2 border-cyan-400 shadow-lg shadow-cyan-500/10'
                  : 'bg-slate-700/50 border-2 border-slate-600 hover:border-slate-500'
              }`}
            >
              <img 
                src={metadata.image} 
                alt={metadata.displayName} 
                className="w-6 h-6 object-contain" 
              />
              <span className={`font-semibold ${isSelected ? 'text-cyan-300' : 'text-slate-200'}`}>
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
          title="Summary of Unclaimed DeFi Data"
        />
      </div>
    </div>
  );
};

