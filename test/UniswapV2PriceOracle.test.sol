// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.21;

import {Test} from "forge-std/Test.sol";
import "../src/vlayer/UniswapV2PriceOracle.sol";
import {IUniswapV2PriceOracle} from "../src/vlayer/interfaces/IUniswapV2PriceOracle.sol";

/**
 * @title UniswapV2PriceOracleTest
 * @notice Test suite for UniswapV2PriceOracle contract
 * @dev Tests the price calculation functionality for Uniswap V2 pairs
 */
contract UniswapV2PriceOracleTest is Test {
    
    // ============ TEST CONTRACTS ============
    
    UniswapV2PriceOracle public priceOracle;
    
    // ============ TEST ADDRESSES ============
    
    address public factory = address(0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f); // Uniswap V2 Factory on Ethereum
    address public token0 = address(0xa0b86A33E6441C8C06dDD1233d7C6E2B8A7a1C7F); // Mock token0
    address public token1 = address(0xB1c97a33E6441C8c06dDd1233d7c6E2B8A7a1C7F); // Mock token1
    address public pair = address(0xc2d88a33E6441c8c06DDd1233D7c6E2B8A7a1C7F); // Mock pair
    
    // ============ MOCK CONTRACTS ============
    
    MockUniswapV2Factory public mockFactory;
    MockUniswapV2Pair public mockPair;
    MockERC20 public mockToken0;
    MockERC20 public mockToken1;
    MockRegistry public mockRegistry;
    
    // ============ TEST DATA ============
    
    uint112 public constant RESERVE0 = 1000000e18; // 1M tokens
    uint112 public constant RESERVE1 = 2000000e6;  // 2M tokens (6 decimals)
    uint32 public constant BLOCK_TIMESTAMP = 1234567890;
    
    // ============ SETUP ============
    
    function setUp() public {
        // Deploy mock contracts
        mockFactory = new MockUniswapV2Factory();
        mockPair = new MockUniswapV2Pair();
        mockToken0 = new MockERC20("Token0", "TKN0", 18);
        mockToken1 = new MockERC20("Token1", "TKN1", 6);
        mockRegistry = new MockRegistry();
        
        // Setup mock pair
        mockPair.setTokens(token0, token1);
        mockPair.setReserves(RESERVE0, RESERVE1, BLOCK_TIMESTAMP);
        
        // Setup mock factory
        mockFactory.setPair(token0, token1, pair);
        
        // Deploy price oracle with mock factory and registry
        priceOracle = new UniswapV2PriceOracle(address(mockFactory), address(mockRegistry));
        
        // Setup mock pair contract at the pair address
        vm.etch(pair, address(mockPair).code);
    }
    
    // ============ HELPER FUNCTIONS ============
    
    function _setupMockPair() internal {
        // Mock the pair contract calls
        vm.mockCall(
            pair,
            abi.encodeWithSelector(IUniswapV2Pair.getReserves.selector),
            abi.encode(RESERVE0, RESERVE1, BLOCK_TIMESTAMP)
        );
        
        vm.mockCall(
            pair,
            abi.encodeWithSelector(IUniswapV2Pair.token0.selector),
            abi.encode(token0)
        );
        
        vm.mockCall(
            pair,
            abi.encodeWithSelector(IUniswapV2Pair.token1.selector),
            abi.encode(token1)
        );
    }
    
    function _setupMockTokens() internal {
        // Mock token decimals
        vm.mockCall(
            token0,
            abi.encodeWithSelector(IERC20.decimals.selector),
            abi.encode(18)
        );
        
        vm.mockCall(
            token1,
            abi.encodeWithSelector(IERC20.decimals.selector),
            abi.encode(6)
        );
    }
    
    // ============ TESTS ============
    
    // ============ STABLECOIN PRICE TESTS ============
    
    function testGetPriceInUSDC() public {
        _setupMockPair();
        _setupMockTokens();
        
        // Setup mock factory to return pair for token0 and USDC
        mockFactory.setPair(token0, mockRegistry.MOCK_USDC(), pair);
        
        uint256 amount = 1e18; // 1 token0 (18 decimals)
        
        (uint256 price, address retrievedPair) = priceOracle.getPriceInUSDC(token0, amount);
        
        assertEq(retrievedPair, pair);
        assertGt(price, 0);
        // Should get the same result as getPriceFromTokens
        assertEq(price, 2e6); // Raw price in USDC decimals (6)
    }
    
    function testGetPriceInUSDT() public {
        _setupMockPair();
        _setupMockTokens();
        
        // Setup mock factory to return pair for token0 and USDT
        mockFactory.setPair(token0, mockRegistry.MOCK_USDT(), pair);
        
        uint256 amount = 1e18; // 1 token0 (18 decimals)
        
        (uint256 price, address retrievedPair) = priceOracle.getPriceInUSDT(token0, amount);
        
        assertEq(retrievedPair, pair);
        assertGt(price, 0);
        // Should get the same result as getPriceFromTokens
        assertEq(price, 2e6); // Raw price in USDT decimals (6)
    }
    
    function testGetPriceInUSDCNonExistentPair() public {
        _setupMockPair();
        _setupMockTokens();
        
        // Don't setup pair for token0 and USDC - should fail
        uint256 amount = 1e18;
        
        vm.expectRevert("Pair does not exist");
        priceOracle.getPriceInUSDC(token0, amount);
    }
    
    function testGetPriceInUSDTNonExistentPair() public {
        _setupMockPair();
        _setupMockTokens();
        
        // Don't setup pair for token0 and USDT - should fail
        uint256 amount = 1e18;
        
        vm.expectRevert("Pair does not exist");
        priceOracle.getPriceInUSDT(token0, amount);
    }
}

