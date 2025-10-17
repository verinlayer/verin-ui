// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.21;

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
