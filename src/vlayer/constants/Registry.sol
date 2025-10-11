// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.21;

import {AccessControl} from "openzeppelin-contracts/access/AccessControl.sol";
import {Initializable} from "openzeppelin-contracts/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "openzeppelin-contracts/proxy/utils/UUPSUpgradeable.sol";
import {IRegistry} from "../interfaces/IRegistry.sol";

/**
 * @title Registry
 * @notice Centralized storage for contract addresses used across the protocol
 * @dev This contract contains all the constant addresses used in the SimpleTeleport system
 *
 * Token Types:
 * - Native tokens: Tokens that are natively issued on each chain (e.g., WETH on L2s)
 * - Bridged tokens: Tokens that are bridged from Ethereum mainnet to L2s
 * - Native L2 tokens: Tokens that are natively issued by the token issuer on L2s (e.g., Circle's USDC on Base)
 * @custom:oz-upgrades-from Registry
 */
contract Registry is Initializable, AccessControl, UUPSUpgradeable, IRegistry {
    // Role definitions
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant UPDATER_ROLE = keccak256("UPDATER_ROLE");

    // Aave Protocol Addresses
    address public constant AAVE_POOL_ADDRESS = 0x794a61358D6845594F94dc1DB02A252b5b4814aD;

    // Morpho Protocol Addresses (to be updated with actual addresses)
    address public constant MORPHO_LENS_ADDRESS = address(0);
    address public constant MORPHO_REWARDS_DISTRIBUTOR_ADDRESS = address(0);

    // Compound Protocol Addresses (to be updated with actual addresses)
    address public constant COMPOUND_COMPTROLLER_ADDRESS = address(0);
    address public constant COMPOUND_C_TOKEN_FACTORY_ADDRESS = address(0);

    // Common ERC20 Token Addresses (mainnet - native tokens)
    address public constant USDC_ADDRESS = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48; // Native USDC
    address public constant USDT_ADDRESS = 0xdAC17F958D2ee523a2206206994597C13D831ec7; // Native USDT
    address public constant WETH_ADDRESS = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2; // Native WETH
    address public constant WBTC_ADDRESS = 0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599; // Native WBTC

    // Placeholder addresses for other chains (to be updated with actual addresses)
    address public constant PLACEHOLDER_ADDRESS = address(0);

    // Optimism token addresses (mostly bridged from Ethereum)
    address public constant OP_USDC_ADDRESS = 0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85; // Bridged USDC (Circle's native USDC)
    address public constant OP_USDT_ADDRESS = 0x94b008aA00579c1307B0EF2c499aD98a8ce58e58; // Bridged USDT
    address public constant OP_WETH_ADDRESS = 0x4200000000000000000000000000000000000006; // Native WETH (Optimism's native ETH wrapper)
    address public constant OP_WBTC_ADDRESS = 0x68f180fcCe6836688e9084f035309E29Bf0A2095; // Bridged WBTC


    // Base token addresses (mostly bridged from Ethereum)
    address public constant BASE_USDC_ADDRESS = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913; // Native USDC (Circle's native USDC on Base)
    address public constant BASE_USDT_ADDRESS = 0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2; // Bridge USDT (Tether's native USDT on Base)
    address public constant BASE_WETH_ADDRESS = 0x4200000000000000000000000000000000000006; // Native WETH (Base's native ETH wrapper)
    address public constant BASE_WBTC_ADDRESS = 0x0555E30da8f98308EdB960aa94C0Db47230d2B9c; // Bridged WBTC

    // Arbitrum token addresses (mostly bridged from Ethereum)
    address public constant ARB_USDC_ADDRESS = 0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8; // Bridged USDC (Circle's native USDC)
    address public constant ARB_USDT_ADDRESS = 0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9; // Bridged USDT
    address public constant ARB_WETH_ADDRESS = 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1; // Native WETH (Arbitrum's native ETH wrapper)
    address public constant ARB_WBTC_ADDRESS = 0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f; // Bridged WBTC
    // Chain-specific address mappings
    mapping(uint256 => ChainAddresses) private chainAddresses;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initializes the Registry contract
     * @dev This replaces the constructor for upgradeable contracts
     * @param admin The address that will be granted all roles
     */
    function initialize(address admin) public initializer {
        require(admin != address(0), "Admin cannot be zero address");

        // Initialize access control
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        _grantRole(UPDATER_ROLE, admin);

        // Initialize mainnet addresses
        chainAddresses[1] = ChainAddresses({
            aavePool: AAVE_POOL_ADDRESS,
            morphoLens: MORPHO_LENS_ADDRESS,
            compoundComptroller: COMPOUND_COMPTROLLER_ADDRESS,
            usdc: USDC_ADDRESS,
            usdt: USDT_ADDRESS,
            weth: WETH_ADDRESS,
            wbtc: WBTC_ADDRESS
        });

        // Initialize optimism addresses
        chainAddresses[10] = ChainAddresses({
            aavePool: AAVE_POOL_ADDRESS,
            morphoLens: PLACEHOLDER_ADDRESS,
            compoundComptroller: PLACEHOLDER_ADDRESS,
            usdc: OP_USDC_ADDRESS,
            usdt: OP_USDT_ADDRESS,
            weth: OP_WETH_ADDRESS,
            wbtc: OP_WBTC_ADDRESS
        });

        // Initialize base addresses
        chainAddresses[8453] = ChainAddresses({
            aavePool: AAVE_POOL_ADDRESS,
            morphoLens: PLACEHOLDER_ADDRESS,
            compoundComptroller: PLACEHOLDER_ADDRESS,
            usdc: BASE_USDC_ADDRESS,
            usdt: BASE_USDT_ADDRESS,
            weth: BASE_WETH_ADDRESS,
            wbtc: BASE_WBTC_ADDRESS
        });
    }

    /**
     * @notice Get addresses for a specific chain
     * @param chainId The chain ID to get addresses for
     * @return addresses The addresses for the specified chain
     */
    function getAddressesForChain(uint256 chainId) external view returns (ChainAddresses memory addresses) {
        addresses = chainAddresses[chainId];
        require(addresses.aavePool != address(0), "Unsupported chain ID");
    }

    /**
     * @notice Get Aave pool address for a specific chain
     * @param chainId The chain ID
     * @return The Aave pool address for the chain
     */
    function getAavePoolAddress(uint256 chainId) external view returns (address) {
        ChainAddresses memory addresses = chainAddresses[chainId];
        require(addresses.aavePool != address(0), "Unsupported chain ID");
        return addresses.aavePool;
    }

    /**
     * @notice Get Morpho lens address for a specific chain
     * @param chainId The chain ID
     * @return The Morpho lens address for the chain
     */
    function getMorphoLensAddress(uint256 chainId) external view returns (address) {
        ChainAddresses memory addresses = chainAddresses[chainId];
        require(addresses.aavePool != address(0), "Unsupported chain ID");
        return addresses.morphoLens;
    }

    /**
     * @notice Get Compound comptroller address for a specific chain
     * @param chainId The chain ID
     * @return The Compound comptroller address for the chain
     */
    function getCompoundComptrollerAddress(uint256 chainId) external view returns (address) {
        ChainAddresses memory addresses = chainAddresses[chainId];
        require(addresses.aavePool != address(0), "Unsupported chain ID");
        return addresses.compoundComptroller;
    }

    /**
     * @notice Update addresses for a specific chain (only admin or updater)
     * @param chainId The chain ID
     * @param addresses The new addresses for the chain
     */
    function updateChainAddresses(uint256 chainId, ChainAddresses calldata addresses) external onlyRole(ADMIN_ROLE) {
        chainAddresses[chainId] = addresses;
        emit ChainAddressesUpdated(chainId, addresses);
    }

    /**
     * @notice Update token addresses for a specific chain (only updater role)
     * @param chainId The chain ID
     * @param usdc USDC address
     * @param usdt USDT address
     * @param weth WETH address
     * @param wbtc WBTC address
     */
    function updateTokenAddresses(
        uint256 chainId,
        address usdc,
        address usdt,
        address weth,
        address wbtc
    ) external onlyRole(UPDATER_ROLE) {
        ChainAddresses storage addresses = chainAddresses[chainId];
        require(addresses.aavePool != address(0), "Unsupported chain ID");

        addresses.usdc = usdc;
        addresses.usdt = usdt;
        addresses.weth = weth;
        addresses.wbtc = wbtc;

        emit TokenAddressesUpdated(chainId, usdc, usdt, weth, wbtc);
    }

    /**
     * @notice Update protocol addresses for a specific chain (only admin role)
     * @param chainId The chain ID
     * @param aavePool Aave pool address
     * @param morphoLens Morpho lens address
     * @param compoundComptroller Compound comptroller address
     */
    function updateProtocolAddresses(
        uint256 chainId,
        address aavePool,
        address morphoLens,
        address compoundComptroller
    ) external onlyRole(ADMIN_ROLE) {
        ChainAddresses storage addresses = chainAddresses[chainId];
        require(addresses.aavePool != address(0), "Unsupported chain ID");

        addresses.aavePool = aavePool;
        addresses.morphoLens = morphoLens;
        addresses.compoundComptroller = compoundComptroller;

        emit ProtocolAddressesUpdated(chainId, aavePool, morphoLens, compoundComptroller);
    }

    /**
     * @dev Function that should revert when msg.sender is not authorized to upgrade the contract
     * @param newImplementation Address of the new implementation
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(ADMIN_ROLE) {}

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[49] private __gap;
}
