// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.21;

import {Proof} from "vlayer-0.1.0/Proof.sol";
import {Prover} from "vlayer-0.1.0/Prover.sol";
import {IERC20} from "openzeppelin-contracts/token/ERC20/IERC20.sol";
import {Initializable} from "openzeppelin-contracts/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "openzeppelin-contracts/proxy/utils/UUPSUpgradeable.sol";
import {IProver} from "./interfaces/IProver.sol";
import {Erc20Token, CToken, Protocol, TokenType, CTokenType} from "./types/TeleportTypes.sol";
import {ICToken} from "./interfaces/ICToken.sol";

/// @title SimpleTeleportProver
/// @notice Upgradeable contract for proving DeFi protocol data
/// @dev Uses UUPS upgrade pattern for future contract upgrades
/// @custom:oz-upgrades-from SimpleTeleportProver
contract SimpleTeleportProver is Initializable, UUPSUpgradeable, Prover, IProver {
    // Storage
    address private _owner;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice Initializes the contract
    /// @dev This replaces the constructor for upgradeable contracts
    /// @param initialOwner The address that will be set as the initial owner
    function initialize(address initialOwner) public initializer {
        if (initialOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(initialOwner);
    }

    /// @notice Returns the address of the current owner
    function owner() public view returns (address) {
        return _owner;
    }

    /// @notice Throws if called by any account other than the owner
    modifier onlyOwner() {
        if (owner() != msg.sender) {
            revert OwnableUnauthorizedAccount(msg.sender);
        }
        _;
    }

    /// @notice Transfers ownership of the contract to a new account
    /// @param newOwner The address of the new owner
    function transferOwnership(address newOwner) public onlyOwner {
        if (newOwner == address(0)) {
            revert OwnableInvalidOwner(address(0));
        }
        _transferOwnership(newOwner);
    }

    /// @notice Renounces ownership of the contract
    /// @dev Leaves the contract without an owner, disabling upgrade functionality
    function renounceOwnership() public onlyOwner {
        _transferOwnership(address(0));
    }

    /// @dev Internal function to transfer ownership
    function _transferOwnership(address newOwner) internal {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }

    /// @notice Authorizes an upgrade to a new implementation
    /// @dev Only the owner can authorize upgrades
    /// @param newImplementation Address of the new implementation
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function proveAaveData(address _owner, Erc20Token[] memory tokens)
        external
        returns (Proof memory, address, bytes4, bytes memory)
    {
        for (uint256 i = 0; i < tokens.length; i++) {
            setChain(tokens[i].chainId, tokens[i].blockNumber);
            tokens[i].balance = IERC20(tokens[i].aTokenAddress).balanceOf(_owner);
        }
        bytes memory encodedData = abi.encode(tokens);
        return (proof(), _owner, SimpleTeleportProver.proveAaveData.selector, encodedData);
    }

    function proveCompoundData(address _owner, CToken[] memory tokens)
        external
        returns (Proof memory, address, bytes4, bytes memory)
    {
        for (uint256 i = 0; i < tokens.length; i++) {
            setChain(tokens[i].chainId, tokens[i].blockNumber);
            if(tokens[i].tokenType == CTokenType.BASE) {
                tokens[i].balance = ICToken(tokens[i].cTokenAddress).borrowBalanceOf(_owner);
            } else if(tokens[i].tokenType == CTokenType.COLLATERAL) {
                tokens[i].balance = ICToken(tokens[i].cTokenAddress).userCollateral(_owner, tokens[i].collateralAddress).balance;
            }
        }
        bytes memory encodedData = abi.encode(tokens);
        return (proof(), _owner, SimpleTeleportProver.proveCompoundData.selector, encodedData);
    }

    function proveMorphoData(address _owner, Erc20Token[] memory tokens)
        external
        returns (Proof memory, address, Erc20Token[] memory)
    {
        // TODO: Implement Morpho data proving logic
        return (proof(), _owner, tokens);
    }

    function proveFluidIOData(address _owner, Erc20Token[] memory tokens)
        external
        returns (Proof memory, address, Erc20Token[] memory)
    {
        // TODO: Implement FluidIO data proving logic
        return (proof(), _owner, tokens);
    }

    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[49] private __gap;
}
