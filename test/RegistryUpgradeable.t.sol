// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.21;

import {Test, console} from "forge-std/Test.sol";
import {Registry} from "../src/vlayer/constants/Registry.sol";
import {IRegistry} from "../src/vlayer/interfaces/IRegistry.sol";
import {ERC1967Proxy} from "openzeppelin-contracts/proxy/ERC1967/ERC1967Proxy.sol";

/// @title RegistryUpgradeableTest
/// @notice Tests for the upgradeable Registry contract
contract RegistryUpgradeableTest is Test {
    Registry public registry;
    address public admin;
    address public updater;
    address public user;

    function setUp() public {
        admin = address(this);
        updater = address(0x456);
        user = address(0x789);

        // Deploy implementation
        Registry implementation = new Registry();

        // Deploy proxy with initializer
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(implementation),
            abi.encodeWithSelector(Registry.initialize.selector, admin)
        );

        // Wrap proxy in Registry interface
        registry = Registry(address(proxy));
    }

    /// @notice Test basic initialization
    function testInitialization() public {
        // Verify admin has all roles
        assertTrue(registry.hasRole(registry.DEFAULT_ADMIN_ROLE(), admin));
        assertTrue(registry.hasRole(registry.ADMIN_ROLE(), admin));
        assertTrue(registry.hasRole(registry.UPDATER_ROLE(), admin));
    }

    /// @notice Test cannot initialize with zero address
    function testCannotInitializeWithZeroAddress() public {
        // Deploy implementation
        Registry implementation = new Registry();

        // Try to deploy proxy with zero address should fail
        vm.expectRevert("Admin cannot be zero address");
        new ERC1967Proxy(
            address(implementation),
            abi.encodeWithSelector(Registry.initialize.selector, address(0))
        );
    }

    /// @notice Test cannot initialize twice
    function testCannotInitializeTwice() public {
        vm.expectRevert();
        registry.initialize(admin);
    }

    /// @notice Test getting addresses for mainnet (chain ID 1)
    function testGetAddressesForMainnet() public {
        IRegistry.ChainAddresses memory addresses = registry.getAddressesForChain(1);
        
        assertEq(addresses.aavePool, registry.AAVE_POOL_ADDRESS());
        assertEq(addresses.usdc, registry.USDC_ADDRESS());
        assertEq(addresses.usdt, registry.USDT_ADDRESS());
        assertEq(addresses.weth, registry.WETH_ADDRESS());
        assertEq(addresses.wbtc, registry.WBTC_ADDRESS());
    }

    /// @notice Test getting addresses for Optimism (chain ID 10)
    function testGetAddressesForOptimism() public {
        IRegistry.ChainAddresses memory addresses = registry.getAddressesForChain(10);
        
        assertEq(addresses.aavePool, registry.AAVE_POOL_ADDRESS());
        assertEq(addresses.usdc, registry.OP_USDC_ADDRESS());
        assertEq(addresses.usdt, registry.OP_USDT_ADDRESS());
        assertEq(addresses.weth, registry.OP_WETH_ADDRESS());
        assertEq(addresses.wbtc, registry.OP_WBTC_ADDRESS());
    }

    /// @notice Test getting addresses for Base (chain ID 8453)
    function testGetAddressesForBase() public {
        IRegistry.ChainAddresses memory addresses = registry.getAddressesForChain(8453);
        
        assertEq(addresses.aavePool, registry.AAVE_POOL_ADDRESS());
        assertEq(addresses.usdc, registry.BASE_USDC_ADDRESS());
        assertEq(addresses.usdt, registry.BASE_USDT_ADDRESS());
        assertEq(addresses.weth, registry.BASE_WETH_ADDRESS());
        assertEq(addresses.wbtc, registry.BASE_WBTC_ADDRESS());
    }

    /// @notice Test getting addresses for unsupported chain fails
    function testGetAddressesForUnsupportedChain() public {
        vm.expectRevert("Unsupported chain ID");
        registry.getAddressesForChain(999);
    }

    /// @notice Test getting Aave pool address
    function testGetAavePoolAddress() public {
        address aavePool = registry.getAavePoolAddress(1);
        assertEq(aavePool, registry.AAVE_POOL_ADDRESS());
    }

    /// @notice Test getting Morpho lens address
    function testGetMorphoLensAddress() public {
        address morphoLens = registry.getMorphoLensAddress(1);
        assertEq(morphoLens, registry.MORPHO_LENS_ADDRESS());
    }

    /// @notice Test getting Compound comptroller address
    function testGetCompoundComptrollerAddress() public {
        address comptroller = registry.getCompoundComptrollerAddress(1);
        assertEq(comptroller, registry.COMPOUND_COMPTROLLER_ADDRESS());
    }

    /// @notice Test updating chain addresses as admin
    function testUpdateChainAddressesAsAdmin() public {
        IRegistry.ChainAddresses memory newAddresses = IRegistry.ChainAddresses({
            aavePool: address(0x111),
            morphoLens: address(0x222),
            compoundComptroller: address(0x333),
            usdc: address(0x444),
            usdt: address(0x555),
            weth: address(0x666),
            wbtc: address(0x777)
        });

        // Expect event emission
        vm.expectEmit(true, false, false, true);
        emit IRegistry.ChainAddressesUpdated(1, newAddresses);
        
        registry.updateChainAddresses(1, newAddresses);

        IRegistry.ChainAddresses memory updatedAddresses = registry.getAddressesForChain(1);
        assertEq(updatedAddresses.aavePool, address(0x111));
        assertEq(updatedAddresses.usdc, address(0x444));
    }

    /// @notice Test updating chain addresses as non-admin fails
    function testUpdateChainAddressesAsNonAdminFails() public {
        IRegistry.ChainAddresses memory newAddresses = IRegistry.ChainAddresses({
            aavePool: address(0x111),
            morphoLens: address(0x222),
            compoundComptroller: address(0x333),
            usdc: address(0x444),
            usdt: address(0x555),
            weth: address(0x666),
            wbtc: address(0x777)
        });

        vm.prank(user);
        vm.expectRevert();
        registry.updateChainAddresses(1, newAddresses);
    }

    /// @notice Test updating token addresses as updater
    function testUpdateTokenAddressesAsUpdater() public {
        // Grant updater role to updater address
        registry.grantRole(registry.UPDATER_ROLE(), updater);

        address newUsdc = address(0x888);
        address newUsdt = address(0x999);
        address newWeth = address(0xAAA);
        address newWbtc = address(0xBBB);

        // Expect event emission
        vm.expectEmit(true, false, false, true);
        emit IRegistry.TokenAddressesUpdated(1, newUsdc, newUsdt, newWeth, newWbtc);

        vm.prank(updater);
        registry.updateTokenAddresses(1, newUsdc, newUsdt, newWeth, newWbtc);

        IRegistry.ChainAddresses memory addresses = registry.getAddressesForChain(1);
        assertEq(addresses.usdc, newUsdc);
        assertEq(addresses.usdt, newUsdt);
        assertEq(addresses.weth, newWeth);
        assertEq(addresses.wbtc, newWbtc);
    }

    /// @notice Test updating token addresses as non-updater fails
    function testUpdateTokenAddressesAsNonUpdaterFails() public {
        vm.prank(user);
        vm.expectRevert();
        registry.updateTokenAddresses(1, address(0x888), address(0x999), address(0xAAA), address(0xBBB));
    }

    /// @notice Test updating protocol addresses as admin
    function testUpdateProtocolAddressesAsAdmin() public {
        address newAavePool = address(0xCCC);
        address newMorphoLens = address(0xDDD);
        address newComptroller = address(0xEEE);

        // Expect event emission
        vm.expectEmit(true, false, false, true);
        emit IRegistry.ProtocolAddressesUpdated(1, newAavePool, newMorphoLens, newComptroller);

        registry.updateProtocolAddresses(1, newAavePool, newMorphoLens, newComptroller);

        IRegistry.ChainAddresses memory addresses = registry.getAddressesForChain(1);
        assertEq(addresses.aavePool, newAavePool);
        assertEq(addresses.morphoLens, newMorphoLens);
        assertEq(addresses.compoundComptroller, newComptroller);
    }

    /// @notice Test updating protocol addresses as non-admin fails
    function testUpdateProtocolAddressesAsNonAdminFails() public {
        vm.prank(user);
        vm.expectRevert();
        registry.updateProtocolAddresses(1, address(0xCCC), address(0xDDD), address(0xEEE));
    }

    /// @notice Test granting and revoking roles
    function testGrantAndRevokeRoles() public {
        // Grant updater role
        registry.grantRole(registry.UPDATER_ROLE(), user);
        assertTrue(registry.hasRole(registry.UPDATER_ROLE(), user));

        // Revoke updater role
        registry.revokeRole(registry.UPDATER_ROLE(), user);
        assertFalse(registry.hasRole(registry.UPDATER_ROLE(), user));
    }

    /// @notice Test upgrade preserves storage
    function testUpgradePreservesStorage() public {
        // Deploy new implementation
        Registry newImplementation = new Registry();

        // Store some data before upgrade
        IRegistry.ChainAddresses memory addresses = registry.getAddressesForChain(1);
        
        // Upgrade to new implementation
        registry.upgradeToAndCall(address(newImplementation), "");

        // Verify data persisted after upgrade
        IRegistry.ChainAddresses memory addressesAfter = registry.getAddressesForChain(1);
        assertEq(addressesAfter.aavePool, addresses.aavePool);
        assertEq(addressesAfter.usdc, addresses.usdc);
        
        // Verify roles persisted
        assertTrue(registry.hasRole(registry.ADMIN_ROLE(), admin));
    }

    /// @notice Test only admin can upgrade
    function testOnlyAdminCanUpgrade() public {
        Registry newImplementation = new Registry();

        vm.prank(user);
        vm.expectRevert();
        registry.upgradeToAndCall(address(newImplementation), "");
    }

    /// @notice Test upgrade functionality still works after upgrade
    function testFunctionalityWorksAfterUpgrade() public {
        // Deploy new implementation
        Registry newImplementation = new Registry();

        // Upgrade
        registry.upgradeToAndCall(address(newImplementation), "");

        // Verify functionality still works
        IRegistry.ChainAddresses memory addresses = registry.getAddressesForChain(1);
        assertEq(addresses.usdc, registry.USDC_ADDRESS());
        
        // Test update still works
        registry.updateTokenAddresses(1, address(0x123), address(0x456), address(0x789), address(0xABC));
        IRegistry.ChainAddresses memory updatedAddresses = registry.getAddressesForChain(1);
        assertEq(updatedAddresses.usdc, address(0x123));
    }
}

