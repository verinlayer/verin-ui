import { createPublicClient, http } from 'viem';
import { optimismSepolia, mainnet, base, baseSepolia, optimism } from 'viem/chains';
import { getCwethAddressForChain, getWethAddressForChain, getCompoundSubgraphUrl } from '../config/compound';
import { rpcClients } from '../config/compound';

// Compound Subgraph configuration
const COMPOUND_APIURL = getCompoundSubgraphUrl();

// Types for Compound data structures
export interface CompoundInteraction {
  amount: string;
  amountUsd: string;
  asset: {
    token: {
      address: string;
    };
  };
  market: {
    configuration: {
      baseToken: {
        token: {
          address: string;
        };
      };
      id: string;
    };
  };
  transaction: {
    hash: string;
    blockNumber: string;
  };
}

export interface CompoundPosition {
  supplyCollateralInteractions: CompoundInteraction[];
  supplyBaseInteractions: CompoundInteraction[];
  withdrawCollateralInteractions: CompoundInteraction[];
  withdrawBaseInteractions: CompoundInteraction[];
}

export interface CompoundAccount {
  positions: CompoundPosition[];
}

export interface CompoundSubgraphTransaction {
  action: string; // 'Supply', 'Borrow', 'Repay', 'Withdraw'
  txHash: string;
  id: string;
  amount: string;
  amountUsd?: string;
  blockNumber: string;
  assetAddress: string;
  marketId: string;
  baseTokenAddress: string;
  isCollateralInteraction: boolean; // true for collateral interactions, false for base interactions
}

export interface CompoundTokenConfig {
  collateralAddress: string;
  cTokenAddress: string;
  chainId: string;
  blockNumber: string;
  balance: string;
  tokenType: number; // 0 = BASE, 1 = COLLATERAL
}

export enum CompoundTokenType {
  BASE = 0,
  COLLATERAL = 1,
}

export interface CompoundSupplyBorrowData {
  asset: string;
  chainId: string;
  supplyAmount: string;
  borrowAmount: string;
  repayAmount: string;
  totalBorrowAmount: string;
  assetPriceUSD?: string;
  supplyAmountUSD?: string;
  borrowAmountUSD?: string;
  repayAmountUSD?: string;
  transactions?: CompoundSubgraphTransaction[];
}

// Create GraphQL query for Compound
const createCompoundQuery = (user: string, timestampFilter?: number, blockNumberFilter?: number) => {
  // Calculate timestamp for 14 days ago (in seconds)
  const fourteenDaysAgo = Math.floor(Date.now() / 1000) - (14 * 24 * 60 * 60) - 3600;
  
  // Use the maximum between timestampFilter and 14 days ago
  const effectiveTimestamp = timestampFilter 
    ? Math.max(timestampFilter, fourteenDaysAgo)
    : fourteenDaysAgo;
  
  console.log('🕐 Compound query using effective timestamp:', effectiveTimestamp, '(', new Date(effectiveTimestamp * 1000).toISOString(), ')');
  console.log('📅 14 days ago timestamp:', fourteenDaysAgo, '(', new Date(fourteenDaysAgo * 1000).toISOString(), ')');
  
  // Build the where clause for filtering
  let whereClause = '';
  if (blockNumberFilter) {
    whereClause = `where: {transaction_: {blockNumber_gt: "${blockNumberFilter}"}}`;
    console.log('🔢 Using block number filter in query:', blockNumberFilter);
  } else {
    whereClause = `where: {transaction_: {timestamp_gt: ${effectiveTimestamp}}}`;
    console.log('⏰ Using timestamp filter in query:', effectiveTimestamp);
  }
  
  return `query {
  accounts(where: {address: "${user.toLowerCase()}"}) {
    positions {
      supplyCollateralInteractions(
        first: 100
        ${whereClause}
      ) {
        amount
        amountUsd
        asset {
          token {
            address
          }
        }
        market {
          configuration {
            baseToken {
              token {
                address
              }
            }
            id
          }
        }
        transaction {
          hash
          blockNumber
        }
      }
      supplyBaseInteractions(
        first: 100
        ${whereClause}
      ) {
        amount
        amountUsd
        asset {
          token {
            address
          }
        }
        market {
          configuration {
            baseToken {
              token {
                address
              }
            }
            id
          }
        }
        transaction {
          hash
          blockNumber
        }
      }
      withdrawCollateralInteractions(
        first: 100
        ${whereClause}
      ) {
        amount
        amountUsd
        asset {
          token {
            address
          }
        }
        market {
          configuration {
            baseToken {
              token {
                address
              }
            }
            id
          }
        }
        transaction {
          hash
          blockNumber
        }
      }
      withdrawBaseInteractions(
        first: 100
        ${whereClause}
      ) {
        amount
        amountUsd
        asset {
          token {
            address
          }
        }
        market {
          configuration {
            baseToken {
              token {
                address
              }
            }
            id
          }
        }
        transaction {
          hash
          blockNumber
        }
      }
    }
  }
}`;
};

