// Helper script to get actual Aave token addresses
// This script helps you find the correct aToken and debt token addresses for your assets

import { createPublicClient, http } from "viem";
import { mainnet, optimism, base } from "viem/chains";

// Aave Pool contract addresses on different chains
const AAVE_POOL_ADDRESSES = {
  [mainnet.id]: "0x794a61358D6845594F94dc1DB02A252b5b4814aD",
  [optimism.id]: "0x794a61358D6845594F94dc1DB02A252b5b4814aD", // Same as mainnet
  [base.id]: "0x794a61358D6845594F94dc1DB02A252b5b4814aD", // Same as mainnet
};

// Common underlying assets
const UNDERLYING_ASSETS = {
  [mainnet.id]: {
    USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    WBTC: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
  },
  [optimism.id]: {
    USDC: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607",
    USDT: "0x94b008aA00579c1307B0ef2c499aD98a8ce58e58",
    WETH: "0x4200000000000000000000000000000000000006",
    OP: "0x4200000000000000000000000000000000000042",
  },
  [base.id]: {
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    WETH: "0x4200000000000000000000000000000000000006",
  },
};

// Aave Pool ABI (minimal)
const AAVE_POOL_ABI = [
  {
    inputs: [{ name: "asset", type: "address" }],
    name: "getReserveAToken",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "asset", type: "address" }],
    name: "getReserveVariableDebtToken",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "asset", type: "address" }],
    name: "getReserveStableDebtToken",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const getAaveTokenAddresses = async (chainId: number, underlyingAsset: string) => {
  const client = createPublicClient({
    chain: chainId === mainnet.id ? mainnet : chainId === optimism.id ? optimism : base,
    transport: http(),
  });

  const poolAddress = AAVE_POOL_ADDRESSES[chainId as keyof typeof AAVE_POOL_ADDRESSES];
  if (!poolAddress) {
    throw new Error(`No Aave pool address configured for chain ${chainId}`);
  }

  try {
    const [aToken, variableDebtToken, stableDebtToken] = await Promise.all([
      client.readContract({
        address: poolAddress,
        abi: AAVE_POOL_ABI,
        functionName: "getReserveAToken",
        args: [underlyingAsset as `0x${string}`],
      }),
      client.readContract({
        address: poolAddress,
        abi: AAVE_POOL_ABI,
        functionName: "getReserveVariableDebtToken",
        args: [underlyingAsset as `0x${string}`],
      }),
      client.readContract({
        address: poolAddress,
        abi: AAVE_POOL_ABI,
        functionName: "getReserveStableDebtToken",
        args: [underlyingAsset as `0x${string}`],
      }),
    ]);

    return {
      underlyingAsset,
      aToken,
      variableDebtToken,
      stableDebtToken,
    };
  } catch (error) {
    console.error(`Error getting token addresses for ${underlyingAsset} on chain ${chainId}:`, error);
    return null;
  }
};

const main = async () => {
  const chainId = parseInt(process.argv[2]) || mainnet.id;
  const asset = process.argv[3];

  console.log(`🔍 Getting Aave token addresses for chain ${chainId}`);
  
  if (asset) {
    // Get addresses for specific asset
    console.log(`📋 Getting addresses for asset: ${asset}`);
    const addresses = await getAaveTokenAddresses(chainId, asset);
    
    if (addresses) {
      console.log("\n✅ Token addresses found:");
      console.log(`  Underlying Asset: ${addresses.underlyingAsset}`);
      console.log(`  aToken: ${addresses.aToken}`);
      console.log(`  Variable Debt Token: ${addresses.variableDebtToken}`);
      console.log(`  Stable Debt Token: ${addresses.stableDebtToken}`);
    }
  } else {
    // Get addresses for all common assets
    const assets = UNDERLYING_ASSETS[chainId as keyof typeof UNDERLYING_ASSETS];
    if (!assets) {
      console.error(`❌ No assets configured for chain ${chainId}`);
      process.exit(1);
    }

    console.log(`📋 Getting addresses for all assets on chain ${chainId}:`);
    
    for (const [name, address] of Object.entries(assets)) {
      console.log(`\n🔄 Processing ${name} (${address})...`);
      const addresses = await getAaveTokenAddresses(chainId, address);
      
      if (addresses) {
        console.log(`  ✅ ${name}:`);
        console.log(`    aToken: ${addresses.aToken}`);
        console.log(`    Variable Debt: ${addresses.variableDebtToken}`);
        console.log(`    Stable Debt: ${addresses.stableDebtToken}`);
      } else {
        console.log(`  ❌ Failed to get addresses for ${name}`);
      }
    }
  }
};

// Usage examples:
console.log("Usage:");
console.log("  bun run get-aave-token-addresses.ts [chainId] [asset]");
console.log("  bun run get-aave-token-addresses.ts 1 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48");
console.log("  bun run get-aave-token-addresses.ts 10");
console.log("");

main().catch(console.error);
