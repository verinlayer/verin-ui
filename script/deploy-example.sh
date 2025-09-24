#!/bin/bash

# SimpleTeleport Deployment Example Script
# This script demonstrates how to deploy the SimpleTeleport contracts

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required environment variables are set
check_env() {
    if [ -z "$PRIVATE_KEY" ]; then
        print_error "PRIVATE_KEY environment variable is not set"
        print_status "Please set your private key: export PRIVATE_KEY='your_private_key_here'"
        exit 1
    fi
    
    if [ -z "$RPC_URL" ]; then
        print_error "RPC_URL environment variable is not set"
        print_status "Please set your RPC URL: export RPC_URL='https://your-rpc-url'"
        exit 1
    fi
}

# Deploy to local network (Anvil)
deploy_local() {
    print_status "Deploying to local Anvil network..."
    
    # Start Anvil in background
    anvil &
    ANVIL_PID=$!
    
    # Wait for Anvil to start
    sleep 2
    
    # Deploy contracts
    forge script script/DeployTeleportTest.s.sol:DeployTeleportTest \
        --rpc-url http://localhost:8545 \
        --broadcast \
        --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
    
    # Stop Anvil
    kill $ANVIL_PID
    
    print_status "Local deployment completed!"
}

# Deploy to testnet
deploy_testnet() {
    print_status "Deploying to testnet..."
    
    forge script script/DeployTeleport.s.sol:DeployTeleport \
        --rpc-url $RPC_URL \
        --broadcast \
        --verify \
        --etherscan-api-key $ETHERSCAN_API_KEY
    
    print_status "Testnet deployment completed!"
}

# Deploy to mainnet
deploy_mainnet() {
    print_warning "You are about to deploy to MAINNET!"
    read -p "Are you sure? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        print_status "Deployment cancelled."
        exit 0
    fi
    
    print_status "Deploying to mainnet..."
    
    forge script script/DeployTeleportAdvanced.s.sol:DeployTeleportAdvanced \
        --rpc-url $RPC_URL \
        --broadcast \
        --verify \
        --etherscan-api-key $ETHERSCAN_API_KEY \
        --slow
    
    print_status "Mainnet deployment completed!"
}

# Main script
main() {
    print_status "SimpleTeleport Contract Deployment"
    print_status "=================================="
    
    # Check environment
    check_env
    
    # Parse command line arguments
    case "${1:-local}" in
        "local")
            deploy_local
            ;;
        "testnet")
            deploy_testnet
            ;;
        "mainnet")
            deploy_mainnet
            ;;
        *)
            print_error "Invalid deployment target: $1"
            print_status "Usage: $0 [local|testnet|mainnet]"
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"

