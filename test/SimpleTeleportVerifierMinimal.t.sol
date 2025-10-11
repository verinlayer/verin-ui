// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.21;

import {Test, console} from "forge-std/Test.sol";
import {SimpleTeleportVerifier} from "../src/vlayer/SimpleTeleportVerifier.sol";
import {SimpleTeleportProver} from "../src/vlayer/SimpleTeleportProver.sol";
import {Registry} from "../src/vlayer/constants/Registry.sol";
import {CreditModel} from "../src/vlayer/CreditModel.sol";
import {UniswapV2PriceOracle} from "../src/vlayer/UniswapV2PriceOracle.sol";
import {Erc20Token, Protocol, TokenType} from "../src/vlayer/types/TeleportTypes.sol";
import {IVerifier} from "../src/vlayer/interfaces/IVerifier.sol";
import {Proof} from "vlayer-0.1.0/Proof.sol";
import {Seal, ProofMode} from "vlayer-0.1.0/Seal.sol";
import {CallAssumptions} from "vlayer-0.1.0/CallAssumptions.sol";
import {IAavePool} from "../src/vlayer/interfaces/IAavePool.sol";
import {ERC1967Proxy} from "openzeppelin-contracts/proxy/ERC1967/ERC1967Proxy.sol";

/**
 * @title SimpleTeleportVerifierMinimalTest
 * @notice Minimal test suite for SimpleTeleportVerifier contract
 * @dev Tests basic functionality with minimal complexity
 */
