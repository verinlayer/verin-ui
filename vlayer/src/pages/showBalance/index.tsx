import { FormEvent, useEffect, useState } from "react";
import { useLocalStorage } from "usehooks-ts";
import { useNavigate } from "react-router";
import { useAccount } from "wagmi";
import { formatUnits, decodeAbiParameters } from "viem";
import { ConnectWalletButton } from "../../shared/components/ConnectWalletButton";
import { TokenConfigDisplay } from "../../shared/components/SupplyBorrowDisplay";
import { getChainName, parseProverResult, getTokensToProve, type ProtocolTokenConfig, type TokenConfig, type CompoundTokenConfig } from "../../shared/lib/utils";
import { TokenType, getTokenTypeName, getTokenTypeColor, getTokenTypeIcon } from "../../shared/types/TeleportTypes";
import { type MorphoTokenConfig } from "../../shared/lib/morpho-subgraph";
import { getStepPath } from "../../app/router/steps";
import { StepKind } from "../../app/router/types";
import proverSpec from "../../contracts/SimpleTeleportProver.json";

// Common token addresses to highlight (can be expanded)
const HIGHLIGHTED_TOKENS = {
  // USDT addresses on different chains
  "0xd7bfa30cA5cBB252F228AB6Ba3b1b2814d752081": "USDT", // OP Sepolia
  "0xdac17f958d2ee523a2206206994597c13d831ec7": "USDT", // Ethereum Mainnet
  "0x94b008aa00579c1307b0ef2c499ad98a8ce58e58": "USDT", // Optimism
  // USDC addresses on different chains  
  "0x64dF24D36d68583766aEeeD77F05EA6D9f399378": "USDC", // OP Sepolia
  "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": "USDC", // Ethereum Mainnet
  "0x7f5c764cbc14f9669b88837ca1490cca17c31607": "USDC", // Optimism
  "0x0b2c639c533813f4aa9d7837caf62653d097ff85": "USDC", // Optimism (Bridged)
  "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913": "USDC", // Base Mainnet
} as const;

