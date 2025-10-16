// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import {Protocol} from "../types/TeleportTypes.sol";
import {Erc20Token, CToken} from "../types/TeleportTypes.sol";
import {Proof} from "vlayer-0.1.0/Proof.sol";

/**
 * @title IVerifier
 * @notice Interface for DeFi credit scoring and user activity verification
 * @dev Defines the standard interface for credit scoring systems that track
 *      user activity across multiple DeFi protocols
 */
interface IVerifier {

    // ============ STRUCTS ============

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

    // ============ EVENTS ============

    /// @notice Emitted when a user borrows assets from a DeFi protocol
    /// @param user The address of the user who borrowed
    /// @param protocol The DeFi protocol where the borrow occurred
    /// @param amount The amount borrowed in this transaction
    /// @param newTotalBorrowed The user's total borrowed amount after this transaction
    /// @param borrowCount The total number of borrow transactions for this user
    event UserBorrowed(address indexed user, Protocol indexed protocol, uint256 amount, uint256 newTotalBorrowed, uint256 borrowCount);

    /// @notice Emitted when a user supplies collateral to a DeFi protocol
    /// @param user The address of the user who supplied assets
    /// @param protocol The DeFi protocol where the supply occurred
    /// @param amount The amount supplied in this transaction
    /// @param newTotalSupplied The user's total supplied amount after this transaction
    /// @param supplyCount The total number of supply transactions for this user
    event UserSupplied(address indexed user, Protocol indexed protocol, uint256 amount, uint256 newTotalSupplied, uint256 supplyCount);

    /// @notice Emitted when a user repays borrowed assets to a DeFi protocol
    /// @param user The address of the user who repaid
    /// @param protocol The DeFi protocol where the repay occurred
    /// @param amount The amount repaid in this transaction
    /// @param newTotalRepaid The user's total repaid amount after this transaction
    /// @param repayCount The total number of repay transactions for this user
    event UserRepaid(address indexed user, Protocol indexed protocol, uint256 amount, uint256 newTotalRepaid, uint256 repayCount);

    /// @notice Emitted when the price oracle is updated
    /// @param oldPriceOracle The address of the previous price oracle
    /// @param newPriceOracle The address of the new price oracle
    event PriceOracleUpdated(address indexed oldPriceOracle, address indexed newPriceOracle);

    // ============ CORE FUNCTIONS ============

    /**
     * @notice Claims and processes DeFi activity data for a user
     * @dev This function processes verified token data to track user's borrowing,
     *      supplying, and repayment activities. It updates the user's credit score data
     *      and emits events for each activity type.
     *
     * @dev Parameters:
     *      - proof: The cryptographic proof that validates the data authenticity
     *      - claimer: The address of the user claiming their data
     *      - tokens: Array of Erc20Token structs containing token balances and metadata
     *
     * @dev Processing Logic:
     *      - Only processes tokens with block numbers greater than the last processed block
     *      - AVARIABLEDEBT tokens: Tracks borrows (balance increase) and repays (balance decrease)
     *      - ARESERVE tokens: Tracks supplied assets (collateral deposits)
     *      - ASTABLEDEBT tokens: Currently skipped (returns early)
     *
     * @dev Credit Score Impact:
     *      - Updates borrowedAmount, suppliedAmount, repaidAmount
     *      - Tracks activity frequency (borrowTimes, supplyTimes, repayTimes)
     *      - Records first activity timestamp for credit scoring
     *      - Updates latest block and balance for temporal calculations
     *
     * @dev Events Emitted:
     *      - UserBorrowed: When user borrows assets
     *      - UserSupplied: When user supplies collateral
     *      - UserRepaid: When user repays borrowed assets
     *
     * @dev Modifiers:
     *      - onlyVerified: Ensures the proof is valid and comes from the trusted prover
     *      - onlyClaimer: Ensures only the data owner can claim their information
     *
     * @dev Security:
     *      - Validates token addresses against the registry
     *      - Prevents processing of stale data (older block numbers)
     *      - Requires cryptographic proof of data authenticity
     */
    function claim(Proof calldata, address claimer, Erc20Token[] memory tokens) external;

