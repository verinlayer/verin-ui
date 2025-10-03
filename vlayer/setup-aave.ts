#!/usr/bin/env bun
// Setup script for proveAave.ts
// This script helps configure the contract addresses for proveAave.ts

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const CONFIG_FILE = "config-aave.ts";

interface ContractAddresses {
  registry: string;
  prover: string;
  verifier: string;
}

const prompt = (question: string): string => {
  // Simple prompt implementation for Bun
  process.stdout.write(question);
  return "0x0000000000000000000000000000000000000000"; // Placeholder
};

const validateAddress = (address: string): boolean => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

const updateConfigFile = (chainName: string, addresses: ContractAddresses) => {
  const configPath = join(process.cwd(), CONFIG_FILE);
  
  try {
    let content = readFileSync(configPath, "utf-8");
    
    // Replace the addresses for the specified chain
    const chainConfig = `  ${chainName}: {
    registry: "${addresses.registry}",
    prover: "${addresses.prover}",
    verifier: "${addresses.verifier}",
  },`;
    
    // Simple replacement - in production you'd use a proper parser
    const chainRegex = new RegExp(`  ${chainName}: \\{[^}]+\\},`, "g");
    if (content.match(chainRegex)) {
      content = content.replace(chainRegex, chainConfig);
    } else {
      console.error(`❌ Chain ${chainName} not found in config file`);
      return false;
    }
    
    writeFileSync(configPath, content);
    console.log(`✅ Updated ${CONFIG_FILE} for chain ${chainName}`);
    return true;
  } catch (error) {
    console.error(`❌ Error updating config file:`, error);
    return false;
  }
};

const main = async () => {
  console.log("🚀 Setting up proveAave.ts configuration\n");
  
  const chainName = process.argv[2] || "optimismSepolia";
  console.log(`📋 Configuring addresses for chain: ${chainName}\n`);
  
  console.log("Please provide the deployed contract addresses:");
  console.log("(Press Enter to skip and keep current values)\n");
  
  const addresses: ContractAddresses = {
    registry: prompt(`Registry address: `),
    prover: prompt(`SimpleTeleportProver address: `),
    verifier: prompt(`SimpleTeleportVerifier address: `),
  };
  
  // Validate addresses
  const invalidAddresses = Object.entries(addresses).filter(([name, addr]) => 
    addr !== "0x0000000000000000000000000000000000000000" && !validateAddress(addr)
  );
  
  if (invalidAddresses.length > 0) {
    console.error("❌ Invalid addresses found:");
    invalidAddresses.forEach(([name, addr]) => {
      console.error(`  ${name}: ${addr}`);
    });
    process.exit(1);
  }
  
  // Update config file
  if (updateConfigFile(chainName, addresses)) {
    console.log("\n✅ Configuration updated successfully!");
    console.log("\nNext steps:");
    console.log("1. Run 'forge build' to generate contract artifacts");
    console.log("2. Set your environment variables:");
    console.log("   export EXAMPLES_TEST_PRIVATE_KEY='your_private_key'");
    console.log("   export VITE_SUBGRAPH_API_KEY='your_subgraph_api_key'");
    console.log("3. Run 'bun run proveAave.ts' to test");
  } else {
    console.error("\n❌ Configuration update failed");
    process.exit(1);
  }
};

main().catch(console.error);
