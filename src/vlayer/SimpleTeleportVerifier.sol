// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.21;

import {SimpleTeleportProver} from "./SimpleTeleportProver.sol";
import {Erc20Token, CToken, Protocol, TokenType, CTokenType} from "./types/TeleportTypes.sol";
import {Registry} from "./constants/Registry.sol";
import {IRegistry} from "./interfaces/IRegistry.sol";
import {CreditModel} from "./CreditModel.sol";
import {IVerifier} from "./interfaces/IVerifier.sol";
import {IController} from "./interfaces/IController.sol";
import {IUniswapV2PriceOracle} from "./interfaces/IUniswapV2PriceOracle.sol";
import {Ownable2Step} from "openzeppelin-contracts/access/Ownable2Step.sol";
import {Ownable} from "openzeppelin-contracts/access/Ownable.sol";

import {Proof} from "vlayer-0.1.0/Proof.sol";
import {Verifier} from "vlayer-0.1.0/Verifier.sol";

/**
 * @title SimpleTeleportVerifier
 * @notice A thin verification layer that validates proofs and delegates data processing
 * @dev This contract serves as the entry point for claim verification and delegates
 *      all business logic to the Controller contract
 *
 * @dev Security Features:
 *      - Cryptographic proof verification via Risc0
 *      - User-specific data access controls
 *      - Delegation to trusted Controller contract
 *
 * @dev Architecture:
 *      - SimpleTeleportVerifier: Proof verification and access control
 *      - Controller: Business logic and data processing
 *      - This separation allows for upgradeability and cleaner code organization
 */
contract SimpleTeleportVerifier is Verifier, IVerifier, Ownable2Step {

    // ============ STATE VARIABLES ============

    /// @notice Address of the trusted prover contract for data verification
    address public prover;

    /// @notice Address of the Controller contract that handles data processing
    address public controller;

    // ============ EVENTS ============
    // Events are defined in IVerifier interface

    // ============ CONSTRUCTOR ============

    /**
     * @notice Initializes the SimpleTeleportVerifier contract
     * @dev Sets up the trusted prover and controller
     *
     * @param _prover Address of the trusted prover contract for data verification
     * @param _controller Address of the Controller contract for data processing
     * @param initialOwner Address of the initial owner who can update the contracts
     */
    constructor(
        address _prover,
        address _controller,
        address initialOwner
    ) Ownable(initialOwner) {
        prover = _prover;
        controller = _controller;
    }

    // ============ MODIFIERS ============

    /**
     * @notice Modifier to ensure only the claimer can update their own data
     * @dev Prevents users from claiming or modifying other users' data
     *
     * @param claimer The address claiming/updating their data
     * @dev Reverts if msg.sender is not the same as the claimer address
     */
    modifier onlyClaimer(address claimer) {
        require(msg.sender == claimer, "Only the claimer can update their own data");
        _;
    }

    // ============ CORE FUNCTIONS ============

    /**
     * @notice Public claim function with new interface
     * @dev This is the main claim function that accepts any selector and encoded data
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
    function claim(
        Proof calldata proof,
        address claimer,
        bytes4 selector,
        bytes memory encodedData
    )
        public
        onlyVerified(prover, selector)
        onlyClaimer(claimer)
    {
        // Delegate all data processing to the Controller
        IController(controller).processClaim(claimer, selector, encodedData);
    }

    // ============ ADMIN FUNCTIONS ============

    /**
     * @notice Updates the controller contract address
     * @dev Only the contract owner can call this function
     * @param newController The address of the new controller contract
     */
    function setController(address newController) external onlyOwner {
        require(newController != address(0), "Controller cannot be zero address");

        address oldController = controller;
        controller = newController;
        
        emit ControllerUpdated(oldController, newController);
    }

    /**
     * @notice Updates the prover contract address
     * @dev Only the contract owner can call this function
     * @param newProver The address of the new prover contract
     */
    function setProver(address newProver) external onlyOwner {
        require(newProver != address(0), "Prover cannot be zero address");

        address oldProver = prover;
        prover = newProver;
        
        emit ProverUpdated(oldProver, newProver);
    }

}
