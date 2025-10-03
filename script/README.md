# SimpleTeleport Deployment Scripts

This directory contains Solidity deployment scripts for the SimpleTeleport protocol contracts.

## Scripts Overview

### 1. `DeployTeleport.s.sol` - Basic Deployment Script
- Simple deployment script with basic functionality
- Deploys all contracts in the correct dependency order
- Includes helper functions for partial deployments

### 2. `DeployTeleportAdvanced.s.sol` - Advanced Deployment Script
- Environment-specific configurations
- Comprehensive logging and verification
- Support for different deployment strategies
- Post-deployment verification and setup

### 3. `DeployTeleportTest.s.sol` - Test Deployment Script
- Minimal configuration for testing and development
- Uses default values
- Quick deployment for development purposes

## Contract Deployment Order

The contracts must be deployed in the following order due to dependencies:

1. **WhaleBadgeNFT** - No dependencies
2. **Registry** - No dependencies (requires admin address)
3. **SimpleTeleportProver** - No dependencies
4. **SimpleTeleportVerifier** - Depends on Prover, WhaleBadgeNFT, and Registry

## Usage

### Prerequisites

1. Set up your environment variables:
```bash
export DEPLOYER_PRIVATE_KEY="your_private_key_here"
export ADMIN_ADDRESS="0x..." # Optional, defaults to deployer
export ENVIRONMENT="development" # Optional, defaults to "development"
export VERIFY_CONTRACTS="true" # Optional, defaults to true
```

### Basic Deployment

```bash
# Deploy all contracts
forge script script/DeployTeleport.s.sol:DeployTeleport --rpc-url <RPC_URL> --broadcast

# Deploy only Registry
forge script script/DeployTeleport.s.sol:DeployTeleport --sig "deployRegistry()" --rpc-url <RPC_URL> --broadcast

# Deploy core contracts with existing Registry
forge script script/DeployTeleport.s.sol:DeployTeleport --sig "deployCore(address)" <REGISTRY_ADDRESS> --rpc-url <RPC_URL> --broadcast
```

### Advanced Deployment

```bash
# Deploy with environment configuration
forge script script/DeployTeleportAdvanced.s.sol:DeployTeleportAdvanced --rpc-url <RPC_URL> --broadcast

# Deploy with custom admin
forge script script/DeployTeleportAdvanced.s.sol:DeployTeleportAdvanced --sig "deployWithAdmin(address)" <ADMIN_ADDRESS> --rpc-url <RPC_URL> --broadcast

# Deploy to specific network
forge script script/DeployTeleportAdvanced.s.sol:DeployTeleportAdvanced --sig "deployToNetwork(string)" <NETWORK_NAME> --rpc-url <RPC_URL> --broadcast
```

### Test Deployment

```bash
# Quick deployment for testing
forge script script/DeployTeleportTest.s.sol:DeployTeleportTest --rpc-url <RPC_URL> --broadcast
```

## Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PRIVATE_KEY` | Private key for deployment | - | Yes |
| `ADMIN_ADDRESS` | Address to grant admin role in Registry | Deployer address | No |
| `ENVIRONMENT` | Deployment environment name | "development" | No |
| `VERIFY_CONTRACTS` | Whether to log verification commands | true | No |
| `GAS_PRICE` | Gas price for transactions | 0 (auto) | No |

## Contract Addresses

After deployment, the script will output the addresses of all deployed contracts:

- **WhaleBadgeNFT**: NFT contract for rewards
- **Registry**: Centralized address storage
- **SimpleTeleportProver**: Proof generation contract
- **SimpleTeleportVerifier**: Proof verification and reward distribution

## Verification

The deployment scripts include built-in verification to ensure:
- All contract addresses are set correctly
- Dependencies are properly linked
- Admin roles are granted correctly

## Network-Specific Deployment

For different networks, you may need to update the Registry contract with network-specific addresses:

1. Deploy the Registry
2. Update chain-specific addresses using the Registry's update functions
3. Deploy the remaining contracts

## Troubleshooting

### Common Issues

1. **Insufficient funds**: Ensure the deployer account has enough ETH for gas
2. **Invalid private key**: Check that `PRIVATE_KEY` is set correctly
3. **RPC issues**: Verify the RPC URL is correct and accessible
4. **Contract verification**: Use the logged verification commands after deployment

### Gas Estimation

Before deploying to mainnet, estimate gas costs:

```bash
forge script script/DeployTeleport.s.sol:DeployTeleport --rpc-url <RPC_URL> --gas-estimate
```

## Security Notes

- Never commit private keys to version control
- Use environment variables for sensitive data
- Verify contracts after deployment
- Test on testnets before mainnet deployment
- Consider using multisig wallets for admin roles in production

