import { FormEvent, useEffect, useState } from "react";
import { useProver } from "../../shared/hooks/useProver";
import { useNavigate } from "react-router";
import { getStepPath } from "../../app/router/steps";
import { StepKind } from "../../app/router/types";
import { HodlerForm } from "../../shared/forms/HodlerForm";
import { ConnectWallet } from "../../shared/components/ConnectWallet";
import { loadTokensToProve, getTokensToProve, getFallbackTokensToProve, type TokenConfig } from "../../shared/lib/utils";
import { useAccount } from "wagmi";
export const WelcomePage = () => {
  const { address } = useAccount();
  console.log("address", address);
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);
  const [tokensToProve, setTokensToProve] = useState<TokenConfig[]>([]);
  const [error, setError] = useState<string | null>(null);
  const defaultTokenHolder = import.meta.env
    .VITE_DEFAULT_TOKEN_HOLDER as `0x${string}`;
  const { callProver, result } = useProver();


  // Load token configs when component mounts or address changes
  useEffect(() => {
    const loadTokens = async () => {
      if (!address) return;
      
      setIsLoadingTokens(true);
      setError(null);
      
      try {
        console.log("🔄 Loading tokens for address:", address);
        const tokens = await loadTokensToProve(address);
        setTokensToProve(tokens);
        
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
        console.error("❌ Error loading tokens:", err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(`Failed to load token data: ${errorMessage}. Using fallback configuration.`);
        // Use fallback tokens on error
        const fallbackTokens = getFallbackTokensToProve();
        setTokensToProve(fallbackTokens);
      } finally {
        setIsLoadingTokens(false);
      }
    };

    loadTokens();
  }, [address]);

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

  if (!address) {
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
      
      
      <HodlerForm
        holderAddress={address}
        onSubmit={handleSubmit}
        isLoading={isLoading || isLoadingTokens}
        loadingLabel={isLoadingTokens ? "Loading tokens..." : "Generating proof..."}
        submitLabel="Show cross-chain balance"
        isEditable={true}
      />
      
      {tokensToProve.length > 0 && (
        <div className="mt-4 p-3 bg-gray-100 rounded text-sm">
          <p>Found {tokensToProve.length} token(s) to prove:</p>
          <ul className="mt-2 space-y-1">
            {tokensToProve.map((token, index) => (
              <li key={index} className="text-xs">
                {token.addr.slice(0, 6)}...{token.addr.slice(-4)} on Chain {token.chainId}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
