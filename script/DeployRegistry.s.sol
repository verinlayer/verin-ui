// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.21;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {Registry} from "../src/vlayer/constants/Registry.sol";
import {ERC1967Proxy} from "openzeppelin-contracts/proxy/ERC1967/ERC1967Proxy.sol";

/// @title DeployRegistry
/// @notice Deployment script for the upgradeable Registry contract
/// @dev This script demonstrates how to deploy and upgrade a UUPS proxy contract
contract DeployRegistry is Script {
    
    /// @notice Deploy the Registry implementation and proxy
    /// @dev The proxy will be initialized with the deployer as the admin
    /// @return proxy The address of the deployed proxy contract
    function run() external returns (address proxy) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying Registry with deployer:", deployer);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // 1. Deploy the implementation contract
        Registry implementation = new Registry();
        console.log("Implementation deployed at:", address(implementation));
        
        // 2. Encode the initializer function call
        bytes memory initData = abi.encodeWithSelector(
            Registry.initialize.selector,
            deployer
        );
        
        // 3. Deploy the proxy contract pointing to the implementation
        ERC1967Proxy proxyContract = new ERC1967Proxy(
            address(implementation),
            initData
        );
        proxy = address(proxyContract);
        
        console.log("Proxy deployed at:", proxy);
        console.log("Admin of proxy:", deployer);
        
        // Verify roles are set
        Registry registryProxy = Registry(proxy);
        bool hasAdminRole = registryProxy.hasRole(registryProxy.ADMIN_ROLE(), deployer);
        bool hasUpdaterRole = registryProxy.hasRole(registryProxy.UPDATER_ROLE(), deployer);
        console.log("Deployer has ADMIN_ROLE:", hasAdminRole);
        console.log("Deployer has UPDATER_ROLE:", hasUpdaterRole);
        
        vm.stopBroadcast();
        
        return proxy;
    }
    
    /// @notice Upgrade the Registry implementation
    /// @dev Only the admin of the proxy can call this
    /// @param proxyAddress The address of the deployed proxy
    /// @return newImplementation The address of the new implementation
    function upgrade(address proxyAddress) external returns (address newImplementation) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        console.log("Upgrading Registry at proxy:", proxyAddress);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // 1. Deploy the new implementation
        Registry newImpl = new Registry();
        newImplementation = address(newImpl);
        console.log("New implementation deployed at:", newImplementation);
        
        // 2. Upgrade the proxy to point to the new implementation
        Registry proxy = Registry(proxyAddress);
        proxy.upgradeToAndCall(newImplementation, "");
        
        console.log("Proxy upgraded successfully");
        
        vm.stopBroadcast();
        
        return newImplementation;
    }
}