// ============ MOCK CONTRACTS ============

contract MockUniswapV2Factory {
    mapping(address => mapping(address => address)) public pairs;
    
    function setPair(address tokenA, address tokenB, address pair) external {
        pairs[tokenA][tokenB] = pair;
        pairs[tokenB][tokenA] = pair;
    }
    
    function getPair(address tokenA, address tokenB) external view returns (address pair) {
        return pairs[tokenA][tokenB];
    }
}

contract MockUniswapV2Pair {
    address public token0;
    address public token1;
    uint112 public reserve0;
    uint112 public reserve1;
    uint32 public blockTimestampLast;
    
    function setTokens(address _token0, address _token1) external {
        token0 = _token0;
        token1 = _token1;
    }
    
    function setReserves(uint112 _reserve0, uint112 _reserve1, uint32 _blockTimestamp) external {
        reserve0 = _reserve0;
        reserve1 = _reserve1;
        blockTimestampLast = _blockTimestamp;
    }
    
    function getReserves() external view returns (uint112, uint112, uint32) {
        return (reserve0, reserve1, blockTimestampLast);
    }
}

contract MockERC20 {
    string public name;
    string public symbol;
    uint8 public decimals;
    
    constructor(string memory _name, string memory _symbol, uint8 _decimals) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
    }
}

contract MockRegistry {
    struct ChainAddresses {
        address aavePool;
        address morphoLens;
        address compoundComptroller;
        address usdc;
        address usdt;
        address weth;
        address wbtc;
    }
    
    // Mock addresses for testing
    address public constant MOCK_USDC = address(0x1111111111111111111111111111111111111111);
    address public constant MOCK_USDT = address(0x2222222222222222222222222222222222222222);
    address public constant MOCK_WETH = address(0x3333333333333333333333333333333333333333);
    address public constant MOCK_WBTC = address(0x4444444444444444444444444444444444444444);
    
    function getAddressesForChain(uint256 /* chainId */) external pure returns (ChainAddresses memory addresses) {
        // Return mock addresses for any chain ID
        addresses = ChainAddresses({
            aavePool: address(0),
            morphoLens: address(0),
            compoundComptroller: address(0),
            usdc: MOCK_USDC,
            usdt: MOCK_USDT,
            weth: MOCK_WETH,
            wbtc: MOCK_WBTC
        });
    }
}
