# UsersInfo Query Scripts

This directory contains scripts to query user information from the SimpleTeleportVerifier contract.

## Overview

The `usersInfo` mapping in the SimpleTeleportVerifier contract stores user activity data across different DeFi protocols (AAVE, MORPHO, COMPOUND). Each user can have data for multiple protocols, and each protocol tracks:

- **Borrowed Amount**: Total amount borrowed by the user
- **Supplied Amount**: Total amount supplied by the user  
- **Repaid Amount**: Total amount repaid by the user
- **Latest Block**: Most recent block number for this user's activity
- **Latest Balance**: Most recent balance for this user
- **Borrow Times**: Number of times the user has borrowed
- **Supply Times**: Number of times the user has supplied
- **Repay Times**: Number of times the user has repaid

## Scripts Available

### 1. Foundry Script (`GetUsersInfo.s.sol`)

A Solidity script that can be run with Foundry to query user data directly from the blockchain.

**Usage:**
```bash
# Query all protocols for a specific user
forge script script/GetUsersInfo.s.sol:GetUsersInfo --sig "queryAllProtocols(address)" 0x716cB4CB740D5D6514f9D418fD8613E91D1dd33A

# Query specific protocol for a user
forge script script/GetUsersInfo.s.sol:GetUsersInfo --sig "querySpecificUser(address,uint256)" 0x716cB4CB740D5D6514f9D418fD8613E91D1dd33A 0

# Run with default example user
forge script script/GetUsersInfo.s.sol:GetUsersInfo
```

**Protocol Values:**
- `0` = AAVE
- `1` = MORPHO  
- `2` = COMPOUND

### 2. TypeScript Script (`vlayer/getUsersInfo.ts`)

A TypeScript module with functions to query user data using viem.

**Usage in code:**
```typescript
import { getUserInfo, getAllUserInfo, getUserTotalActivity } from './getUsersInfo';

// Get specific protocol data
const aaveInfo = await getUserInfo('0x1234...', 'AAVE');

// Get all protocol data
const allInfo = await getAllUserInfo('0x1234...');

// Get total activity across all protocols
const totalActivity = await getUserTotalActivity('0x1234...');
```

### 3. CLI Script (`vlayer/scripts/queryUsersInfo.ts`)

A command-line tool for quick queries.

**Usage:**
```bash
# Query all protocols for default test user
bun run vlayer/scripts/queryUsersInfo.ts

# Query all protocols for specific user
bun run vlayer/scripts/queryUsersInfo.ts 0x716cB4CB740D5D6514f9D418fD8613E91D1dd33A

# Query specific protocol for user
bun run vlayer/scripts/queryUsersInfo.ts 0x716cB4CB740D5D6514f9D418fD8613E91D1dd33A AAVE

# Show help
bun run vlayer/scripts/queryUsersInfo.ts --help
```

### 4. React Hook (`vlayer/src/shared/hooks/useUsersInfo.ts`)

A React hook for use in the web application.

**Usage in React components:**
```typescript
import { useUsersInfo } from '../hooks/useUsersInfo';

function MyComponent() {
  const { userInfo, totalActivity, loading, error, refreshUserInfo } = useUsersInfo();
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return (
    <div>
      <h3>User Activity</h3>
      {userInfo?.aave && <div>Aave: {userInfo.aave.borrowedAmount}</div>}
      <button onClick={refreshUserInfo}>Refresh</button>
    </div>
  );
}
```

### 5. React Component (`vlayer/src/shared/components/UsersInfoDisplay.tsx`)

A ready-to-use React component for displaying user information.

**Usage:**
```typescript
import UsersInfoDisplay from '../components/UsersInfoDisplay';

function MyPage() {
  return (
    <div>
      <UsersInfoDisplay userAddress="0x1234..." />
    </div>
  );
}
```

## Contract Addresses

- **SimpleTeleportVerifier**: `0x49F08053963A088aD826576ae9C5B08B9864a44C`
- **Network**: Optimism Mainnet (Chain ID: 10)

## Data Structure

```solidity
struct UserInfo {
    uint256 borrowedAmount;    // Total borrowed amount
    uint256 suppliedAmount;    // Total supplied amount  
    uint256 repaidAmount;      // Total repaid amount
    uint256 latestBlock;       // Most recent block number
    uint256 latestBalance;     // Most recent balance
    uint256 borrowTimes;       // Number of borrow transactions
    uint256 supplyTimes;       // Number of supply transactions
    uint256 repayTimes;        // Number of repay transactions
}
```

## Examples

### Example 1: Check if user has any Aave activity
```typescript
const aaveInfo = await getUserInfo('0x1234...', 'AAVE');
const hasActivity = hasActivity(aaveInfo);
console.log(`User has Aave activity: ${hasActivity}`);
```

### Example 2: Get formatted user data
```typescript
const aaveInfo = await getUserInfo('0x1234...', 'AAVE');
const formatted = formatUserInfo(aaveInfo);
console.log(`Borrowed: ${formatted.borrowedAmount} tokens`);
```

### Example 3: Compare activity across protocols
```typescript
const allInfo = await getAllUserInfo('0x1234...');
const protocols = ['aave', 'morpho', 'compound'] as const;

protocols.forEach(protocol => {
  const info = allInfo[protocol];
  if (info) {
    console.log(`${protocol}: ${info.borrowedAmount} borrowed`);
  }
});
```

## Error Handling

All scripts include proper error handling for:
- Invalid user addresses
- Network connection issues
- Contract call failures
- Missing data

## Dependencies

- **Foundry**: For Solidity scripts
- **viem**: For TypeScript blockchain interactions
- **React**: For web application hooks and components
- **wagmi**: For wallet connection in React components
