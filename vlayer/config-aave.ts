// Configuration helper for proveAave.ts
// This file helps manage pre-deployed contract addresses

export interface AaveConfig {
  registry: `0x${string}`;
  prover: `0x${string}`;
  creditModel: `0x${string}`;
  controller: `0x${string}`;
  verifier: `0x${string}`;
}

// Pre-deployed contract addresses for different networks
export const aaveContractAddresses: Record<string, AaveConfig> = {
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
    // refactor
    registry: "0x7a9BB8eC3f229082A6A9D730D3040b481fD4D25A",
    prover: "0x6D0d0be7B466A5C1C949181e5995986390B9B352",
    creditModel: "0x83E59b7735598e579C70Aeed00b1475bEA97D33c",
    controller: "0x578AA45402fC4c353879B27DaB4637A1706Bd410", // Replace with actual address
    verifier: "0xfc722Beb480A7Ab14bEA987Dc709302d3F9086fF",

    // newest aave + compound
    // registry: "0x04e25d76Fb91f25225848043288206c54CdD8A98",
    // prover: "0x717694E59A5EA52a39D6c4C81d6919503bd112B3",
    // creditModel: "0xd90CfDcE6b72B22c42da1Acc7a0B1Dd413ac1202",
    // controller: "0x27d7BB6dbcdb1f40E00604c45766A6Aecf9C09FE", // Replace with actual address
    // verifier: "0x27d7BB6dbcdb1f40E00604c45766A6Aecf9C09FE",
    // aave + compound
    // registry: "0xF7dc9D42BA3D08382A63bAcdBD568E627c6E80C1",
    // prover: "0x7cE1c988F125F6b05EC875bEa292D442f7272101",
    // creditModel: "0xe233aca82D0008f36b857D32a7BD568a8211f72d",
    // verifier: "0x0F52445C9ef4917af118Be00C0c0e439b6B005B2",

    // only Aave
    // registry: "0xE45F42E67271768CBAB25a88C854D25A4916dc6F",
    // prover: "0x075FC16eF11e0466d7918950913A8afC141e6B89",
    // creditModel: "0xB43968076B149606777f3eaED843D6F3AE478502",
    // verifier: "0x0063216834A0c5D25622A1a5Fc7fDB1DD5546840",

    // registry: "0xF3122c8ad8bF6b94646df826d710fa80f0A91e92",
    // prover: "0x0a05dE411c2750669De86554e03c66A4E8c65D67",
    // creditModel: "0x73EfE5e5096E0F0eF9b6FaAF14a9cbD15b623477",
    // verifier: "0xd629f02607fab45605e29168577C44F65706a656",
  },
  base: {
    registry: "0x0000000000000000000000000000000000000000", // Replace with actual address
    prover: "0x0000000000000000000000000000000000000000", // Replace with actual address
    creditModel: "0x0000000000000000000000000000000000000000", // Replace with actual address
    controller: "0x0000000000000000000000000000000000000000", // Replace with actual address
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
