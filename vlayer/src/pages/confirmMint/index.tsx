import { FormEvent, useEffect, useMemo, useState } from "react";
// Note: You may need to update this import path based on your build output
// import verifierSpec from "../../../../out/SimpleTeleportVerifier.sol/SimpleTeleportVerifier.json";

// Temporary ABI for SimpleTeleportVerifier - replace with actual ABI from compiled contract
const verifierSpec = {
  abi: [
    {
      "inputs": [
        {
          "components": [
            {
              "components": [
                {"name": "verifierSelector", "type": "bytes4"},
                {"name": "seal", "type": "bytes32[8]"},
                {"name": "mode", "type": "uint8"}
              ],
              "name": "seal",
              "type": "tuple"
            },
            {"name": "callGuestId", "type": "bytes32"},
            {"name": "length", "type": "uint32"},
            {
              "components": [
                {"name": "proverContractAddress", "type": "address"},
                {"name": "functionSelector", "type": "bytes4"},
                {"name": "settleChainId", "type": "uint256"},
                {"name": "settleBlockNumber", "type": "uint256"},
                {"name": "settleBlockHash", "type": "bytes32"}
              ],
              "name": "callAssumptions",
              "type": "tuple"
            }
          ],
          "name": "proof",
          "type": "tuple"
        },
        {"name": "claimer", "type": "address"},
        {
          "components": [
            {"name": "underlingTokenAddress", "type": "address"},
            {"name": "aTokenAddress", "type": "address"},
            {"name": "chainId", "type": "uint256"},
            {"name": "blockNumber", "type": "uint256"},
            {"name": "balance", "type": "uint256"},
            {"name": "tokenType", "type": "uint8"}
          ],
          "name": "tokens",
          "type": "tuple[]"
        }
      ],
      "name": "claim",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ]
};
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
      if (mintError.message.includes("already been minted")) {
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
    writeContract({
      address: import.meta.env.VITE_VERIFIER_ADDRESS,
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
        NFT of DeFi activity across {currentTokens.length} token(s) on {new Set(currentTokens.map(t => t.chainId)).size} chain(s)
      </p>
      <div className="mb-4 w-full block">
        <label
          htmlFor="holderAddress"
          className="block text-sm font-medium mb-1 text-slate-900"
        >
          You will mint NFT for wallet:
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
          {isLoading ? "Minting..." : "Mint token"}
        </button>
      </div>
      {!enoughBalance && chain && <FaucetInfo chain={chain} />}
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
