// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.21;

import {Proof} from "vlayer-0.1.0/Proof.sol";
import {Erc20Token, CToken, Protocol, TokenType, CTokenType} from "../types/TeleportTypes.sol";

/**
 * @title IProver
 * @notice Interface for the SimpleTeleportProver contract
 * @dev Defines the public methods that any prover implementation should provide
 */
interface IProver {
    // Events
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    // Errors
    error OwnableUnauthorizedAccount(address account);
    error OwnableInvalidOwner(address owner);
    /**
     * @notice Proves Aave protocol data for a given owner
     * @param _owner The address of the token owner
     * @param tokens Array of Erc20Token structs containing Aave token information
     * @return proof The generated proof
     * @return owner The verified owner address
     * @return selector The function selector for routing
     * @return encodedData The encoded token data
     */
    function proveAaveData(address _owner, Erc20Token[] memory tokens)
        external
        returns (Proof memory, address, bytes4, bytes memory);

    /**
     * @notice Proves Morpho protocol data for a given owner
     * @param _owner The address of the token owner
     * @param tokens Array of Erc20Token structs containing Morpho token information
     * @return proof The generated proof
     * @return owner The verified owner address
     * @return tokensWithBalances Array of tokens with updated balance information
     */
    function proveMorphoData(address _owner, Erc20Token[] memory tokens)
        external
        returns (Proof memory, address, Erc20Token[] memory);

    /**
     * @notice Proves Compound protocol data for a given owner
     * @param _owner The address of the token owner
     * @param tokens Array of CToken structs containing Compound token information
     * @return proof The generated proof
     * @return owner The verified owner address
     * @return selector The function selector for routing
     * @return encodedData The encoded token data
     */
    function proveCompoundData(address _owner, CToken[] memory tokens)
        external
        returns (Proof memory, address, bytes4, bytes memory);
}
