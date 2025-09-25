import { FormEvent, useEffect, useState } from "react";
import { useProver } from "../../shared/hooks/useProver";
import { useNavigate } from "react-router";
import { getStepPath } from "../../app/router/steps";
import { StepKind } from "../../app/router/types";
import { HodlerForm } from "../../shared/forms/HodlerForm";
import { ConnectWallet } from "../../shared/components/ConnectWallet";
import { SupplyBorrowDisplay } from "../../shared/components/SupplyBorrowDisplay";
import { type SupplyBorrowData } from "../../shared/lib/client";
import { loadTokensToProve, getTokensToProve, getFallbackTokensToProve, type TokenConfig } from "../../shared/lib/utils";
import { getSupplyBorrowDataForUser } from "../../shared/lib/client";
import { useAccount } from "wagmi";
export const WelcomePage = () => {
  const { address, chain, isConnected, isConnecting } = useAccount();
  console.log("Wallet state:", { address, isConnected, isConnecting, chain: chain?.name });
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);
  const [tokensToProve, setTokensToProve] = useState<TokenConfig[]>([]);
  const [supplyBorrowData, setSupplyBorrowData] = useState<SupplyBorrowData[]>([]);
  const [isLoadingSupplyBorrow, setIsLoadingSupplyBorrow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const defaultTokenHolder = import.meta.env
    .VITE_DEFAULT_TOKEN_HOLDER as `0x${string}`;
  const { callProver, result } = useProver();


  // Load token configs and supply/borrow data when component mounts or address changes
  useEffect(() => {
    const loadData = async () => {
      if (!address) return;
      
      setIsLoadingTokens(true);
      setIsLoadingSupplyBorrow(true);
      setError(null);
      
      try {
        console.log("🔄 Loading data for address:", address);
        console.log("🌐 Current chain:", chain?.name, "ID:", chain?.id);
        
        // Load both token configs and supply/borrow data in parallel
        const [tokens, supplyBorrow] = await Promise.all([
          loadTokensToProve(address, chain?.id),
          getSupplyBorrowDataForUser(address, chain?.id)
        ]);
        
        setTokensToProve(tokens);
        setSupplyBorrowData(supplyBorrow);
        
        // If no tokens found from subgraph, try fallback
        if (tokens.length === 0) {
          console.log("⚠️ No tokens found from subgraph, trying fallback...");
          const fallbackTokens = getFallbackTokensToProve();
          setTokensToProve(fallbackTokens);
          setError("No DeFi activity found for this address. Using fallback configuration.");
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
        setSupplyBorrowData([]);
      } finally {
        setIsLoadingTokens(false);
        setIsLoadingSupplyBorrow(false);
      }
    };

    loadData();
  }, [address, chain?.id]);

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
      
      console.log("Calling prover with tokens:", currentTokens);
      await callProver([holderAddress, currentTokens]);
    } catch (err) {
      console.error("Error calling prover:", err);
      setError("Failed to generate proof. Please try again.");
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (result) {
      void navigate(getStepPath(StepKind.showBalance));
      setIsLoading(false);
    }
  }, [result]);

  // Show loading state while checking wallet connection
  if (isConnecting) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Checking Wallet Connection...
          </h2>
          <p className="text-gray-600">
            Please wait while we check your wallet connection status.
          </p>
        </div>
      </div>
    );
  }

  // Show connect wallet if not connected
  if (!isConnected || !address) {
    return <ConnectWallet />;
  }

  return (
    <div>
      {error && (
        <div className={`mb-4 p-3 border rounded ${
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
        <div className="mb-4 p-3 bg-blue-100 border border-blue-400 text-blue-700 rounded">
          Loading token configurations from subgraph...
        </div>
      )}
      
      
      {/* Display supply and borrow data */}
      <SupplyBorrowDisplay 
        data={supplyBorrowData} 
        isLoading={isLoadingSupplyBorrow} 
      />
      
      <HodlerForm
        holderAddress={address}
        onSubmit={handleSubmit}
        isLoading={isLoading || isLoadingTokens}
        loadingLabel={isLoadingTokens ? "Loading tokens..." : "Generating proof..."}
        submitLabel="Get proof"
        isEditable={true}
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
