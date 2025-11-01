import { getMorphoSubgraphUrl, getMorphoAddressForChain, rpcClients } from '../config/morpho';
import { getProtocolEnum, type ProtocolType } from './utils';

// Minimal ABI for Controller.latestProtocolBlockNumbers
const CONTROLLER_BLOCKS_ABI = [
  {
    "inputs": [
      { "internalType": "uint8", "name": "protocol", "type": "uint8" }
    ],
    "name": "latestProtocolBlockNumbers",
    "outputs": [
      { "internalType": "uint256", "name": "latestDebtBlock", "type": "uint256" },
      { "internalType": "uint256", "name": "latestCollateralBlock", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

export interface MorphoEvent {
  action: 'Borrow' | 'Repay' | 'Supply' | 'Withdraw';
  amount: string;
  amountUSD?: string;
  blockNumber: string;
  marketId: string; // bytes32 id
  assetAddress: string;
  txHash: string;
}

export interface MorphoTokenConfig {
  marketId: `0x${string}`; // bytes32
  morphoAddress: `0x${string}`;
  chainId: number;
  blockNumber: string;
  supplyShares: string; // placeholder 0
  borrowShares: string; // placeholder 0
  collateral: string; // placeholder 0
  totalSupplyAssets: string; // placeholder 0
  totalSupplyShares: string; // placeholder 0
  totalBorrowAssets: string; // placeholder 0
  totalBorrowShares: string; // placeholder 0
}

const buildMorphoQuery = (user: string, debtAfter: string, collateralAfter: string, timestampAfter: number) => {
  // Use dynamic account with BOTH blockNumber_gt and timestamp_gt
  return `query {
  borrows(
    where: {and: [
      {account: "${user.toLowerCase()}"},
      {blockNumber_gt: "${debtAfter}"},
      {timestamp_gt: ${timestampAfter}}
    ]}
    first: 100
    orderBy: blockNumber
    orderDirection: asc
  ) {
    amount
    amountUSD
    blockNumber
    market { id }
    hash
    asset { decimals name symbol id lastPriceUSD }
  }
  repays(
    where: {and: [
      {account: "${user.toLowerCase()}"},
      {blockNumber_gt: "${debtAfter}"},
      {timestamp_gt: ${timestampAfter}}
    ]}
    first: 100
    orderBy: blockNumber
    orderDirection: asc
  ) {
    amount
    amountUSD
    blockNumber
    market { id }
    hash
    asset { decimals name symbol id lastPriceUSD }
  }
  deposits(
    where: {and: [
      {account: "${user.toLowerCase()}"},
      {blockNumber_gt: "${collateralAfter}"},
      {timestamp_gt: ${timestampAfter}}
    ]}
    first: 100
    orderBy: blockNumber
    orderDirection: asc
  ) {
    amount
    amountUSD
    blockNumber
    market { id }
    hash
    asset { decimals name symbol id lastPriceUSD }
  }
  withdraws(
    where: {and: [
      {account: "${user.toLowerCase()}"},
      {blockNumber_gt: "${collateralAfter}"},
      {timestamp_gt: ${timestampAfter}}
    ]}
    first: 100
    orderBy: blockNumber
    orderDirection: asc
  ) {
    amount
    amountUSD
    blockNumber
    market { id }
    hash
    asset { decimals name symbol id lastPriceUSD }
  }
}`;
};

export const queryMorphoEvents = async (
  user: string,
  chainId?: number,
  controllerAddress?: string
): Promise<MorphoEvent[]> => {
  const apiUrl = getMorphoSubgraphUrl(chainId);

  let latestDebtBlock = '0';
  let latestCollateralBlock = '0';
  // Default timestamp filter to 14 days ago if we cannot derive from blocks
  const fourteenDaysAgo = Math.floor(Date.now() / 1000) - (14 * 24 * 60 * 60) - 3600;
  let timestampAfter = fourteenDaysAgo;

  // Read latest blocks from Controller if available
  if (controllerAddress && chainId) {
    try {
      const client = rpcClients[chainId as keyof typeof rpcClients];
      const protocolEnum = getProtocolEnum('MORPHO' as ProtocolType);
      const res = await client.readContract({
        address: controllerAddress as `0x${string}`,
        abi: CONTROLLER_BLOCKS_ABI,
        functionName: 'latestProtocolBlockNumbers',
        args: [protocolEnum]
      }) as any;
      latestDebtBlock = (res?.[0] ?? 0n).toString();
      latestCollateralBlock = (res?.[1] ?? 0n).toString();
      // If we have non-zero latest blocks, prefer using their corresponding timestamps via app-side mapping (optional).
      // Since we don't convert here, keep fourteenDaysAgo to ensure recent data; caller can refine if needed.
    } catch (e) {
      console.warn('Could not read latestProtocolBlockNumbers, defaulting to 0', e);
    }
  }

  const query = buildMorphoQuery(user, latestDebtBlock, latestCollateralBlock, timestampAfter);
  const result = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query })
  });

  if (!result.ok) {
    throw new Error(`Morpho subgraph HTTP ${result.status}: ${await result.text()}`);
  }

  const data = await result.json();
  const events: MorphoEvent[] = [];

  const pushEvents = (arr: any[], action: MorphoEvent['action']) => {
    arr?.forEach((it: any) => {
      events.push({
        action,
        amount: it.amount,
        amountUSD: it.amountUSD,
        blockNumber: it.blockNumber,
        marketId: it.market?.id,
        assetAddress: it.asset?.id,
        txHash: it.hash,
      });
    });
  };

  pushEvents(data?.data?.borrows || [], 'Borrow');
  pushEvents(data?.data?.repays || [], 'Repay');
  pushEvents(data?.data?.deposits || [], 'Supply');
  pushEvents(data?.data?.withdraws || [], 'Withdraw');

  // Sort and cap to 10 total
  events.sort((a, b) => Number(a.blockNumber) - Number(b.blockNumber));
  return events.slice(0, 10);
};