/// @title RegistryV2Mock
/// @notice Mock V2 implementation for testing upgrades with new features
contract RegistryV2Mock is Registry {
    // New state variable (added at the end to preserve storage layout)
    uint256 public newFeature;

    // New function in V2
    function setNewFeature(uint256 value) external onlyRole(ADMIN_ROLE) {
        newFeature = value;
    }

    // New function to test V2 functionality
    function getVersion() external pure returns (string memory) {
        return "v2.0.0";
    }

    // New function to get all supported chains
    function getSupportedChains() external pure returns (uint256[] memory) {
        uint256[] memory chains = new uint256[](3);
        chains[0] = 1;      // Mainnet
        chains[1] = 10;     // Optimism
        chains[2] = 8453;   // Base
        return chains;
    }
}

/// @title RegistryUpgradeToV2Test
/// @notice Tests upgrading from V1 to V2 with new features
contract RegistryUpgradeToV2Test is Test {
    Registry public registry;
    address public admin;

    function setUp() public {
        admin = address(this);

        // Deploy V1
        Registry implementation = new Registry();
        ERC1967Proxy proxy = new ERC1967Proxy(
            address(implementation),
            abi.encodeWithSelector(Registry.initialize.selector, admin)
        );
        registry = Registry(address(proxy));
    }

    /// @notice Test upgrade to V2 with new features
    function testUpgradeToV2() public {
        // Test V1 functionality
        IRegistry.ChainAddresses memory addresses = registry.getAddressesForChain(1);
        assertEq(addresses.usdc, registry.USDC_ADDRESS());

        // Deploy V2 implementation
        RegistryV2Mock v2Implementation = new RegistryV2Mock();

        // Upgrade to V2
        registry.upgradeToAndCall(address(v2Implementation), "");

        // Cast to V2
        RegistryV2Mock registryV2 = RegistryV2Mock(address(registry));

        // Test that V1 functionality still works
        IRegistry.ChainAddresses memory addressesV2 = registryV2.getAddressesForChain(1);
        assertEq(addressesV2.usdc, registryV2.USDC_ADDRESS());

        // Test new V2 functionality
        assertEq(registryV2.getVersion(), "v2.0.0");

        // Test new state variable
        registryV2.setNewFeature(42);
        assertEq(registryV2.newFeature(), 42);

        // Test new function
        uint256[] memory chains = registryV2.getSupportedChains();
        assertEq(chains.length, 3);
        assertEq(chains[0], 1);
        assertEq(chains[1], 10);
        assertEq(chains[2], 8453);

        // Verify roles persisted
        assertTrue(registryV2.hasRole(registryV2.ADMIN_ROLE(), admin));
    }

    /// @notice Test V2 preserves all V1 data
    function testV2PreservesV1Data() public {
        // Update some data in V1
        registry.updateTokenAddresses(1, address(0x111), address(0x222), address(0x333), address(0x444));
        
        // Verify update worked
        IRegistry.ChainAddresses memory addressesBefore = registry.getAddressesForChain(1);
        assertEq(addressesBefore.usdc, address(0x111));

        // Upgrade to V2
        RegistryV2Mock v2Implementation = new RegistryV2Mock();
        registry.upgradeToAndCall(address(v2Implementation), "");
        RegistryV2Mock registryV2 = RegistryV2Mock(address(registry));

        // Verify data persisted
        IRegistry.ChainAddresses memory addressesAfter = registryV2.getAddressesForChain(1);
        assertEq(addressesAfter.usdc, address(0x111));
        assertEq(addressesAfter.usdt, address(0x222));
        assertEq(addressesAfter.weth, address(0x333));
        assertEq(addressesAfter.wbtc, address(0x444));
    }
}

