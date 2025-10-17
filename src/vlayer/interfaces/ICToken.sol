// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.21;

import {UserCollateral} from "../types/TeleportTypes.sol";


/**
 * @title Compound's Comet Main Interface
 */
interface ICToken {
    function userCollateral(address account, address asset) external view returns (UserCollateral memory);
    function borrowBalanceOf(address account) external view returns (uint256);
    function baseToken() external view returns (address);
}