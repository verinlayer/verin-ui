import { optimismSepolia } from "viem/chains";

export interface TeleportConfig {
  tokenHolder: `0x${string}`;
  prover: {
    erc20Addresses: string;
    erc20ChainIds: string;
    erc20BlockNumbers: string;
  };
}

export const chainToTeleportConfig: Record<string, TeleportConfig> = {
  anvil: {
    tokenHolder: "0xe2148eE53c0755215Df69b2616E552154EdC584f",
    prover: {
      erc20Addresses: "0xda52b25ddB0e3B9CC393b0690Ac62245Ac772527",
      erc20ChainIds: "31338",
      erc20BlockNumbers: "3",
    },
  },
  optimismSepolia: {
    tokenHolder: "0x4631d3E5803332448e0D9cBb9bF501A4C50B95ed",
    prover: {
      erc20Addresses: "0x3e26834A64CeBb8415bDE55D5543304c5c23f94A,0xb4adc69d39b2a341CB77151A8f37613017AD53F9",
      erc20ChainIds: "11155420,11155420",
      erc20BlockNumbers: "32843947,32843947",
      // erc20Addresses: "0x3e26834A64CeBb8415bDE55D5543304c5c23f94A",
      // erc20ChainIds: "11155420",
      // erc20BlockNumbers: "32843947",
    },
  },
  
  optimism: {
    tokenHolder: "0x4631d3E5803332448e0D9cBb9bF501A4C50B95ed",
    prover: {
      erc20Addresses: "0x0b2c639c533813f4aa9d7837caf62653d097ff85",
      erc20ChainIds: "10",
      erc20BlockNumbers: "141400000",
    },
  },
  
  mainnet: {
    tokenHolder: "0x4631d3E5803332448e0D9cBb9bF501A4C50B95ed",
    prover: {
      erc20Addresses: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
      erc20ChainIds: "1",
      erc20BlockNumbers: "19000000",
    },
  },
};

export const getTeleportConfig = (chainName: string): TeleportConfig => {
  const config: TeleportConfig | undefined = chainToTeleportConfig[chainName];
  if (!config) {
    throw new Error(
      `The "${chainName}" chain is not yet configured in this example.`,
    );
  }
  return config;
};
