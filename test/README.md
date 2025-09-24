# SimpleTeleportVerifier Test Suite

This directory contains comprehensive test cases for the SimpleTeleportVerifier contract.

## Test Files Overview

### 1. `SimpleTeleportVerifierMinimal.t.sol` - ✅ Working
**Status**: All tests passing (11/11)

A minimal test suite that covers the core functionality without complex vlayer integration:

- **Constructor Tests**: Verifies proper initialization of contract addresses
- **UserInfo Tests**: Tests initial state of user information tracking
- **WhaleBadgeNFT Tests**: Verifies NFT minting functionality
- **Registry Tests**: Tests address storage and access control
- **Error Handling Tests**: Tests invalid inputs and edge cases
- **Enum Tests**: Verifies TokenType and Protocol enum values

### 2. `SimpleTeleportVerifierBasic.t.sol` - ⚠️ Partial
**Status**: Compiles but fails due to vlayer verification issues

A more comprehensive test suite that includes:
- All functionality from minimal tests
- Claim function tests with different token types
- Borrow/repay logic tests
- Multiple user scenarios
- Integration tests

**Issues**: Tests fail due to vlayer verification requirements that need proper setup.

## Test Coverage

### ✅ Covered Functionality

1. **Contract Initialization**
   - Constructor parameter validation
   - Address assignment verification
   - Access control setup

2. **User Information Tracking**
   - Initial state verification
   - Data structure validation
   - User isolation testing

3. **Registry Integration**
   - Address storage and retrieval
   - Chain-specific address management
   - Access control verification

4. **WhaleBadgeNFT Integration**
   - NFT minting functionality
   - Ownership verification
   - Token ID tracking

5. **Error Handling**
   - Invalid block number handling
   - Invalid token address validation
   - Empty input handling

6. **Data Types**
   - TokenType enum validation
   - Protocol enum validation
   - Struct field verification

### ⚠️ Partially Covered (Requires vlayer Setup)

1. **Claim Function Logic**
   - Aave token validation
   - Balance tracking updates
   - Borrow/repay calculations
   - Supply amount tracking

2. **Complex Scenarios**
   - Multiple token processing
   - Sequential claim handling
   - User state transitions

## Running Tests

### Run All Tests
```bash
forge test
```

### Run Specific Test File
```bash
# Run minimal tests (recommended)
forge test --match-contract SimpleTeleportVerifierMinimalTest

# Run basic tests (may fail due to vlayer)
forge test --match-contract SimpleTeleportVerifierBasicTest
```

### Run with Verbose Output
```bash
forge test --match-contract SimpleTeleportVerifierMinimalTest -vvv
```

## Test Structure

### Setup Function
Each test file includes a `setUp()` function that:
- Deploys all required contracts
- Sets up test accounts
- Mocks external dependencies
- Initializes test data

### Helper Functions
- `createMockProof()`: Creates valid Proof structs for testing
- `createErc20Token()`: Creates Erc20Token structs with test data
- `mockAavePoolCall()`: Mocks Aave pool contract calls

### Test Categories

1. **Constructor Tests**
   - Verify proper initialization
   - Test zero address handling
   - Validate address assignments

2. **UserInfo Tests**
   - Test initial state
   - Verify data structure
   - Test user isolation

3. **Integration Tests**
   - Test contract interactions
   - Verify external dependencies
   - Test data flow

4. **Error Handling Tests**
   - Test invalid inputs
   - Verify error messages
   - Test edge cases

5. **Enum and Type Tests**
   - Verify enum values
   - Test struct creation
   - Validate data types

## Mocking Strategy

### External Dependencies
- **Aave Pool**: Mocked to return expected token addresses
- **vlayer Verification**: Mocked to bypass complex verification logic
- **Registry**: Uses actual contract with mocked addresses

### Test Data
- Uses realistic Ethereum mainnet addresses
- Creates valid struct instances
- Uses appropriate test values

## Known Issues

### 1. vlayer Verification
The main challenge is that the `claim` function requires vlayer proof verification, which is complex to set up in tests. The current approach:
- Mocks the verification process
- Tests the logic that runs after verification
- Focuses on data validation and state updates

### 2. Stack Too Deep Errors
Some test functions hit Solidity's stack depth limit. Solutions:
- Use minimal test file for basic functionality
- Break complex tests into smaller functions
- Use `--via-ir` compiler flag if needed

### 3. Gas Estimation
Tests don't include gas usage validation, but this could be added for optimization testing.

## Future Improvements

### 1. Complete vlayer Integration
- Set up proper vlayer test environment
- Create realistic proof data
- Test full verification flow

### 2. Fuzz Testing
- Add fuzz tests for edge cases
- Test with random inputs
- Validate boundary conditions

### 3. Integration Testing
- Test with real Aave contracts
- Test cross-contract interactions
- Test with multiple users

### 4. Performance Testing
- Measure gas usage
- Test with large datasets
- Optimize for efficiency

## Test Data

### Token Addresses
- **USDC**: `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`
- **aUSDC**: `0x98C23E9D8F34fefB1b7Bd6a91b7Ff122f4E15F5c`
- **vDebt USDC**: `0x72E95b6b8ef21F7199cab2C9C59606F7d37c2570`

### Test Values
- **Block Numbers**: 1000, 1001, 1002, etc.
- **Balances**: 1000e6 (1000 USDC), 500e6 (500 USDC)
- **Chain ID**: 1 (Ethereum mainnet)

## Contributing

When adding new tests:
1. Follow the existing naming convention
2. Include proper documentation
3. Test both success and failure cases
4. Use appropriate mocking strategies
5. Keep tests focused and atomic

## Debugging

### Common Issues
1. **Compilation Errors**: Check imports and struct definitions
2. **Test Failures**: Verify mock setup and expected behavior
3. **Gas Issues**: Use `--gas-report` flag for analysis

### Debug Commands
```bash
# Run with gas report
forge test --gas-report

# Run with trace
forge test --match-test testName -vvvv

# Run specific test with debug
forge test --match-test testName --debug
```
