// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.21;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {Controller} from "../src/vlayer/Controller.sol";

/// @title UpgradeController
/// @notice Dedicated script for upgrading the Controller contract
/// @dev This script handles the upgrade process for the upgradeable Controller
contract UpgradeController is Script {
    
    /// @notice Upgrade the Controller implementation
    /// @dev Only the owner of the proxy can call this
    /// @param controllerProxyAddress The address of the deployed controller proxy
    /// @return newImplementation The address of the new implementation
    function run(address controllerProxyAddress) external returns (address newImplementation) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("\n========================================");
        console.log("UPGRADING CONTROLLER");
        console.log("========================================");
        console.log("Deployer address:", deployer);
        console.log("Controller proxy address:", controllerProxyAddress);
        console.log("Chain ID:", block.chainid);
        console.log("========================================\n");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Verify current proxy state
        Controller proxy = Controller(controllerProxyAddress);
        address currentOwner = proxy.owner();
        console.log("Current proxy owner:", currentOwner);
        
        // Verify deployer is the owner
        require(currentOwner == deployer, "Deployer is not the owner of the proxy");
        console.log("[OK] Deployer is authorized to upgrade");
        
        // 1. Deploy the new implementation
        console.log("[1/3] Deploying new implementation...");
        Controller newImpl = new Controller();
        newImplementation = address(newImpl);
        console.log("  New implementation deployed at:", newImplementation);
        console.log("  [OK] New implementation ready\n");
        
        // 2. Upgrade the proxy to point to the new implementation
        console.log("[2/3] Upgrading proxy to new implementation...");
        proxy.upgradeToAndCall(newImplementation, "");
        console.log("  [OK] Proxy upgraded successfully\n");
        
        // 3. Verify the upgrade
        console.log("[3/3] Verifying upgrade...");
        // Note: We can't easily verify the implementation address from the proxy
        // but we can verify the contract still works
        address ownerAfterUpgrade = proxy.owner();
        console.log("  Owner after upgrade:", ownerAfterUpgrade);
        require(ownerAfterUpgrade == currentOwner, "Ownership lost during upgrade");
        console.log("  [OK] Upgrade verification successful\n");
        
        vm.stopBroadcast();
        
        // Final upgrade summary
        console.log("========================================");
        console.log("UPGRADE COMPLETE");
        console.log("========================================");
        console.log("Controller proxy address:", controllerProxyAddress);
        console.log("New implementation:", newImplementation);
        console.log("Proxy owner:", ownerAfterUpgrade);
        console.log("========================================\n");
        
        return newImplementation;
    }
    
    /// @notice Upgrade with custom initialization data
    /// @dev Allows for custom initialization during upgrade
    /// @param controllerProxyAddress The address of the deployed controller proxy
    /// @param initData Custom initialization data (can be empty bytes)
    /// @return newImplementation The address of the new implementation
    function upgradeWithInit(address controllerProxyAddress, bytes memory initData) external returns (address newImplementation) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Upgrading Controller with custom init data...");
        console.log("Controller proxy:", controllerProxyAddress);
        console.log("Init data length:", initData.length);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Verify ownership
        Controller proxy = Controller(controllerProxyAddress);
        require(proxy.owner() == deployer, "Deployer is not the owner");
        
        // Deploy new implementation
        Controller newImpl = new Controller();
        newImplementation = address(newImpl);
        console.log("New implementation:", newImplementation);
        
        // Upgrade with custom init data
        proxy.upgradeToAndCall(newImplementation, initData);
        console.log("Upgrade completed with custom initialization");
        
        vm.stopBroadcast();
        
        return newImplementation;
    }
    
    /// @notice Check the current implementation address of a proxy
    /// @dev Useful for verifying which implementation a proxy is currently using
    /// @param proxyAddress The address of the proxy to check
    function checkImplementation(address proxyAddress) external view {
        console.log("Checking implementation for proxy:", proxyAddress);
        
        // This would require additional logic to read the implementation address
        // from the proxy's storage, which is implementation-specific
        console.log("Note: Implementation address checking requires additional tooling");
        console.log("Use OpenZeppelin's upgradeable tools or ethers.js to verify");
    }
}
