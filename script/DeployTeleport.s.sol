// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.21;

import {Script, console} from "forge-std/Script.sol";
import {SimpleTeleportProver} from "../src/vlayer/SimpleTeleportProver.sol";
import {SimpleTeleportVerifier} from "../src/vlayer/SimpleTeleportVerifier.sol";
import {Registry} from "../src/vlayer/constants/Registry.sol";
import {CreditModel} from "../src/vlayer/CreditModel.sol";
import {UniswapV2PriceOracle} from "../src/vlayer/UniswapV2PriceOracle.sol";
import {ERC1967Proxy} from "openzeppelin-contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * @title DeployTeleport
 * @notice Deployment script for the SimpleTeleport protocol contracts
 * @dev Deploys contracts in the correct order with proper dependencies
 */
contract DeployTeleport is Script {
    // Contract instances
    Registry public registry;
    SimpleTeleportProver public prover;
    SimpleTeleportVerifier public verifier;
    UniswapV2PriceOracle public priceOracle;

    function run() external {
        // Get the deployer's private key
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("Deploying contracts with address:", deployer);
        console.log("Deployer balance:", deployer.balance);

        vm.startBroadcast(deployerPrivateKey);

        // Step 2: Deploy Registry (no dependencies) - using proxy pattern
        console.log("\n=== Deploying Registry ===");
        Registry registryImpl = new Registry();
        console.log("Registry implementation deployed at:", address(registryImpl));
        
        ERC1967Proxy registryProxy = new ERC1967Proxy(
            address(registryImpl),
            abi.encodeWithSelector(Registry.initialize.selector, deployer)
        );
        registry = Registry(address(registryProxy));
        console.log("Registry proxy deployed at:", address(registry));

        // Step 3: Deploy SimpleTeleportProver (no dependencies)
        console.log("\n=== Deploying SimpleTeleportProver ===");
        prover = new SimpleTeleportProver();
        console.log("SimpleTeleportProver deployed at:", address(prover));

        // Step 4: Deploy CreditModel (upgradeable with proxy)
        console.log("\n=== Deploying CreditModel ===");
        CreditModel creditModelImpl = new CreditModel();
        console.log("CreditModel implementation deployed at:", address(creditModelImpl));
        
        ERC1967Proxy creditModelProxy = new ERC1967Proxy(
            address(creditModelImpl),
            abi.encodeWithSelector(CreditModel.initialize.selector, deployer)
        );
        CreditModel creditModel = CreditModel(address(creditModelProxy));
        console.log("CreditModel proxy deployed at:", address(creditModel));
        console.log("CreditModel owner:", creditModel.owner());

        // Step 5: Deploy UniswapV2PriceOracle (depends on registry)
        console.log("\n=== Deploying UniswapV2PriceOracle ===");
        // Note: You'll need to provide actual Uniswap V2 Factory address for the target chain
        address uniswapV2Factory = address(0x0c3c1c532F1e39EdF36BE9Fe0bE1410313E074Bf); // Mainnet factory
        priceOracle = new UniswapV2PriceOracle(uniswapV2Factory, address(registry));
        console.log("UniswapV2PriceOracle deployed at:", address(priceOracle));

        // Step 6: Deploy SimpleTeleportVerifier (depends on prover, registry, creditModel, and priceOracle)
        console.log("\n=== Deploying SimpleTeleportVerifier ===");
        verifier = new SimpleTeleportVerifier(
            address(prover),
            registry,
            address(creditModel),
            address(priceOracle),
            deployer  // initialOwner
        );
        console.log("SimpleTeleportVerifier deployed at:", address(verifier));

        vm.stopBroadcast();

        // Log deployment summary
        console.log("\n=== Deployment Summary ===");
        console.log("Registry:", address(registry));
        console.log("SimpleTeleportProver:", address(prover));
        console.log("CreditModel:", address(creditModel));
        console.log("SimpleTeleportVerifier:", address(verifier));

        // Verify contract addresses are set correctly
        console.log("\n=== Verification ===");
        console.log("Verifier prover address:", verifier.prover());
        console.log("Verifier registry address:", address(verifier.registry()));

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

        Registry registryImpl = new Registry();
        console.log("Registry implementation deployed at:", address(registryImpl));
        
        ERC1967Proxy registryProxy = new ERC1967Proxy(
            address(registryImpl),
            abi.encodeWithSelector(Registry.initialize.selector, deployer)
        );
        registry = Registry(address(registryProxy));
        console.log("Registry proxy deployed at:", address(registry));

        vm.stopBroadcast();
    }

    /**
     * @notice Deploy only the core contracts (Prover, Verifier)
     * @dev Assumes Registry is already deployed
     */
    function deployCore(address registryAddress) external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        // Deploy Prover
        prover = new SimpleTeleportProver();
        console.log("SimpleTeleportProver deployed at:", address(prover));

        // Deploy CreditModel (upgradeable with proxy)
        CreditModel creditModelImpl = new CreditModel();
        console.log("CreditModel implementation deployed at:", address(creditModelImpl));
        
        ERC1967Proxy creditModelProxy = new ERC1967Proxy(
            address(creditModelImpl),
            abi.encodeWithSelector(CreditModel.initialize.selector, deployer)
        );
        CreditModel creditModel = CreditModel(address(creditModelProxy));
        console.log("CreditModel proxy deployed at:", address(creditModel));

        // Deploy UniswapV2PriceOracle with existing registry
        address uniswapV2Factory = address(0x0c3c1c532F1e39EdF36BE9Fe0bE1410313E074Bf); // Mainnet factory
        priceOracle = new UniswapV2PriceOracle(uniswapV2Factory, registryAddress);
        console.log("UniswapV2PriceOracle deployed at:", address(priceOracle));

        // Deploy Verifier with existing registry
        verifier = new SimpleTeleportVerifier(
            address(prover),
            Registry(registryAddress),
            address(creditModel),
            address(priceOracle),
            deployer  // initialOwner
        );
        console.log("SimpleTeleportVerifier deployed at:", address(verifier));

        vm.stopBroadcast();
    }
}
