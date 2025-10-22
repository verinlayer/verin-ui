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

    /// @notice Emitted when the controller contract address is updated
    /// @param oldController The address of the previous controller
    /// @param newController The address of the new controller
    event ControllerUpdated(address indexed oldController, address indexed newController);

    /// @notice Emitted when the prover contract address is updated
    /// @param oldProver The address of the previous prover
    /// @param newProver The address of the new prover
    event ProverUpdated(address indexed oldProver, address indexed newProver);

    // ============ CORE FUNCTIONS ============

    /**
     * @notice Claims and processes DeFi activity data for a user using the new unified interface
     * @dev This function processes verified data to track user's DeFi activity
     *      The actual processing logic is delegated to the Controller contract
     *
     * @param proof The cryptographic proof that validates the data authenticity
     * @param claimer The address of the user claiming their data
     * @param selector The function selector identifying which prover function was used
     * @param encodedData The encoded data returned from the prover
     *
     * @dev Security:
     *      - Requires cryptographic proof verification via onlyVerified modifier
     *      - Only the claimer can update their own data via onlyClaimer modifier
     *      - All data processing is delegated to the trusted Controller contract
     */
    function claim(Proof calldata proof, address claimer, bytes4 selector, bytes memory encodedData) external;
}
