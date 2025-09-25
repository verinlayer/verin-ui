// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.21;

import {Script, console} from "forge-std/Script.sol";
import {SimpleTeleportVerifier} from "../src/vlayer/SimpleTeleportVerifier.sol";

/**
 * @title GetUsersInfo
 * @notice Script to query usersInfo data from SimpleTeleportVerifier contract
 * @dev This script allows you to query user information for different protocols
 */
contract GetUsersInfo is Script {
    // Contract addresses (update these with your deployed addresses)
    address constant VERIFIER_ADDRESS = 0x49F08053963A088aD826576ae9C5B08B9864a44C;

    // Protocol enum values
    uint256 constant AAVE = 0;
    uint256 constant MORPHO = 1;
    uint256 constant COMPOUND = 2;

    function run() external view {
        // Get the verifier contract instance
        SimpleTeleportVerifier verifier = SimpleTeleportVerifier(VERIFIER_ADDRESS);

        // Example: Query a specific user's Aave data
        // Replace with actual user address
        address userAddress = 0x716cB4CB740D5D6514f9D418fD8613E91D1dd33A;

        console.log("=== User Info Query ===");
        console.log("Verifier Address:", VERIFIER_ADDRESS);
        console.log("User Address:", userAddress);
        console.log("");

        // Query Aave data
        console.log("=== AAVE Protocol Data ===");
        queryUserInfo(verifier, userAddress, AAVE);

        // Query Morpho data
        console.log("=== MORPHO Protocol Data ===");
        queryUserInfo(verifier, userAddress, MORPHO);

        // Query Compound data
        console.log("=== COMPOUND Protocol Data ===");
        queryUserInfo(verifier, userAddress, COMPOUND);
    }

    /**
     * @notice Query user info for a specific protocol
     * @param verifier The SimpleTeleportVerifier contract instance
     * @param user The user address to query
     * @param protocol The protocol type (0=AAVE, 1=MORPHO, 2=COMPOUND)
     */
    function queryUserInfo(
        SimpleTeleportVerifier verifier,
        address user,
        uint256 protocol
    ) internal view {
        (
            uint256 borrowedAmount,
            uint256 suppliedAmount,
            uint256 repaidAmount,
            uint256 latestBlock,
            uint256 latestBalance,
            uint256 borrowTimes,
            uint256 supplyTimes,
            uint256 repayTimes
        ) = verifier.usersInfo(user, protocol);

        console.log("  Borrowed Amount:", borrowedAmount);
        console.log("  Supplied Amount:", suppliedAmount);
        console.log("  Repaid Amount:", repaidAmount);
        console.log("  Latest Block:", latestBlock);
        console.log("  Latest Balance:", latestBalance);
        console.log("  Borrow Times:", borrowTimes);
        console.log("  Supply Times:", supplyTimes);
        console.log("  Repay Times:", repayTimes);
        console.log("");
    }

    /**
     * @notice Query user info for a specific user and protocol
     * @param userAddress The user address to query
     * @param protocol The protocol type (0=AAVE, 1=MORPHO, 2=COMPOUND)
     */
    function querySpecificUser(address userAddress, uint256 protocol) external view {
        SimpleTeleportVerifier verifier = SimpleTeleportVerifier(VERIFIER_ADDRESS);

        string memory protocolName;
        if (protocol == AAVE) {
            protocolName = "AAVE";
        } else if (protocol == MORPHO) {
            protocolName = "MORPHO";
        } else if (protocol == COMPOUND) {
            protocolName = "COMPOUND";
        } else {
            protocolName = "UNKNOWN";
        }

        console.log("=== Querying", protocolName, "for user:");
        console.log(userAddress);
        queryUserInfo(verifier, userAddress, protocol);
    }

    /**
     * @notice Query all protocols for a specific user
     * @param userAddress The user address to query
     */
    function queryAllProtocols(address userAddress) external view {
        SimpleTeleportVerifier verifier = SimpleTeleportVerifier(VERIFIER_ADDRESS);

        console.log("=== All Protocol Data for User:", userAddress);
        console.log("");

        queryUserInfo(verifier, userAddress, AAVE);
        queryUserInfo(verifier, userAddress, MORPHO);
        queryUserInfo(verifier, userAddress, COMPOUND);
    }
}
