// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.21;

import {Script, console} from "forge-std/Script.sol";
import {SimpleTeleportVerifier} from "../src/vlayer/SimpleTeleportVerifier.sol";
import {Protocol} from "../src/vlayer/types/TeleportTypes.sol";
import {IVerifier} from "../src/vlayer/interfaces/IVerifier.sol";

/**
 * @title GetUsersInfo
 * @notice Script to query usersInfo data from SimpleTeleportVerifier contract
 * @dev This script allows you to query user information for different protocols
 */
contract GetUsersInfo is Script {
    // Contract addresses (update these with your deployed addresses)
    address constant VERIFIER_ADDRESS = 0x49F08053963A088aD826576ae9C5B08B9864a44C;

    // Protocol enum values
    uint8 constant AAVE = 0;
    uint8 constant MORPHO = 1;
    uint8 constant COMPOUND = 2;

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
        queryUserInfo(verifier, userAddress, Protocol.AAVE);

        // Query Morpho data
        console.log("=== MORPHO Protocol Data ===");
        queryUserInfo(verifier, userAddress, Protocol.MORPHO);

        // Query Compound data
        console.log("=== COMPOUND Protocol Data ===");
        queryUserInfo(verifier, userAddress, Protocol.COMPOUND);
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
        Protocol protocol
    ) internal view {
        IVerifier.UserInfo memory userInfo = verifier.usersInfo(user, protocol);
        uint256 borrowedAmount = userInfo.borrowedAmount;
        uint256 suppliedAmount = userInfo.suppliedAmount;
        uint256 repaidAmount = userInfo.repaidAmount;
        uint256 latestBlock = userInfo.latestBlock;
        uint256 latestBalance = userInfo.latestBalance;
        uint256 borrowTimes = userInfo.borrowTimes;
        uint256 supplyTimes = userInfo.supplyTimes;
        uint256 repayTimes = userInfo.repayTimes;
        uint256 firstActivityBlock = userInfo.firstActivityBlock;
        uint256 liquidations = userInfo.liquidations;

        console.log("  Borrowed Amount:", borrowedAmount);
        console.log("  Supplied Amount:", suppliedAmount);
        console.log("  Repaid Amount:", repaidAmount);
        console.log("  Latest Block:", latestBlock);
        console.log("  Latest Balance:", latestBalance);
        console.log("  Borrow Times:", borrowTimes);
        console.log("  Supply Times:", supplyTimes);
        console.log("  Repay Times:", repayTimes);
        console.log("  First Activity Block:", firstActivityBlock);
        console.log("  Liquidations:", liquidations);
        console.log("");
    }

    /**
     * @notice Query user info for a specific user and protocol
     * @param userAddress The user address to query
     * @param protocol The protocol type (0=AAVE, 1=MORPHO, 2=COMPOUND)
     */
    function querySpecificUser(address userAddress, Protocol protocol) external view {
        SimpleTeleportVerifier verifier = SimpleTeleportVerifier(VERIFIER_ADDRESS);

        string memory protocolName;
        if (protocol == Protocol.AAVE) {
            protocolName = "AAVE";
        } else if (protocol == Protocol.MORPHO) {
            protocolName = "MORPHO";
        } else if (protocol == Protocol.COMPOUND) {
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

        queryUserInfo(verifier, userAddress, Protocol.AAVE);
        queryUserInfo(verifier, userAddress, Protocol.MORPHO);
        queryUserInfo(verifier, userAddress, Protocol.COMPOUND);
    }
}
