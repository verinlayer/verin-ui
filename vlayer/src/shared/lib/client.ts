import { createPublicClient, http, type Address } from 'viem';
import { optimismSepolia, mainnet, base, baseSepolia, optimism } from 'viem/chains';
import { getAaveSubgraphUrl } from '../config/aave';
import { rpcClients } from '../config/compound';
import { getUnclaimedCompoundData } from './compound-subgraph';
import { type ProtocolType, getProtocolEnum } from './utils';

// Subgraph configuration - read from config
const APIURL = getAaveSubgraphUrl();

// Types for our data structures
export interface TokenConfig {
  underlingTokenAddress: string;
  aTokenAddress: string;
  chainId: string;
  blockNumber: string;
  balance: string;
  tokenType: number; // 0 = ARESERVE, 1 = AVARIABLEDEBT, 2 = ASTABLEDEBT
}

export enum TokenType {
  ARESERVE = 0,
  AVARIABLEDEBT = 1,
  ASTABLEDEBT = 2,
}

export interface SubgraphTransaction {
  action: string;
  txHash: string;
  id: string;
  amount: string;
  timestamp?: number;
  assetPriceUSD?: string;
  stableTokenDebt?: string;
  variableTokenDebt?: string;
  reserve: {
    underlyingAsset: string;
    aToken?: {
      id: string;
    };
    vToken?: {
      id: string;
    };
  };
  tokenAddress: string;
  // Add any chain-specific fields if available in the subgraph
  chainId?: string;
  network?: string;
}

export interface SupplyBorrowData {
  asset: string;
  chainId: string;
  supplyAmount: string;
  borrowAmount: string;
  repayAmount: string;
  totalBorrowAmount: string;
  assetPriceUSD?: string;
  stableTokenDebt?: string;
  variableTokenDebt?: string;
  transactions?: SubgraphTransaction[]; // Add transaction details
}

const createQuery = (user: string, timestampFilter?: number) => {
    const timestampCondition = timestampFilter ? `{timestamp_gt: ${timestampFilter}}` : `{timestamp_lt: 1791606704}`;
    
    return `query {
  userTransactions(
    first: 30
    orderBy: timestamp
    orderDirection: asc
    where: {and: 
      [{user: "${user.toLowerCase()}"},
      {or: [{action: Borrow},{action: Repay},{action: Supply}]},
      ${timestampCondition}]
    }
  ) {
    action
    txHash
    id
    timestamp
    ... on Borrow {
      assetPriceUSD
      amount
      stableTokenDebt
      variableTokenDebt
      reserve {
        underlyingAsset
        aToken {
          id
        }
        vToken {
          id
        }
      }
    }
    ... on Repay {
      amount
      assetPriceUSD
      reserve {
        underlyingAsset
        aToken {
          id
        }
        vToken {
          id
        }
      }
    }
    ... on Supply {
      amount
      assetPriceUSD
      reserve {
        underlyingAsset
        aToken {
          id
        }
      }
    }
    
  }
}
`;

};