export const getMorphoTokenConfigs = async (
  user: string,
  chainId?: number,
  controllerAddress?: string
): Promise<MorphoTokenConfig[]> => {
  const events = await queryMorphoEvents(user, chainId, controllerAddress);
  const morphoAddr = getMorphoAddressForChain(chainId);
  if (!morphoAddr) return [];

  // Build minimal MToken configs from events
  const tokens: MorphoTokenConfig[] = events.map(ev => ({
    marketId: ev.marketId as `0x${string}`,
    morphoAddress: morphoAddr,
    chainId: chainId || 8453,
    blockNumber: ev.blockNumber,
    supplyShares: '0',
    borrowShares: '0',
    collateral: '0',
    totalSupplyAssets: '0',
    totalSupplyShares: '0',
    totalBorrowAssets: '0',
    totalBorrowShares: '0',
  }));

  return tokens;
};

// Get unclaimed Morpho data (mirrors Compound structure)
export interface MorphoSupplyBorrowData {
  asset: string;
  chainId: string;
  supplyAmount: string;
  borrowAmount: string;
  repayAmount: string;
  totalBorrowAmount: string;
  supplyAmountUSD?: string;
  borrowAmountUSD?: string;
  repayAmountUSD?: string;
}

export const getUnclaimedMorphoData = async (
  userAddress: string,
  currentChainId?: number,
  controllerAddress?: string
): Promise<MorphoSupplyBorrowData[]> => {
  try {
    console.log(`Fetching unclaimed Morpho data for user: ${userAddress}`);

    const events = await queryMorphoEvents(userAddress, currentChainId, controllerAddress);
    if (!events || events.length === 0) {
      console.log('No unclaimed Morpho transactions found for user');
      return [];
    }

    const byAsset = new Map<string, typeof events>();
    events.forEach(ev => {
      const key = (ev.assetAddress || '').toLowerCase();
      if (!byAsset.has(key)) byAsset.set(key, []);
      byAsset.get(key)!.push(ev);
    });

    const supplyBorrowData: MorphoSupplyBorrowData[] = [];

    for (const [asset, assetEvents] of byAsset) {
      let supply = 0n, borrow = 0n, repay = 0n, totalBorrow = 0n;
      let totalSupplyUSD = 0, totalBorrowUSD = 0, totalRepayUSD = 0;

      assetEvents.forEach(e => {
        const amt = BigInt(e.amount || '0');
        const usd = e.amountUSD ? parseFloat(e.amountUSD) : 0;
        if (e.action === 'Supply') { supply += amt; totalSupplyUSD += usd; }
        if (e.action === 'Borrow') { borrow += amt; totalBorrow += amt; totalBorrowUSD += usd; }
        if (e.action === 'Repay') { repay += amt; totalRepayUSD += usd; }
      });

      const chainIdStr = (currentChainId || 8453).toString();

      if (supply > 0n || totalBorrow > 0n || repay > 0n) {
        supplyBorrowData.push({
          asset,
          chainId: chainIdStr,
          supplyAmount: supply.toString(),
          borrowAmount: borrow.toString(),
          repayAmount: repay.toString(),
          totalBorrowAmount: totalBorrow.toString(),
          supplyAmountUSD: totalSupplyUSD.toString(),
          borrowAmountUSD: totalBorrowUSD.toString(),
          repayAmountUSD: totalRepayUSD.toString(),
        });
      }
    }

    console.log(`Created ${supplyBorrowData.length} unclaimed Morpho data entries`);
    return supplyBorrowData;
  } catch (error) {
    console.error('Error getting unclaimed Morpho data:', error);
    throw error;
  }
};


