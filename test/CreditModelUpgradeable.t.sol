// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {Test, console} from "forge-std/Test.sol";
import {CreditModel} from "../src/vlayer/CreditModel.sol";
import {IVerifier} from "../src/vlayer/interfaces/IVerifier.sol";
import {ERC1967Proxy} from "openzeppelin-contracts/proxy/ERC1967/ERC1967Proxy.sol";

/// @title CreditModelUpgradeableTest
/// @notice Tests for the upgradeable CreditModel contract
contract CreditModelUpgradeableTest is Test {
    CreditModel public creditModel;
    address public owner;
    address public user;

    function setUp() public {
        owner = address(this);
        user = address(0x123);

        // Deploy implementation
        CreditModel implementation = new CreditModel();

        // Deploy proxy with initializer
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(implementation),
            abi.encodeWithSelector(CreditModel.initialize.selector, owner)
        );

        // Wrap proxy in CreditModel interface
        creditModel = CreditModel(address(proxy));
    }

    function testInitialization() public {
        assertEq(creditModel.owner(), owner);
    }

    function testCannotInitializeWithZeroAddress() public {
        // Deploy implementation
        CreditModel implementation = new CreditModel();

        // Try to deploy proxy with zero address should fail
        vm.expectRevert(
            abi.encodeWithSelector(
                CreditModel.OwnableInvalidOwner.selector,
                address(0)
            )
        );
        new ERC1967Proxy(
            address(implementation),
            abi.encodeWithSelector(CreditModel.initialize.selector, address(0))
        );
    }

    function testOwnershipTransfer() public {
        creditModel.transferOwnership(user);
        assertEq(creditModel.owner(), user);
    }

    function testOnlyOwnerCanTransferOwnership() public {
        vm.prank(user);
        vm.expectRevert(
            abi.encodeWithSelector(
                CreditModel.OwnableUnauthorizedAccount.selector,
                user
            )
        );
        creditModel.transferOwnership(user);
    }

    function testComputeScoreAndTier() public {
        // Create mock user data
        IVerifier.UserInfo memory userInfo = IVerifier.UserInfo({
            borrowedAmount: 1000e6,      // $1,000 borrowed
            suppliedAmount: 5000e6,      // $5,000 supplied
            repaidAmount: 950e6,         // $950 repaid (95% repay rate)
            latestBlock: 2000000,
            latestBalance: 4050e6,       // Current balance
            borrowTimes: 5,
            supplyTimes: 10,
            repayTimes: 4,
            firstActivityBlock: 1000000,
            liquidations: 0
        });

        uint256 currentBlock = 2500000;

        // Compute score and tier
        (uint256 score, CreditModel.Tier tier) = creditModel.computeScoreAndTier(
            userInfo,
            currentBlock
        );

        console.log("Credit Score:", score);
        console.log("Credit Tier:", uint256(tier));

        // Basic assertions
        assertTrue(score > 0 && score <= 100, "Score should be between 0 and 100");
        assertTrue(
            tier == CreditModel.Tier.A ||
            tier == CreditModel.Tier.B ||
            tier == CreditModel.Tier.C ||
            tier == CreditModel.Tier.D,
            "Invalid tier"
        );
    }

    function testScoreToTier() public {
        assertEq(uint256(creditModel.scoreToTier(90)), uint256(CreditModel.Tier.A));
        assertEq(uint256(creditModel.scoreToTier(85)), uint256(CreditModel.Tier.A));
        assertEq(uint256(creditModel.scoreToTier(75)), uint256(CreditModel.Tier.B));
        assertEq(uint256(creditModel.scoreToTier(70)), uint256(CreditModel.Tier.B));
        assertEq(uint256(creditModel.scoreToTier(60)), uint256(CreditModel.Tier.C));
        assertEq(uint256(creditModel.scoreToTier(50)), uint256(CreditModel.Tier.C));
        assertEq(uint256(creditModel.scoreToTier(40)), uint256(CreditModel.Tier.D));
        assertEq(uint256(creditModel.scoreToTier(0)), uint256(CreditModel.Tier.D));
    }

    function testLiquidationPenalty() public {
        // User with liquidation should get lowest score
        IVerifier.UserInfo memory userInfo = IVerifier.UserInfo({
            borrowedAmount: 1000e6,
            suppliedAmount: 5000e6,
            repaidAmount: 950e6,
            latestBlock: 2000000,
            latestBalance: 4050e6,
            borrowTimes: 5,
            supplyTimes: 10,
            repayTimes: 4,
            firstActivityBlock: 1000000,
            liquidations: 1  // Has liquidation
        });

        uint256 currentBlock = 2500000;

        (uint256 score, CreditModel.Tier tier) = creditModel.computeScoreAndTier(
            userInfo,
            currentBlock
        );

        assertEq(score, 10, "Score should be 10 for liquidation");
        assertEq(uint256(tier), uint256(CreditModel.Tier.D), "Tier should be D");
    }

    function testUpgrade() public {
        // Deploy new implementation
        CreditModel newImplementation = new CreditModel();

        // Get current owner before upgrade
        address currentOwner = creditModel.owner();

        // Upgrade to new implementation
        creditModel.upgradeToAndCall(address(newImplementation), "");

        // Verify owner persisted after upgrade
        assertEq(creditModel.owner(), currentOwner, "Owner should persist after upgrade");

        // Verify functionality still works
        assertEq(uint256(creditModel.scoreToTier(90)), uint256(CreditModel.Tier.A));
    }

    function testOnlyOwnerCanUpgrade() public {
        CreditModel newImplementation = new CreditModel();

        vm.prank(user);
        vm.expectRevert(
            abi.encodeWithSelector(
                CreditModel.OwnableUnauthorizedAccount.selector,
                user
            )
        );
        creditModel.upgradeToAndCall(address(newImplementation), "");
    }

    function testRenounceOwnership() public {
        creditModel.renounceOwnership();
        assertEq(creditModel.owner(), address(0), "Owner should be zero address");

        // After renouncing, cannot upgrade
        CreditModel newImplementation = new CreditModel();
        vm.expectRevert(
            abi.encodeWithSelector(
                CreditModel.OwnableUnauthorizedAccount.selector,
                address(this)
            )
        );
        creditModel.upgradeToAndCall(address(newImplementation), "");
    }
}