// Query Compound subgraph for user's transactions
export const queryCompoundUserTransactions = async (
  user: string,
  timestampFilter?: number,
  blockNumberFilter?: number,
  chainId?: number
): Promise<CompoundSubgraphTransaction[]> => {
  try {
    console.log('🔍 Querying Compound subgraph for user:', user);
    console.log('📡 Compound API URL:', COMPOUND_APIURL);
    
    if (timestampFilter) {
      console.log('⏰ Using timestamp filter:', timestampFilter, '(', new Date(timestampFilter * 1000).toISOString(), ')');
    }
    if (blockNumberFilter) {
      console.log('🔢 Using block number filter:', blockNumberFilter);
    }
    
    const query = createCompoundQuery(user, timestampFilter, blockNumberFilter);
    console.log('📝 Compound GraphQL Query:', query);
    
    const result = await fetch(COMPOUND_APIURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    console.log('📊 Compound response status:', result.status);
    
    if (!result.ok) {
      const errorText = await result.text();
      console.error('❌ Compound HTTP Error:', result.status, errorText);
      throw new Error(`HTTP ${result.status}: ${errorText}`);
    }

    const data = await result.json();
    console.log('📋 Compound full response data:', data);
    
    if (data.errors) {
      console.error('❌ Compound GraphQL Errors:', data.errors);
      throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
    }
    
    const accounts = data.data?.accounts || [];
    console.log('Compound accounts found:', accounts.length);
    
    if (accounts.length === 0) {
      console.log('No Compound accounts found for user');
      return [];
    }

    const transactions: CompoundSubgraphTransaction[] = [];

    // Process all positions
    accounts.forEach((account: CompoundAccount) => {
      account.positions.forEach((position: CompoundPosition) => {
        // Process Supply Collateral (Supply liquidity)
        position.supplyCollateralInteractions?.forEach((interaction: CompoundInteraction) => {
          console.log('📝 Supply Collateral:', {
            asset: interaction.asset.token.address,
            amount: interaction.amount,
            amountUsd: interaction.amountUsd,
            marketId: interaction.market.configuration.id,
            baseToken: interaction.market.configuration.baseToken.token.address
          });
          transactions.push({
            action: 'Supply',
            txHash: interaction.transaction.hash,
            id: `${interaction.transaction.blockNumber}:${interaction.transaction.hash}`,
            amount: interaction.amount,
            amountUsd: interaction.amountUsd,
            blockNumber: interaction.transaction.blockNumber,
            assetAddress: interaction.asset.token.address,
            marketId: interaction.market.configuration.id,
            baseTokenAddress: interaction.market.configuration.baseToken.token.address,
            isCollateralInteraction: true, // COLLATERAL
          });
        });

        // Process Supply Base (Repaid)
        position.supplyBaseInteractions?.forEach((interaction: CompoundInteraction) => {
          const marketId = interaction.market.configuration.id.toLowerCase();
          const assetAddress = interaction.asset.token.address.toLowerCase();

          // Ignore WETH supply to cWETHv3 market (not a real repayment) for the passed chain
          const chainWeth = getWethAddressForChain(chainId).toLowerCase();
          const chainCweth = (getCwethAddressForChain(chainId) || '').toLowerCase();
          if (chainCweth && marketId === chainCweth && assetAddress === chainWeth) {
            console.log('⏭️  Skipping WETH supply to cWETHv3 market for chain', chainId);
            return;
          }
          
          console.log('📝 Repay (Supply Base):', {
            asset: interaction.asset.token.address,
            amount: interaction.amount,
            amountUsd: interaction.amountUsd,
            marketId: interaction.market.configuration.id,
            baseToken: interaction.market.configuration.baseToken.token.address
          });
          transactions.push({
            action: 'Repay',
            txHash: interaction.transaction.hash,
            id: `${interaction.transaction.blockNumber}:${interaction.transaction.hash}`,
            amount: interaction.amount,
            amountUsd: interaction.amountUsd,
            blockNumber: interaction.transaction.blockNumber,
            assetAddress: interaction.asset.token.address,
            marketId: interaction.market.configuration.id,
            baseTokenAddress: interaction.market.configuration.baseToken.token.address,
            isCollateralInteraction: false, // BASE
          });
        });

        // Process Withdraw Base (Borrow)
        position.withdrawBaseInteractions?.forEach((interaction: CompoundInteraction) => {
          const marketId = interaction.market.configuration.id.toLowerCase();
          const assetAddress = interaction.asset.token.address.toLowerCase();

          // Ignore WETH withdraw from cWETHv3 market for the passed chain
          const chainWethWithdraw = getWethAddressForChain(chainId).toLowerCase();
          const chainCwethWithdraw = (getCwethAddressForChain(chainId) || '').toLowerCase();
          if (chainCwethWithdraw && marketId === chainCwethWithdraw && assetAddress === chainWethWithdraw) {
            console.log('⏭️  Skipping WETH withdraw from cWETHv3 market for chain', chainId);
            return;
          }

          console.log('📝 Borrow (Withdraw Base):', {
            asset: interaction.asset.token.address,
            amount: interaction.amount,
            amountUsd: interaction.amountUsd,
            marketId: interaction.market.configuration.id,
            baseToken: interaction.market.configuration.baseToken.token.address
          });
          transactions.push({
            action: 'Borrow',
            txHash: interaction.transaction.hash,
            id: `${interaction.transaction.blockNumber}:${interaction.transaction.hash}`,
            amount: interaction.amount,
            amountUsd: interaction.amountUsd,
            blockNumber: interaction.transaction.blockNumber,
            assetAddress: interaction.asset.token.address,
            marketId: interaction.market.configuration.id,
            baseTokenAddress: interaction.market.configuration.baseToken.token.address,
            isCollateralInteraction: false, // BASE
          });
        });

        // Note: withdrawCollateralInteractions (Withdraw liquidity) - not processed as per requirements
      });
    });

    console.log(`Processed ${transactions.length} Compound transactions`);
    
    // Sort transactions by block number in ascending order
    transactions.sort((a, b) => {
      const blockA = parseInt(a.blockNumber);
      const blockB = parseInt(b.blockNumber);
      return blockA - blockB;
    });
    
    console.log(`Sorted ${transactions.length} Compound transactions by block number`);
    return transactions;
  } catch (error) {
    console.error('Error querying Compound subgraph:', error);
    throw error;
  }
};

// Safe BigInt conversion
const safeBigInt = (value: string | number): bigint => {
  try {
    const num = BigInt(value);
    return num < 0n ? 0n : num;
  } catch (error) {
    console.warn(`Invalid BigInt value: ${value}, using 0`);
    return 0n;
  }
};

// Calculate supply amount from transactions
const calculateCompoundSupplyAmount = (transactions: CompoundSubgraphTransaction[]): bigint => {
  let supplyAmount = BigInt(0);
  
  console.log(`Calculating Compound supply amount for ${transactions.length} transactions`);
  
  transactions.forEach(tx => {
    if (tx.action === 'Supply') {
      const amount = safeBigInt(tx.amount);
      supplyAmount += amount;
      console.log(`Supply: +${amount} (total: ${supplyAmount})`);
    }
  });
  
  console.log(`Final Compound supply amount: ${supplyAmount}`);
  return supplyAmount < 0n ? 0n : supplyAmount;
};

// Calculate total borrow amount (sum of all borrows)
const calculateCompoundTotalBorrowAmount = (transactions: CompoundSubgraphTransaction[]): bigint => {
  let totalBorrowAmount = BigInt(0);
  
  console.log(`Calculating Compound total borrow amount for ${transactions.length} transactions`);
  
  transactions.forEach(tx => {
    if (tx.action === 'Borrow') {
      const amount = safeBigInt(tx.amount);
      totalBorrowAmount += amount;
      console.log(`Borrow: +${amount} (total: ${totalBorrowAmount})`);
    }
  });
  
  console.log(`Final Compound total borrow amount: ${totalBorrowAmount}`);
  return totalBorrowAmount;
};

// Calculate total repay amount (sum of all repays)
const calculateCompoundRepayAmount = (transactions: CompoundSubgraphTransaction[]): bigint => {
  let repayAmount = BigInt(0);
  
  console.log(`Calculating Compound total repay amount for ${transactions.length} transactions`);
  
  transactions.forEach(tx => {
    if (tx.action === 'Repay') {
      const amount = safeBigInt(tx.amount);
      repayAmount += amount;
      console.log(`Repay: +${amount} (total: ${repayAmount})`);
    }
  });
  
  console.log(`Final Compound total repay amount: ${repayAmount}`);
  return repayAmount;
};

// Get supply and borrow data for Compound
export const getCompoundSupplyBorrowData = async (userAddress: string, currentChainId?: number): Promise<CompoundSupplyBorrowData[]> => {
  try {
    console.log(`Fetching Compound supply/borrow data for user: ${userAddress}`);
    
    // Query Compound subgraph (use timestamp filter by default)
    const transactions = await queryCompoundUserTransactions(userAddress, undefined, undefined, currentChainId);
    
    if (transactions.length === 0) {
      console.log('No Compound transactions found for user');
      return [];
    }
    
    // Group transactions by asset
    const uniqueAssets = new Map<string, CompoundSubgraphTransaction[]>();
    
    transactions.forEach(tx => {
      const asset = tx.assetAddress.toLowerCase();
      if (!uniqueAssets.has(asset)) {
        uniqueAssets.set(asset, []);
      }
      uniqueAssets.get(asset)!.push(tx);
    });

    const supplyBorrowData: CompoundSupplyBorrowData[] = [];

    // Process each unique asset
    for (const [asset, assetTxs] of uniqueAssets) {
      console.log(`\n=== Processing Compound asset ${asset} ===`);
      console.log(`Found ${assetTxs.length} transactions for this asset`);
      
      // Calculate supply and borrow amounts
      const supplyAmount = calculateCompoundSupplyAmount(assetTxs);
      const totalBorrowAmount = calculateCompoundTotalBorrowAmount(assetTxs);
      const repayAmount = calculateCompoundRepayAmount(assetTxs);
      
      // For Compound, amountUsd is already in USD format from the subgraph
      // Sum all USD values from transactions
      let totalSupplyUSD = 0;
      let totalBorrowUSD = 0;
      let totalRepayUSD = 0;
      
      assetTxs.forEach(tx => {
        const usdValue = tx.amountUsd ? parseFloat(tx.amountUsd) : 0;
        if (tx.action === 'Supply') {
          totalSupplyUSD += usdValue;
        } else if (tx.action === 'Borrow') {
          totalBorrowUSD += usdValue;
        } else if (tx.action === 'Repay') {
          totalRepayUSD += usdValue;
        }
      });
      
      // Use chainId from currentChainId or default to mainnet
      const chainId = currentChainId || mainnet.id;
      
      console.log(`\n=== Final calculations for Compound ${asset} ===`);
      console.log(`Supply Amount: ${supplyAmount} ($${totalSupplyUSD.toFixed(2)})`);
      console.log(`Total Borrow Amount: ${totalBorrowAmount} ($${totalBorrowUSD.toFixed(2)})`);
      console.log(`Repay Amount: ${repayAmount} ($${totalRepayUSD.toFixed(2)})`);
      
      // Only include assets with some activity
      if (supplyAmount > 0n || totalBorrowAmount > 0n || repayAmount > 0n) {
        supplyBorrowData.push({
          asset,
          chainId: chainId.toString(),
          supplyAmount: supplyAmount.toString(),
          borrowAmount: totalBorrowAmount.toString(),
          repayAmount: repayAmount.toString(),
          totalBorrowAmount: totalBorrowAmount.toString(),
          supplyAmountUSD: totalSupplyUSD.toString(),
          borrowAmountUSD: totalBorrowUSD.toString(),
          repayAmountUSD: totalRepayUSD.toString(),
          transactions: assetTxs,
        });
        console.log(`✅ Added to Compound supply/borrow data with ${assetTxs.length} transactions`);
      } else {
        console.log(`❌ Skipped - no activity`);
      }
    }
    
    console.log(`Created ${supplyBorrowData.length} Compound supply/borrow data entries`);
    return supplyBorrowData;
  } catch (error) {
    console.error('Error getting Compound supply/borrow data for user:', error);
    throw error;
  }
};

// Get TokenConfig structures for Compound user
export const getCompoundTokenConfigs = async (userAddress: string, currentChainId?: number): Promise<CompoundTokenConfig[]> => {
  try {
    console.log(`Fetching Compound TokenConfig structures for user: ${userAddress}`);
    
    // Query Compound subgraph (use timestamp filter by default)
    const transactions = await queryCompoundUserTransactions(userAddress, undefined, undefined, currentChainId);
    
    if (transactions.length === 0) {
      console.log('No Compound transactions found for user');
      return [];
    }
    
    const tokenConfigs: CompoundTokenConfig[] = [];
    
    // Process each transaction
    for (const tx of transactions) {
      console.log(`Processing Compound transaction: ${tx.action} - ${tx.amount} (tx: ${tx.txHash.slice(0, 10)}...)`);
      
      // Determine token type based on whether it's a collateral or base interaction
      const tokenType = tx.isCollateralInteraction ? CompoundTokenType.COLLATERAL : CompoundTokenType.BASE;
      
      // Always use market ID as cTokenAddress
      const cTokenAddress = tx.marketId;
      
      tokenConfigs.push({
        collateralAddress: tx.assetAddress,
        cTokenAddress: cTokenAddress,
        chainId: currentChainId?.toString() || '1',
        blockNumber: tx.blockNumber,
        balance: '0', // Always 0 as in Aave implementation
        tokenType: tokenType,
      });
      
      console.log(`Added Compound ${tx.action} token: ${tx.amount} ${tx.assetAddress} (type: ${tokenType})`);
    }
    
    console.log(`Created ${tokenConfigs.length} Compound TokenConfig structures`);
    return tokenConfigs;
  } catch (error) {
    console.error('Error getting Compound TokenConfig structures:', error);
    throw error;
  }
};

// Get unclaimed Compound data (data after the latest claimed timestamp)
export const getUnclaimedCompoundData = async (
  userAddress: string, 
  currentChainId?: number, 
  timestampFilter?: number
): Promise<CompoundSupplyBorrowData[]> => {
  try {
    console.log(`Fetching unclaimed Compound data for user: ${userAddress}`);
    if (timestampFilter) {
      console.log(`Using timestamp filter for unclaimed data: ${timestampFilter} (${new Date(timestampFilter * 1000).toISOString()})`);
    }
    
    // Query Compound subgraph with timestamp filter (not block number)
    const transactions = await queryCompoundUserTransactions(userAddress, timestampFilter, undefined, currentChainId);
    
    if (transactions.length === 0) {
      console.log('No unclaimed Compound transactions found for user');
      return [];
    }
    
    // Group transactions by asset
    const uniqueAssets = new Map<string, CompoundSubgraphTransaction[]>();
    
    transactions.forEach(tx => {
      const asset = tx.assetAddress.toLowerCase();
      if (!uniqueAssets.has(asset)) {
        uniqueAssets.set(asset, []);
      }
      uniqueAssets.get(asset)!.push(tx);
    });

    const supplyBorrowData: CompoundSupplyBorrowData[] = [];

    // Process each unique asset
    for (const [asset, assetTxs] of uniqueAssets) {
      console.log(`\n=== Processing unclaimed Compound asset ${asset} ===`);
      console.log(`Found ${assetTxs.length} transactions for this asset`);
      
      // Calculate supply and borrow amounts
      const supplyAmount = calculateCompoundSupplyAmount(assetTxs);
      const totalBorrowAmount = calculateCompoundTotalBorrowAmount(assetTxs);
      const repayAmount = calculateCompoundRepayAmount(assetTxs);
      
      // For Compound, amountUsd is already in USD format from the subgraph
      // Sum all USD values from transactions
      let totalSupplyUSD = 0;
      let totalBorrowUSD = 0;
      let totalRepayUSD = 0;
      
      assetTxs.forEach(tx => {
        const usdValue = tx.amountUsd ? parseFloat(tx.amountUsd) : 0;
        if (tx.action === 'Supply') {
          totalSupplyUSD += usdValue;
        } else if (tx.action === 'Borrow') {
          totalBorrowUSD += usdValue;
        } else if (tx.action === 'Repay') {
          totalRepayUSD += usdValue;
        }
      });
      
      // Use chainId from currentChainId or default to mainnet
      const chainId = currentChainId || mainnet.id;
      
      console.log(`\n=== Final calculations for unclaimed Compound ${asset} ===`);
      console.log(`Supply Amount: ${supplyAmount} ($${totalSupplyUSD.toFixed(2)})`);
      console.log(`Total Borrow Amount: ${totalBorrowAmount} ($${totalBorrowUSD.toFixed(2)})`);
      console.log(`Repay Amount: ${repayAmount} ($${totalRepayUSD.toFixed(2)})`);
      
      // Only include assets with some activity
      if (supplyAmount > 0n || totalBorrowAmount > 0n || repayAmount > 0n) {
        supplyBorrowData.push({
          asset,
          chainId: chainId.toString(),
          supplyAmount: supplyAmount.toString(),
          borrowAmount: totalBorrowAmount.toString(),
          repayAmount: repayAmount.toString(),
          totalBorrowAmount: totalBorrowAmount.toString(),
          supplyAmountUSD: totalSupplyUSD.toString(),
          borrowAmountUSD: totalBorrowUSD.toString(),
          repayAmountUSD: totalRepayUSD.toString(),
          transactions: assetTxs,
        });
        console.log(`✅ Added to unclaimed Compound data with ${assetTxs.length} transactions`);
      } else {
        console.log(`❌ Skipped - no activity`);
      }
    }
    
    console.log(`Created ${supplyBorrowData.length} unclaimed Compound data entries`);
    return supplyBorrowData;
  } catch (error) {
    console.error('Error getting unclaimed Compound data:', error);
    throw error;
  }
};

