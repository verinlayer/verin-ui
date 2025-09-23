// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.21;

import {Script, console} from "forge-std/Script.sol";
import {WhaleBadgeNFT} from "../src/vlayer/WhaleBadgeNFT.sol";
import {SimpleTeleportProver} from "../src/vlayer/SimpleTeleportProver.sol";
import {SimpleTeleportVerifier} from "../src/vlayer/SimpleTeleportVerifier.sol";
import {Registry} from "../src/vlayer/constants/Registry.sol";

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

        // 1. Deploy WhaleBadgeNFT
        WhaleBadgeNFT whaleBadgeNFT = new WhaleBadgeNFT();
        console.log("WhaleBadgeNFT:", address(whaleBadgeNFT));

        // 2. Deploy Registry
        Registry registry = new Registry(deployer);
        console.log("Registry:", address(registry));

        // 3. Deploy SimpleTeleportProver
        SimpleTeleportProver prover = new SimpleTeleportProver();
        console.log("SimpleTeleportProver:", address(prover));

        // 4. Deploy SimpleTeleportVerifier
        SimpleTeleportVerifier verifier = new SimpleTeleportVerifier(
            address(prover),
            whaleBadgeNFT,
            registry
        );
        console.log("SimpleTeleportVerifier:", address(verifier));

        vm.stopBroadcast();

        // Verify deployment
        require(verifier.prover() == address(prover), "Prover address mismatch");
        require(address(verifier.registry()) == address(registry), "Registry address mismatch");
        require(address(verifier.reward()) == address(whaleBadgeNFT), "WhaleBadgeNFT address mismatch");

        console.log("\n[SUCCESS] Deployment successful!");
        console.log("All contracts deployed and verified.");
    }
}