/// @title CreditModelV2Mock
/// @notice Mock V2 implementation for testing upgrades with new features
contract CreditModelV2Mock is CreditModel {
    // New state variable (added at the end to preserve storage layout)
    uint256 public newFeature;

    // New function in V2
    function setNewFeature(uint256 value) external onlyOwner {
        newFeature = value;
    }

    // New function to test V2 functionality
    function getVersion() external pure returns (string memory) {
        return "v2.0.0";
    }
}

/// @title CreditModelUpgradeToV2Test
/// @notice Tests upgrading from V1 to V2 with new features
contract CreditModelUpgradeToV2Test is Test {
    CreditModel public creditModel;
    address public owner;

    function setUp() public {
        owner = address(this);

        // Deploy V1
        CreditModel implementation = new CreditModel();
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(implementation),
            abi.encodeWithSelector(CreditModel.initialize.selector, owner)
        );
        creditModel = CreditModel(address(proxy));
    }

    function testUpgradeToV2() public {
        // Test V1 functionality
        assertEq(uint256(creditModel.scoreToTier(90)), uint256(CreditModel.Tier.A));

        // Deploy V2 implementation
        CreditModelV2Mock v2Implementation = new CreditModelV2Mock();

        // Upgrade to V2
        creditModel.upgradeToAndCall(address(v2Implementation), "");

        // Cast to V2
        CreditModelV2Mock creditModelV2 = CreditModelV2Mock(address(creditModel));

        // Test that V1 functionality still works
        assertEq(uint256(creditModelV2.scoreToTier(90)), uint256(CreditModel.Tier.A));

        // Test new V2 functionality
        assertEq(creditModelV2.getVersion(), "v2.0.0");

        // Test new state variable
        creditModelV2.setNewFeature(42);
        assertEq(creditModelV2.newFeature(), 42);

        // Verify owner persisted
        assertEq(creditModelV2.owner(), owner);
    }
}
