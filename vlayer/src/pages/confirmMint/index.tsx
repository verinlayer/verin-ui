import { FormEvent, useEffect, useMemo, useState } from "react";
import { getAaveContractAddresses } from "../../../config-aave";
// Note: You may need to update this import path based on your build output
// import verifierSpec from "../../../../out/SimpleTeleportVerifier.sol/SimpleTeleportVerifier.json";

// Temporary ABI for SimpleTeleportVerifier - replace with actual ABI from compiled contract
import verifierAbi from "../../../../out/SimpleTeleportVerifier.sol/SimpleTeleportVerifier.json";


const verifierSpec = { abi: verifierAbi.abi, bytecode: verifierAbi.bytecode };

import { useLocalStorage } from "usehooks-ts";
import { useAccount, useBalance, useWriteContract } from "wagmi";
import { useNavigate } from "react-router";
import { ConnectWallet } from "../../shared/components/ConnectWallet";
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
      } else if (mintError.message.includes("User rejected the request")) {
        setIsLoading(false);
      } else {
        throw new Error(mintError.message);
      }
    }
  }, [mintError]);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const [proof, owner, tokens] = parseProverResult(proverResult);
    setIsLoading(true);
    
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
    return <ConnectWallet />;
  }

  const currentTokens = getTokensToProve();

  return (
    <form onSubmit={handleSubmit}>
      <p className="desc w-full text-center">
        DeFi activity across {currentTokens.length} token(s) on {new Set(currentTokens.map(t => t.chainId)).size} chain(s)
      </p>
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
