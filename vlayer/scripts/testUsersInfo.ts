#!/usr/bin/env bun

/**
 * Test script for UsersInfo functionality
 * This script demonstrates how to query user information from the SimpleTeleportVerifier contract
 */

import { 
  getUserInfo, 
  getAllUserInfo, 
  getUserTotalActivity, 
  formatUserInfo, 
  hasActivity 
} from '../getUsersInfo';

// Test user address (replace with actual address)
const TEST_USER = '0x05e14E44e3B296f12b21790CdE834BCE5bE5B8e0' as `0x${string}`;

async function testUsersInfo() {
  console.log('🧪 Testing UsersInfo Query Functionality');
  console.log('==========================================');
  console.log(`Test User: ${TEST_USER}`);
  console.log(`Verifier Contract: 0x49F08053963A088aD826576ae9C5B08B9864a44C`);
  console.log('');

  try {
    // Test 1: Query specific protocol (AAVE)
    console.log('📊 Test 1: Query AAVE Protocol');
    console.log('------------------------------');
    const aaveInfo = await getUserInfo(TEST_USER, 'AAVE');
    const aaveFormatted = formatUserInfo(aaveInfo);
    const aaveHasActivity = hasActivity(aaveInfo);
    
    console.log(`Has AAVE Activity: ${aaveHasActivity ? '✅ Yes' : '❌ No'}`);
    console.log('Formatted Data:');
    console.log(`  Borrowed: ${aaveFormatted.borrowedAmount}`);
    console.log(`  Supplied: ${aaveFormatted.suppliedAmount}`);
    console.log(`  Repaid: ${aaveFormatted.repaidAmount}`);
    console.log(`  Latest Balance: ${aaveFormatted.latestBalance}`);
    console.log(`  Borrow Times: ${aaveFormatted.borrowTimes}`);
    console.log(`  Supply Times: ${aaveFormatted.supplyTimes}`);
    console.log(`  Repay Times: ${aaveFormatted.repayTimes}`);
    console.log(`  Latest Block: ${aaveFormatted.latestBlock}`);
    console.log('');

    // Test 2: Query all protocols
    console.log('📊 Test 2: Query All Protocols');
    console.log('------------------------------');
    const allInfo = await getAllUserInfo(TEST_USER);
    
    const protocols = [
      { name: 'AAVE', data: allInfo.aave, emoji: '🟢' },
      { name: 'MORPHO', data: allInfo.morpho, emoji: '🟣' },
      { name: 'COMPOUND', data: allInfo.compound, emoji: '🟠' },
    ];

    for (const protocol of protocols) {
      console.log(`${protocol.emoji} ${protocol.name}:`);
      if (protocol.data) {
        const formatted = formatUserInfo(protocol.data);
        const activity = hasActivity(protocol.data);
        console.log(`  Activity: ${activity ? '✅ Yes' : '❌ No'}`);
        console.log(`  Borrowed: ${formatted.borrowedAmount}`);
        console.log(`  Supplied: ${formatted.suppliedAmount}`);
        console.log(`  Repaid: ${formatted.repaidAmount}`);
      } else {
        console.log(`  ❌ No data available`);
      }
    }
    console.log('');

    // Test 3: Get total activity
    console.log('📊 Test 3: Total Activity Summary');
    console.log('---------------------------------');
    const totalActivity = await getUserTotalActivity(TEST_USER);
    
    console.log(`Total Borrowed: ${formatUserInfo({
      borrowedAmount: totalActivity.totalBorrowed,
      suppliedAmount: 0n,
      repaidAmount: 0n,
      latestBlock: 0n,
      latestBalance: 0n,
      borrowTimes: 0n,
      supplyTimes: 0n,
      repayTimes: 0n,
    }).borrowedAmount}`);
    
    console.log(`Total Supplied: ${formatUserInfo({
      borrowedAmount: 0n,
      suppliedAmount: totalActivity.totalSupplied,
      repaidAmount: 0n,
      latestBlock: 0n,
      latestBalance: 0n,
      borrowTimes: 0n,
      supplyTimes: 0n,
      repayTimes: 0n,
    }).suppliedAmount}`);
    
    console.log(`Total Repaid: ${formatUserInfo({
      borrowedAmount: 0n,
      suppliedAmount: 0n,
      repaidAmount: totalActivity.totalRepaid,
      latestBlock: 0n,
      latestBalance: 0n,
      borrowTimes: 0n,
      supplyTimes: 0n,
      repayTimes: 0n,
    }).repaidAmount}`);
    
    console.log(`Total Borrow Times: ${totalActivity.totalBorrowTimes}`);
    console.log(`Total Supply Times: ${totalActivity.totalSupplyTimes}`);
    console.log(`Total Repay Times: ${totalActivity.totalRepayTimes}`);
    console.log('');

    // Test 4: Activity analysis
    console.log('📊 Test 4: Activity Analysis');
    console.log('----------------------------');
    const hasAnyActivity = (
      totalActivity.totalBorrowed > 0n ||
      totalActivity.totalSupplied > 0n ||
      totalActivity.totalRepaid > 0n
    );
    
    console.log(`User has any DeFi activity: ${hasAnyActivity ? '✅ Yes' : '❌ No'}`);
    
    if (hasAnyActivity) {
      const mostActiveProtocol = (() => {
        const activities = [
          { name: 'AAVE', total: (allInfo.aave ? allInfo.aave.borrowedAmount + allInfo.aave.suppliedAmount + allInfo.aave.repaidAmount : 0n) },
          { name: 'MORPHO', total: (allInfo.morpho ? allInfo.morpho.borrowedAmount + allInfo.morpho.suppliedAmount + allInfo.morpho.repaidAmount : 0n) },
          { name: 'COMPOUND', total: (allInfo.compound ? allInfo.compound.borrowedAmount + allInfo.compound.suppliedAmount + allInfo.compound.repaidAmount : 0n) },
        ];
        return activities.reduce((max, current) => current.total > max.total ? current : max);
      })();
      
      console.log(`Most active protocol: ${mostActiveProtocol.name}`);
      console.log(`Total transactions: ${totalActivity.totalBorrowTimes + totalActivity.totalSupplyTimes + totalActivity.totalRepayTimes}`);
    }

    console.log('');
    console.log('✅ All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testUsersInfo().catch(console.error);

