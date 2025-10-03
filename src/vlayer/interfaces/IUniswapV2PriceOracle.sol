// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.21;

/**
 * @title IUniswapV2PriceOracle
 * @notice Interface for Uniswap V2 price oracle functionality
 * @dev Defines the contract interface for getting reserves and calculating token prices from Uniswap V2 pairs
 */
interface IUniswapV2PriceOracle {

    // ============ EVENTS ============

    /// @notice Emitted when a price is calculated
    /// @param pair Address of the pair
    /// @param inputToken Address of the input token
    /// @param amount Amount of input token
    /// @param price Calculated price
    /// @param isToken0 Whether input token is token0
    event PriceCalculated(
        address indexed pair,
        address indexed inputToken,
        uint256 amount,
        uint256 price,
        bool isToken0
    );


    // ============ STABLECOIN PRICE FUNCTIONS ============

    /**
     * @notice Get the price of an input token in terms of USDC
     * @param inputToken Address of the token to get price for
     * @param amount Amount of input token (in input token's decimals)
     * @return price Raw price of input token in terms of USDC (in USDC's decimals)
     * @return pair Address of the pair used for calculation
     */
    function getPriceInUSDC(address inputToken, uint256 amount) external view returns (uint256 price, address pair);

    /**
     * @notice Get the price of an input token in terms of USDT
     * @param inputToken Address of the token to get price for
     * @param amount Amount of input token (in input token's decimals)
     * @return price Raw price of input token in terms of USDT (in USDT's decimals)
     * @return pair Address of the pair used for calculation
     */
    function getPriceInUSDT(address inputToken, uint256 amount) external view returns (uint256 price, address pair);
}
