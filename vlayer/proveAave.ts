import { createVlayerClient, type ProveArgs } from "@vlayer/sdk";
// Note: These imports will be available after running forge build
// import proverSpec from "../out/SimpleTeleportProver.sol/SimpleTeleportProver";
// import verifierSpec from "../out/SimpleTeleportVerifier.sol/SimpleTeleportVerifier";
// import whaleBadgeNFTSpec from "../out/WhaleBadgeNFT.sol/WhaleBadgeNFT";
// import registrySpec from "../out/Registry.sol/Registry";

// Load contract specs from compiled contracts
import proverAbi from "../out/SimpleTeleportProver.sol/SimpleTeleportProver.json" assert { type: "json" };
import verifierAbi from "../out/SimpleTeleportVerifier.sol/SimpleTeleportVerifier.json" assert { type: "json" };

const proverSpec = { abi: proverAbi.abi, bytecode: proverAbi.bytecode };
const verifierSpec = { abi: verifierAbi.abi, bytecode: verifierAbi.bytecode };
const whaleBadgeNFTSpec = { abi: [] as any, bytecode: { object: "0x" } };
const registrySpec = { abi: [] as any, bytecode: { object: "0x" } };
import {
  createContext,
  deployVlayerContracts,
  getConfig,
  waitForContractDeploy,
} from "@vlayer/sdk/config";
import { type Address } from "viem";
import { loadFixtures } from "./loadFixtures";
import { getTeleportConfig } from "./constants";
import { 
  getSupplyBorrowDataForUser, 
  getTokenConfigsForUser,
  getBlockNumberFromTxHash,
  queryUserTransactions,
  type SupplyBorrowData,
  type SubgraphTransaction
} from "./src/shared/lib/client";
import { getAaveContractAddresses, validateContractAddresses } from "./config-aave";
import debug from "debug";

const createLogger = (namespace: string) => {
  const debugLogger = debug(namespace + ":debug");
  const infoLogger = debug(namespace + ":info");

  // Enable info logs by default
  if (!debug.enabled(namespace + ":info")) {
    debug.enable(namespace + ":info");
  }

  return {
    info: (message: string, ...args: unknown[]) => infoLogger(message, ...args),
    debug: (message: string, ...args: unknown[]) =>
      debugLogger(message, ...args),
    warn: (message: string, ...args: unknown[]) => console.warn(message, ...args),
  };
};

const log = createLogger("examples:simple-teleport-aave");

const config = getConfig();
const teleportConfig = getTeleportConfig(config.chainName);

if (config.chainName === "anvil") {
  await loadFixtures();
}

const { chain, ethClient, account, proverUrl, confirmations } =
  createContext(config);

if (!account) {
  throw new Error(
    "No account found make sure EXAMPLES_TEST_PRIVATE_KEY is set in your environment variables",
  );
}

const vlayer = createVlayerClient({
  url: proverUrl,
  token: config.token,
});

log.info("⏳ Using pre-deployed contracts...");

// Get pre-deployed contract addresses from configuration
const contractAddresses = getAaveContractAddresses(config.chainName);

// Validate that all addresses are set
if (!validateContractAddresses(contractAddresses)) {
  throw new Error(
    "Pre-deployed contract addresses not properly configured. Please update config-aave.ts with the actual contract addresses."
  );
}

const { whaleBadgeNFT: WHALE_BADGE_NFT_ADDRESS, registry: REGISTRY_ADDRESS, prover: PROVER_ADDRESS, verifier: VERIFIER_ADDRESS } = contractAddresses;

log.info("📋 Using pre-deployed contracts:");
log.info(`  WhaleBadgeNFT: ${WHALE_BADGE_NFT_ADDRESS}`);
log.info(`  Registry: ${REGISTRY_ADDRESS}`);
log.info(`  Prover: ${PROVER_ADDRESS}`);
log.info(`  Verifier: ${VERIFIER_ADDRESS}`);

// Get Aave data from subgraph
log.info("🔍 Fetching Aave data from subgraph...");
const userAddress = teleportConfig.tokenHolder;
const currentChainId = chain.id;

log.info(`📊 Fetching data for user: ${userAddress} on chain: ${currentChainId}`);

// Get raw transaction data from Aave subgraph
log.info("🔍 Fetching raw transaction data from Aave subgraph...");
const transactions = await queryUserTransactions(userAddress);
log.info(`📈 Found ${transactions.length} transactions from Aave subgraph`);

if (transactions.length === 0) {
  log.warn("⚠️  No transactions found for the user. This might indicate:");
  log.warn("   - User has no Aave activity");
  log.warn("   - Subgraph data is not available");
  log.warn("   - User address is incorrect");
  process.exit(0);
}

log.info(`📊 Found ${transactions.length} transactions to process`);

// Convert Aave data to Erc20Token struct format
const tokensToCheck: {
  underlingTokenAddress: Address;
  aTokenAddress: Address;
  chainId: bigint;
  blockNumber: bigint;
  balance: bigint;
  tokenType: number; // 0 = ARESERVE, 1 = AVARIABLEDEBT, 2 = ASTABLEDEBT
}[] = [];

