// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.21;

import {Script, console} from "forge-std/Script.sol";
import {SimpleTeleportProver} from "../src/vlayer/SimpleTeleportProver.sol";
import {SimpleTeleportVerifier} from "../src/vlayer/SimpleTeleportVerifier.sol";
import {Registry} from "../src/vlayer/constants/Registry.sol";
import {CreditModel} from "../src/vlayer/CreditModel.sol";
import {UniswapV2PriceOracle} from "../src/vlayer/UniswapV2PriceOracle.sol";

/**
 * @title DeployTeleportTest
 * @notice Simple deployment script for testing and development
 * @dev Uses default values and minimal configuration
 */
contract DeployTeleportTest is Script {
    function run() external {
        // Use the first account as deployer and admin
        address deployer = vm.addr(vm.envUint("PRIVATE_KEY"));

        console.log("Deploying SimpleTeleport contracts...");
        console.log("Deployer:", deployer);

        vm.startBroadcast();

        // 1. Deploy Registry
        Registry registry = new Registry(deployer);
        console.log("Registry:", address(registry));

        // 2. Deploy SimpleTeleportProver
        SimpleTeleportProver prover = new SimpleTeleportProver();
        console.log("SimpleTeleportProver:", address(prover));

        // 3. Deploy CreditModel
        CreditModel creditModel = new CreditModel();
        console.log("CreditModel:", address(creditModel));

        // 4. Deploy SimpleTeleportVerifier
        // Deploy UniswapV2PriceOracle
        address uniswapV2Factory = address(0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f); // Mainnet factory
        UniswapV2PriceOracle priceOracle = new UniswapV2PriceOracle(uniswapV2Factory, address(registry));
        
        SimpleTeleportVerifier verifier = new SimpleTeleportVerifier(
            address(prover),
            registry,
            address(creditModel),
            address(priceOracle)
        );
        console.log("SimpleTeleportVerifier:", address(verifier));

        vm.stopBroadcast();

        // Verify deployment
        require(verifier.prover() == address(prover), "Prover address mismatch");
        require(address(verifier.registry()) == address(registry), "Registry address mismatch");

        console.log("\n[SUCCESS] Deployment successful!");
        console.log("All contracts deployed and verified.");
    }
}
