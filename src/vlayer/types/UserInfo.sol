// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/// @title UserInfo
/// @notice Shared struct for user DeFi activity data across contracts
/// @dev Used by both SimpleTeleportVerifier and CreditModel to avoid stack too deep errors
struct UserInfo {
    uint256 borrowedAmount;
    uint256 suppliedAmount;
    uint256 repaidAmount;
    uint256 latestBlock;
    uint256 latestBalance;
    uint256 borrowTimes;
    uint256 supplyTimes;
    uint256 repayTimes;
    uint256 firstActivityBlock;
    uint256 liquidations;
}
