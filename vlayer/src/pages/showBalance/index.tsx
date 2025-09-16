import { FormEvent, useEffect, useState } from "react";
import { useLocalStorage } from "usehooks-ts";
import { useNavigate } from "react-router";
import { useAccount } from "wagmi";
import { formatUnits } from "viem";
import { ConnectWallet } from "../../shared/components/ConnectWallet";
import { getChainName, parseProverResult, getTokensToProve } from "../../shared/lib/utils";

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
  // const address = '0x05e14E44e3B296f12b21790CdE834BCE5bE5B8e0';
  const [tokensToProve, setTokens] = useState<
    { addr: string; chainId: string; blockNumber: string; balance: string }[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [proverResult] = useLocalStorage("proverResult", "");

  useEffect(() => {
    if (proverResult) {
      const [, , tokens] = parseProverResult(proverResult);
      setTokens(tokens);
      setIsLoading(false);
    }
  }, [proverResult]);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void navigate(`/confirm-mint`);
  };

  if (!address) {
    return <ConnectWallet />;
  }

  // Categorize tokens by type for highlighting
  const highlightedTokens = tokensToProve.filter(token => 
    HIGHLIGHTED_TOKENS[token.addr.toLowerCase() as keyof typeof HIGHLIGHTED_TOKENS]
  );
  
  const otherTokens = tokensToProve.filter(token => 
    !HIGHLIGHTED_TOKENS[token.addr.toLowerCase() as keyof typeof HIGHLIGHTED_TOKENS]
  );

  // Group highlighted tokens by type
  const tokenGroups = highlightedTokens.reduce((groups, token) => {
    const tokenType = HIGHLIGHTED_TOKENS[token.addr.toLowerCase() as keyof typeof HIGHLIGHTED_TOKENS];
    if (!groups[tokenType]) {
      groups[tokenType] = [];
    }
    groups[tokenType].push(token);
    return groups;
  }, {} as Record<string, typeof tokensToProve>);

  console.log('tokenGroups', tokenGroups);
  console.log('otherTokens', otherTokens);
  console.log('highlightedTokens', highlightedTokens);

  const format18 = (raw: string) => {
    try {
      return formatUnits(BigInt(raw), 18);
    } catch {
      return raw;
    }
  };

  // Get color scheme for different token types
  const getTokenTypeColor = (tokenType: string) => {
    switch (tokenType) {
      case 'USDT':
        return 'border-violet-300 bg-violet-50';
      case 'USDC':
        return 'border-emerald-300 bg-emerald-50';
      default:
        return 'border-blue-300 bg-blue-50';
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-4 w-full block">
        <label
          htmlFor="holderAddress"
          className="block text-sm font-medium mb-1 text-slate-900"
        >
          Address or ENS of token holder:
        </label>
        <input
          name="holderAddress"
          type="text"
          defaultValue={address}
          className="w-full p-2 border border-gray-300 rounded-md bg-gray-50 text-slate-900"
          disabled
        />
      </div>

      {/* Dynamic highlighted token groups */}
      {Object.entries(tokenGroups).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {Object.entries(tokenGroups).map(([tokenType, tokens]) => (
            <div key={tokenType} className="space-y-2">
              {tokens.map((token, index) => (
                <div 
                  key={`${token.addr}-${index}`}
                  className={`p-4 rounded-lg border ${getTokenTypeColor(tokenType)} text-slate-900`}
                >
                  <div className="font-semibold">{tokenType} DeFi Activity</div>
                  <div className="text-sm mt-1">
                    Chain: {getChainName(token.chainId)}
                  </div>
                  <div className="text-2xl mt-2 break-all">{format18(token.balance)}</div>
                  <div className="text-xs mt-1 text-slate-600">
                    Block: {token.blockNumber}
                  </div>
                  <div className="text-xs mt-1 text-slate-500">
                    Token: {token.addr.slice(0, 6)}...{token.addr.slice(-4)}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Other tokens */}
      {otherTokens.length > 0 && (
        <div className="p-4 bg-slate-100 rounded-lg text-slate-800 mb-4">
          <div className="font-semibold mb-2">Other Tokens</div>
          {otherTokens.map((token, index) => (
            <div key={`${token.addr}-${index}`} className="mb-2 p-2 bg-white rounded border">
              <div className="text-sm">
                <strong>Chain:</strong> {getChainName(token.chainId)}
              </div>
              <div className="text-sm">
                <strong>Balance:</strong> {format18(token.balance)}
              </div>
              <div className="text-xs text-slate-600">
                Block: {token.blockNumber} | Token: {token.addr.slice(0, 6)}...{token.addr.slice(-4)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
        <div className="text-sm text-blue-800">
          <strong>Summary:</strong> Found {tokensToProve.length} token(s) across {new Set(tokensToProve.map(t => t.chainId)).size} chain(s)
        </div>
      </div>

      <div className="mt-5 flex justify-center">
        <button type="submit" id="nextButton" disabled={isLoading}>
          {isLoading ? "Loading..." : "Continue to Mint"}
        </button>
      </div>
    </form>
  );
};
