// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.21;

import {Script, console} from "forge-std/Script.sol";
import {Test} from "forge-std/Test.sol";
import {WhaleBadgeNFT} from "../src/vlayer/WhaleBadgeNFT.sol";
import {SimpleTeleportProver} from "../src/vlayer/SimpleTeleportProver.sol";
import {SimpleTeleportVerifier} from "../src/vlayer/SimpleTeleportVerifier.sol";
import {Registry} from "../src/vlayer/constants/Registry.sol";
import {CreditModel} from "../src/vlayer/CreditModel.sol";
import {UniswapV2PriceOracle} from "../src/vlayer/UniswapV2PriceOracle.sol";

/**
 * @title TestDeployment
 * @notice Test script to verify deployment works correctly
 * @dev Tests the deployment process and contract interactions
 */
contract TestDeployment is Script, Test {
    function run() external {
        address deployer = vm.addr(vm.envUint("PRIVATE_KEY"));

        console.log("Testing SimpleTeleport deployment...");
        console.log("Deployer:", deployer);

        vm.startBroadcast();

        // Deploy contracts
        WhaleBadgeNFT whaleBadgeNFT = new WhaleBadgeNFT();
        Registry registry = new Registry(deployer);
        SimpleTeleportProver prover = new SimpleTeleportProver();
        CreditModel creditModel = new CreditModel();
        // Deploy UniswapV2PriceOracle
        address uniswapV2Factory = address(0x0c3c1c532F1e39EdF36BE9Fe0bE1410313E074Bf); // Mainnet factory
        UniswapV2PriceOracle priceOracle = new UniswapV2PriceOracle(uniswapV2Factory, address(registry));
        
        SimpleTeleportVerifier verifier = new SimpleTeleportVerifier(
            address(prover),
            registry,
            address(creditModel),
            address(priceOracle)
        );

        vm.stopBroadcast();

        // Test contract interactions
        console.log("\n=== Testing Contract Interactions ===");

        // Test WhaleBadgeNFT
        assertEq(whaleBadgeNFT.name(), "WhaleBadgeNFT");
        assertEq(whaleBadgeNFT.symbol(), "Whale");
        assertEq(whaleBadgeNFT.currentTokenId(), 1);
        console.log("[OK] WhaleBadgeNFT initialized correctly");

        // Test Registry
        assertEq(registry.AAVE_POOL_ADDRESS(), 0x794a61358D6845594F94dc1DB02A252b5b4814aD);
        assertTrue(registry.hasRole(registry.ADMIN_ROLE(), deployer));
        console.log("[OK] Registry initialized correctly");

        // Test Prover
        assertTrue(address(prover) != address(0));
        console.log("[OK] SimpleTeleportProver deployed correctly");

        // Test Verifier
        assertEq(verifier.prover(), address(prover));
        assertEq(address(verifier.registry()), address(registry));
        console.log("[OK] SimpleTeleportVerifier initialized correctly");

        // Test Registry functions
        console.log("\n=== Testing Registry Functions ===");

        // Test getAddressesForChain for mainnet
        Registry.ChainAddresses memory mainnetAddresses = registry.getAddressesForChain(1);
        assertEq(mainnetAddresses.aavePool, 0x794a61358D6845594F94dc1DB02A252b5b4814aD);
        assertEq(mainnetAddresses.usdc, 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48);
        console.log("[OK] Registry chain addresses working correctly");

        // Test WhaleBadgeNFT minting
        console.log("\n=== Testing WhaleBadgeNFT Minting ===");
        uint256 tokenIdBefore = whaleBadgeNFT.currentTokenId();
        whaleBadgeNFT.mint(deployer);
        uint256 tokenIdAfter = whaleBadgeNFT.currentTokenId();
        assertEq(tokenIdAfter, tokenIdBefore + 1);
        assertEq(whaleBadgeNFT.ownerOf(tokenIdBefore), deployer);
        console.log("[OK] WhaleBadgeNFT minting working correctly");

        console.log("\n=== All Tests Passed! ===");
        console.log("Deployment and basic functionality verified successfully.");

        // Log contract addresses for reference
        console.log("\n=== Contract Addresses ===");
        console.log("WhaleBadgeNFT:", address(whaleBadgeNFT));
        console.log("Registry:", address(registry));
        console.log("SimpleTeleportProver:", address(prover));
        console.log("SimpleTeleportVerifier:", address(verifier));
    }
}
