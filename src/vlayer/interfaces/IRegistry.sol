// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.21;

/**
 * @title IRegistry
 * @notice Interface for the Registry contract
 * @dev Defines the public functions for address management across different chains
 */
interface IRegistry {
    // Struct for chain-specific addresses
    struct ChainAddresses {
        address aavePool;
        address morpho;
        address compoundComptroller;
        address usdc;
        address usdt;
        address weth;
        address wbtc;
    }
    struct CompoundAddresses {
        address cUSDCV3;
        address cUSDTV3;
        address cWETHV3;
        address cWBTCV3;
        address cUSDSV3;
        address cwstETHV3;
    }

    // Events
    event ChainAddressesUpdated(uint256 indexed chainId, ChainAddresses addresses);
    event TokenAddressesUpdated(uint256 indexed chainId, address usdc, address usdt, address weth, address wbtc);
    event ProtocolAddressesUpdated(uint256 indexed chainId, address aavePool, address morphoLens, address compoundComptroller);
    event CompoundAddressesUpdated(uint256 indexed chainId, CompoundAddresses addresses);

    // View functions
    function getAddressesForChain(uint256 chainId) external view returns (ChainAddresses memory addresses);
    function getAavePoolAddress(uint256 chainId) external view returns (address);
    function getMorphoAddress(uint256 chainId) external view returns (address);
    function getCompoundComptrollerAddress(uint256 chainId) external view returns (address);
    function getCompoundAddresses(uint256 chainId) external view returns (CompoundAddresses memory);

    // Update functions (require specific roles)
    function updateChainAddresses(uint256 chainId, ChainAddresses calldata addresses) external;
    function updateTokenAddresses(
        uint256 chainId,
        address usdc,
        address usdt,
        address weth,
        address wbtc
    ) external;
    function updateProtocolAddresses(
        uint256 chainId,
        address aavePool,
        address morphoLens,
        address compoundComptroller
    ) external;
    function updateCompoundAddresses(uint256 chainId, CompoundAddresses calldata addresses) external;
}
