// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {CreditModel} from "../src/vlayer/CreditModel.sol";
import {ERC1967Proxy} from "openzeppelin-contracts/proxy/ERC1967/ERC1967Proxy.sol";

/// @title DeployCreditModel
/// @notice Deployment script for the upgradeable CreditModel contract
/// @dev This script demonstrates how to deploy and upgrade a UUPS proxy contract
contract DeployCreditModel is Script {
    
    /// @notice Deploy the CreditModel implementation and proxy
    /// @dev The proxy will be initialized with the deployer as the owner
    /// @return proxy The address of the deployed proxy contract
    function run() external returns (address proxy) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying CreditModel with deployer:", deployer);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // 1. Deploy the implementation contract
        CreditModel implementation = new CreditModel();
        console.log("Implementation deployed at:", address(implementation));
        
        // 2. Encode the initializer function call
        bytes memory initData = abi.encodeWithSelector(
            CreditModel.initialize.selector,
            deployer
        );
        
        // 3. Deploy the proxy contract pointing to the implementation
        ERC1967Proxy proxyContract = new ERC1967Proxy(
            address(implementation),
            initData
        );
        proxy = address(proxyContract);
        
        console.log("Proxy deployed at:", proxy);
        console.log("Owner of proxy:", CreditModel(proxy).owner());
        
        vm.stopBroadcast();
        
        return proxy;
    }
    
    /// @notice Upgrade the CreditModel implementation
    /// @dev Only the owner of the proxy can call this
    /// @param proxyAddress The address of the deployed proxy
    /// @return newImplementation The address of the new implementation
    function upgrade(address proxyAddress) external returns (address newImplementation) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        console.log("Upgrading CreditModel at proxy:", proxyAddress);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // 1. Deploy the new implementation
        CreditModel newImpl = new CreditModel();
        newImplementation = address(newImpl);
        console.log("New implementation deployed at:", newImplementation);
        
        // 2. Upgrade the proxy to point to the new implementation
        CreditModel proxy = CreditModel(proxyAddress);
        proxy.upgradeToAndCall(newImplementation, "");
        
        console.log("Proxy upgraded successfully");
        
        vm.stopBroadcast();
        
        return newImplementation;
    }
}
