// Configuration helper for proveAave.ts
// This file helps manage pre-deployed contract addresses

export interface AaveConfig {
  whaleBadgeNFT: `0x${string}`;
  registry: `0x${string}`;
  prover: `0x${string}`;
  verifier: `0x${string}`;
}

// Pre-deployed contract addresses for different networks
export const aaveContractAddresses: Record<string, AaveConfig> = {
  anvil: {
    whaleBadgeNFT: "0x0000000000000000000000000000000000000000", // Replace with actual address
    registry: "0x0000000000000000000000000000000000000000", // Replace with actual address
    prover: "0x0000000000000000000000000000000000000000", // Replace with actual address
    verifier: "0x0000000000000000000000000000000000000000", // Replace with actual address
  },
  optimismSepolia: {
    whaleBadgeNFT: "0x0000000000000000000000000000000000000000", // Replace with actual address
    registry: "0x0000000000000000000000000000000000000000", // Replace with actual address
    prover: "0x0000000000000000000000000000000000000000", // Replace with actual address
    verifier: "0x0000000000000000000000000000000000000000", // Replace with actual address
  },
  mainnet: {
    whaleBadgeNFT: "0x1BA3B66108CD2CD17f71091B368397C4C7C006AF",
    registry: "0xE2fe992C22Db37771ed5EdEA08b96dC071263827",
    prover: "0x41d1da43de6a5aF46964C2c37572800c2a64CfEB",
    verifier: "0x7E07cedF47975bC76210E8AbE155d1BD58d71473",
  },
  optimism: {
    whaleBadgeNFT: "0x196379121F74D4c438bD8A3BeD35F40FC47971d6",
    registry: "0x8CAFdd6A534542a94B286D9eD151207ac9853171",
    prover: "0xD6fDB097CC62Be3DC050fA7225D98F3741399dE0",
    verifier: "0x49F08053963A088aD826576ae9C5B08B9864a44C",
  },
  base: {
    whaleBadgeNFT: "0x0000000000000000000000000000000000000000", // Replace with actual address
    registry: "0x0000000000000000000000000000000000000000", // Replace with actual address
    prover: "0x0000000000000000000000000000000000000000", // Replace with actual address
    verifier: "0x0000000000000000000000000000000000000000", // Replace with actual address
  },
};

export const getAaveContractAddresses = (chainName: string): AaveConfig => {
  const addresses = aaveContractAddresses[chainName];
  if (!addresses) {
    throw new Error(
      `The "${chainName}" chain is not yet configured in aaveContractAddresses.`,
    );
  }
  return addresses;
};

// Helper function to validate contract addresses
export const validateContractAddresses = (addresses: AaveConfig): boolean => {
  const zeroAddress = "0x0000000000000000000000000000000000000000";
  
  if (addresses.whaleBadgeNFT === zeroAddress) {
    console.error("❌ WHALE_BADGE_NFT_ADDRESS is not set");
    return false;
  }
  if (addresses.registry === zeroAddress) {
    console.error("❌ REGISTRY_ADDRESS is not set");
    return false;
  }
  if (addresses.prover === zeroAddress) {
    console.error("❌ PROVER_ADDRESS is not set");
    return false;
  }
  if (addresses.verifier === zeroAddress) {
    console.error("❌ VERIFIER_ADDRESS is not set");
    return false;
  }
  
  return true;
};
