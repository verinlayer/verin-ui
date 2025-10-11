// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.21;

import {IUniswapV2PriceOracle} from "./interfaces/IUniswapV2PriceOracle.sol";

// ============ INTERFACES ============

/// @notice Uniswap V2 Factory interface
interface IUniswapV2Factory {
    function getPair(address tokenA, address tokenB) external view returns (address pair);
}

/// @notice Uniswap V2 Pair interface
interface IUniswapV2Pair {
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
    function token0() external view returns (address);
    function token1() external view returns (address);
}

/// @notice ERC20 interface for token decimals
interface IERC20 {
    function decimals() external view returns (uint8);
}

/// @notice Registry interface for getting stablecoin addresses
interface IRegistry {
    struct ChainAddresses {
        address aavePool;
        address morphoLens;
        address compoundComptroller;
        address usdc;
        address usdt;
        address weth;
        address wbtc;
    }
    
    function getAddressesForChain(uint256 chainId) external view returns (ChainAddresses memory addresses);
}

/**
 * @title UniswapV2PriceOracle
 * @notice Contract to get reserves from Uniswap V2 pools and calculate token prices
 * @dev Provides price calculation functionality for Uniswap V2 pairs
 */
contract UniswapV2PriceOracle is IUniswapV2PriceOracle {

    // ============ EVENTS ============
    // Events are defined in the IUniswapV2PriceOracle interface

    // ============ STATE VARIABLES ============

    /// @notice Address of the Uniswap V2 Factory contract
    address public immutable UNISWAP_V2_FACTORY;
    
    /// @notice Address of the Registry contract
    address public immutable REGISTRY;

    uint256 public immutable EXP = 1e18;

    // ============ CONSTRUCTOR ============

    /**
     * @notice Initialize the UniswapV2PriceOracle contract
     * @param _factory Address of the Uniswap V2 Factory contract
     * @param _registry Address of the Registry contract
     */
    constructor(address _factory, address _registry) {
        UNISWAP_V2_FACTORY = _factory;
        REGISTRY = _registry;
    }

    // ============ INTERNAL HELPER FUNCTIONS ============

    /**
     * @notice Internal helper to get the address of a Uniswap V2 pair for two tokens
     * @param tokenA First token address
     * @param tokenB Second token address
     * @return pair Address of the Uniswap V2 pair contract
     */
    function _getPairAddress(address tokenA, address tokenB) internal view returns (address pair) {
        return IUniswapV2Factory(UNISWAP_V2_FACTORY).getPair(tokenA, tokenB);
    }

    /**
     * @notice Internal helper to get reserves of a Uniswap V2 pair
     * @param pair Address of the Uniswap V2 pair
     * @return reserve0 Reserve amount of token0
     * @return reserve1 Reserve amount of token1
     * @return blockTimestampLast Timestamp of the last block when reserves were updated
     */
    function _getPairReserves(address pair) internal view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast) {
        return IUniswapV2Pair(pair).getReserves();
    }

    /**
     * @notice Internal helper to get token addresses from a Uniswap V2 pair
     * @param pair Address of the Uniswap V2 pair
     * @return token0 Address of token0
     * @return token1 Address of token1
     */
    function _getPairTokens(address pair) internal view returns (address token0, address token1) {
        IUniswapV2Pair pairContract = IUniswapV2Pair(pair);
        return (pairContract.token0(), pairContract.token1());
    }

    /**
     * @notice Internal helper to calculate the price of input token in terms of the other token in the pair
     * @param pair Address of the Uniswap V2 pair
     * @param inputToken Address of the token to get price for
     * @param amount Amount of input token to calculate price for (in input token's decimals)
     * @return price Raw price of the input token in terms of the other token (in quote token's decimals)
     * @return isToken0 Whether the input token is token0 in the pair
     */
    function _getTokenPrice(address pair, address inputToken, uint256 amount) internal view returns (uint256 price, bool isToken0) {
        // Get reserves and token addresses
        (uint112 reserve0, uint112 reserve1,) = _getPairReserves(pair);
        (address token0,) = _getPairTokens(pair);

        // Determine if input token is token0 or token1
        isToken0 = (inputToken == token0);

        // Calculate price based on which token is the input
        // Amount and reserves are already in their respective token decimals
        if (isToken0) {
            // Price of token0 in terms of token1
            price = (amount * uint256(reserve1)) * EXP / uint256(reserve0);
        } else {
            // Price of token1 in terms of token0
            price = (amount * uint256(reserve0)) * EXP / uint256(reserve1);
        }

        return (price, isToken0);
    }

    /**
     * @notice Internal helper to get the price of tokenA in terms of tokenB
     * @param tokenA First token address (input token)
     * @param tokenB Second token address (quote token)
     * @param amount Amount of tokenA to calculate price for (in tokenA's decimals)
     * @return price Raw price of tokenA in terms of tokenB (in tokenB's decimals)
     * @return pair Address of the pair used for calculation
     */
    function _getPriceFromTokens(address tokenA, address tokenB, uint256 amount) internal view returns (uint256 price, address pair) {
        // Get pair address
        pair = _getPairAddress(tokenA, tokenB);
        require(pair != address(0), "Pair does not exist");

        // Get price from pair
        (price,) = _getTokenPrice(pair, tokenA, amount);
        
        return (price, pair);
    }

    // ============ STABLECOIN PRICE FUNCTIONS ============

    /**
     * @notice Get the price of an input token in terms of USDC
     * @param inputToken Address of the token to get price for
     * @param amount Amount of input token (in input token's decimals)
     * @return price Raw price of input token in terms of USDC (in USDC's decimals)
     * @return pair Address of the pair used for calculation
     */
    function getPriceInUSDC(address inputToken, uint256 amount) external view returns (uint256 price, address pair) {
        // Get USDC address from registry using current chain ID
        IRegistry registry = IRegistry(REGISTRY);
        IRegistry.ChainAddresses memory addresses = registry.getAddressesForChain(block.chainid);
        
        // Get price using the internal helper function
        (price, pair) = _getPriceFromTokens(inputToken, addresses.usdc, amount);
        
        return (price, pair);
    }

    /**
     * @notice Get the price of an input token in terms of USDT
     * @param inputToken Address of the token to get price for
     * @param amount Amount of input token (in input token's decimals)
     * @return price Raw price of input token in terms of USDT (in USDT's decimals)
     * @return pair Address of the pair used for calculation
     */
    function getPriceInUSDT(address inputToken, uint256 amount) external view returns (uint256 price, address pair) {
        // Get USDT address from registry using current chain ID
        IRegistry registry = IRegistry(REGISTRY);
        IRegistry.ChainAddresses memory addresses = registry.getAddressesForChain(block.chainid);
        
        // Get price using the internal helper function
        (price, pair) = _getPriceFromTokens(inputToken, addresses.usdt, amount);
        
        return (price, pair);
    }

    
}