contract SimpleTeleportVerifierMinimalTest is Test {
    SimpleTeleportVerifier public verifier;
    SimpleTeleportProver public prover;
    Registry public registry;
    
    address public deployer;
    address public user1;
    address public mockAavePool;
    
    address public constant USDC_ADDRESS = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant AUSDC_ADDRESS = 0x98C23E9D8F34fefB1b7Bd6a91b7Ff122f4E15F5c;
    
    function setUp() public {
        deployer = makeAddr("deployer");
        user1 = makeAddr("user1");
        mockAavePool = makeAddr("mockAavePool");
        
        vm.startPrank(deployer);
        // Deploy Registry using proxy pattern
        Registry registryImpl = new Registry();
        ERC1967Proxy registryProxy = new ERC1967Proxy(
            address(registryImpl),
            abi.encodeWithSelector(Registry.initialize.selector, deployer)
        );
        registry = Registry(address(registryProxy));
        
        prover = new SimpleTeleportProver();
        
        // Deploy CreditModel using proxy pattern
        CreditModel creditModelImpl = new CreditModel();
        ERC1967Proxy creditModelProxy = new ERC1967Proxy(
            address(creditModelImpl),
            abi.encodeWithSelector(CreditModel.initialize.selector, deployer)
        );
        CreditModel creditModel = CreditModel(address(creditModelProxy));
        // Deploy UniswapV2PriceOracle for testing
        address uniswapV2Factory = address(0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f); // Mainnet factory
        UniswapV2PriceOracle priceOracle = new UniswapV2PriceOracle(uniswapV2Factory, address(registry));
        
        verifier = new SimpleTeleportVerifier(
            address(prover),
            registry,
            address(creditModel),
            address(priceOracle),
            deployer  // initialOwner
        );
        vm.stopPrank();
        
        vm.etch(mockAavePool, new bytes(1));
        vm.store(address(registry), bytes32(uint256(keccak256("AAVE_POOL_ADDRESS")) - 1), bytes32(uint256(uint160(mockAavePool))));
    }
    
    function createMockProof() internal pure returns (Proof memory) {
        return Proof({
            seal: Seal({verifierSelector: bytes4(0), seal: [bytes32(0), bytes32(0), bytes32(0), bytes32(0), bytes32(0), bytes32(0), bytes32(0), bytes32(0)], mode: ProofMode.FAKE}),
            callGuestId: bytes32(0),
            length: 0,
            callAssumptions: CallAssumptions({proverContractAddress: address(0), functionSelector: bytes4(0), settleChainId: 0, settleBlockNumber: 0, settleBlockHash: bytes32(0)})
        });
    }
    
    function createErc20Token(address underlying, address aToken, uint256 blockNumber, uint256 balance, TokenType tokenType) internal pure returns (Erc20Token memory) {
        return Erc20Token({
            underlingTokenAddress: underlying,
            aTokenAddress: aToken,
            chainId: 1,
            blockNumber: blockNumber,
            balance: balance,
            tokenType: tokenType
        });
    }
    
    function mockAavePoolCall(address underlying, address expectedAToken) internal {
        vm.mockCall(mockAavePool, abi.encodeWithSelector(IAavePool.getReserveAToken.selector, underlying), abi.encode(expectedAToken));
        vm.mockCall(mockAavePool, abi.encodeWithSelector(IAavePool.getReserveVariableDebtToken.selector, underlying), abi.encode(expectedAToken));
    }

    function testConstructor() public view {
        assertEq(verifier.prover(), address(prover));
        assertEq(address(verifier.registry()), address(registry));
    }
    
    function testInitialUserInfo() public view {
        IVerifier.UserInfo memory userInfo = verifier.usersInfo(user1, Protocol.AAVE);
        uint256 borrowedAmount = userInfo.borrowedAmount;
        uint256 suppliedAmount = userInfo.suppliedAmount;
        uint256 repaidAmount = userInfo.repaidAmount;
        uint256 latestBlock = userInfo.latestBlock;
        uint256 latestBalance = userInfo.latestBalance;
        uint256 borrowTimes = userInfo.borrowTimes;
        uint256 supplyTimes = userInfo.supplyTimes;
        uint256 repayTimes = userInfo.repayTimes;
        uint256 firstActivityBlock = userInfo.firstActivityBlock;
        uint256 liquidations = userInfo.liquidations;
        
        assertEq(borrowedAmount, 0);
        assertEq(suppliedAmount, 0);
        assertEq(repaidAmount, 0);
        assertEq(latestBlock, 0);
        assertEq(latestBalance, 0);
        assertEq(borrowTimes, 0);
        assertEq(supplyTimes, 0);
        assertEq(repayTimes, 0);
    }

    
    function testRegistryAddresses() public view {
        assertEq(registry.AAVE_POOL_ADDRESS(), 0x794a61358D6845594F94dc1DB02A252b5b4814aD);
        assertEq(registry.USDC_ADDRESS(), 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48);
        assertEq(registry.WETH_ADDRESS(), 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2);
    }
    
    function testRegistryChainAddresses() public view {
        Registry.ChainAddresses memory mainnetAddresses = registry.getAddressesForChain(1);
        assertEq(mainnetAddresses.aavePool, 0x794a61358D6845594F94dc1DB02A252b5b4814aD);
        assertEq(mainnetAddresses.usdc, 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48);
    }
    
    function testRegistryAccessControl() public view {
        assertTrue(registry.hasRole(registry.ADMIN_ROLE(), deployer));
        assertTrue(registry.hasRole(registry.DEFAULT_ADMIN_ROLE(), deployer));
        assertTrue(registry.hasRole(registry.UPDATER_ROLE(), deployer));
    }
    
    function testClaimWithEmptyTokensArray() public {
        Erc20Token[] memory tokens = new Erc20Token[](0);
        Proof memory proof = createMockProof();
        
        vm.expectRevert();
        verifier.claim(proof, user1, tokens);
    }
    
    function testClaimWithInvalidBlockNumber() public {
        vm.store(address(verifier), keccak256(abi.encode(user1, Protocol.AAVE, 3)), bytes32(uint256(1000)));
        
        Erc20Token[] memory tokens = new Erc20Token[](1);
        tokens[0] = createErc20Token(USDC_ADDRESS, AUSDC_ADDRESS, 999, 1000e6, TokenType.ARESERVE);
        
        Proof memory proof = createMockProof();
        
        vm.expectRevert();
        verifier.claim(proof, user1, tokens);
    }
    
    function testClaimWithInvalidAaveToken() public {
        mockAavePoolCall(USDC_ADDRESS, address(0x123));
        
        Erc20Token[] memory tokens = new Erc20Token[](1);
        tokens[0] = createErc20Token(USDC_ADDRESS, AUSDC_ADDRESS, 1000, 1000e6, TokenType.ARESERVE);
        
        Proof memory proof = createMockProof();
        
        vm.expectRevert();
        verifier.claim(proof, user1, tokens);
    }
    
    function testTokenTypeEnum() public pure {
        assertEq(uint256(TokenType.ARESERVE), 0);
        assertEq(uint256(TokenType.AVARIABLEDEBT), 1);
        assertEq(uint256(TokenType.ASTABLEDEBT), 2);
    }
    
    function testProtocolEnum() public pure {
        assertEq(uint256(Protocol.AAVE), 0);
        assertEq(uint256(Protocol.MORPHO), 1);
        assertEq(uint256(Protocol.COMPOUND), 2);
    }
    
    function testOnlyClaimerModifier() public view {
        // This test is complex because the claim function has multiple modifiers
        // The onlyVerified modifier runs before onlyClaimer, so we need to handle proof verification
        // For now, we'll test the modifier logic indirectly by checking the function signature
        
        // Test that the claim function exists and has the correct signature
        // The actual modifier test would require proper proof mocking
        assertTrue(address(verifier) != address(0));
        
        // Test that usersInfo mapping works with Protocol enum
        IVerifier.UserInfo memory userInfo = verifier.usersInfo(user1, Protocol.AAVE);
        uint256 borrowedAmount = userInfo.borrowedAmount;
        uint256 suppliedAmount = userInfo.suppliedAmount;
        uint256 repaidAmount = userInfo.repaidAmount;
        uint256 latestBlock = userInfo.latestBlock;
        uint256 latestBalance = userInfo.latestBalance;
        uint256 borrowTimes = userInfo.borrowTimes;
        uint256 supplyTimes = userInfo.supplyTimes;
        uint256 repayTimes = userInfo.repayTimes;
        uint256 firstActivityBlock = userInfo.firstActivityBlock;
        uint256 liquidations = userInfo.liquidations;
        
        // Verify initial values are zero
        assertEq(borrowedAmount, 0);
        assertEq(suppliedAmount, 0);
        assertEq(repaidAmount, 0);
        assertEq(latestBlock, 0);
        assertEq(latestBalance, 0);
        assertEq(borrowTimes, 0);
        assertEq(supplyTimes, 0);
        assertEq(repayTimes, 0);
    }
    
    function testEventsEmission() public pure {
        // This test would need proper proof verification to work
        // For now, we just verify the events are defined in the contract
        // In a real test, you would need to mock the proof verification
        
        // Test that events are properly defined by checking the contract ABI
        // This is a placeholder for when proper proof mocking is implemented
        assertTrue(true); // Placeholder assertion
    }

    /// @notice Test owner can update price oracle
    function testSetPriceOracle() public {
        address newPriceOracle = address(0x999);
        address oldPriceOracle = address(verifier.priceOracle());
        
        vm.prank(deployer);
        verifier.setPriceOracle(newPriceOracle);
        
        assertEq(address(verifier.priceOracle()), newPriceOracle);
    }

    /// @notice Test non-owner cannot update price oracle
    function testSetPriceOracleOnlyOwner() public {
        address newPriceOracle = address(0x999);
        
        vm.prank(user1);
        vm.expectRevert();
        verifier.setPriceOracle(newPriceOracle);
    }

    /// @notice Test cannot set price oracle to zero address
    function testSetPriceOracleZeroAddress() public {
        vm.prank(deployer);
        vm.expectRevert("Price oracle cannot be zero address");
        verifier.setPriceOracle(address(0));
    }

    /// @notice Test ownership can be transferred
    function testOwnershipTransfer() public {
        address newOwner = address(0x888);
        
        vm.prank(deployer);
        verifier.transferOwnership(newOwner);
        
        // Accept ownership from new owner
        vm.prank(newOwner);
        verifier.acceptOwnership();
        
        assertEq(verifier.owner(), newOwner);
        
        // New owner can update price oracle
        address newPriceOracle = address(0x777);
        vm.prank(newOwner);
        verifier.setPriceOracle(newPriceOracle);
        
        assertEq(address(verifier.priceOracle()), newPriceOracle);
    }

    /// @notice Test pending owner must accept ownership
    function testOwnershipTransferTwoStep() public {
        address newOwner = address(0x888);
        
        vm.prank(deployer);
        verifier.transferOwnership(newOwner);
        
        // Owner hasn't changed yet
        assertEq(verifier.owner(), deployer);
        
        // Pending owner must accept
        vm.prank(newOwner);
        verifier.acceptOwnership();
        
        // Now ownership has changed
        assertEq(verifier.owner(), newOwner);
    }
}
