// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import {Protocol} from "../types/TeleportTypes.sol";
import {IVerifier} from "./IVerifier.sol";

/**
 * @title IController
 * @notice Interface for the Controller contract that handles data processing
 * @dev Defines the standard interface for processing claim data from different protocols
 */
interface IController {

    // ============ EVENTS ============

    // Ownership Events
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    // Errors
    error OwnableUnauthorizedAccount(address account);
    error OwnableInvalidOwner(address owner);

    /// @notice Emitted when a user borrows assets from a DeFi protocol
    event UserBorrowed(address indexed user, Protocol indexed protocol, uint256 amount, uint256 newTotalBorrowed, uint256 borrowCount);

    /// @notice Emitted when a user supplies collateral to a DeFi protocol
    event UserSupplied(address indexed user, Protocol indexed protocol, uint256 amount, uint256 newTotalSupplied, uint256 supplyCount);

    /// @notice Emitted when a user repays borrowed assets to a DeFi protocol
    event UserRepaid(address indexed user, Protocol indexed protocol, uint256 amount, uint256 newTotalRepaid, uint256 repayCount);

    /// @notice Emitted when the verifier contract address is updated
    event VerifierUpdated(address indexed oldVerifier, address indexed newVerifier);

    /// @notice Emitted when the price oracle is updated
    event PriceOracleUpdated(address indexed oldPriceOracle, address indexed newPriceOracle);

    // ============ CORE FUNCTIONS ============

    /**
     * @notice Process claim data based on the selector
     * @dev Decodes the data and processes it according to the selector
     * @param claimer The address claiming their data
     * @param selector The function selector identifying which data type to process
     * @param encodedData The encoded data to process
     */
    function processClaim(address claimer, bytes4 selector, bytes memory encodedData) external;

    // ============ CREDIT SCORING FUNCTIONS ============

    /**
     * @notice Calculate credit score for a user
     * @param user The user address to calculate credit score for
     * @return score The credit score (0-1000)
     * @return tier The credit tier
     */
    function calculateCreditScore(address user)
        external
        view
        returns (uint256 score, uint8 tier);

    /**
     * @notice Get credit score for a user (score only)
     * @param user The user address to get credit score for
     * @return score The credit score (0-1000)
     */
    function getCreditScore(address user)
        external
        view
        returns (uint256 score);

    /**
     * @notice Calculate credit score for a specific protocol
     * @param user The address of the user to calculate the credit score for
     * @param protocol The specific protocol to calculate the score for
     * @return score The calculated credit score (0-1000)
     * @return tier The credit tier
     */
    function calculateCreditScorePerProtocol(address user, Protocol protocol)
        external
        view
        returns (uint256 score, uint8 tier);

    /**
     * @notice Get credit score for a specific protocol (score only)
     * @param user The address of the user to get the credit score for
     * @param protocol The specific protocol to get the score for
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
        returns (IVerifier.UserInfo memory userInfo);

    /**
     * @notice Get total aggregated user information across all protocols
     * @param user The user address to query
     * @return userInfo The aggregated user activity data
     */
    function totals(address user)
        external
        view
        returns (IVerifier.UserInfo memory userInfo);

    /**
     * @notice Get latest debt and collateral block numbers for a protocol
     * @param protocol The protocol to query
     * @return latestDebtBlock The latest processed debt block number for the protocol
     * @return latestCollateralBlock The latest processed collateral block number for the protocol
     */
    function latestProtocolBlockNumbers(Protocol protocol)
        external
        view
        returns (uint256 latestDebtBlock, uint256 latestCollateralBlock);

    // ============ ADMIN FUNCTIONS ============

    /**
     * @notice Updates the price oracle contract address
     * @dev Only the contract owner (via verifier delegation) can call this function
     * @param newPriceOracle The address of the new price oracle contract
     */
    function setPriceOracle(address newPriceOracle) external;
}

