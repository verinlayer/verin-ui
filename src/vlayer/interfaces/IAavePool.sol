// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title IAavePool
 * @author Aave
 * @notice Minimal interface for Aave Pool containing only functions used in the codebase
 */
interface IAavePool {
  /**
   * @notice Returns the aToken address of a reserve.
   * @param asset The address of the underlying asset of the reserve
   * @return The address of the aToken
   */
  function getReserveAToken(address asset) external view returns (address);

  /**
   * @notice Returns the variableDebtToken address of a reserve.
   * @param asset The address of the underlying asset of the reserve
   * @return The address of the variableDebtToken
   */
  function getReserveVariableDebtToken(address asset) external view returns (address);
}