// Get block numbers from multiple transaction hashes using batch RPC calls
export const getBlockNumbersFromTxHashes = async (txHashes: string[], chainId: number): Promise<Map<string, string>> => {
  try {
    const client = rpcClients[chainId as keyof typeof rpcClients];
    if (!client) {
      throw new Error(`No RPC client configured for chain ID: ${chainId}`);
    }

    console.log(`Batch fetching block numbers for ${txHashes.length} transactions on chain ${chainId}`);

    // Get the RPC URL from the client
    const rpcUrl = client.transport.url;
    if (!rpcUrl) {
      throw new Error(`No RPC URL found for chain ${chainId}`);
    }

    const blockNumbers = new Map<string, string>();
    const BATCH_SIZE = 10; // RPC provider limit

    // Process in chunks of 10 to respect RPC provider limits
    for (let i = 0; i < txHashes.length; i += BATCH_SIZE) {
      const chunk = txHashes.slice(i, i + BATCH_SIZE);
      console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(txHashes.length / BATCH_SIZE)} with ${chunk.length} transactions`);

      // Create batch RPC requests for this chunk
      const batchRequests = chunk.map((txHash, index) => ({
        jsonrpc: "2.0",
        method: "eth_getTransactionReceipt",
        params: [txHash],
        id: i + index + 1
      }));

      try {
        // Make batch request for this chunk
        const response = await fetch(rpcUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(batchRequests)
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const results = await response.json();

        // Process results for this chunk
        for (let j = 0; j < results.length; j++) {
          const result = results[j];
          const txHash = chunk[j];

          if (result.error) {
            console.warn(`Error getting block number for tx ${txHash}:`, result.error);
            continue;
          }

          if (result.result) {
            const blockNumber = BigInt(result.result.blockNumber);
            
            // Validate block number is positive
            if (blockNumber < 0n) {
              console.warn(`Invalid block number for tx ${txHash}: ${blockNumber}`);
              continue;
            }

            blockNumbers.set(txHash, blockNumber.toString());
            console.log(`Tx ${txHash}: block ${blockNumber}`);
          }
        }

        // Add a small delay between batches to be respectful to the RPC provider
        if (i + BATCH_SIZE < txHashes.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (chunkError) {
        console.warn(`Error processing batch ${Math.floor(i / BATCH_SIZE) + 1}:`, chunkError);
        // Continue with next batch even if this one fails
        continue;
      }
    }

    console.log(`Successfully fetched ${blockNumbers.size} block numbers out of ${txHashes.length} requests`);
    return blockNumbers;
  } catch (error) {
    console.error(`Error batch fetching block numbers for chain ${chainId}:`, error);
    throw error;
  }
};

// Get block number from SubgraphTransaction.id by parsing the ID format (no RPC call)
export const getBlockNumberFromTransactionId = (transactionId: string): string => {
  try {
    // Parse block number from SubgraphTransaction.id format: blockNumber:...
    // Example: 142018170:44:0x9ed5028a788b2a90a510f1b1ecac9a9b853911159c4c3dc4a4fce4b82642b3d3:150:4
    const idParts = transactionId.split(':');
    if (idParts.length === 0) {
      throw new Error(`Invalid transaction ID format: ${transactionId}`);
    }

    const blockNumber = idParts[0];
    
    // Validate block number is a valid number
    const blockNumberNum = parseInt(blockNumber);
    if (isNaN(blockNumberNum) || blockNumberNum < 0) {
      throw new Error(`Invalid block number: ${blockNumber}. Block numbers must be positive numbers.`);
    }

    console.log(`Parsed block number ${blockNumber} from transaction ID: ${transactionId}`);
    return blockNumber;
  } catch (error) {
    console.error(`Error parsing block number from transaction ID ${transactionId}:`, error);
    throw error;
  }
};

// Get block numbers from array of SubgraphTransaction IDs by parsing the ID format (no RPC call)
export const getBlockNumbersFromTransactionIds = (transactionIds: string[]): Map<string, string> => {
  try {
    console.log(`Parsing block numbers for ${transactionIds.length} transaction IDs`);

    const blockNumbers = new Map<string, string>();

    // Process each transaction ID to extract block number
    for (const transactionId of transactionIds) {
      try {
        // Parse block number from SubgraphTransaction.id format: blockNumber:...
        // Example: 142018170:44:0x9ed5028a788b2a90a510f1b1ecac9a9b853911159c4c3dc4a4fce4b82642b3d3:150:4
        const idParts = transactionId.split(':');
        if (idParts.length === 0) {
          console.warn(`Invalid transaction ID format: ${transactionId}`);
          continue;
        }

        const blockNumber = idParts[0];
        
        // Validate block number is a valid number
        const blockNumberNum = parseInt(blockNumber);
        if (isNaN(blockNumberNum) || blockNumberNum < 0) {
          console.warn(`Invalid block number: ${blockNumber} for transaction ID: ${transactionId}`);
          continue;
        }

        // Use the transaction ID as the key
        blockNumbers.set(transactionId, blockNumber);
        console.log(`Parsed block ${blockNumber} from transaction ID: ${transactionId}`);
      } catch (error) {
        console.warn(`Error parsing block number from transaction ID ${transactionId}:`, error);
        continue;
      }
    }

    console.log(`Successfully parsed ${blockNumbers.size} block numbers out of ${transactionIds.length} transaction IDs`);
    return blockNumbers;
  } catch (error) {
    console.error(`Error parsing block numbers from transaction IDs:`, error);
    throw error;
  }
};

// Get block number from transaction hash using RPC (single request)
export const getBlockNumberFromTxHash = async (txHash: string, chainId: number): Promise<string> => {
  try {
    const client = rpcClients[chainId as keyof typeof rpcClients];
    if (!client) {
      throw new Error(`No RPC client configured for chain ID: ${chainId}`);
    }

    console.log('chainId', chainId);
    console.log('txHash', txHash);

    const receipt = await client.getTransactionReceipt({
      hash: txHash as `0x${string}`
    });

    const blockNumber = receipt.blockNumber;
    
    // Validate block number is positive
    if (blockNumber < 0n) {
      throw new Error(`Invalid block number: ${blockNumber}. Block numbers must be positive.`);
    }

    return blockNumber.toString();
  } catch (error) {
    console.error(`Error getting block number for tx ${txHash} on chain ${chainId}:`, error);
    throw error;
  }
};

// Query subgraph for user's DeFi transactions
export const queryUserTransactions = async (user: string, timestampFilter?: number): Promise<SubgraphTransaction[]> => {
  try {
    console.log('🔍 Querying subgraph for user:', user);
    console.log('📡 API URL:', APIURL);
    
    // const query = createQuery('0x05e14e44e3b296f12b21790cde834bce5be5b8e0', timestampFilter);
    const query = createQuery(user, timestampFilter);
    console.log('📝 GraphQL Query:', query);
    
    const result = await fetch(APIURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    console.log('📊 Response status:', result.status);
    
    if (!result.ok) {
      const errorText = await result.text();
      console.error('❌ HTTP Error:', result.status, errorText);
      throw new Error(`HTTP ${result.status}: ${errorText}`);
    }

    const data = await result.json();
    console.log('📋 Full response data:', data);
    
    if (data.errors) {
      console.error('❌ GraphQL Errors:', data.errors);
      throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
    }
    
    const txs = data.data?.userTransactions || [];
    console.log('All user transactions:', txs.length);
    
    return txs;
  } catch (error) {
    console.error('Error querying subgraph:', error);
    throw error;
  }
};

// Wrapper function to get unclaimed supply/borrow data based on protocol
export const getUnclaimedSupplyBorrowDataWithProtocol = async (
  userAddress: string,
  currentChainId?: number,
  verifierAddress?: string,
  protocol: ProtocolType = 'AAVE'
): Promise<SupplyBorrowData[]> => {
  if (protocol === 'COMPOUND') {
    // Get latest claimed block from contract if available
    let latestClaimedBlock: number | undefined;
    if (verifierAddress && currentChainId) {
      try {
        const userInfo = await getUserInfoFromContract(userAddress, currentChainId, verifierAddress, protocol);
        if (userInfo && userInfo.latestBlock > 0n) {
          latestClaimedBlock = Number(userInfo.latestBlock);
        }
      } catch (error) {
        console.warn('Could not get latest claimed block for Compound:', error);
      }
    }
    return getUnclaimedCompoundData(userAddress, currentChainId, latestClaimedBlock) as Promise<SupplyBorrowData[]>;
  }
  // Default to Aave path
  return getUnclaimedSupplyBorrowData(userAddress, currentChainId, verifierAddress);
};

// Helper function to determine chain ID for an asset
const getChainIdForAsset = (asset: string): number => {
  // This is a simplified mapping - you may need to adjust based on your subgraph data
  // or add more sophisticated logic to determine the chain
  const assetToChainMap: Record<string, number> = {
    // USDC on different chains
    '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': mainnet.id, // USDC on Ethereum
    '0x0b2c639c533813f4aa9d7837caf62653d097ff85': base.id, // USDC on Base
    '0x7f5c764cbc14f9669b88837ca1490cca17c31607': optimism.id, // USDC on Optimism
    // USDT on different chains  
    '0xdac17f958d2ee523a2206206994597c13d831ec7': mainnet.id, // USDT on Ethereum
    '0x94b008aa00579c1307b0ef2c499ad98a8ce58e58': optimism.id, // USDT on Optimism
    // WETH on different chains
    '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': mainnet.id, // WETH on Ethereum
    '0x4200000000000000000000000000000000000006': optimism.id, // WETH on Optimism
    // DAI on different chains
    '0x6b175474e89094c44da98b954eedeac495271d0f': mainnet.id, // DAI on Ethereum
    '0xda10009cbd5d07dd0cecc66161fc93d7c9000da1': optimism.id, // DAI on Optimism
    '0x4200000000000000000000000000000000000042': optimism.id, // OP on Optimism
    // Add more mappings as needed
  };

  return assetToChainMap[asset.toLowerCase()] || optimism.id; // Default to OP Mainnet
};

// Enhanced function to determine chain ID from transaction hash
const getChainIdFromTransaction = async (txHash: string, asset: string): Promise<number> => {
  // First try the asset mapping
  const assetChainId = getChainIdForAsset(asset);
  
  // Try to verify by checking which RPC client can fetch the transaction
  const chainsToCheck = [optimism.id, mainnet.id, base.id, baseSepolia.id, optimismSepolia.id];
  
  for (const chainId of chainsToCheck) {
    try {
      const client = rpcClients[chainId];
      if (client) {
        const receipt = await client.getTransactionReceipt({ hash: txHash as `0x${string}` });
        if (receipt) {
          console.log(`Transaction ${txHash} found on chain ${chainId}`);
          return chainId;
        }
      }
    } catch (error) {
      // Transaction not found on this chain, continue checking
      continue;
    }
  }
  
  // If we can't find the transaction, fall back to asset mapping
  console.log(`Could not determine chain for transaction ${txHash}, using asset mapping: ${assetChainId}`);
  return assetChainId;
};

// Safe BigInt conversion that handles negative values
const safeBigInt = (value: string | number): bigint => {
  try {
    const num = BigInt(value);
    return num < 0n ? 0n : num;
  } catch (error) {
    console.warn(`Invalid BigInt value: ${value}, using 0`);
    return 0n;
  }
};

// Calculate net balance from transactions (for backward compatibility)
const calculateNetBalance = (transactions: SubgraphTransaction[]): bigint => {
  let netBalance = BigInt(0);
  
  transactions.forEach(tx => {
    if (tx.action === 'Borrow') {
      netBalance += safeBigInt(tx.amount);
    } else if (tx.action === 'Repay') {
      const repayAmount = safeBigInt(tx.amount);
      // Only subtract if it won't make the balance negative
      if (netBalance >= repayAmount) {
        netBalance -= repayAmount;
      } else {
        netBalance = 0n; // Set to 0 if repay would make it negative
      }
    }
  });
  
  // Ensure balance is never negative (return 0 if negative)
  return netBalance < 0n ? 0n : netBalance;
  // return 0n;
};

// Calculate supply amount from transactions
const calculateSupplyAmount = (transactions: SubgraphTransaction[]): bigint => {
  let supplyAmount = BigInt(0);
  
  console.log(`Calculating supply amount for ${transactions.length} transactions`);
  
  transactions.forEach(tx => {
    if (tx.action === 'Supply') {
      const amount = safeBigInt(tx.amount);
      supplyAmount += amount;
      console.log(`Supply: +${amount} (total: ${supplyAmount})`);
    } else if (tx.action === 'Withdraw') {
      const withdrawAmount = safeBigInt(tx.amount);
      // Only subtract if it won't make the balance negative
      if (supplyAmount >= withdrawAmount) {
        supplyAmount -= withdrawAmount;
        console.log(`Withdraw: -${withdrawAmount} (total: ${supplyAmount})`);
      } else {
        supplyAmount = 0n; // Set to 0 if withdraw would make it negative
        console.log(`Withdraw: -${withdrawAmount} (total: 0, was negative)`);
      }
    }
  });
  
  console.log(`Final supply amount: ${supplyAmount}`);
  // Ensure balance is never negative (return 0 if negative)
  return supplyAmount < 0n ? 0n : supplyAmount;
};

// Calculate borrow amount from transactions (net amount after repays)
const calculateBorrowAmount = (transactions: SubgraphTransaction[]): bigint => {
  let borrowAmount = BigInt(0);
  
  transactions.forEach(tx => {
    if (tx.action === 'Borrow') {
      borrowAmount += safeBigInt(tx.amount);
    } else if (tx.action === 'Repay') {
      const repayAmount = safeBigInt(tx.amount);
      // Only subtract if it won't make the balance negative
      if (borrowAmount >= repayAmount) {
        borrowAmount -= repayAmount;
      } else {
        borrowAmount = 0n; // Set to 0 if repay would make it negative
      }
    }
  });
  
  // Ensure balance is never negative (return 0 if negative)
  return borrowAmount < 0n ? 0n : borrowAmount;
};

// Calculate total borrow amount (sum of all borrows, ignoring repays)
const calculateTotalBorrowAmount = (transactions: SubgraphTransaction[]): bigint => {
  let totalBorrowAmount = BigInt(0);
  
  console.log(`Calculating total borrow amount for ${transactions.length} transactions`);
  
  transactions.forEach(tx => {
    if (tx.action === 'Borrow') {
      const amount = safeBigInt(tx.amount);
      totalBorrowAmount += amount;
      console.log(`Borrow: +${amount} (total: ${totalBorrowAmount})`);
    }
  });
  
  console.log(`Final total borrow amount: ${totalBorrowAmount}`);
  return totalBorrowAmount;
};

// Calculate total repay amount (sum of all repays)
const calculateRepayAmount = (transactions: SubgraphTransaction[]): bigint => {
  let repayAmount = BigInt(0);
  
  console.log(`Calculating total repay amount for ${transactions.length} transactions`);
  
  transactions.forEach(tx => {
    if (tx.action === 'Repay') {
      const amount = safeBigInt(tx.amount);
      repayAmount += amount;
      console.log(`Repay: +${amount} (total: ${repayAmount})`);
    }
  });
  
  console.log(`Final total repay amount: ${repayAmount}`);
  return repayAmount;
};

// Get supply and borrow data for display
export const getSupplyBorrowDataForUser = async (userAddress: string, currentChainId?: number): Promise<SupplyBorrowData[]> => {
  try {
    console.log(`Fetching supply/borrow data for user: ${userAddress}`);
    
    // Query subgraph for user transactions
    const transactions = await queryUserTransactions(userAddress);
    
    if (transactions.length === 0) {
      console.log('No transactions found for user');
      return [];
    }
    
    // Group transactions by asset
    const uniqueAssets = new Map<string, SubgraphTransaction[]>();
    
    transactions.forEach(tx => {
      const asset = tx.reserve.underlyingAsset.toLowerCase();
      if (!uniqueAssets.has(asset)) {
        uniqueAssets.set(asset, []);
      }
      uniqueAssets.get(asset)!.push(tx);
    });

    const supplyBorrowData: SupplyBorrowData[] = [];

    // Process each unique asset
    for (const [asset, assetTxs] of uniqueAssets) {
      console.log(`\n=== Processing asset ${asset} ===`);
      console.log(`Found ${assetTxs.length} transactions for this asset`);
      assetTxs.forEach((tx, index) => {
        console.log(`  ${index + 1}. ${tx.action}: ${tx.amount} (tx: ${tx.txHash.slice(0, 10)}...)`);
      });
      
      // Get the most recent transaction for price data
      const latestTx = assetTxs[assetTxs.length - 1];
      
      // Calculate supply and borrow amounts
      const supplyAmount = calculateSupplyAmount(assetTxs);
      const totalBorrowAmount = calculateTotalBorrowAmount(assetTxs); // Total borrowed without subtracting repays
      const repayAmount = calculateRepayAmount(assetTxs);
      
      // Determine chain ID based on the asset and transaction
      const chainId = await getChainIdFromTransaction(latestTx.txHash, asset);
      
      console.log(`Processing asset ${asset}: determined chain ${chainId}, current chain: ${currentChainId}`);
      
      // Filter by current chain if specified
      if (currentChainId && chainId !== currentChainId) {
        console.log(`Skipping asset ${asset} on chain ${chainId} - not current chain ${currentChainId}`);
        continue;
      }
      
      console.log(`\n=== Final calculations for ${asset} ===`);
      console.log(`Supply Amount: ${supplyAmount}`);
      console.log(`Total Borrow Amount: ${totalBorrowAmount}`);
      console.log(`Repay Amount: ${repayAmount}`);
      console.log(`Net Borrow Amount: ${totalBorrowAmount - repayAmount}`);
      
      // Only include assets with some activity
      if (supplyAmount > 0n || totalBorrowAmount > 0n || repayAmount > 0n) {
        supplyBorrowData.push({
          asset,
          chainId: chainId.toString(),
          supplyAmount: supplyAmount.toString(),
          borrowAmount: totalBorrowAmount.toString(), // Use total borrowed amount (without subtracting repays)
          repayAmount: repayAmount.toString(),
          totalBorrowAmount: totalBorrowAmount.toString(),
          assetPriceUSD: latestTx.assetPriceUSD,
          stableTokenDebt: latestTx.stableTokenDebt,
          variableTokenDebt: latestTx.variableTokenDebt,
          transactions: assetTxs, // Include transaction details
        });
        console.log(`✅ Added to supply/borrow data with ${assetTxs.length} transactions`);
      } else {
        console.log(`❌ Skipped - no activity`);
      }
    }
    
    console.log(`Created ${supplyBorrowData.length} supply/borrow data entries`);
    return supplyBorrowData;
  } catch (error) {
    console.error('Error getting supply/borrow data for user:', error);
    throw error;
  }
};

// New function to get TokenConfig structures for a user (matching smart contract structure)
export const getTokenConfigsForUserNew = async (userAddress: string, currentChainId?: number): Promise<TokenConfig[]> => {
  try {
    console.log(`Fetching TokenConfig structures for user: ${userAddress}`);
    
    // Query subgraph for user transactions
    const transactions = await queryUserTransactions(userAddress);
    
    if (transactions.length === 0) {
      console.log('No transactions found for user');
      return [];
    }
    
    // Group transactions by chain ID for batch processing
    const transactionsByChain = new Map<number, SubgraphTransaction[]>();
    transactions.forEach(tx => {
      const chainId = parseInt(tx.chainId || currentChainId?.toString() || '1');
      if (!transactionsByChain.has(chainId)) {
        transactionsByChain.set(chainId, []);
      }
      transactionsByChain.get(chainId)!.push(tx);
    });
    
    // Batch fetch block numbers for each chain
    const blockNumbersMap = new Map<string, string>();
    for (const [chainId, chainTransactions] of transactionsByChain) {
      try {
         const transactionIds = chainTransactions.map(tx => tx.id);
         console.log(`Batch parsing ${transactionIds.length} block numbers for chain ${chainId}`);
         const chainBlockNumbers = await getBlockNumbersFromTransactionIds(transactionIds);
        
         // Merge into main map
         for (const [transactionId, blockNumber] of chainBlockNumbers) {
           blockNumbersMap.set(transactionId, blockNumber);
         }
      } catch (error) {
         console.warn(`Error batch parsing block numbers for chain ${chainId}:`, error);
         // Fallback to individual parsing for this chain
         for (const tx of chainTransactions) {
           try {
             const blockNumber = getBlockNumberFromTransactionId(tx.id);
             blockNumbersMap.set(tx.id, blockNumber);
           } catch (individualError) {
             console.warn(`Could not parse block number for tx ${tx.id}:`, individualError);
             blockNumbersMap.set(tx.id, '0'); // Fallback to 0 if parsing fails
           }
         }
      }
    }
    
    const tokenConfigs: TokenConfig[] = [];
    
    // Process each transaction individually (matching proveAave.ts approach)
    for (const tx of transactions) {
      console.log(`Processing transaction: ${tx.action} - ${tx.amount} (tx: ${tx.txHash.slice(0, 10)}...)`);
      
      // Get block number from batch results
      const blockNumber = blockNumbersMap.get(tx.id) || '0';
      console.log(`Block number from tx ${tx.id}: ${blockNumber}`);
      
      // Determine token type based on action
      let tokenType: number;
      switch (tx.action) {
        case 'Supply':
          tokenType = TokenType.ARESERVE;
          break;
        case 'Borrow':
          tokenType = TokenType.AVARIABLEDEBT;
          break;
        case 'Repay':
          tokenType = TokenType.AVARIABLEDEBT; // Repay affects variable debt
          break;
        default:
          console.warn(`Unknown action: ${tx.action}, skipping`);
          continue;
      }
      
      // Create TokenConfig entry with balance always 0 (matching proveAave.ts)
      const aTokenAddress = tx.reserve.aToken?.id || tx.reserve.underlyingAsset;
      console.log(`aToken data:`, {
        underlyingAsset: tx.reserve.underlyingAsset,
        aTokenId: tx.reserve.aToken?.id,
        finalATokenAddress: aTokenAddress
      });
      
      tokenConfigs.push({
        underlingTokenAddress: tx.reserve.underlyingAsset,
        aTokenAddress: aTokenAddress, // Use aToken.id from subgraph
        chainId: tx.chainId || currentChainId?.toString() || '1',
        blockNumber: blockNumber,
        balance: '0', // Always 0 as in proveAave.ts
        tokenType: tokenType,
      });
      
      console.log(`Added ${tx.action} token: ${tx.amount} ${tx.reserve.underlyingAsset} (type: ${tokenType})`);
    }
    
    console.log(`Created ${tokenConfigs.length} TokenConfig structures`);
    return tokenConfigs;
  } catch (error) {
    console.error('Error getting TokenConfig structures for user:', error);
    throw error;
  }
};

// ABI for SimpleTeleportVerifier contract
const VERIFIER_ABI = [
  {
    "inputs": [
      {"name": "user", "type": "address"},
      {"name": "protocol", "type": "uint8"}
    ],
    "name": "usersInfo",
    "outputs": [
      {"name": "borrowedAmount", "type": "uint256"},
      {"name": "suppliedAmount", "type": "uint256"},
      {"name": "repaidAmount", "type": "uint256"},
      {"name": "latestBlock", "type": "uint256"},
      {"name": "latestBalance", "type": "uint256"},
      {"name": "borrowTimes", "type": "uint256"},
      {"name": "supplyTimes", "type": "uint256"},
      {"name": "repayTimes", "type": "uint256"},
      {"name": "firstActivityBlock", "type": "uint256"},
      {"name": "liquidations", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// Interface for UserInfo from smart contract
export interface ContractUserInfo {
  borrowedAmount: bigint;
  suppliedAmount: bigint;
  repaidAmount: bigint;
  latestBlock: bigint;
  latestBalance: bigint;
  borrowTimes: bigint;
  supplyTimes: bigint;
  repayTimes: bigint;
  firstActivityBlock: bigint;
  liquidations: bigint;
}

// Get UserInfo from SimpleTeleportVerifier contract
export const getUserInfoFromContract = async (
  userAddress: string, 
  chainId: number, 
  verifierAddress: string,
  protocol: ProtocolType = 'AAVE'
): Promise<ContractUserInfo | null> => {
  try {
    const client = rpcClients[chainId as keyof typeof rpcClients];
    if (!client) {
      throw new Error(`No RPC client configured for chain ID: ${chainId}`);
    }

    // Map protocol to enum value
    const protocolEnum = getProtocolEnum(protocol);

    console.log(`Reading UserInfo for ${userAddress} from contract ${verifierAddress} on chain ${chainId} for protocol ${protocol} (enum: ${protocolEnum})`);

    // Read user info from the contract with the specified protocol
    const result = await client.readContract({
      address: verifierAddress as `0x${string}`,
      abi: VERIFIER_ABI,
      functionName: 'usersInfo',
      args: [userAddress as `0x${string}`, protocolEnum]
    });

    // Convert the result to ContractUserInfo interface
    const userInfo: ContractUserInfo = {
      borrowedAmount: result[0],
      suppliedAmount: result[1],
      repaidAmount: result[2],
      latestBlock: result[3],
      latestBalance: result[4],
      borrowTimes: result[5],
      supplyTimes: result[6],
      repayTimes: result[7],
      firstActivityBlock: result[8],
      liquidations: result[9]
    };

    console.log('UserInfo from contract:', userInfo);
    return userInfo;
  } catch (error) {
    console.error('Error reading UserInfo from contract:', error);
    return null;
  }
};

// Get block timestamp from block number
export const getBlockTimestamp = async (blockNumber: bigint, chainId: number): Promise<number> => {
  try {
    const client = rpcClients[chainId as keyof typeof rpcClients];
    if (!client) {
      throw new Error(`No RPC client configured for chain ID: ${chainId}`);
    }

    const block = await client.getBlock({ blockNumber });
    return Number(block.timestamp);
  } catch (error) {
    console.error(`Error getting block timestamp for block ${blockNumber}:`, error);
    return 0;
  }
};

// Get unclaimed supply/borrow data (data after the latest claimed block)
export const getUnclaimedSupplyBorrowData = async (userAddress: string, currentChainId?: number, verifierAddress?: string): Promise<SupplyBorrowData[]> => {
  try {
    console.log(`Fetching unclaimed supply/borrow data for user: ${userAddress}`);
    
    let timestampFilter: number | undefined;
    
    // If we have a verifier address and chain ID, get the latest claimed block timestamp
    if (verifierAddress && currentChainId) {
      try {
        const userInfo = await getUserInfoFromContract(userAddress, currentChainId, verifierAddress, 'AAVE');
        if (userInfo && userInfo.latestBlock > 0n) {
          const blockTimestamp = await getBlockTimestamp(userInfo.latestBlock, currentChainId);
          if (blockTimestamp > 0) {
            timestampFilter = blockTimestamp;
            console.log(`Using timestamp filter: ${timestampFilter} (from block ${userInfo.latestBlock})`);
          }
        }
      } catch (error) {
        console.warn('Could not get latest claimed block timestamp, using all data:', error);
      }
    }
    
    // Query subgraph for user transactions with timestamp filter
    const transactions = await queryUserTransactions(userAddress, timestampFilter);
    
    if (transactions.length === 0) {
      console.log('No unclaimed transactions found for user');
      return [];
    }
    
    // Group transactions by asset
    const uniqueAssets = new Map<string, SubgraphTransaction[]>();
    
    transactions.forEach(tx => {
      const asset = tx.reserve.underlyingAsset.toLowerCase();
      if (!uniqueAssets.has(asset)) {
        uniqueAssets.set(asset, []);
      }
      uniqueAssets.get(asset)!.push(tx);
    });

    const supplyBorrowData: SupplyBorrowData[] = [];

    // Process each unique asset
    for (const [asset, assetTxs] of uniqueAssets) {
      console.log(`\n=== Processing asset ${asset} ===`);
      console.log(`Found ${assetTxs.length} transactions for this asset`);
      
      // Get the most recent transaction for price data
      const latestTx = assetTxs[assetTxs.length - 1];
      
      // Calculate supply and borrow amounts
      const supplyAmount = calculateSupplyAmount(assetTxs);
      const totalBorrowAmount = calculateTotalBorrowAmount(assetTxs);
      const repayAmount = calculateRepayAmount(assetTxs);
      
      // Determine chain ID based on the asset and transaction
      const chainId = await getChainIdFromTransaction(latestTx.txHash, asset);
      
      console.log(`Processing asset ${asset}: determined chain ${chainId}, current chain: ${currentChainId}`);
      
      // Filter by current chain if specified
      if (currentChainId && chainId !== currentChainId) {
        console.log(`Skipping asset ${asset} on chain ${chainId} - not current chain ${currentChainId}`);
        continue;
      }
      
      console.log(`\n=== Final calculations for ${asset} ===`);
      console.log(`Supply Amount: ${supplyAmount}`);
      console.log(`Total Borrow Amount: ${totalBorrowAmount}`);
      console.log(`Repay Amount: ${repayAmount}`);
      
      // Only include assets with some activity
      if (supplyAmount > 0n || totalBorrowAmount > 0n || repayAmount > 0n) {
        supplyBorrowData.push({
          asset,
          chainId: chainId.toString(),
          supplyAmount: supplyAmount.toString(),
          borrowAmount: totalBorrowAmount.toString(),
          repayAmount: repayAmount.toString(),
          totalBorrowAmount: totalBorrowAmount.toString(),
          assetPriceUSD: latestTx.assetPriceUSD,
          stableTokenDebt: latestTx.stableTokenDebt,
          variableTokenDebt: latestTx.variableTokenDebt,
          transactions: assetTxs,
        });
        console.log(`✅ Added to unclaimed supply/borrow data with ${assetTxs.length} transactions`);
      } else {
        console.log(`❌ Skipped - no activity`);
      }
    }
    
    console.log(`Created ${supplyBorrowData.length} unclaimed supply/borrow data entries`);
    return supplyBorrowData;
  } catch (error) {
    console.error('Error getting unclaimed supply/borrow data for user:', error);
    throw error;
  }
};

export const getTokenConfigsForUnclaimedData = async (userAddress: string, currentChainId?: number, verifierAddress?: string): Promise<TokenConfig[]> => {
  try {
    console.log(`Fetching TokenConfig structures for unclaimed supply/borrow data for user: ${userAddress}`);
    
    let timestampFilter: number | undefined;
    
    // If we have a verifier address and chain ID, get the latest claimed block timestamp
    if (verifierAddress && currentChainId) {
      try {
        const userInfo = await getUserInfoFromContract(userAddress, currentChainId, verifierAddress, 'AAVE');
        if (userInfo && userInfo.latestBlock > 0n) {
          const blockTimestamp = await getBlockTimestamp(userInfo.latestBlock, currentChainId);
          if (blockTimestamp > 0) {
            timestampFilter = blockTimestamp;
            console.log(`Using timestamp filter for unclaimed data: ${timestampFilter} (from block ${userInfo.latestBlock})`);
          }
        }
      } catch (error) {
        console.warn('Could not get latest claimed block timestamp for unclaimed data, using all data:', error);
      }
    }
    
    // Query subgraph for user transactions with timestamp filter (only unclaimed data)
    const transactions = await queryUserTransactions(userAddress, timestampFilter);
    
    if (transactions.length === 0) {
      console.log('No unclaimed transactions found for user');
      return [];
    }
    
    // Group transactions by chain ID for batch processing
    const transactionsByChain = new Map<number, SubgraphTransaction[]>();
    transactions.forEach(tx => {
      const chainId = parseInt(tx.chainId || currentChainId?.toString() || '1');
      if (!transactionsByChain.has(chainId)) {
        transactionsByChain.set(chainId, []);
      }
      transactionsByChain.get(chainId)!.push(tx);
    });
    
    // Batch fetch block numbers for each chain
    const blockNumbersMap = new Map<string, string>();
    for (const [chainId, chainTransactions] of transactionsByChain) {
      try {
        // const txHashes = chainTransactions.map(tx => tx.txHash);
        const txHashes = chainTransactions.map(tx => tx.id);
        console.log(`Batch fetching ${txHashes.length} block numbers for unclaimed data on chain ${chainId}`);
        // const chainBlockNumbers = await getBlockNumbersFromTxHashes(txHashes, chainId);
        const chainBlockNumbers = await getBlockNumbersFromTransactionIds(txHashes);
        
         // Merge into main map
         for (const [transactionId, blockNumber] of chainBlockNumbers) {
           blockNumbersMap.set(transactionId, blockNumber);
         }
      } catch (error) {
        console.warn(`Error batch parsing block numbers for unclaimed data on chain ${chainId}:`, error);
        // Fallback to individual parsing for this chain
        for (const tx of chainTransactions) {
          try {
            const blockNumber = getBlockNumberFromTransactionId(tx.id);
            blockNumbersMap.set(tx.id, blockNumber);
          } catch (individualError) {
            console.warn(`Could not parse block number for unclaimed tx ${tx.id}:`, individualError);
            blockNumbersMap.set(tx.id, '0'); // Fallback to 0 if parsing fails
          }
        }
      }
    }
    
    const tokenConfigs: TokenConfig[] = [];
    
    // Process each transaction individually (matching getTokenConfigsForUserNew approach)
    for (const tx of transactions) {
      console.log(`Processing unclaimed transaction: ${tx.action} - ${tx.amount} (tx: ${tx.txHash.slice(0, 10)}...)`);
      
      // Get block number from batch results
      const blockNumber = blockNumbersMap.get(tx.id) || '0';
      console.log(`Block number from unclaimed tx ${tx.id}: ${blockNumber}`);
      
      // Determine token type based on action
      let tokenType: number;
      switch (tx.action) {
        case 'Supply':
          tokenType = TokenType.ARESERVE;
          break;
        case 'Borrow':
          tokenType = TokenType.AVARIABLEDEBT;
          break;
        case 'Repay':
          tokenType = TokenType.AVARIABLEDEBT; // Repay affects variable debt
          break;
        default:
          console.warn(`Unknown action: ${tx.action}, skipping`);
          continue;
      }
      
      // Create TokenConfig entry with balance always 0 (matching getTokenConfigsForUserNew)
      let aTokenAddress: string;
      if (tx.action === 'Borrow' || tx.action === 'Repay') {
        aTokenAddress = tx.reserve.vToken?.id || tx.reserve.underlyingAsset;
      } else if (tx.action === 'Supply') {
        aTokenAddress = tx.reserve.aToken?.id || tx.reserve.underlyingAsset;
      } else {
        // Fallback for any other action types
        aTokenAddress = tx.reserve.aToken?.id || tx.reserve.underlyingAsset;
      }
      console.log(`aToken data for unclaimed:`, {
        underlyingAsset: tx.reserve.underlyingAsset,
        aTokenId: tx.reserve.aToken?.id,
        finalATokenAddress: aTokenAddress
      });
      
      tokenConfigs.push({
        underlingTokenAddress: tx.reserve.underlyingAsset,
        aTokenAddress: aTokenAddress, // Use aToken.id from subgraph
        chainId: tx.chainId || currentChainId?.toString() || '1',
        blockNumber: blockNumber,
        balance: '0', // Always 0 as in getTokenConfigsForUserNew
        tokenType: tokenType,
      });
      
      console.log(`Added unclaimed ${tx.action} token: ${tx.amount} ${tx.reserve.underlyingAsset} (type: ${tokenType})`);
    }
    
    console.log(`Created ${tokenConfigs.length} TokenConfig structures for unclaimed data`);
    return tokenConfigs;
  } catch (error) {
    console.error('Error getting TokenConfig structures for unclaimed data:', error);
    throw error;
  }
};
