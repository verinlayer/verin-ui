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
    /**
     * @notice Proves cross-chain balance of ERC20 tokens for a given owner
     * @param _owner The address of the token owner
     * @param tokens Array of Erc20Token structs containing token information
     * @return proof The generated proof
     * @return owner The verified owner address
     * @return tokensWithBalances Array of tokens with updated balance information
     */
    function crossChainBalanceOf(address _owner, Erc20Token[] memory tokens)
        external
        returns (Proof memory, address, Erc20Token[] memory);

    /**
     * @notice Proves Aave protocol data for a given owner
     * @param _owner The address of the token owner
     * @param tokens Array of Erc20Token structs containing Aave token information
     * @return proof The generated proof
     * @return owner The verified owner address
     * @return tokensWithBalances Array of tokens with updated balance information
     */
    function proveAaveData(address _owner, Erc20Token[] memory tokens)
        external
        returns (Proof memory, address, Erc20Token[] memory);

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
     * @return tokensWithBalances Array of tokens with updated balance information
     */
    function proveCompoundData(address _owner, CToken[] memory tokens)
        external
        returns (Proof memory, address, CToken[] memory);
}
