// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.21;

import {Script, console} from "forge-std/Script.sol";
import {WhaleBadgeNFT} from "../src/vlayer/WhaleBadgeNFT.sol";
import {SimpleTeleportProver} from "../src/vlayer/SimpleTeleportProver.sol";
import {SimpleTeleportVerifier} from "../src/vlayer/SimpleTeleportVerifier.sol";
import {Registry} from "../src/vlayer/constants/Registry.sol";

/**
 * @title DeployTeleport
 * @notice Deployment script for the SimpleTeleport protocol contracts
 * @dev Deploys contracts in the correct order with proper dependencies
 */
contract DeployTeleport is Script {
    // Contract instances
    WhaleBadgeNFT public whaleBadgeNFT;
    Registry public registry;
    SimpleTeleportProver public prover;
    SimpleTeleportVerifier public verifier;

    function run() external {
        // Get the deployer's private key
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying contracts with address:", deployer);
        console.log("Deployer balance:", deployer.balance);

        vm.startBroadcast(deployerPrivateKey);

        // Step 1: Deploy WhaleBadgeNFT (no dependencies)
        console.log("\n=== Deploying WhaleBadgeNFT ===");
        whaleBadgeNFT = new WhaleBadgeNFT();
        console.log("WhaleBadgeNFT deployed at:", address(whaleBadgeNFT));

        // Step 2: Deploy Registry (no dependencies)
        console.log("\n=== Deploying Registry ===");
        registry = new Registry(deployer); // Deployer becomes admin
        console.log("Registry deployed at:", address(registry));

        // Step 3: Deploy SimpleTeleportProver (no dependencies)
        console.log("\n=== Deploying SimpleTeleportProver ===");
        prover = new SimpleTeleportProver();
        console.log("SimpleTeleportProver deployed at:", address(prover));

        // Step 4: Deploy SimpleTeleportVerifier (depends on prover, whaleBadgeNFT, and registry)
        console.log("\n=== Deploying SimpleTeleportVerifier ===");
        verifier = new SimpleTeleportVerifier(
            address(prover),
            whaleBadgeNFT,
            registry
        );
        console.log("SimpleTeleportVerifier deployed at:", address(verifier));

        vm.stopBroadcast();

        // Log deployment summary
        console.log("\n=== Deployment Summary ===");
        console.log("WhaleBadgeNFT:", address(whaleBadgeNFT));
        console.log("Registry:", address(registry));
        console.log("SimpleTeleportProver:", address(prover));
        console.log("SimpleTeleportVerifier:", address(verifier));
        
        // Verify contract addresses are set correctly
        console.log("\n=== Verification ===");
        console.log("Verifier prover address:", verifier.prover());
        console.log("Verifier registry address:", address(verifier.registry()));
        console.log("Verifier reward address:", address(verifier.reward()));
        
        // Log registry admin role
        console.log("Registry admin role granted to:", deployer);
    }

    /**
     * @notice Deploy only the Registry contract (useful for testing)
     */
    function deployRegistry() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        vm.startBroadcast(deployerPrivateKey);
        
        registry = new Registry(deployer);
        console.log("Registry deployed at:", address(registry));
        
        vm.stopBroadcast();
    }

    /**
     * @notice Deploy only the core contracts (WhaleBadgeNFT, Prover, Verifier)
     * @dev Assumes Registry is already deployed
     */
    function deployCore(address registryAddress) external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy WhaleBadgeNFT
        whaleBadgeNFT = new WhaleBadgeNFT();
        console.log("WhaleBadgeNFT deployed at:", address(whaleBadgeNFT));
        
        // Deploy Prover
        prover = new SimpleTeleportProver();
        console.log("SimpleTeleportProver deployed at:", address(prover));
        
        // Deploy Verifier with existing registry
        verifier = new SimpleTeleportVerifier(
            address(prover),
            whaleBadgeNFT,
            Registry(registryAddress)
        );
        console.log("SimpleTeleportVerifier deployed at:", address(verifier));
        
        vm.stopBroadcast();
    }
}
