// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.21;

import {Script, console} from "forge-std/Script.sol";
import {WhaleBadgeNFT} from "../src/vlayer/WhaleBadgeNFT.sol";
import {SimpleTeleportProver} from "../src/vlayer/SimpleTeleportProver.sol";
import {SimpleTeleportVerifier} from "../src/vlayer/SimpleTeleportVerifier.sol";
import {Registry} from "../src/vlayer/constants/Registry.sol";
import {CreditModel} from "../src/vlayer/CreditModel.sol";
import {UniswapV2PriceOracle} from "../src/vlayer/UniswapV2PriceOracle.sol";

/**
 * @title DeployTeleportAdvanced
 * @notice Advanced deployment script with environment-specific configurations
 * @dev Supports different deployment strategies and environment configurations
 */
contract DeployTeleportAdvanced is Script {
    // Contract instances
    WhaleBadgeNFT public whaleBadgeNFT;
    Registry public registry;
    SimpleTeleportProver public prover;
    SimpleTeleportVerifier public verifier;

    // Environment configuration
    struct DeploymentConfig {
        address admin;
        bool verifyContracts;
        string environment;
        uint256 gasPrice;
    }

    function run() external {
        DeploymentConfig memory config = _loadConfig();

        console.log("=== SimpleTeleport Protocol Deployment ===");
        console.log("Environment:", config.environment);
        console.log("Admin address:", config.admin);
        console.log("Gas price:", config.gasPrice);
        console.log("Verify contracts:", config.verifyContracts);

        vm.startBroadcast();

        // Deploy contracts in dependency order
        _deployContracts(config);

        vm.stopBroadcast();

        // Post-deployment verification and setup
        _postDeploymentSetup(config);
    }

    function _loadConfig() internal view returns (DeploymentConfig memory) {
        address admin;
        try vm.envAddress("ADMIN_ADDRESS") returns (address _admin) {
            admin = _admin;
        } catch {
            admin = msg.sender;
        }

        bool verifyContracts;
        try vm.envBool("VERIFY_CONTRACTS") returns (bool _verify) {
            verifyContracts = _verify;
        } catch {
            verifyContracts = true;
        }

        string memory environment;
        try vm.envString("ENVIRONMENT") returns (string memory _env) {
            environment = _env;
        } catch {
            environment = "development";
        }

        uint256 gasPrice;
        try vm.envUint("GAS_PRICE") returns (uint256 _gasPrice) {
            gasPrice = _gasPrice;
        } catch {
            gasPrice = 0;
        }

        return DeploymentConfig({
            admin: admin,
            verifyContracts: verifyContracts,
            environment: environment,
            gasPrice: gasPrice
        });
    }

    function _deployContracts(DeploymentConfig memory config) internal {
        // Step 1: Deploy WhaleBadgeNFT
        console.log("\n1. Deploying WhaleBadgeNFT...");
        whaleBadgeNFT = new WhaleBadgeNFT();
        console.log("   [OK] WhaleBadgeNFT deployed at:", address(whaleBadgeNFT));

        // Step 2: Deploy Registry
        console.log("\n2. Deploying Registry...");
        registry = new Registry(config.admin);
        console.log("   [OK] Registry deployed at:", address(registry));
        console.log("   [OK] Admin role granted to:", config.admin);

        // Step 3: Deploy SimpleTeleportProver
        console.log("\n3. Deploying SimpleTeleportProver...");
        prover = new SimpleTeleportProver();
        console.log("   [OK] SimpleTeleportProver deployed at:", address(prover));

        // Step 4: Deploy CreditModel
        console.log("\n4. Deploying CreditModel...");
        CreditModel creditModel = new CreditModel();
        console.log("   [OK] CreditModel deployed at:", address(creditModel));

        // Step 5: Deploy SimpleTeleportVerifier
        console.log("\n5. Deploying SimpleTeleportVerifier...");
        // Deploy UniswapV2PriceOracle
        address uniswapV2Factory = address(0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f); // Mainnet factory
        UniswapV2PriceOracle priceOracle = new UniswapV2PriceOracle(uniswapV2Factory, address(registry));
        
        verifier = new SimpleTeleportVerifier(
            address(prover),
            registry,
            address(creditModel),
            address(priceOracle)
        );
        console.log("   [OK] SimpleTeleportVerifier deployed at:", address(verifier));
    }

    function _postDeploymentSetup(DeploymentConfig memory config) internal view {
        console.log("\n=== Post-Deployment Verification ===");

        // Verify contract addresses
        require(verifier.prover() == address(prover), "Prover address mismatch");
        require(address(verifier.registry()) == address(registry), "Registry address mismatch");

        console.log("[OK] All contract addresses verified");

        // Log deployment summary
        console.log("\n=== Deployment Summary ===");
        console.log("Environment:", config.environment);
        console.log("WhaleBadgeNFT:", address(whaleBadgeNFT));
        console.log("Registry:", address(registry));
        console.log("SimpleTeleportProver:", address(prover));
        console.log("SimpleTeleportVerifier:", address(verifier));

        // Log contract interactions
        console.log("\n=== Contract Interactions ===");
        console.log("Verifier -> Prover:", verifier.prover());
        console.log("Verifier -> Registry:", address(verifier.registry()));

        // Log registry configuration
        console.log("\n=== Registry Configuration ===");
        console.log("Admin:", config.admin);
        console.log("Aave Pool Address:", registry.AAVE_POOL_ADDRESS());

        if (config.verifyContracts) {
            console.log("\n=== Contract Verification Commands ===");
            console.log("forge verify-contract", address(whaleBadgeNFT), "WhaleBadgeNFT");
            console.log("forge verify-contract", address(registry), "Registry");
            console.log("forge verify-contract", address(prover), "SimpleTeleportProver");
            console.log("forge verify-contract", address(verifier), "SimpleTeleportVerifier");
        }
    }

    /**
     * @notice Deploy with custom admin address
     */
    function deployWithAdmin(address admin) external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        console.log("Deploying with custom admin:", admin);

        // Deploy all contracts
        whaleBadgeNFT = new WhaleBadgeNFT();
        registry = new Registry(admin);
        prover = new SimpleTeleportProver();
        CreditModel creditModel = new CreditModel();
        // Deploy UniswapV2PriceOracle
        address uniswapV2Factory = address(0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f); // Mainnet factory
        UniswapV2PriceOracle priceOracle = new UniswapV2PriceOracle(uniswapV2Factory, address(registry));
        
        verifier = new SimpleTeleportVerifier(address(prover), registry, address(creditModel), address(priceOracle));

        vm.stopBroadcast();

        console.log("Deployment completed with admin:", admin);
    }

    /**
     * @notice Deploy only Registry for testing
     */
    function deployRegistryOnly() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        registry = new Registry(deployer);
        console.log("Registry deployed at:", address(registry));

        vm.stopBroadcast();
    }

    /**
     * @notice Deploy to a specific network
     */
    function deployToNetwork(string memory network) external {
        // Set the network
        vm.createSelectFork(network);

        console.log("Deploying to network:", network);

        // Run normal deployment
        this.run();
    }
}
