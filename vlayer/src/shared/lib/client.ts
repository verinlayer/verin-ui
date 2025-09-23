import { createPublicClient, http, type Address } from 'viem';
import { optimismSepolia, mainnet, base, baseSepolia, optimism } from 'viem/chains';

// Subgraph configuration - using import.meta.env for Vite environment variables
// aave subgraph
const APIURL = `https://gateway.thegraph.com/api/${
    import.meta.env.VITE_SUBGRAPH_API_KEY ?? ''
}/subgraphs/id/DSfLz8oQBUeU5atALgUFQKMTSYV9mZAVYp4noLSXAfvb`;

// const APIURL = `https://subgraph.satsuma-prod.com/26f8b6e55b9f/multicall--913477/example2/version/v0.0.2-new-version/api`;
// const APIURL = `https://api.studio.thegraph.com/query/89103/sample-for-teleport/version/latest`;

// RPC client configuration for different chains
const rpcClients = {
  [optimismSepolia.id]: createPublicClient({
    chain: optimismSepolia,
    transport: http(optimismSepolia.rpcUrls.default.http[0])
  }),
  [mainnet.id]: createPublicClient({
    chain: mainnet,
    transport: http(mainnet.rpcUrls.default.http[0])
  }),
  [base.id]: createPublicClient({
    chain: base,
    transport: http(base.rpcUrls.default.http[0])
  }),
  [baseSepolia.id]: createPublicClient({
    chain: baseSepolia,
    transport: http(baseSepolia.rpcUrls.default.http[0])
  }),
  [optimism.id]: createPublicClient({
    chain: optimism,
    transport: http(optimism.rpcUrls.default.http[0])
  })
};

// Types for our data structures
export interface TokenConfig {
  addr: string;
  chainId: string;
  blockNumber: string;
  balance: string;
}

