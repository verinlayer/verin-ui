// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.21;

import {Proof} from "vlayer-0.1.0/Proof.sol";
import {Prover} from "vlayer-0.1.0/Prover.sol";
import {IERC20} from "openzeppelin-contracts/token/ERC20/IERC20.sol";
import {IProver} from "./interfaces/IProver.sol";
import {Erc20Token, CToken, Protocol, TokenType, CTokenType} from "./types/TeleportTypes.sol";
import {ICToken} from "./interfaces/ICToken.sol";

contract SimpleTeleportProver is Prover, IProver {
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
}