export const ShowBalancePage = () => {
  const navigate = useNavigate();
  const { address } = useAccount();
  const [tokensToProve, setTokens] = useState<ProtocolTokenConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [proverResult] = useLocalStorage("proverResult", "");

  useEffect(() => {
    if (proverResult) {
      try {
        // Parse the new prover result format
        const { proof, claimer, selector, encodedData } = parseProverResult(proverResult);
        
        console.log('Prover result parsed:', { selector, encodedData });
        
        // Determine which function was called based on selector comparison
        const isAave = selector.toLowerCase().startsWith('0x7b450eea'); // proveAaveData selector
        const isCompound = selector.toLowerCase().startsWith('0x10dcfe73'); // proveCompoundData selector
        const isMorpho = selector.toLowerCase().startsWith('0x89642ede'); // proveMorphoData selector
        
        let tokenConfigs: ProtocolTokenConfig[];
        
        if (isAave) {
          // Decode as Erc20Token[]
          const [decodedTokens] = decodeAbiParameters(
            [{ name: 'tokens', type: 'tuple[]', components: [
              { name: 'underlingTokenAddress', type: 'address' },
              { name: 'aTokenAddress', type: 'address' },
              { name: 'chainId', type: 'uint256' },
              { name: 'blockNumber', type: 'uint256' },
              { name: 'balance', type: 'uint256' },
              { name: 'tokenType', type: 'uint8' }
            ]}],
            encodedData as `0x${string}`
          );
          
          console.log('Decoded Aave tokens:', decodedTokens);
          
          // Convert to TokenConfig format (Aave)
          tokenConfigs = (decodedTokens as any[]).map((token: any): TokenConfig => ({
            underlingTokenAddress: token.underlingTokenAddress,
            aTokenAddress: token.aTokenAddress,
            chainId: token.chainId.toString(),
            blockNumber: token.blockNumber.toString(),
            balance: token.balance.toString(),
            tokenType: token.tokenType,
          }));
        } else if (isCompound) {
          // Decode as CToken[]
          const [decodedTokens] = decodeAbiParameters(
            [{ name: 'tokens', type: 'tuple[]', components: [
              { name: 'collateralAddress', type: 'address' },
              { name: 'cTokenAddress', type: 'address' },
              { name: 'chainId', type: 'uint256' },
              { name: 'blockNumber', type: 'uint256' },
              { name: 'balance', type: 'uint256' },
              { name: 'tokenType', type: 'uint8' }
            ]}],
            encodedData as `0x${string}`
          );
          
          console.log('Decoded Compound tokens:', decodedTokens);
          
          // Convert to CompoundTokenConfig format (Compound)
          tokenConfigs = (decodedTokens as any[]).map((token: any): CompoundTokenConfig => ({
            collateralAddress: token.collateralAddress,
            cTokenAddress: token.cTokenAddress,
            chainId: token.chainId.toString(),
            blockNumber: token.blockNumber.toString(),
            balance: token.balance.toString(),
            tokenType: token.tokenType,
          }));
        } else if (isMorpho) {
          // Decode as MToken[]
          const [decodedTokens] = decodeAbiParameters(
            [{ name: 'tokens', type: 'tuple[]', components: [
              { name: 'marketId', type: 'bytes32' },
              { name: 'morphoAddress', type: 'address' },
              { name: 'chainId', type: 'uint256' },
              { name: 'blockNumber', type: 'uint256' },
              { name: 'supplyShares', type: 'uint256' },
              { name: 'borrowShares', type: 'uint128' },
              { name: 'collateral', type: 'uint128' },
              { name: 'totalSupplyAssets', type: 'uint128' },
              { name: 'totalSupplyShares', type: 'uint128' },
              { name: 'totalBorrowAssets', type: 'uint128' },
              { name: 'totalBorrowShares', type: 'uint128' }
            ]}],
            encodedData as `0x${string}`
          );

          console.log('Decoded Morpho tokens:', decodedTokens);

          // Map to MorphoTokenConfig shape
          tokenConfigs = (decodedTokens as any[]).map((token: any): MorphoTokenConfig => ({
            marketId: token.marketId as `0x${string}`,
            morphoAddress: token.morphoAddress as `0x${string}`,
            chainId: Number(token.chainId),
            blockNumber: token.blockNumber.toString(),
            supplyShares: token.supplyShares.toString(),
            borrowShares: token.borrowShares.toString(),
            collateral: token.collateral.toString(),
            totalSupplyAssets: token.totalSupplyAssets.toString(),
            totalSupplyShares: token.totalSupplyShares.toString(),
            totalBorrowAssets: token.totalBorrowAssets.toString(),
            totalBorrowShares: token.totalBorrowShares.toString(),
          }));
        } else {
          throw new Error(`Unknown selector: ${selector}`);
        }
        
        console.log('Total decoded tokens:', tokenConfigs.length);
        console.log('Token configs:', tokenConfigs);
        
        // Show all tokens from prover (no deduplication)
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
    void navigate(`/${getStepPath(StepKind.confirmClaim)}`);
  };


  if (!address) {
    return <ConnectWalletButton />;
  }

  // Group tokens by type for better display
  const tokensByType = tokensToProve.reduce((groups, token) => {
    // Handle both TokenConfig and CompoundTokenConfig
    let tokenTypeName: string;
    if ('marketId' in token) {
      tokenTypeName = 'Morpho';
    } else {
      const underlyingAddress = 'underlingTokenAddress' in token 
        ? token.underlingTokenAddress 
        : (token as CompoundTokenConfig).collateralAddress;
      tokenTypeName = getTokenTypeName((token as TokenConfig | CompoundTokenConfig).tokenType, underlyingAddress);
    }
    if (!groups[tokenTypeName]) {
      groups[tokenTypeName] = [];
    }
    groups[tokenTypeName].push(token);
    return groups;
  }, {} as Record<string, ProtocolTokenConfig[]>);

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
