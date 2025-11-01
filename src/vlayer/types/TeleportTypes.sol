// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.21;
import {Id} from "../interfaces/IMorpho.sol";

struct Erc20Token {
    address underlingTokenAddress;
    address aTokenAddress;
    uint256 chainId;
    uint256 blockNumber;
    uint256 balance;
    TokenType tokenType;
}

struct CToken{
    address collateralAddress;
    address cTokenAddress;
    uint256 chainId;
    uint256 blockNumber;
    uint256 balance;
    CTokenType tokenType;
}


struct MToken {
    Id marketId;
    address morphoAddress;
    uint256 chainId;
    uint256 blockNumber;
    uint256 supplyShares;
    uint128 borrowShares;
    uint128 collateral;
    uint128 totalSupplyAssets;
    uint128 totalSupplyShares;
    uint128 totalBorrowAssets;
    uint128 totalBorrowShares;
}

struct UserCollateral {
        uint128 balance;
        uint128 _reserved;
    }

enum Protocol {
    AAVE,
    COMPOUND,
    FLUID,
    MORPHO,
    SPARK,
    MAPPLE,
    GEARBOX
}

// Aave token type
enum TokenType {
    ARESERVE,
    AVARIABLEDEBT,
    ASTABLEDEBT
}

// Compound token type
enum CTokenType{
    BASE,
    COLLATERAL
}
