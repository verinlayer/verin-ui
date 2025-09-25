#!/usr/bin/env bun

import { 
  getUserInfo, 
  getAllUserInfo, 
  getUserTotalActivity, 
  formatUserInfo, 
  hasActivity 
} from '../getUsersInfo';

// Default user address for testing
const DEFAULT_USER = '0x716cB4CB740D5D6514f9D418fD8613E91D1dd33A' as `0x${string}`;

async function main() {
  const args = process.argv.slice(2);
  const userAddress = (args[0] as `0x${string}`) || DEFAULT_USER;
  const protocol = args[1]?.toUpperCase() as 'AAVE' | 'MORPHO' | 'COMPOUND' | undefined;

  console.log('🔍 UsersInfo Query Tool');
  console.log('======================');
  console.log(`User Address: ${userAddress}`);
  console.log(`Verifier Address: 0x49F08053963A088aD826576ae9C5B08B9864a44C`);
  console.log('');

  try {
    if (protocol && ['AAVE', 'MORPHO', 'COMPOUND'].includes(protocol)) {
      // Query specific protocol
      console.log(`📊 Querying ${protocol} Protocol Data`);
      console.log('=====================================');
      
      const info = await getUserInfo(userAddress, protocol);
      const formatted = formatUserInfo(info);
      const activity = hasActivity(info);

      console.log(`Has Activity: ${activity ? '✅ Yes' : '❌ No'}`);
      console.log('');
      console.log('Raw Data:');
      console.log(`  Borrowed Amount: ${info.borrowedAmount.toString()}`);
      console.log(`  Supplied Amount: ${info.suppliedAmount.toString()}`);
      console.log(`  Repaid Amount: ${info.repaidAmount.toString()}`);
      console.log(`  Latest Block: ${info.latestBlock.toString()}`);
      console.log(`  Latest Balance: ${info.latestBalance.toString()}`);
      console.log(`  Borrow Times: ${info.borrowTimes.toString()}`);
      console.log(`  Supply Times: ${info.supplyTimes.toString()}`);
      console.log(`  Repay Times: ${info.repayTimes.toString()}`);
      console.log('');
      console.log('Formatted Data:');
      console.log(`  Borrowed Amount: ${formatted.borrowedAmount}`);
      console.log(`  Supplied Amount: ${formatted.suppliedAmount}`);
      console.log(`  Repaid Amount: ${formatted.repaidAmount}`);
      console.log(`  Latest Block: ${formatted.latestBlock}`);
      console.log(`  Latest Balance: ${formatted.latestBalance}`);
      console.log(`  Borrow Times: ${formatted.borrowTimes}`);
      console.log(`  Supply Times: ${formatted.supplyTimes}`);
      console.log(`  Repay Times: ${formatted.repayTimes}`);

    } else {
      // Query all protocols
      console.log('📊 Querying All Protocol Data');
      console.log('==============================');

      const [allInfo, totalActivity] = await Promise.all([
        getAllUserInfo(userAddress),
        getUserTotalActivity(userAddress),
      ]);

      // Display each protocol
      const protocols = [
        { name: 'AAVE', data: allInfo.aave, color: '🟢' },
        { name: 'MORPHO', data: allInfo.morpho, color: '🟣' },
        { name: 'COMPOUND', data: allInfo.compound, color: '🟠' },
      ];

      for (const protocol of protocols) {
        console.log(`\n${protocol.color} ${protocol.name} Protocol`);
        console.log('─'.repeat(20));
        
        if (protocol.data) {
          const formatted = formatUserInfo(protocol.data);
          const activity = hasActivity(protocol.data);
          
          console.log(`Has Activity: ${activity ? '✅ Yes' : '❌ No'}`);
          console.log(`Borrowed: ${formatted.borrowedAmount}`);
          console.log(`Supplied: ${formatted.suppliedAmount}`);
          console.log(`Repaid: ${formatted.repaidAmount}`);
          console.log(`Latest Balance: ${formatted.latestBalance}`);
          console.log(`Borrow Times: ${formatted.borrowTimes}`);
          console.log(`Supply Times: ${formatted.supplyTimes}`);
          console.log(`Repay Times: ${formatted.repayTimes}`);
          console.log(`Latest Block: ${formatted.latestBlock}`);
        } else {
          console.log('❌ No data available');
        }
      }

      // Display total activity
      console.log('\n📈 Total Activity Summary');
      console.log('=========================');
      console.log(`Total Borrowed: ${formatUserInfo({ ...totalActivity, borrowedAmount: totalActivity.totalBorrowed }).borrowedAmount}`);
      console.log(`Total Supplied: ${formatUserInfo({ ...totalActivity, suppliedAmount: totalActivity.totalSupplied }).suppliedAmount}`);
      console.log(`Total Repaid: ${formatUserInfo({ ...totalActivity, repaidAmount: totalActivity.totalRepaid }).repaidAmount}`);
      console.log(`Total Borrow Times: ${totalActivity.totalBorrowTimes.toString()}`);
      console.log(`Total Supply Times: ${totalActivity.totalSupplyTimes.toString()}`);
      console.log(`Total Repay Times: ${totalActivity.totalRepayTimes.toString()}`);
    }

  } catch (error) {
    console.error('❌ Error querying user info:', error);
    process.exit(1);
  }
}

// Usage information
function showUsage() {
  console.log('Usage:');
  console.log('  bun run scripts/queryUsersInfo.ts [userAddress] [protocol]');
  console.log('');
  console.log('Arguments:');
  console.log('  userAddress  - Ethereum address to query (optional, defaults to test address)');
  console.log('  protocol     - Protocol to query: AAVE, MORPHO, or COMPOUND (optional)');
  console.log('');
  console.log('Examples:');
  console.log('  bun run scripts/queryUsersInfo.ts');
  console.log('  bun run scripts/queryUsersInfo.ts 0x1234... AAVE');
  console.log('  bun run scripts/queryUsersInfo.ts 0x1234... MORPHO');
}

// Check for help flag
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  showUsage();
  process.exit(0);
}

// Run the main function
main().catch(console.error);
