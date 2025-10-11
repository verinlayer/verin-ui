// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.21;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {SimpleTeleportVerifier} from "../src/vlayer/SimpleTeleportVerifier.sol";
import {SimpleTeleportProver} from "../src/vlayer/SimpleTeleportProver.sol";
import {Registry} from "../src/vlayer/constants/Registry.sol";
import {CreditModel} from "../src/vlayer/CreditModel.sol";
import {UniswapV2PriceOracle} from "../src/vlayer/UniswapV2PriceOracle.sol";
import {ERC1967Proxy} from "openzeppelin-contracts/proxy/ERC1967/ERC1967Proxy.sol";

/// @title DeploySimpleTeleportVerifier
/// @notice Deployment script for the SimpleTeleportVerifier contract
/// @dev This script deploys SimpleTeleportVerifier with all required dependencies
contract DeploySimpleTeleportVerifier is Script {
    
    /// @notice Deploy the SimpleTeleportVerifier contract
    /// @dev Deploys SimpleTeleportVerifier with existing dependencies
    /// @param proverAddress Address of the SimpleTeleportProver contract
    /// @param registryAddress Address of the Registry contract (can be proxy)
    /// @param creditModelAddress Address of the CreditModel contract (can be proxy)
    /// @param priceOracleAddress Address of the UniswapV2PriceOracle contract
    /// @return verifierAddress The address of the deployed SimpleTeleportVerifier
    function run(
        address proverAddress,
        address registryAddress,
        address creditModelAddress,
        address priceOracleAddress
    ) external returns (address verifierAddress) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying SimpleTeleportVerifier with deployer:", deployer);
        console.log("Prover address:", proverAddress);
        console.log("Registry address:", registryAddress);
        console.log("CreditModel address:", creditModelAddress);
        console.log("PriceOracle address:", priceOracleAddress);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy SimpleTeleportVerifier
        SimpleTeleportVerifier verifier = new SimpleTeleportVerifier(
            proverAddress,
            Registry(registryAddress),
            creditModelAddress,
            priceOracleAddress,
            deployer  // initialOwner
        );
        verifierAddress = address(verifier);
        
        console.log("SimpleTeleportVerifier deployed at:", verifierAddress);
        console.log("Owner:", verifier.owner());
        console.log("Prover:", verifier.prover());
        console.log("Registry:", address(verifier.registry()));
        console.log("CreditModel:", address(verifier.creditScoreCalculator()));
        console.log("PriceOracle:", address(verifier.priceOracle()));
        
        vm.stopBroadcast();
        
        return verifierAddress;
    }
    
    /// @notice Deploy SimpleTeleportVerifier with full system deployment
    /// @dev Deploys all dependencies (Prover, Registry, CreditModel, PriceOracle) and SimpleTeleportVerifier
    /// @return verifierAddress The address of the deployed SimpleTeleportVerifier
    function runFullDeployment() external returns (address verifierAddress) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying full SimpleTeleport system with deployer:", deployer);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // 1. Deploy Registry (upgradeable)
        console.log("\n1. Deploying Registry...");
        Registry registryImpl = new Registry();
        ERC1967Proxy registryProxy = new ERC1967Proxy(
            address(registryImpl),
            abi.encodeWithSelector(Registry.initialize.selector, deployer)
        );
        Registry registry = Registry(address(registryProxy));
        console.log("   Registry proxy:", address(registry));
        
        // 2. Deploy SimpleTeleportProver (non-upgradeable)
        console.log("\n2. Deploying SimpleTeleportProver...");
        SimpleTeleportProver prover = new SimpleTeleportProver();
        console.log("   SimpleTeleportProver:", address(prover));
        
        // 3. Deploy CreditModel (upgradeable)
        console.log("\n3. Deploying CreditModel...");
        CreditModel creditModelImpl = new CreditModel();
        ERC1967Proxy creditModelProxy = new ERC1967Proxy(
            address(creditModelImpl),
            abi.encodeWithSelector(CreditModel.initialize.selector, deployer)
        );
        CreditModel creditModel = CreditModel(address(creditModelProxy));
        console.log("   CreditModel proxy:", address(creditModel));
        
        // 4. Deploy UniswapV2PriceOracle (non-upgradeable)
        console.log("\n4. Deploying UniswapV2PriceOracle...");
        address uniswapV2Factory = address(0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f); // Mainnet factory
        UniswapV2PriceOracle priceOracle = new UniswapV2PriceOracle(uniswapV2Factory, address(registry));
        console.log("   UniswapV2PriceOracle:", address(priceOracle));
        
        // 5. Deploy SimpleTeleportVerifier (non-upgradeable)
        console.log("\n5. Deploying SimpleTeleportVerifier...");
        SimpleTeleportVerifier verifier = new SimpleTeleportVerifier(
            address(prover),
            registry,
            address(creditModel),
            address(priceOracle),
            deployer  // initialOwner
        );
        verifierAddress = address(verifier);
        
        console.log("   SimpleTeleportVerifier:", verifierAddress);
        console.log("   Owner:", verifier.owner());
        
        vm.stopBroadcast();
        
        // Summary
        console.log("\n=== Deployment Summary ===");
        console.log("Registry:", address(registry));
        console.log("SimpleTeleportProver:", address(prover));
        console.log("CreditModel:", address(creditModel));
        console.log("UniswapV2PriceOracle:", address(priceOracle));
        console.log("SimpleTeleportVerifier:", verifierAddress);
        
        return verifierAddress;
    }
    
    /// @notice Update the price oracle for an existing SimpleTeleportVerifier
    /// @dev Only the owner can call this
    /// @param verifierAddress The address of the deployed SimpleTeleportVerifier
    /// @param newPriceOracleAddress The address of the new price oracle
    function updatePriceOracle(address verifierAddress, address newPriceOracleAddress) external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        console.log("Updating price oracle for SimpleTeleportVerifier at:", verifierAddress);
        console.log("New price oracle address:", newPriceOracleAddress);
        
        vm.startBroadcast(deployerPrivateKey);
        
        SimpleTeleportVerifier verifier = SimpleTeleportVerifier(verifierAddress);
        
        // Verify caller is owner
        console.log("Current owner:", verifier.owner());
        console.log("Updating as:", vm.addr(deployerPrivateKey));
        
        address oldPriceOracle = address(verifier.priceOracle());
        console.log("Old price oracle:", oldPriceOracle);
        
        verifier.setPriceOracle(newPriceOracleAddress);
        
        console.log("Price oracle updated successfully");
        console.log("New price oracle:", address(verifier.priceOracle()));
        
        vm.stopBroadcast();
    }
}

