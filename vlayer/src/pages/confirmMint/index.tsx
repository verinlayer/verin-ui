import { FormEvent, useEffect, useMemo, useState } from "react";
import { getAaveContractAddresses } from "../../../config-aave";
// Import actual ABI from compiled contract
import verifierAbi from "../../contracts/SimpleTeleportVerifier.json";

const verifierSpec = { abi: verifierAbi.abi, bytecode: verifierAbi.bytecode };

import { useLocalStorage } from "usehooks-ts";
import { useAccount, useBalance, useWriteContract } from "wagmi";
import { useNavigate } from "react-router";
import { ConnectWalletButton } from "../../shared/components/ConnectWalletButton";
import { parseProverResult, getTokensToProve } from "../../shared/lib/utils";
import { AlreadyMintedError } from "../../shared/errors/appErrors";
import { Chain, optimismSepolia } from "viem/chains";
import { match } from "ts-pattern";
export const ConfirmMintPage = () => {
  const { address, chain } = useAccount();
  const { data: balance } = useBalance({ address: address as `0x${string}` });
  const navigate = useNavigate();
  const {
    writeContract,
    data: txHash,
    status,
    error: mintError,
  } = useWriteContract();
  const [holderAddress, setHolderAddress] = useState<`0x${string}` | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [userCancelled, setUserCancelled] = useState(false);
  const [proverResult] = useLocalStorage("proverResult", "");

  useEffect(() => {
    if (txHash && status === "success") {
      void navigate(`/success?txHash=${txHash}`);
    }
  }, [txHash, status]);

  useEffect(() => {
    if (proverResult) {
      const [, owner] = parseProverResult(proverResult);
      setHolderAddress(owner);
    }
  }, [proverResult]);

  useEffect(() => {
    if (mintError) {
      if (mintError.message.includes("already been claimed")) {
        throw new AlreadyMintedError();
      } else if (mintError.message.includes("User rejected the request") || 
                 mintError.message.includes("User rejected") ||
                 mintError.message.includes("rejected") ||
                 mintError.message.includes("cancelled") ||
                 mintError.message.includes("denied")) {
        setIsLoading(false);
        setUserCancelled(true);
        // Don't throw error for user rejection - just stop loading
        console.log('Transaction cancelled by user');
      } else {
        throw new Error(mintError.message);
      }
    }
  }, [mintError]);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const [proof, owner, tokens] = parseProverResult(proverResult);
    setIsLoading(true);
    setUserCancelled(false);
    
    // Get verifier address from config based on current chain
    let verifierAddress: `0x${string}` = import.meta.env.VITE_VERIFIER_ADDRESS as `0x${string}`; // fallback to env
    try {
      if (chain?.name) {
        // Map chain names to our config keys
        let chainName = 'optimism'; // default
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
        
        const addresses = getAaveContractAddresses(chainName);
        verifierAddress = addresses.verifier;
        console.log(`Using verifier address from config: ${verifierAddress} for chain: ${chain.name}`);
      }
    } catch (err) {
      console.warn("Could not get verifier address from config, using env variable:", err);
    }
    
    writeContract({
      address: verifierAddress,
      abi: verifierSpec.abi,
      functionName: "claim",
      args: [proof, owner, tokens],
    });
  };

  // estimated price for Sepolia verification tx
  const enoughBalance = balance?.value && balance.value > 3000000000000000n;

  if (!holderAddress) {
    return <ConnectWalletButton />;
  }

  const currentTokens = getTokensToProve();

  return (
    <form onSubmit={handleSubmit}>
      <p className="desc w-full text-center">
        DeFi activity across {currentTokens.length} token(s) on {new Set(currentTokens.map(t => t.chainId)).size} chain(s)
      </p>
      
      {userCancelled && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <div className="text-sm font-medium text-yellow-800">Transaction Cancelled</div>
              <div className="text-xs text-yellow-600">You rejected the transaction in your wallet. You can try again when ready.</div>
            </div>
          </div>
        </div>
      )}
      
      <div className="mb-4 w-full block">
        <label
          htmlFor="holderAddress"
          className="block text-sm font-medium mb-1 text-slate-900"
        >
          You will claim proof for wallet:
        </label>
        <input
          name="holderAddress"
          type="text"
          defaultValue={holderAddress}
          className="w-full p-2 border border-gray-300 rounded-md bg-gray-50 text-slate-900"
          disabled
        />
      </div>
      <div className="mb-4 w-full block">
        <label
          htmlFor="minterAddress"
          className="block text-sm font-medium mb-1 text-slate-900"
        >
          Transaction will be sent from connected wallet:
        </label>
        <input
          name="minterAddress"
          type="text"
          defaultValue={address}
          className="w-full p-2 border border-gray-300 rounded-md bg-gray-50 text-slate-900"
          disabled
        />
      </div>
      <div className="mt-5 flex justify-center">
        <button type="submit" id="nextButton" disabled={isLoading}>
          {isLoading ? "Claiming..." : "Claim proof"}
        </button>
      </div>
      {/* {!enoughBalance && chain && <FaucetInfo chain={chain} />} */}
    </form>
  );
};

const getFaucetUrl = (chainId: number) => {
  return match(chainId)
    .with(
      optimismSepolia.id,
      () => "https://cloud.google.com/application/web3/faucet/ethereum/sepolia",
    )
    .otherwise(() => null);
};

const FaucetInfo = ({ chain }: { chain: Chain }) => {
  const faucet = useMemo(() => getFaucetUrl(chain.id), [chain.id]);
  return (
    <p className="text-red-400 text-center mt-4">
      Insufficient balance in your wallet. <br />
      {faucet ? (
        <>
          Please fund your account with{" "}
          <a href={faucet} target="_blank" className="font-bold">
            {chain.name} Faucet
          </a>
        </>
      ) : (
        <>
          Please fill your wallet with {chain.nativeCurrency.name} from{" "}
          {chain.name}
        </>
      )}
    </p>
  );
};