// Process each transaction individually
for (const tx of transactions) {
  log.info(`\n🔄 Processing transaction: ${tx.action} - ${tx.amount} (tx: ${tx.txHash.slice(0, 10)}...)`);

  // Get the actual block number from transaction hash using RPC
  let blockNumber: bigint;
  try {
    const blockNumberStr = await getBlockNumberFromTxHash(tx.txHash, parseInt(tx.chainId || currentChainId.toString()));
    blockNumber = BigInt(blockNumberStr);
    log.info(`  📦 Block number from tx ${tx.txHash}: ${blockNumber}`);
  } catch (error) {
    log.warn(`  ⚠️  Could not get block number from transaction hash, using latest: ${error}`);
    // Fallback to latest block if we can't get the specific block number
    blockNumber = BigInt("latest");
  }

  // Determine token type based on action
  let tokenType: number;
  switch (tx.action) {
    case 'Supply':
      tokenType = 0; // ARESERVE
      break;
    case 'Borrow':
      tokenType = 1; // AVARIABLEDEBT
      break;
    case 'Repay':
      tokenType = 1; // AVARIABLEDEBT (repay affects variable debt)
      break;
    default:
      log.warn(`  ⚠️  Unknown action: ${tx.action}, skipping`);
      continue;
  }

  // Create token entry with balance always 0
  tokensToCheck.push({
    underlingTokenAddress: tx.reserve.underlyingAsset as Address,
    aTokenAddress: (tx.reserve as any).aToken?.id as Address || tx.reserve.underlyingAsset as Address, // Use aToken.id from subgraph
    chainId: BigInt(tx.chainId || currentChainId.toString()),
    blockNumber: blockNumber,
    balance: BigInt(0), // Always 0 as requested
    tokenType: tokenType,
  });
  
  log.info(`  ✅ Added ${tx.action} token: ${tx.amount} ${tx.reserve.underlyingAsset} (type: ${tokenType})`);
}

log.info(`\n📋 Created ${tokensToCheck.length} tokens to check`);

if (tokensToCheck.length === 0) {
  log.warn("⚠️  No tokens found for the user. This might indicate:");
  log.warn("   - User has no Aave activity");
  log.warn("   - Subgraph data is not available");
  log.warn("   - User address is incorrect");
  process.exit(0);
}

// Log all tokens that will be checked
tokensToCheck.forEach((token, index) => {
  const tokenTypeNames = ["ARESERVE", "AVARIABLEDEBT", "ASTABLEDEBT"];
  log.info(`  ${index + 1}. ${tokenTypeNames[token.tokenType]}: ${token.balance} ${token.underlingTokenAddress} (Chain: ${token.chainId}, Block: ${token.blockNumber})`);
});

log.info("⏳ Proving Aave data...");

const proveArgs = {
  address: PROVER_ADDRESS,
  proverAbi: proverSpec.abi as any,
  functionName: "proveAaveData",
  args: [userAddress, tokensToCheck],
  chainId: chain.id,
  vgasLimit: config.vgasLimit,
} as ProveArgs<any, "proveAaveData">;

const { proverAbi: _, ...argsToLog } = proveArgs;
log.info("Proving args:", argsToLog);
log.info("Proving args details:", argsToLog.args);

const proofHash = await vlayer.prove(proveArgs);
log.info("Proving hash:", proofHash);

const result = await vlayer.waitForProvingResult({ hash: proofHash });
log.info("Proving result:", result);

log.info("⏳ Verifying Aave proof...");

// Workaround for viem estimating gas with `latest` block causing future block assumptions to fail on slower chains like mainnet/sepolia
const gas = await ethClient.estimateContractGas({
  address: VERIFIER_ADDRESS,
  abi: verifierSpec.abi,
  functionName: "claim",
  args: result as readonly any[],
  account,
  blockTag: "pending",
});

const verificationHash = await ethClient.writeContract({
  address: VERIFIER_ADDRESS,
  abi: verifierSpec.abi,
  functionName: "claim",
  args: result as readonly any[],
  account,
  gas,
});

const receipt = await ethClient.waitForTransactionReceipt({
  hash: verificationHash,
  confirmations,
  retryCount: 600,
  retryDelay: 1000,
  timeout: 600 * 1000,
});

log.info(`✅ Aave verification result: ${receipt.status}`);

// // Log user's Aave activity summary
// log.info("\n📊 Aave Activity Summary:");
// log.info(`  User: ${userAddress}`);
// log.info(`  Chain: ${currentChainId}`);
// log.info(`  Assets Processed: ${uniqueAssets.size}`);
// log.info(`  Tokens Checked: ${tokensToCheck.length}`);

// let totalSupply = 0n;
// let totalBorrow = 0n;
// let totalRepay = 0n;

// // Calculate totals from tokensToCheck
// tokensToCheck.forEach(token => {
//   if (token.tokenType === 0) { // ARESERVE
//     totalSupply += token.balance;
//   } else if (token.tokenType === 1) { // AVARIABLEDEBT
//     totalBorrow += token.balance;
//   } else if (token.tokenType === 2) { // ASTABLEDEBT
//     totalBorrow += token.balance;
//   }
// });

// // Calculate repay amount from transactions
// transactions.forEach(tx => {
//   if (tx.action === 'Repay') {
//     totalRepay += BigInt(tx.amount);
//   }
// });

// log.info(`  Total Supply: ${totalSupply.toString()}`);
// log.info(`  Total Borrow: ${totalBorrow.toString()}`);
// log.info(`  Total Repay: ${totalRepay.toString()}`);
// log.info(`  Net Position: ${(totalSupply - totalBorrow + totalRepay).toString()}`);

// log.info("🎉 Aave proof generation and verification completed successfully!");
