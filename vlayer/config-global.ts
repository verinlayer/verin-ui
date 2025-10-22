// Global configuration helper for contract addresses
// This file helps manage pre-deployed contract addresses across all protocols

export interface ContractConfig {
  registry: `0x${string}`;
  prover: `0x${string}`;
  creditModel: `0x${string}`;
  controller: `0x${string}`;
  verifier: `0x${string}`;
}

// Pre-deployed contract addresses for different networks
export const contractAddresses: Record<string, ContractConfig> = {
  anvil: {
    registry: "0xFF4b6b3D98E997255f66801DD01a00492e32D403",
    prover: "0x0715c4A2C783d12D9f5E250670bE217775566DFB",
    creditModel: "0x0FE35b67B1f0778DD19FeD602B37753691337D9D",
    controller: "0x0000000000000000000000000000000000000000", // Replace with actual address
    verifier: "0x3523f2b275FA934128D14Ea45e53A7ef086ba6ec",
  },
  optimismSepolia: {
    registry: "0x0000000000000000000000000000000000000000", // Replace with actual address
    prover: "0x0000000000000000000000000000000000000000", // Replace with actual address
    creditModel: "0x0000000000000000000000000000000000000000", // Replace with actual address
    controller: "0x0000000000000000000000000000000000000000", // Replace with actual address
    verifier: "0x0000000000000000000000000000000000000000", // Replace with actual address
  },
  mainnet: {
    registry: "0x7a9BB8eC3f229082A6A9D730D3040b481fD4D25A",
    prover: "0x6D0d0be7B466A5C1C949181e5995986390B9B352",
    creditModel: "0x0000000000000000000000000000000000000000", // Replace with actual address
    controller: "0x0000000000000000000000000000000000000000", // Replace with actual address
    verifier: "0x7E07cedF47975bC76210E8AbE155d1BD58d71473",
  },
  optimism: {
    registry: "0x7a9BB8eC3f229082A6A9D730D3040b481fD4D25A",
    prover: "0x6D0d0be7B466A5C1C949181e5995986390B9B352",
    creditModel: "0x83E59b7735598e579C70Aeed00b1475bEA97D33c",
    controller: "0x578AA45402fC4c353879B27DaB4637A1706Bd410",
    verifier: "0xfc722Beb480A7Ab14bEA987Dc709302d3F9086fF",
  },
  base: {
    registry: "0x0715c4A2C783d12D9f5E250670bE217775566DFB",
    prover: "0x0FE35b67B1f0778DD19FeD602B37753691337D9D",
    creditModel: "0xA3f077C09B1647e513Dea51a1707607f6D1A43B0",
    controller: "0x0a05dE411c2750669De86554e03c66A4E8c65D67",
    verifier: "0x73EfE5e5096E0F0eF9b6FaAF14a9cbD15b623477",
  },
};

export const getContractAddresses = (chainName: string): ContractConfig => {
  const addresses = contractAddresses[chainName];
  if (!addresses) {
    throw new Error(
      `The "${chainName}" chain is not yet configured in contractAddresses.`,
    );
  }
  return addresses;
};

// Helper function to validate contract addresses
export const validateContractAddresses = (addresses: ContractConfig): boolean => {
  const zeroAddress = "0x0000000000000000000000000000000000000000";
  
  if (addresses.registry === zeroAddress) {
    console.error("❌ REGISTRY_ADDRESS is not set");
    return false;
  }
  if (addresses.prover === zeroAddress) {
    console.error("❌ PROVER_ADDRESS is not set");
    return false;
  }
  if (addresses.creditModel === zeroAddress) {
    console.error("❌ CREDIT_MODEL_ADDRESS is not set");
    return false;
  }
  if (addresses.controller === zeroAddress) {
    console.error("❌ CONTROLLER_ADDRESS is not set");
    return false;
  }
  if (addresses.verifier === zeroAddress) {
    console.error("❌ VERIFIER_ADDRESS is not set");
    return false;
  }
  
  return true;
};

// Legacy export for backward compatibility (will be deprecated)
export const aaveContractAddresses = contractAddresses;
export const getAaveContractAddresses = getContractAddresses;
export type AaveConfig = ContractConfig;