export interface SubgraphTransaction {
  action: string;
  txHash: string;
  id: string;
  amount: string;
  assetPriceUSD?: string;
  stableTokenDebt?: string;
  variableTokenDebt?: string;
  reserve: {
    underlyingAsset: string;
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
}

const createQuery = (user: string) => {
    return `query {
  userTransactions(
    first: 1
    orderBy: timestamp
    orderDirection: desc
    where: {and: 
      [{user: "${user.toLowerCase()}"},
      {or: [{action: Borrow},{action: Repay},{action: Supply}]}]
    }
  ) {
    action
    txHash
    id
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

  // return `query {
  //   userTransactions(
  //     first: 2
  //     orderBy: timestamp
  //     orderDirection: desc
      
  //     where: {and: [
  //       {address: "${user.toLowerCase()}"},
  //       {or: [
  //         {tokenAddress: "0xd7bfa30cA5cBB252F228AB6Ba3b1b2814d752081"},
  //         {tokenAddress: "0x64dF24D36d68583766aEeeD77F05EA6D9f399378"}
  //       ]}
  //     ]}
  //   ) {
  //     txHash
  //     id
  //     tokenAddress
      
  //     }
  // }`;
};

// Get block number from transaction hash using RPC
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
export const queryUserTransactions = async (user: string): Promise<SubgraphTransaction[]> => {
  try {
    console.log('🔍 Querying subgraph for user:', user);
    console.log('📡 API URL:', APIURL);
    
    // const query = createQuery(user);
    const query = createQuery('0x05e14E44e3B296f12b21790CdE834BCE5bE5B8e0');
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

// Get unique assets from transactions and create token configs
export const createTokenConfigsFromTransactions = async (
  transactions: SubgraphTransaction[],
  userAddress: string,
  currentChainId?: number
): Promise<TokenConfig[]> => {
  // Get unique assets from transactions
  const uniqueAssets = new Map<string, SubgraphTransaction[]>();
  
  transactions.forEach(tx => {
    const asset = tx.reserve.underlyingAsset.toLowerCase();
    if (!uniqueAssets.has(asset)) {
      uniqueAssets.set(asset, []);
    }
    uniqueAssets.get(asset)!.push(tx);
  });

  const tokenConfigs: TokenConfig[] = [];

  // Process each unique asset
  for (const [asset, assetTxs] of uniqueAssets) {
    // Get the most recent transaction for this asset
    const latestTx = assetTxs[assetTxs.length - 1];
    
    // Determine chain ID based on the asset and transaction
    const chainId = await getChainIdFromTransaction(latestTx.txHash, asset);
    
    console.log(`Processing asset ${asset}: determined chain ${chainId}, current chain: ${currentChainId}`);
    
    // Filter by current chain if specified
    if (currentChainId && chainId !== currentChainId) {
      console.log(`Skipping asset ${asset} on chain ${chainId} - not current chain ${currentChainId}`);
      continue;
    }
    
    try {
      // Get block number from the latest transaction
      const blockNumber = await getBlockNumberFromTxHash(latestTx.txHash, chainId);
      
      // Calculate total borrow amount (without subtracting repays)
      const totalBorrowAmount = calculateTotalBorrowAmount(assetTxs);
      
      // Validate all values before creating token config
      if (totalBorrowAmount < 0n) {
        console.warn(`Negative balance detected for asset ${asset}, setting to 0`);
      }
      
      if (blockNumber && blockNumber !== '0') {
        tokenConfigs.push({
          addr: asset,
          chainId: chainId.toString(),
          blockNumber: blockNumber,
          balance: totalBorrowAmount.toString()
        });
      } else {
        console.warn(`Invalid block number for asset ${asset}, skipping`);
      }
      
      console.log(`Created config for asset ${asset}:`, {
        chainId,
        blockNumber,
        balance: totalBorrowAmount.toString()
      });
    } catch (error) {
      console.error(`Error processing asset ${asset}:`, error);
      // Continue with other assets even if one fails
    }
  }

  // const tokenConfigs: TokenConfig[] = [];
  
  // for (const tx of transactions) {
  //   try {
  //     // get block number
  //     const blockNumber = await getBlockNumberFromTxHash(tx.txHash, 11155420);
  //     if (blockNumber) {
  //       tokenConfigs.push({
  //         addr: tx.tokenAddress,
  //         chainId: '11155420',  
  //         blockNumber: blockNumber,
  //         balance: 0n.toString()
  //       });
  //     } else {
  //       console.warn(`Invalid block number for asset ${tx.tokenAddress}, skipping`);
  //     }
  //   } catch (error) {
  //     console.error(`Error processing transaction ${tx.txHash}:`, error);
  //   }
  // }

  return tokenConfigs;
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
        });
        console.log(`✅ Added to supply/borrow data`);
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

// Main function to get token configs for a user
export const getTokenConfigsForUser = async (userAddress: string, currentChainId?: number): Promise<TokenConfig[]> => {
  try {
    console.log(`Fetching token configs for user: ${userAddress}`);
    
    // Query subgraph for user transactions
    const transactions = await queryUserTransactions(userAddress);
    
    if (transactions.length === 0) {
      console.log('No transactions found for user');
      return [];
    }
    
    // Create token configs from transactions
    const tokenConfigs = await createTokenConfigsFromTransactions(transactions, userAddress, currentChainId);
    
    console.log(`Created ${tokenConfigs.length} token configs`);
    return tokenConfigs;
  } catch (error) {
    console.error('Error getting token configs for user:', error);
    throw error;
  }
};

// Legacy function for backward compatibility
export const queryBorrowHistory = async (user: string, asset: string) => {
    const transactions = await queryUserTransactions(user);
    const assetTxs = transactions.filter((item: any) => item.reserve.underlyingAsset === asset.toLowerCase());
    console.log('txs borrow given asset', assetTxs.length);

    let sumBorrow = BigInt(0);
    let sumRepay = BigInt(0);

    assetTxs.forEach((item: any) => {
        if (item.action === 'Borrow') {
          console.log('tx hash borrow', item.txHash);
            sumBorrow = sumBorrow + BigInt(item.amount);
        }
        if (item.action === 'Repay') {
          console.log('tx hash repay', item.txHash);
            sumRepay = sumRepay + BigInt(item.amount);
        }
    });

    console.log('sumBorrow', sumBorrow);
    console.log('sumRepay', sumRepay);

    return assetTxs;
};
