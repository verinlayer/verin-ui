// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.21;

import {Script, console} from "forge-std/Script.sol";
import {SimpleTeleportProver} from "../src/vlayer/SimpleTeleportProver.sol";
import {SimpleTeleportVerifier} from "../src/vlayer/SimpleTeleportVerifier.sol";
import {Controller} from "../src/vlayer/Controller.sol";
import {Registry} from "../src/vlayer/constants/Registry.sol";
import {CreditModel} from "../src/vlayer/CreditModel.sol";
import {UniswapV2PriceOracle} from "../src/vlayer/UniswapV2PriceOracle.sol";
import {ERC1967Proxy} from "openzeppelin-contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * @title DeployTeleport
 * @notice Comprehensive deployment script for the SimpleTeleport protocol
 * @dev Deploys all contracts in the correct order with proper dependencies:
 *      1. Registry (upgradeable with proxy)
 *      2. SimpleTeleportProver
 *      3. CreditModel (upgradeable with proxy)
 *      4. UniswapV2PriceOracle
 *      5. Controller
 *      6. SimpleTeleportVerifier
 *      7. Links Controller to Verifier
 */
contract DeployTeleport is Script {
    // Contract instances
    Registry public registry;
    SimpleTeleportProver public prover;
    SimpleTeleportVerifier public verifier;
    Controller public controller;
    CreditModel public creditModel;
    UniswapV2PriceOracle public priceOracle;

    /**
     * @notice Main deployment function - deploys all contracts
     * @dev Call this function to deploy the entire SimpleTeleport system
     */
    function run() external returns (
        address registryAddress,
        address proverAddress,
        address creditModelAddress,
        address priceOracleAddress,
        address controllerAddress,
        address verifierAddress
    ) {
        // Get the deployer's private key
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("\n========================================");
        console.log("DEPLOYING SIMPLETELEPORT PROTOCOL");
        console.log("========================================");
        console.log("Deployer address:", deployer);
        console.log("Deployer balance:", deployer.balance);
        console.log("Chain ID:", block.chainid);
        console.log("========================================\n");

        vm.startBroadcast(deployerPrivateKey);

        // STEP 1: Deploy Registry (upgradeable with proxy pattern)
        console.log("[1/7] Deploying Registry...");
        Registry registryImpl = new Registry();
        console.log("  Registry implementation:", address(registryImpl));
        
        ERC1967Proxy registryProxy = new ERC1967Proxy(
            address(registryImpl),
            abi.encodeWithSelector(Registry.initialize.selector, deployer)
        );
        registry = Registry(address(registryProxy));
        console.log("  Registry proxy:", address(registry));
        console.log("  [OK] Registry deployed\n");

        // STEP 2: Deploy SimpleTeleportProver
        console.log("[2/7] Deploying SimpleTeleportProver...");
        prover = new SimpleTeleportProver();
        console.log("  SimpleTeleportProver:", address(prover));
        console.log("  [OK] Prover deployed\n");

        // STEP 3: Deploy CreditModel (upgradeable with proxy pattern)
        console.log("[3/7] Deploying CreditModel...");
        CreditModel creditModelImpl = new CreditModel();
        console.log("  CreditModel implementation:", address(creditModelImpl));
        
        ERC1967Proxy creditModelProxy = new ERC1967Proxy(
            address(creditModelImpl),
            abi.encodeWithSelector(CreditModel.initialize.selector, deployer)
        );
        creditModel = CreditModel(address(creditModelProxy));
        console.log("  CreditModel proxy:", address(creditModel));
        console.log("  CreditModel owner:", creditModel.owner());
        console.log("  [OK] CreditModel deployed\n");

        // STEP 4: Deploy UniswapV2PriceOracle
        console.log("[4/7] Deploying UniswapV2PriceOracle...");
        // Note: Update this address based on your target chain
        // address uniswapV2Factory = address(0x0c3c1c532F1e39EdF36BE9Fe0bE1410313E074Bf); // OP mainnet
        address uniswapV2Factory = address(0x8909Dc15e40173Ff4699343b6eB8132c65e18eC6); // OP mainnet
        console.log("  Using Uniswap V2 Factory:", uniswapV2Factory);
        priceOracle = new UniswapV2PriceOracle(uniswapV2Factory, address(registry));
        console.log("  UniswapV2PriceOracle:", address(priceOracle));
        console.log("  [OK] Price Oracle deployed\n");

        // STEP 5: Deploy Controller
        console.log("[5/7] Deploying Controller...");
        controller = new Controller(
            address(0), // verifier address will be set in step 7
            registry,
            address(creditModel),
            address(priceOracle),
            deployer  // initialOwner
        );
        console.log("  Controller:", address(controller));
        console.log("  Controller owner:", controller.owner());
        console.log("  [OK] Controller deployed\n");

        // STEP 6: Deploy SimpleTeleportVerifier
        console.log("[6/7] Deploying SimpleTeleportVerifier...");
        verifier = new SimpleTeleportVerifier(
            address(prover),
            address(controller),
            deployer  // initialOwner
        );
        console.log("  SimpleTeleportVerifier:", address(verifier));
        console.log("  Verifier owner:", verifier.owner());
        console.log("  Verifier prover:", verifier.prover());
        console.log("  Verifier controller:", verifier.controller());
        console.log("  [OK] Verifier deployed\n");

        // STEP 7: Link Controller to Verifier
        console.log("[7/7] Linking Controller to Verifier...");
        controller.setVerifier(address(verifier));
        console.log("  Controller verifier set to:", address(verifier));
        console.log("  [OK] Link complete\n");

        vm.stopBroadcast();

        // Final deployment summary
        console.log("========================================");
        console.log("DEPLOYMENT COMPLETE");
        console.log("========================================");
        console.log("Registry (proxy):", address(registry));
        console.log("SimpleTeleportProver:", address(prover));
        console.log("CreditModel (proxy):", address(creditModel));
        console.log("UniswapV2PriceOracle:", address(priceOracle));
        console.log("Controller:", address(controller));
        console.log("SimpleTeleportVerifier:", address(verifier));
        console.log("========================================");
        console.log("Owner (all contracts):", deployer);
        console.log("========================================\n");

        return (
            address(registry),
            address(prover),
            address(creditModel),
            address(priceOracle),
            address(controller),
            address(verifier)
        );
    }

    /**
     * @notice Deploy only the Registry contract
     * @dev Useful for testing or when you want to deploy contracts separately
     */
    function deployRegistry() external returns (address registryAddress) {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("Deploying Registry only...");
        vm.startBroadcast(deployerPrivateKey);

        Registry registryImpl = new Registry();
        console.log("Registry implementation:", address(registryImpl));
        
        ERC1967Proxy registryProxy = new ERC1967Proxy(
            address(registryImpl),
            abi.encodeWithSelector(Registry.initialize.selector, deployer)
        );
        registry = Registry(address(registryProxy));
        console.log("Registry proxy:", address(registry));

        vm.stopBroadcast();
        
        return address(registry);
    }

    /**
     * @notice Deploy core contracts with existing Registry
     * @dev Assumes Registry is already deployed
     * @param registryAddress Address of the existing Registry contract
     */
    function deployCore(address registryAddress) external returns (
        address proverAddress,
        address creditModelAddress,
        address priceOracleAddress,
        address controllerAddress,
        address verifierAddress
    ) {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("Deploying core contracts with existing Registry...");
        console.log("Registry address:", registryAddress);

        vm.startBroadcast(deployerPrivateKey);

        // Deploy Prover
        prover = new SimpleTeleportProver();
        console.log("SimpleTeleportProver:", address(prover));

        // Deploy CreditModel
        CreditModel creditModelImpl = new CreditModel();
        ERC1967Proxy creditModelProxy = new ERC1967Proxy(
            address(creditModelImpl),
            abi.encodeWithSelector(CreditModel.initialize.selector, deployer)
        );
        creditModel = CreditModel(address(creditModelProxy));
        console.log("CreditModel proxy:", address(creditModel));

        // Deploy UniswapV2PriceOracle
        address uniswapV2Factory = address(0x0c3c1c532F1e39EdF36BE9Fe0bE1410313E074Bf);
        priceOracle = new UniswapV2PriceOracle(uniswapV2Factory, registryAddress);
        console.log("UniswapV2PriceOracle:", address(priceOracle));

        // Deploy Controller
        controller = new Controller(
            address(0),
            Registry(registryAddress),
            address(creditModel),
            address(priceOracle),
            deployer
        );
        console.log("Controller:", address(controller));

        // Deploy SimpleTeleportVerifier
        verifier = new SimpleTeleportVerifier(
            address(prover),
            address(controller),
            deployer
        );
        console.log("SimpleTeleportVerifier:", address(verifier));

        // Link Controller to Verifier
        controller.setVerifier(address(verifier));
        console.log("Controller linked to Verifier");

        vm.stopBroadcast();

        console.log("\nDeployment Complete!");
        
        return (
            address(prover),
            address(creditModel),
            address(priceOracle),
            address(controller),
            address(verifier)
        );
    }
}
