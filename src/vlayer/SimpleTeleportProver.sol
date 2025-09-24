// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.21;

import {Proof} from "vlayer-0.1.0/Proof.sol";
import {Prover} from "vlayer-0.1.0/Prover.sol";
import {IERC20} from "openzeppelin-contracts/token/ERC20/IERC20.sol";
import {IProver} from "./interfaces/IProver.sol";
import {Erc20Token, Protocol, TokenType} from "./types/TeleportTypes.sol";

contract SimpleTeleportProver is Prover, IProver {
    function crossChainBalanceOf(address _owner, Erc20Token[] memory tokens)
        external
        returns (Proof memory, address, Erc20Token[] memory)
    {
        for (uint256 i = 0; i < tokens.length; i++) {
            setChain(tokens[i].chainId, tokens[i].blockNumber);
            tokens[i].balance = IERC20(tokens[i].aTokenAddress).balanceOf(_owner);
        }

        return (proof(), _owner, tokens);
    }

    function proveAaveData(address _owner, Erc20Token[] memory tokens)
        external
        returns (Proof memory, address, Erc20Token[] memory)
    {
        for (uint256 i = 0; i < tokens.length; i++) {
            setChain(tokens[i].chainId, tokens[i].blockNumber);
            tokens[i].balance = IERC20(tokens[i].aTokenAddress).balanceOf(_owner);
        }
        return (proof(), _owner, tokens);
    }

    function proveMorphoData(address _owner, Erc20Token[] memory tokens)
        external
        returns (Proof memory, address, Erc20Token[] memory)
    {
        
    }

    function proveCompoundData(address _owner, Erc20Token[] memory tokens)
        external
        returns (Proof memory, address, Erc20Token[] memory)
    {
        
    }
}