    /**
     * @notice Claims and processes Compound protocol data for a user
     * @dev This function processes verified Compound token data to track user's borrowing,
     *      supplying, repayment, and withdrawal activities for the Compound protocol.
     *
     * @dev Parameters:
     *      - proof: The cryptographic proof that validates the data authenticity
     *      - claimer: The address of the user claiming their data
     *      - tokens: Array of CToken structs containing Compound token balances and metadata
     *
     * @dev Processing Logic:
     *      - Only processes tokens with block numbers greater than the last processed block
     *      - CTokenType.BASE: Tracks borrows (balance increase) and repays (balance decrease)
     *      - CTokenType.COLLATERAL: Tracks supplied collateral (balance increase) and withdrawals (balance decrease)
     *
     * @dev Modifiers:
     *      - onlyVerified: Ensures the proof is valid and comes from the trusted prover
     *      - onlyClaimer: Ensures only the data owner can claim their information
     */
    function claimCompoundData(Proof calldata, address claimer, CToken[] memory tokens) external;

    // ============ CREDIT SCORING FUNCTIONS ============

    /**
     * @notice Calculate credit score for a user based on their DeFi activity
     * @dev Computes a comprehensive credit score (0-100) and tier (A-D) based on:
     *      - Repayment rate (35% weight): How much borrowed amount has been repaid
     *      - Leverage/Utilization (30% weight): Borrowed vs total assets ratio (inverted)
     *      - Cushion ratio (15% weight): Supplied assets vs borrowed assets
     *      - History (10% weight): Address age in days (capped at 365 days)
     *      - Recency (10% weight): Days since last activity (penalty after 90 days)
     *
     * @param user The user address to calculate credit score for
     * @return score The credit score (0-100, where 100 is excellent)
     * @return tier The credit tier (A: 85-100, B: 70-84, C: 50-69, D: 0-49)
     *
     * @dev Credit Score Factors:
     *      - Higher scores for users who repay more than they borrow
     *      - Lower scores for high leverage (borrowing close to collateral value)
     *      - Bonus for maintaining high collateral ratios
     *      - Penalty for liquidations (automatic score of 10)
     *      - Time-based factors favor established, active users
     */
    function calculateCreditScore(address user)
        external
        view
        returns (uint256 score, uint8 tier);

    /**
     * @notice Get credit score for a user (convenience function)
     * @dev Simplified version of calculateCreditScore that returns only the numeric score
     *      without the tier classification. Useful for integrations that only need the score.
     *
     * @param user The user address to get credit score for
     * @return score The credit score (0-100, where 100 is excellent)
     *
     * @dev This function internally calls calculateCreditScore and discards the tier
     * @dev See calculateCreditScore for detailed scoring methodology
     */
    function getCreditScore(address user)
        external
        view
        returns (uint256 score);

    /**
     * @notice Calculate credit score for a specific protocol
     * @dev Computes credit score and tier based on user's activity in a single protocol
     *      Uses the same credit model as the aggregate score but only considers
     *      data from the specified protocol.
     *
     * @param user The address of the user to calculate the credit score for
     * @param protocol The specific protocol (AAVE or COMPOUND) to calculate the score for
     * @return score The calculated credit score (0-1000)
     * @return tier The credit tier (0: Bronze, 1: Silver, 2: Gold, 3: Platinum, 4: Diamond)
     *
     * @dev This function allows users and dApps to see protocol-specific credit scores,
     *      which can be useful for:
     *      - Understanding performance on individual protocols
     *      - Protocol-specific lending decisions
     *      - Comparative analysis across protocols
     */
    function calculateCreditScorePerProtocol(address user, Protocol protocol)
        external
        view
        returns (uint256 score, uint8 tier);

    /**
     * @notice Get credit score for a specific protocol (score only)
     * @dev Returns just the credit score without the tier for a specific protocol
     *
     * @param user The address of the user to get the credit score for
     * @param protocol The specific protocol (AAVE or COMPOUND) to get the score for
     * @return score The calculated credit score (0-1000)
     */
    function getCreditScorePerProtocol(address user, Protocol protocol)
        external
        view
        returns (uint256 score);

    // ============ VIEW FUNCTIONS ============

    /**
     * @notice Get user information for a specific protocol
     * @param user The user address to query
     * @param protocol The DeFi protocol to query
     * @return userInfo The complete user activity data for the protocol
     */
    function usersInfo(address user, Protocol protocol)
        external
        view
        returns (UserInfo memory userInfo);

    // ============ ADMIN FUNCTIONS ============

    /**
     * @notice Updates the price oracle contract address
     * @dev Only the contract owner can call this function
     * @param newPriceOracle The address of the new price oracle contract
     * 
     * @dev Requirements:
     *      - Caller must be the contract owner
     *      - newPriceOracle must not be the zero address
     * 
     * @dev Emits:
     *      - PriceOracleUpdated event with old and new addresses
     * 
     * @dev Security:
     *      - This is a critical function that changes the price feed
     *      - Only the verified owner can execute this
     *      - Two-step ownership transfer provides additional safety
     */
    function setPriceOracle(address newPriceOracle) external;

}
