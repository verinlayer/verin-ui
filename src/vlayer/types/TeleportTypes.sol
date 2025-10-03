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

enum Protocol {
    AAVE,
    MORPHO,
    COMPOUND,
    SPARK,
    FLUID,
    MAPPLE,
    GEARBOX
}

enum TokenType {
    ARESERVE,
    AVARIABLEDEBT,
    ASTABLEDEBT
}
