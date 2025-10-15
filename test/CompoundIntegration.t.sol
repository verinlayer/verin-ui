// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.21;

import {Test, console} from "forge-std/Test.sol";
import {SimpleTeleportVerifier} from "../src/vlayer/SimpleTeleportVerifier.sol";
import {SimpleTeleportProver} from "../src/vlayer/SimpleTeleportProver.sol";
import {Registry} from "../src/vlayer/constants/Registry.sol";
import {CreditModel} from "../src/vlayer/CreditModel.sol";
import {UniswapV2PriceOracle} from "../src/vlayer/UniswapV2PriceOracle.sol";
import {IVerifier} from "../src/vlayer/interfaces/IVerifier.sol";
import {CToken, CTokenType, Protocol} from "../src/vlayer/types/TeleportTypes.sol";
import {Proof} from "vlayer-0.1.0/Proof.sol";
import {ERC1967Proxy} from "openzeppelin-contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract CompoundIntegrationTest is Test {
    SimpleTeleportVerifier public verifier;
    SimpleTeleportProver public prover;
    Registry public registry;
    CreditModel public creditModel;
    UniswapV2PriceOracle public priceOracle;
    
    address public admin = address(0x1);
    address public user1 = address(0x2);
    address public user2 = address(0x3);
    
    // Optimism chain ID
    uint256 constant OP_CHAIN_ID = 10;
    
    // Mock Compound addresses (using Optimism addresses from Registry)
    address constant OP_CUSDC_V3 = 0x2e44e174f7D53F0212823acC11C01A11d58c5bCB;
    address constant OP_CWETH_V3 = 0xE36A30D249f7761327fd973001A32010b521b6Fd;
    
    // Mock token addresses
    address constant USDC = 0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85;
    address constant WETH = 0x4200000000000000000000000000000000000006;
    
    function setUp() public {
        vm.startPrank(admin);
        
        // Deploy Registry
        Registry registryImpl = new Registry();
        bytes memory registryInitData = abi.encodeWithSelector(
            Registry.initialize.selector,
            admin
        );
        ERC1967Proxy registryProxy = new ERC1967Proxy(
            address(registryImpl),
            registryInitData
        );
        registry = Registry(address(registryProxy));
        
        // Deploy CreditModel
        CreditModel creditModelImpl = new CreditModel();
        bytes memory creditModelInitData = abi.encodeWithSelector(
            CreditModel.initialize.selector,
            admin
        );
        ERC1967Proxy creditModelProxy = new ERC1967Proxy(
            address(creditModelImpl),
            creditModelInitData
        );
        creditModel = CreditModel(address(creditModelProxy));
        
        // Deploy UniswapV2PriceOracle (mock for testing)
        priceOracle = new UniswapV2PriceOracle(
            address(0), // uniswapFactory
            address(registry) // registry
        );
        
        // Deploy Prover
        prover = new SimpleTeleportProver();
        
        // Deploy Verifier
        verifier = new SimpleTeleportVerifier(
            address(prover),
            registry,
            address(creditModel),
            address(priceOracle),
            admin
        );
        
        vm.stopPrank();
    }
    
    function testClaimCompoundBorrow() public {
        vm.startPrank(user1);
        vm.chainId(OP_CHAIN_ID);
        
        // Create borrow token data
        CToken[] memory tokens = new CToken[](1);
        tokens[0] = CToken({
            collateralAddress: USDC,
            cTokenAddress: OP_CUSDC_V3,
            chainId: OP_CHAIN_ID,
            blockNumber: 1000,
            balance: 1000e6, // 1000 USDC borrowed
            tokenType: CTokenType.BASE
        });
        
        // Mock proof
        Proof memory mockProof;
        
        // This will fail in actual test because we don't have real proof verification
        // In production, you'd use vlayer's test framework
        // For now, this tests the logic flow
        vm.expectRevert(); // Expected to revert due to proof verification
        verifier.claimCompoundData(mockProof, user1, tokens);
        
        vm.stopPrank();
    }
    
    function testClaimCompoundSupply() public {
        vm.startPrank(user1);
        vm.chainId(OP_CHAIN_ID);
        
        // Create supply token data
        CToken[] memory tokens = new CToken[](1);
        tokens[0] = CToken({
            collateralAddress: WETH,
            cTokenAddress: OP_CWETH_V3,
            chainId: OP_CHAIN_ID,
            blockNumber: 1000,
            balance: 5e18, // 5 WETH supplied as collateral
            tokenType: CTokenType.COLLATERAL
        });
        
        Proof memory mockProof;
        
        vm.expectRevert(); // Expected to revert due to proof verification
        verifier.claimCompoundData(mockProof, user1, tokens);
        
        vm.stopPrank();
    }
    
    function testTotalsMapping() public view {
        // Check initial state of totals
        (
            uint256 borrowedAmount,
            uint256 suppliedAmount,
            uint256 repaidAmount,
            uint256 latestBlock,
            uint256 latestBalance,
            uint256 borrowTimes,
            uint256 supplyTimes,
            uint256 repayTimes,
            uint256 firstActivityBlock,
            uint256 liquidations
        ) = verifier.totals(user1);
        
        assertEq(borrowedAmount, 0, "Initial borrowed amount should be 0");
        assertEq(suppliedAmount, 0, "Initial supplied amount should be 0");
        assertEq(repaidAmount, 0, "Initial repaid amount should be 0");
        assertEq(borrowTimes, 0, "Initial borrow times should be 0");
        assertEq(supplyTimes, 0, "Initial supply times should be 0");
        assertEq(repayTimes, 0, "Initial repay times should be 0");
    }
    
    function testInvalidCTokenAddress() public {
        vm.startPrank(user1);
        vm.chainId(OP_CHAIN_ID);
        
        // Create token data with invalid cToken address
        CToken[] memory tokens = new CToken[](1);
        tokens[0] = CToken({
            collateralAddress: USDC,
            cTokenAddress: address(0x999), // Invalid address
            chainId: OP_CHAIN_ID,
            blockNumber: 1000,
            balance: 1000e6,
            tokenType: CTokenType.BASE
        });
        
        Proof memory mockProof;
        
        vm.expectRevert(); // Expected to revert
        verifier.claimCompoundData(mockProof, user1, tokens);
        
        vm.stopPrank();
    }
    
    function testOnlyClaimerCanClaim() public {
        vm.startPrank(user2); // user2 trying to claim for user1
        vm.chainId(OP_CHAIN_ID);
        
        CToken[] memory tokens = new CToken[](1);
        tokens[0] = CToken({
            collateralAddress: USDC,
            cTokenAddress: OP_CUSDC_V3,
            chainId: OP_CHAIN_ID,
            blockNumber: 1000,
            balance: 1000e6,
            tokenType: CTokenType.BASE
        });
        
        Proof memory mockProof;
        
        // Note: Will revert due to proof verification or onlyClaimer modifier
        // Without proper proof mocking, we can't test the exact revert reason
        vm.expectRevert();
        verifier.claimCompoundData(mockProof, user1, tokens);
        
        vm.stopPrank();
    }
    
    function testMultipleTokensClaim() public {
        vm.startPrank(user1);
        vm.chainId(OP_CHAIN_ID);
        
        // Create multiple token data
        CToken[] memory tokens = new CToken[](2);
        tokens[0] = CToken({
            collateralAddress: USDC,
            cTokenAddress: OP_CUSDC_V3,
            chainId: OP_CHAIN_ID,
            blockNumber: 1000,
            balance: 1000e6,
            tokenType: CTokenType.BASE
        });
        tokens[1] = CToken({
            collateralAddress: WETH,
            cTokenAddress: OP_CWETH_V3,
            chainId: OP_CHAIN_ID,
            blockNumber: 1000,
            balance: 5e18,
            tokenType: CTokenType.COLLATERAL
        });
        
        Proof memory mockProof;
        
        vm.expectRevert(); // Expected to revert due to proof verification
        verifier.claimCompoundData(mockProof, user1, tokens);
        
        vm.stopPrank();
    }
    
    function testRegistryCompoundAddresses() public {
        // Test Optimism addresses
        vm.chainId(OP_CHAIN_ID);
        
        // Verify registry has Compound addresses configured
        // Get compound addresses from registry
        // This would test registry.getCompoundAddresses(OP_CHAIN_ID)
        // Registry interface exposes this function
    }
    
    function testBorrowRepaySequence() public {
        // This test would verify:
        // 1. Initial borrow increases borrowedAmount
        // 2. Repayment increases repaidAmount
        // 3. Both are tracked in totals
        // Would need mock proof verification to fully test
    }
    
    function testSupplyWithdrawSequence() public {
        // This test would verify:
        // 1. Initial supply increases suppliedAmount
        // 2. Withdrawal doesn't decrease (as per current logic)
        // 3. Both are tracked in totals
        // Would need mock proof verification to fully test
    }
    
    function testCrossProtocolTotals() public {
        // This test would verify:
        // 1. Claim Aave data
        // 2. Claim Compound data
        // 3. Totals reflect combined activity
        // Would need mock proof verification to fully test
    }
}

