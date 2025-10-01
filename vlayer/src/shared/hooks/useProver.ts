import {
  useChain,
  useCallProver,
  useWaitForProvingResult,
} from "@vlayer/react";
import proverSpec from "../../../../out/SimpleTeleportProver.sol/SimpleTeleportProver";
import { useEffect } from "react";
import { useLocalStorage } from "usehooks-ts";
import { UseChainError, CallProverError } from "../errors/appErrors";
import { getAaveContractAddresses } from "../../../config-aave";
import { useAccount } from "wagmi";

export const useProver = () => {
  const [, setProverResult] = useLocalStorage("proverResult", "");
  const { chain: wagmiChain } = useAccount();

  // Try to get the expected chain, but don't throw error if it doesn't match
  const { chain, error: chainError } = useChain(
    import.meta.env.VITE_CHAIN_NAME,
  );

  // Log the chain mismatch but don't throw error
  if (chainError) {
    console.warn('Chain mismatch:', chainError);
    console.log('Expected chain:', import.meta.env.VITE_CHAIN_NAME);
    console.log('Connected chain:', wagmiChain?.name);
    // Don't throw error - let the app continue with the connected chain
  }

  // Get contract addresses from config based on current chain
  let proverAddress: `0x${string}` = import.meta.env.VITE_PROVER_ADDRESS as `0x${string}`; // fallback to env
  try {
    if (wagmiChain?.name) {
      // Map chain names to our config keys
      let chainName = 'optimism'; // default
      const chainNameLower = wagmiChain.name.toLowerCase();
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
      proverAddress = addresses.prover;
      console.log(`Using prover address from config: ${proverAddress} for chain: ${wagmiChain.name}`);
    }
  } catch (err) {
    console.warn("Could not get prover address from config, using env variable:", err);
  }

  const {
    callProver,
    data: provingHash,
    error: provingError,
  } = useCallProver({
    address: proverAddress,
    proverAbi: proverSpec.abi,
    // functionName: "crossChainBalanceOf",
    functionName: "proveAaveData",
    vgasLimit: Number(import.meta.env.VITE_GAS_LIMIT),
    chainId: chain?.id,
  });

  if (provingError) {
    throw new CallProverError(provingError.message);
  }

  const { data: result, error: provingResultError } =
    useWaitForProvingResult(provingHash);

  if (provingResultError) {
    throw new CallProverError(provingResultError.message);
  }

  useEffect(() => {
    if (result && Array.isArray(result)) {
      console.log("result", result);
      setProverResult(
        JSON.stringify(result, (key, value) => {
          if (typeof value === "bigint") {
            return String(value);
          }
          return value as string;
        }),
      );
    }
  }, [result]);

  return { callProver, provingHash, result };
};
