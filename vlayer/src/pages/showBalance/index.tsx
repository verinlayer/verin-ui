import { FormEvent, useEffect, useState } from "react";
import { useLocalStorage } from "usehooks-ts";
import { useNavigate } from "react-router";
import { useAccount } from "wagmi";
import { formatUnits } from "viem";
import { ConnectWallet } from "../../shared/components/ConnectWallet";
import { TokenConfigDisplay } from "../../shared/components/SupplyBorrowDisplay";
import { getChainName, parseProverResult, getTokensToProve } from "../../shared/lib/utils";
import { TokenConfig, TokenType, getTokenTypeName, getTokenTypeColor, getTokenTypeIcon } from "../../shared/types/TeleportTypes";

// Common token addresses to highlight (can be expanded)
const HIGHLIGHTED_TOKENS = {
  // USDT addresses on different chains
  "0xd7bfa30cA5cBB252F228AB6Ba3b1b2814d752081": "USDT", // OP Sepolia
  "0xdac17f958d2ee523a2206206994597c13d831ec7": "USDT", // Ethereum Mainnet
  // USDC addresses on different chains  
  "0x64dF24D36d68583766aEeeD77F05EA6D9f399378": "USDC", // OP Sepolia
  "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": "USDC", // Ethereum Mainnet
  "0x0b2c639c533813f4aa9d7837caf62653d097ff85": "USDC", // Base Mainnet
} as const;

export const ShowBalancePage = () => {
  const navigate = useNavigate();
  const { address } = useAccount();
  const [tokensToProve, setTokens] = useState<TokenConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [proverResult] = useLocalStorage("proverResult", "");

  useEffect(() => {
    if (proverResult) {
      try {
        const [, , tokens] = parseProverResult(proverResult);
        // Convert legacy token format to TokenConfig format
        const tokenConfigs: TokenConfig[] = tokens.map((token: any) => ({
          underlingTokenAddress: token.addr || token.underlingTokenAddress,
          aTokenAddress: token.addr || token.aTokenAddress, // Default to same address
          chainId: token.chainId,
          blockNumber: token.blockNumber,
          balance: token.balance,
          tokenType: token.tokenType || TokenType.ARESERVE, // Default to ARESERVE
        }));
        setTokens(tokenConfigs);
        setIsLoading(false);
      } catch (error) {
        console.error('Error parsing prover result:', error);
        setIsLoading(false);
      }
    }
  }, [proverResult]);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void navigate(`/confirm-mint`);
  };

  if (!address) {
    return <ConnectWallet />;
  }

  // Group tokens by type for better display
  const tokensByType = tokensToProve.reduce((groups, token) => {
    const tokenTypeName = getTokenTypeName(token.tokenType, token.underlingTokenAddress);
    if (!groups[tokenTypeName]) {
      groups[tokenTypeName] = [];
    }
    groups[tokenTypeName].push(token);
    return groups;
  }, {} as Record<string, TokenConfig[]>);

  console.log('tokensByType', tokensByType);
  console.log('tokensToProve', tokensToProve);

  return (
    <form onSubmit={handleSubmit}>

      {/* Display TokenConfig structures */}
      <TokenConfigDisplay tokens={tokensToProve} isLoading={isLoading} />

      {/* Summary */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
        <div className="text-sm text-blue-800">
          <strong>Summary:</strong> Found {tokensToProve.length} token(s) across {new Set(tokensToProve.map(t => t.chainId)).size} chain(s)
        </div>
        <div className="text-xs text-blue-600 mt-1">
          Token Types: {Object.keys(tokensByType).join(', ')}
        </div>
      </div>

      <div className="mt-5 flex justify-center">
        <button type="submit" id="nextButton" disabled={isLoading}>
          {isLoading ? "Loading..." : "Continue to Claim your proof"}
        </button>
      </div>
    </form>
  );
};
